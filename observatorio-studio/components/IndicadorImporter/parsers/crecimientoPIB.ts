import {nanoid} from 'nanoid'
import * as XLSX from 'xlsx'
import type {GeneratedGrafica} from '../types'
import type {TableRow, TableValue} from '../../ExcelImporter/types'

function makeRow(cells: string[]): TableRow {
  return {_type: 'tableRow', _key: nanoid(), cells}
}

function toPercent(val: number): string {
  return parseFloat((val * 100).toFixed(2)).toString()
}

export function parseCrecimientoPIB(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []

  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  })

  const graficas: GeneratedGrafica[] = []
  graficas.push(...parseSeccion1Comparativo(data))
  graficas.push(...parseSeccion2Coahuila(data))
  graficas.push(...parseSeccion3Durango(data))
  graficas.push(...parseSeccion4Ranking(data))
  return graficas
}

// Section 1: Comparative line chart (Coahuila, Nacional, Durango)
function parseSeccion1Comparativo(data: (string | number | null)[][]): GeneratedGrafica[] {
  let sectionIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && c.includes('Crecimiento Económico del PIB') && c.includes('líneas'))) {
      sectionIdx = i
      break
    }
  }
  if (sectionIdx === -1) return []

  // Year row
  const yearRow = data[sectionIdx + 1]
  if (!yearRow) return []

  const anios: string[] = []
  for (let c = 1; c < yearRow.length; c++) {
    const val = yearRow[c]
    if (val && String(val).match(/^\d{4}$/)) anios.push(String(val))
    else break
  }

  // Data rows (skip sub-header row)
  const dataStartRow = sectionIdx + 3
  const tableRows: TableRow[] = [makeRow(['', ...anios])]

  for (let i = dataStartRow; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[0]) break
    const name = String(row[0]).trim()
    const valores = anios.map((_, idx) => {
      const val = row[idx + 1]
      return val !== null && val !== undefined ? toPercent(Number(val)) : '0'
    })
    tableRows.push(makeRow([name, ...valores]))
  }

  if (tableRows.length <= 1) return []

  return [{
    titulo: 'Crecimiento Económico del PIB (Variación % anual)',
    tipo: 'line',
    ubicacion: ['estatal-coahuila', 'estatal-durango'],
    tablaDatos: {rows: tableRows},
    unidadMedida: 'porcentaje',
    fuente: 'inegi',
    descripcionContexto: 'Variación porcentual anual del PIB. Comparativo Coahuila, Durango y Nacional. Fuente: INEGI, ITAEE.',
  }]
}

// Section 2: Coahuila PIB by sector (table)
function parseSeccion2Coahuila(data: (string | number | null)[][]): GeneratedGrafica[] {
  return parseSectorTable(data, 'PIB en Coahuila', 'Coahuila', ['estatal-coahuila'])
}

// Section 3: Durango PIB by sector (table)
function parseSeccion3Durango(data: (string | number | null)[][]): GeneratedGrafica[] {
  return parseSectorTable(data, 'PIB en Durango', 'Durango', ['estatal-durango'])
}

function parseSectorTable(
  data: (string | number | null)[][],
  marker: string,
  estado: string,
  ubicacion: string[],
): GeneratedGrafica[] {
  let sectionIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && c.includes(marker))) {
      sectionIdx = i
      break
    }
  }
  if (sectionIdx === -1) return []

  const yearRow = data[sectionIdx + 1]
  if (!yearRow) return []

  const anios: string[] = []
  for (let c = 1; c < yearRow.length; c++) {
    const val = yearRow[c]
    if (val && String(val).match(/^\d{4}$/)) anios.push(String(val))
    else break
  }

  const dataStartRow = sectionIdx + 3
  const tableRows: TableRow[] = [makeRow(['Sector', ...anios])]

  for (let i = dataStartRow; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[0]) break
    const name = String(row[0]).trim()
    // Truncate long sector names
    const shortName = name.length > 60 ? name.substring(0, 57) + '...' : name
    const valores = anios.map((_, idx) => {
      const val = row[idx + 1]
      return val !== null && val !== undefined ? toPercent(Number(val)) : '0'
    })
    tableRows.push(makeRow([shortName, ...valores]))
  }

  if (tableRows.length <= 1) return []

  return [{
    titulo: `PIB por Sector Económico en ${estado} (Variación % anual)`,
    tipo: 'table',
    ubicacion,
    tablaDatos: {rows: tableRows},
    unidadMedida: 'porcentaje',
    fuente: 'inegi',
    descripcionContexto: `Variación porcentual anual del PIB por sector económico en ${estado}. Fuente: INEGI, ITAEE.`,
  }]
}

// Section 4: National ranking
function parseSeccion4Ranking(data: (string | number | null)[][]): GeneratedGrafica[] {
  let sectionIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && c.includes('Ranking Nacional'))) {
      sectionIdx = i
      break
    }
  }
  if (sectionIdx === -1) return []

  // Skip header row
  const dataStartRow = sectionIdx + 2

  const entidades: string[] = []
  const valores: string[] = []

  for (let i = dataStartRow; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[0]) break
    const name = String(row[0]).trim()
    const val = row[1]
    if (val === null || val === undefined) continue
    entidades.push(name)
    valores.push(parseFloat(Number(val).toFixed(2)).toString())
  }

  if (entidades.length === 0) return []

  const tablaDatos: TableValue = {
    rows: [
      makeRow(['', ...entidades]),
      makeRow(['Variación % anual', ...valores]),
    ],
  }

  return [{
    titulo: 'Ranking Nacional de Crecimiento Económico 2024',
    tipo: 'bar',
    ubicacion: ['estatal-coahuila', 'estatal-durango'],
    tablaDatos,
    unidadMedida: 'porcentaje',
    fuente: 'inegi',
    descripcionContexto: 'Ranking de entidades federativas por variación porcentual anual del PIB en 2024. Fuente: INEGI, ITAEE.',
  }]
}
