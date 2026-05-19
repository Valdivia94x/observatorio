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

export function parseIngresosMunicipales(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const graficas: GeneratedGrafica[] = []

  for (const sheetName of workbook.SheetNames) {
    const muni = normalizeMunicipio(sheetName)
    if (!muni) continue

    const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: null,
    })

    const sec1 = parseFuentes(data, muni)
    if (sec1) graficas.push(sec1)

    const sec2 = parseRubros(data, muni)
    if (sec2) graficas.push(sec2)
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

function parseFuentes(
  data: (string | number | null)[][],
  muni: {ubicacion: string; display: string},
): GeneratedGrafica | null {
  const sectionIdx = findSection(data, 'fuente de financiamiento')
  if (sectionIdx === -1) return null

  const yearInfo = findYearRowAfter(data, sectionIdx + 1)
  if (!yearInfo) return null
  const {yearRowIdx, anios} = yearInfo

  const tableRows: TableRow[] = [makeRow(['', ...anios])]

  for (let i = yearRowIdx + 1; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[0]) break
    const nombre = String(row[0]).trim()
    if (!nombre || nombre.toLowerCase().startsWith('fuente:')) break
    if (nombre.startsWith('2.')) break
    const valores = anios.map((_, idx) => round2(Number(row[idx + 1] || 0)))
    tableRows.push(makeRow([nombre, ...valores]))
  }

  if (tableRows.length <= 1) return null

  return {
    titulo: `Ingresos Municipales por Fuente de Financiamiento en ${muni.display}`,
    tipo: 'stackedBar',
    ubicacion: [muni.ubicacion],
    tablaDatos: {rows: tableRows},
    unidadMedida: 'millones-pesos',
    fuente: 'otra',
    fuentePersonalizada: `Transparencia Municipal del Ayuntamiento de ${muni.display}`,
    descripcionContexto: `Ingresos municipales de ${muni.display} desagregados por fuente de financiamiento (federal, propio, financiamientos), millones de pesos.`,
  }
}

function parseRubros(
  data: (string | number | null)[][],
  muni: {ubicacion: string; display: string},
): GeneratedGrafica | null {
  const sectionIdx = findSection(data, 'por rubros')
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
    if (nombre.toLowerCase().startsWith('ingresos totales')) {
      totalRow = makeRow([`Total Ingresos`, ...valores])
    } else {
      tableRows.push(makeRow([nombre, ...valores]))
    }
  }

  if (tableRows.length <= 1) return null
  if (totalRow) tableRows.push(totalRow)

  return {
    titulo: `Ingresos Municipales por Rubro en ${muni.display}`,
    tipo: 'table',
    ubicacion: [muni.ubicacion],
    tablaDatos: {rows: tableRows},
    unidadMedida: 'pesos',
    fuente: 'otra',
    fuentePersonalizada: `Transparencia Municipal del Ayuntamiento de ${muni.display}`,
    descripcionContexto: `Ingresos municipales de ${muni.display} desagregados por rubro (impuestos, derechos, participaciones, etc.), montos anuales en pesos.`,
  }
}
