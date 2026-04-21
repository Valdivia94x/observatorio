import {nanoid} from 'nanoid'
import * as XLSX from 'xlsx'
import type {GeneratedGrafica} from '../types'
import type {TableRow, TableValue} from '../../ExcelImporter/types'

function makeRow(cells: string[]): TableRow {
  return {_type: 'tableRow', _key: nanoid(), cells}
}

const ALL_UBICACIONES = ['estatal-coahuila', 'estatal-durango', 'torreon', 'matamoros', 'gomez-palacio', 'lerdo']

export function parseUnidadesEconomicas(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []

  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  })

  const graficas: GeneratedGrafica[] = []
  graficas.push(...parseTabla(data, 'tamaño de empresa', 'Unidades Económicas por Tamaño de Empresa'))
  graficas.push(...parseTabla(data, 'Actividad Económica', 'Unidades Económicas por Actividad Económica'))
  return graficas
}

function parseTabla(
  data: (string | number | null)[][],
  marker: string,
  titulo: string,
): GeneratedGrafica[] {
  // Find section
  let sectionIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && c.includes(marker))) {
      sectionIdx = i
      break
    }
  }
  if (sectionIdx === -1) return []

  // Find header row with location names
  let headerIdx = -1
  for (let i = sectionIdx; i < sectionIdx + 3; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && String(c).includes('Coahuila'))) {
      headerIdx = i
      break
    }
  }
  if (headerIdx === -1) return []

  const headerRow = data[headerIdx]
  if (!headerRow) return []

  // Build header cells - find location columns dynamically
  const locationCols: {name: string; colIdx: number}[] = []
  for (let c = 0; c < headerRow.length; c++) {
    const val = headerRow[c]
    if (val && typeof val === 'string' && (val.includes('Coahuila') || val.includes('Durango') || val.includes('Torreón') || val.includes('Matamoros') || val.includes('Gómez') || val.includes('Lerdo'))) {
      locationCols.push({name: val.trim(), colIdx: c})
    }
  }

  const headerCells = ['', ...locationCols.map(l => l.name)]
  const tableRows: TableRow[] = [makeRow(headerCells)]

  // Name column is one before the first location column
  const nameCol = locationCols.length > 0 ? locationCols[0].colIdx - 1 : 0

  for (let i = headerIdx + 1; i < data.length; i++) {
    const row = data[i]
    if (!row) break
    const name = row[nameCol]
    if (!name || typeof name !== 'string' || !name.trim()) break

    const valores = locationCols.map(l => {
      const val = row[l.colIdx]
      return val !== null && val !== undefined ? String(val) : '0'
    })
    tableRows.push(makeRow([name.trim(), ...valores]))
  }

  if (tableRows.length <= 1) return []

  return [{
    titulo,
    tipo: 'table',
    ubicacion: ALL_UBICACIONES,
    tablaDatos: {rows: tableRows},
    unidadMedida: 'unidades',
    fuente: 'inegi',
    descripcionContexto: `${titulo}. Fuente: INEGI, Censos Económicos 2024.`,
  }]
}
