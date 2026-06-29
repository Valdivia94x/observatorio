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

export function parseCoberturaSalud(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []

  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  })

  const graficas: GeneratedGrafica[] = []
  graficas.push(...parseHistorico(data))
  graficas.push(...parsePorInstitucion(data))
  return graficas
}

// Sección 1: histórico de cobertura (barras en capas) por municipio
function parseHistorico(data: (string | number | null)[][]): GeneratedGrafica[] {
  const sectionIdx = findSection(data, 'Histórico de cobertura')
  if (sectionIdx === -1) return []

  const headerRow = data[sectionIdx + 1]
  if (!headerRow) return []
  // Header: [Municipio, Año, Con cobertura (%), Sin cobertura (%), No especificado (%)]
  const categorias: {col: number; nombre: string}[] = []
  for (let c = 2; c < headerRow.length; c++) {
    const val = headerRow[c]
    if (typeof val === 'string' && val.trim()) {
      categorias.push({col: c, nombre: val.replace(/\s*\(%\)\s*/g, '').trim()})
    }
  }
  if (categorias.length === 0) return []

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
    for (const cat of categorias) {
      const valores = m.rows.map((row) => {
        const v = row[cat.col]
        return v === null || v === undefined || v === '' ? '' : toPercent(Number(v))
      })
      tableRows.push(makeRow([cat.nombre, ...valores]))
    }
    graficas.push({
      titulo: `Histórico de Cobertura en Salud en ${m.display}`,
      tipo: 'stackedBar',
      ubicacion: [m.ubicacion],
      tablaDatos: {rows: tableRows},
      unidadMedida: 'porcentaje',
      fuente: 'inegi',
      descripcionContexto: `Distribución histórica de la población con y sin cobertura de salud en ${m.display}.`,
      ocultarValores: true,
      // Orden de series: Con cobertura, Sin cobertura, No especificado
      colores: ['#22c55e', '#ec4899', '#3b82f6'],
    })
  }

  return graficas
}

// Sección 2: cobertura por tipo de institución (barras), instituciones en X por municipio
function parsePorInstitucion(data: (string | number | null)[][]): GeneratedGrafica[] {
  const sectionIdx = findSection(data, 'por tipo de institución')
  if (sectionIdx === -1) return []

  const headerRow = data[sectionIdx + 1]
  if (!headerRow) return []
  // Header: [Municipio, IMSS, ISSSTE, ...]
  const instituciones: {col: number; nombre: string}[] = []
  for (let c = 1; c < headerRow.length; c++) {
    const val = headerRow[c]
    if (typeof val === 'string' && val.trim()) instituciones.push({col: c, nombre: val.trim()})
  }
  if (instituciones.length === 0) return []

  const graficas: GeneratedGrafica[] = []
  for (let i = sectionIdx + 2; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[0]) break
    const nombre = String(row[0]).trim()
    if (nombre.toLowerCase().startsWith('fuente')) break
    const ub = ubicacionDe(nombre)
    if (!ub) break

    const valores = instituciones.map((inst) => {
      const v = row[inst.col]
      return v === null || v === undefined || v === '' ? '' : toPercent(Number(v))
    })

    graficas.push({
      titulo: `Cobertura en Salud por Institución en ${nombre} (2020)`,
      tipo: 'bar',
      ubicacion: [ub],
      tablaDatos: {
        rows: [makeRow(['', ...instituciones.map((i) => i.nombre)]), makeRow([nombre, ...valores])],
      },
      unidadMedida: 'porcentaje',
      fuente: 'inegi',
      descripcionContexto: `Cobertura en salud por tipo de institución en ${nombre}, Censo de Población y Vivienda 2020.`,
    })
  }

  return graficas
}
