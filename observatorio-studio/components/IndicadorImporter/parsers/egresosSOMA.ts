import {nanoid} from 'nanoid'
import * as XLSX from 'xlsx'
import type {GeneratedGrafica} from '../types'
import type {TableRow} from '../../ExcelImporter/types'

function makeRow(cells: string[]): TableRow {
  return {_type: 'tableRow', _key: nanoid(), cells}
}

function round2(n: number): string {
  return parseFloat(n.toFixed(2)).toString()
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

function normalizeMunicipio(name: string): {ubicacion: string; display: string} | null {
  const key = name.toLowerCase().trim()
  const ubicacion = MUNICIPIO_UBICACION[key]
  if (!ubicacion) return null
  return {ubicacion, display: name.trim()}
}

export function parseEgresosSOMA(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const graficas: GeneratedGrafica[] = []

  for (const sheetName of workbook.SheetNames) {
    const muni = normalizeMunicipio(sheetName)
    if (!muni) continue

    const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: null,
    })

    const seccion1 = parsePorcentajes(data, muni)
    if (seccion1) graficas.push(seccion1)

    const seccion2 = parseMontos(data, muni)
    if (seccion2) graficas.push(seccion2)
  }

  return graficas
}

function findSection(data: (string | number | null)[][], marker: string): number {
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && c.includes(marker))) return i
  }
  return -1
}

function readYears(yearRow: (string | number | null)[]): string[] {
  const anios: string[] = []
  for (let c = 1; c < yearRow.length; c++) {
    const val = yearRow[c]
    if (val && String(val).match(/^\d{4}$/)) anios.push(String(val))
    else break
  }
  return anios
}

function findYearRowAfter(
  data: (string | number | null)[][],
  startIdx: number,
): {yearRowIdx: number; anios: string[]} | null {
  for (let i = startIdx; i < Math.min(startIdx + 5, data.length); i++) {
    const row = data[i]
    if (!row) continue
    const anios = readYears(row)
    if (anios.length >= 3) return {yearRowIdx: i, anios}
  }
  return null
}

function parsePorcentajes(
  data: (string | number | null)[][],
  muni: {ubicacion: string; display: string},
): GeneratedGrafica | null {
  const sectionIdx = findSection(data, 'barras en capas')
  if (sectionIdx === -1) return null

  const yearInfo = findYearRowAfter(data, sectionIdx + 1)
  if (!yearInfo) return null
  const {yearRowIdx, anios} = yearInfo

  const tableRows: TableRow[] = [makeRow(['', ...anios])]

  for (let i = yearRowIdx + 1; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[0]) break
    const nombre = String(row[0]).trim()
    if (!nombre || nombre.toLowerCase().startsWith('fuente')) break
    const valores = anios.map((_, idx) => toPercent(Number(row[idx + 1] || 0)))
    tableRows.push(makeRow([nombre, ...valores]))
  }

  if (tableRows.length <= 1) return null

  return {
    titulo: `Egresos del Sistema Operador de Agua en ${muni.display} (% por rubro)`,
    tipo: 'stackedBar',
    ubicacion: [muni.ubicacion],
    tablaDatos: {rows: tableRows},
    unidadMedida: 'porcentaje',
    fuente: 'municipal',
    descripcionContexto: `Gasto ejercido por rubro del Sistema Operador de Agua de ${muni.display}, distribución porcentual anual. Fuente: Transparencia Municipal del Ayuntamiento de ${muni.display}.`,
    ocultarValores: true,
  }
}

function parseMontos(
  data: (string | number | null)[][],
  muni: {ubicacion: string; display: string},
): GeneratedGrafica | null {
  const sectionIdx = findSection(data, '(Tabla)')
  if (sectionIdx === -1) return null

  const yearInfo = findYearRowAfter(data, sectionIdx + 1)
  if (!yearInfo) return null
  const {yearRowIdx, anios} = yearInfo

  const tableRows: TableRow[] = [makeRow(['Rubro', ...anios])]
  let totalRow: TableRow | null = null

  for (let i = yearRowIdx + 1; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[0]) break
    const nombre = String(row[0]).trim()
    if (!nombre || nombre.toLowerCase().startsWith('fuente')) break
    const valores = anios.map((_, idx) => {
      const v = row[idx + 1]
      if (v === null || v === undefined) return ''
      return round2(Number(v))
    })
    if (nombre.toLowerCase() === 'egresos') {
      totalRow = makeRow([`Total Egresos`, ...valores])
    } else {
      tableRows.push(makeRow([nombre, ...valores]))
    }
  }

  if (tableRows.length <= 1) return null
  if (totalRow) tableRows.push(totalRow)

  return {
    titulo: `Egresos del Sistema Operador de Agua en ${muni.display} (montos)`,
    tipo: 'table',
    ubicacion: [muni.ubicacion],
    tablaDatos: {rows: tableRows},
    unidadMedida: 'pesos',
    fuente: 'municipal',
    descripcionContexto: `Gasto ejercido por rubro del Sistema Operador de Agua de ${muni.display}, montos anuales en pesos. Fuente: Transparencia Municipal del Ayuntamiento de ${muni.display}.`,
  }
}
