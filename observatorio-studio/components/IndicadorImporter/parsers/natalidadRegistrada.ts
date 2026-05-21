import {nanoid} from 'nanoid'
import * as XLSX from 'xlsx'
import type {GeneratedGrafica} from '../types'
import type {TableRow} from '../../ExcelImporter/types'

function makeRow(cells: string[]): TableRow {
  return {_type: 'tableRow', _key: nanoid(), cells}
}

function toPercent(val: number): string {
  return parseFloat((val * 100).toFixed(2)).toString()
}

const MUNICIPIO_UBICACION: Record<string, string> = {
  matamoros: 'matamoros',
  torreón: 'torreon',
  torreon: 'torreon',
  'gómez palacio': 'gomez-palacio',
  'gomez palacio': 'gomez-palacio',
  lerdo: 'lerdo',
}

function ubicacionDe(name: string): string | null {
  return MUNICIPIO_UBICACION[name.toLowerCase().trim()] ?? null
}

function findSection(data: (string | number | null)[][], marker: string): number {
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && c.includes(marker))) return i
  }
  return -1
}

export function parseNatalidadRegistrada(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []

  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  })

  const graficas: GeneratedGrafica[] = []
  graficas.push(...parsePorAnio(data))
  graficas.push(...parsePorEdadMadre(data))
  return graficas
}

// Sección 1: nacimientos por año (años × municipios)
function parsePorAnio(data: (string | number | null)[][]): GeneratedGrafica[] {
  const sectionIdx = findSection(data, 'Nacimientos registrados (Gráfica de barras)')
  if (sectionIdx === -1) return []

  const headerRow = data[sectionIdx + 1]
  if (!headerRow) return []
  const muniCols: {col: number; display: string; ubicacion: string}[] = []
  for (let c = 0; c < headerRow.length; c++) {
    const val = headerRow[c]
    if (typeof val === 'string') {
      const ub = ubicacionDe(val)
      if (ub) muniCols.push({col: c, display: val.trim(), ubicacion: ub})
    }
  }
  if (muniCols.length === 0) return []

  const anios: string[] = []
  const valores: Record<number, string[]> = {}
  muniCols.forEach((m) => (valores[m.col] = []))

  for (let i = sectionIdx + 2; i < data.length; i++) {
    const row = data[i]
    if (!row) continue
    const año = row[0]
    if (!año || !String(año).match(/^\d{4}$/)) break
    anios.push(String(año))
    for (const m of muniCols) {
      const v = row[m.col]
      valores[m.col].push(v === null || v === undefined || v === '' ? '' : Math.round(Number(v)).toString())
    }
  }
  if (anios.length === 0) return []

  return muniCols.map((m) => ({
    titulo: `Nacimientos Registrados en ${m.display}`,
    tipo: 'bar' as const,
    ubicacion: [m.ubicacion],
    tablaDatos: {rows: [makeRow(['', ...anios]), makeRow([m.display, ...valores[m.col]])]},
    unidadMedida: 'unidades',
    fuente: 'inegi',
    descripcionContexto: `Nacimientos registrados anualmente en ${m.display}.`,
  }))
}

// Sección 2: nacimientos por rango de edad de la madre (barras en capas por año)
function parsePorEdadMadre(data: (string | number | null)[][]): GeneratedGrafica[] {
  const sectionIdx = findSection(data, 'rango de edad')
  if (sectionIdx === -1) return []

  const headerRow = data[sectionIdx + 1]
  if (!headerRow) return []
  // Header: [Municipio, Año, rango1, rango2, ...]
  const rangos: {col: number; nombre: string}[] = []
  for (let c = 2; c < headerRow.length; c++) {
    const val = headerRow[c]
    if (typeof val === 'string' && val.trim()) rangos.push({col: c, nombre: val.trim()})
  }
  if (rangos.length === 0) return []

  // Agrupar filas por municipio
  const porMuni: Record<string, {display: string; ubicacion: string; anios: string[]; rows: (string | number | null)[][]}> = {}
  for (let i = sectionIdx + 2; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[0]) {
      if (Object.keys(porMuni).length > 0) break
      continue
    }
    const nombre = String(row[0]).trim()
    if (nombre.toLowerCase().startsWith('fuente')) break
    const ub = ubicacionDe(nombre)
    if (!ub) break
    const año = row[1]
    if (!año || !String(año).match(/^\d{4}$/)) continue
    if (!porMuni[ub]) porMuni[ub] = {display: nombre, ubicacion: ub, anios: [], rows: []}
    porMuni[ub].anios.push(String(año))
    porMuni[ub].rows.push(row)
  }

  const graficas: GeneratedGrafica[] = []
  for (const key of Object.keys(porMuni)) {
    const m = porMuni[key]
    if (m.anios.length === 0) continue
    const tableRows: TableRow[] = [makeRow(['', ...m.anios])]
    for (const r of rangos) {
      const valores = m.rows.map((row) => {
        const v = row[r.col]
        return v === null || v === undefined || v === '' ? '' : toPercent(Number(v))
      })
      tableRows.push(makeRow([r.nombre, ...valores]))
    }
    graficas.push({
      titulo: `Nacimientos por Rango de Edad de la Madre en ${m.display}`,
      tipo: 'stackedBar',
      ubicacion: [m.ubicacion],
      tablaDatos: {rows: tableRows},
      unidadMedida: 'porcentaje',
      fuente: 'inegi',
      descripcionContexto: `Distribución porcentual de nacimientos por rango de edad de la madre en ${m.display}.`,
      ocultarValores: true,
    })
  }

  return graficas
}
