import {nanoid} from 'nanoid'
import * as XLSX from 'xlsx'
import type {GeneratedGrafica} from '../types'
import type {TableRow, TableValue} from '../../ExcelImporter/types'

function makeRow(cells: string[]): TableRow {
  return {_type: 'tableRow', _key: nanoid(), cells}
}

function round2(n: number): string {
  return parseFloat(n.toFixed(2)).toString()
}

const UBICACION_MAP: Record<string, string[]> = {
  coahuila: ['estatal-coahuila'],
  durango: ['estatal-durango'],
  matamoros: ['matamoros'],
  torreón: ['torreon'],
  'gómez palacio': ['gomez-palacio'],
  lerdo: ['lerdo'],
}

export function parseRemesas(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []

  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  })

  // Find header row with location names
  let headerIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && String(c).includes('Coahuila'))) {
      headerIdx = i
      break
    }
  }
  if (headerIdx === -1) return []

  const headerRow = data[headerIdx]
  if (!headerRow) return []

  // Find location columns
  const locations: {name: string; colIdx: number}[] = []
  for (let c = 0; c < headerRow.length; c++) {
    const val = headerRow[c]
    if (val && typeof val === 'string' && UBICACION_MAP[val.trim().toLowerCase()]) {
      locations.push({name: val.trim(), colIdx: c})
    }
  }

  // Find year column (column with "Título" or the one before first location)
  const yearCol = locations.length > 0 ? locations[0].colIdx - 1 : 1

  // Collect years and values
  const anios: string[] = []
  const valuesByLoc = new Map<number, string[]>()
  for (const loc of locations) {
    valuesByLoc.set(loc.colIdx, [])
  }

  for (let i = headerIdx + 1; i < data.length; i++) {
    const row = data[i]
    if (!row) break
    const year = row[yearCol]
    if (!year || !String(year).match(/^\d{4}$/)) break

    anios.push(String(year))
    for (const loc of locations) {
      valuesByLoc.get(loc.colIdx)!.push(round2(Number(row[loc.colIdx] || 0)))
    }
  }

  // Generate one chart per location
  const graficas: GeneratedGrafica[] = []

  for (const loc of locations) {
    const valores = valuesByLoc.get(loc.colIdx)!
    const ubicacion = UBICACION_MAP[loc.name.toLowerCase()] || ['torreon']

    const tablaDatos: TableValue = {
      rows: [
        makeRow(['', ...anios]),
        makeRow(['Remesas', ...valores]),
      ],
    }

    graficas.push({
      titulo: `Ingresos por Remesas en ${loc.name}`,
      tipo: 'bar',
      ubicacion,
      tablaDatos,
      unidadMedida: 'millones-pesos',
      fuente: 'banxico',
      descripcionContexto: `Ingresos por remesas en ${loc.name}, millones de dólares. Fuente: Banxico.`,
    })
  }

  return graficas
}
