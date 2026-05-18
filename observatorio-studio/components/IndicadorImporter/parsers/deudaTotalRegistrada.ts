import {nanoid} from 'nanoid'
import * as XLSX from 'xlsx'
import type {GeneratedGrafica} from '../types'
import type {TableRow, TableValue} from '../../ExcelImporter/types'

function makeRow(cells: string[]): TableRow {
  return {_type: 'tableRow', _key: nanoid(), cells}
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
  const display = name.trim().replace(/^./, (c) => c.toUpperCase())
  return {ubicacion, display}
}

export function parseDeudaTotalRegistrada(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const graficas: GeneratedGrafica[] = []

  for (const sheetName of workbook.SheetNames) {
    const grafica = parseSheet(workbook.Sheets[sheetName], sheetName)
    if (grafica) graficas.push(grafica)
  }

  return graficas
}

function parseSheet(sheet: XLSX.Sheet, sheetName: string): GeneratedGrafica | null {
  const muni = normalizeMunicipio(sheetName)
  if (!muni) return null

  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  })

  // Find year row (the row after the section title row, which has years starting at column 1)
  let yearRowIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (!row) continue
    // Year row has nulls in col 0 and 4-digit numbers from col 1
    const hasYears = row.slice(1).filter((v) => v && String(v).match(/^\d{4}$/)).length >= 3
    if (hasYears && (row[0] === null || row[0] === '')) {
      yearRowIdx = i
      break
    }
  }
  if (yearRowIdx === -1) return null

  const yearRow = data[yearRowIdx]
  const anios: string[] = []
  for (let c = 1; c < yearRow.length; c++) {
    const val = yearRow[c]
    if (val && String(val).match(/^\d{4}$/)) anios.push(String(val))
    else break
  }
  if (anios.length === 0) return null

  const tableRows: TableRow[] = [makeRow(['', ...anios])]

  for (let i = yearRowIdx + 1; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[0]) break
    const nombre = String(row[0]).trim()
    if (!nombre || nombre.toLowerCase().startsWith('fuente')) break
    const valores = anios.map((_, idx) => Math.round(Number(row[idx + 1] || 0)).toString())
    tableRows.push(makeRow([nombre, ...valores]))
  }

  if (tableRows.length <= 1) return null

  return {
    titulo: `Deuda Total Registrada en ${muni.display}`,
    tipo: 'stackedBar',
    ubicacion: [muni.ubicacion],
    tablaDatos: {rows: tableRows},
    unidadMedida: 'pesos',
    fuente: 'otra',
    fuentePersonalizada: `Transparencia Municipal del Ayuntamiento de ${muni.display}`,
    descripcionContexto: `Deuda total registrada en el municipio de ${muni.display}, descompuesta en pasivo circulante y no circulante.`,
  }
}
