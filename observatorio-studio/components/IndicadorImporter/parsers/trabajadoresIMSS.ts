import {nanoid} from 'nanoid'
import * as XLSX from 'xlsx'
import type {GeneratedGrafica} from '../types'
import type {TableRow, TableValue} from '../../ExcelImporter/types'

function makeRow(cells: string[]): TableRow {
  return {_type: 'tableRow', _key: nanoid(), cells}
}

const MUNICIPIO_UBICACION: Record<string, string[]> = {
  torreón: ['torreon'],
  'gómez palacio': ['gomez-palacio'],
  lerdo: ['lerdo'],
  matamoros: ['matamoros'],
}

const DISPLAY_NAMES: Record<string, string> = {
  torreón: 'Torreón',
  'gómez palacio': 'Gómez Palacio',
  lerdo: 'Lerdo',
  matamoros: 'Matamoros',
}

function displayName(name: string): string {
  return DISPLAY_NAMES[name.toLowerCase()] || name.trim()
}

export function parseTrabajadoresIMSS(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const graficas: GeneratedGrafica[] = []

  const sheetGenero = workbook.Sheets['Asegurados por género']
  if (sheetGenero) graficas.push(...parseGenero(sheetGenero))

  const sheetActividad = workbook.Sheets['Asegurados por actividad económ']
  if (sheetActividad) graficas.push(...parseActividad(sheetActividad))

  const sheetEdad = workbook.Sheets['Asegurados por edad']
  if (sheetEdad) graficas.push(...parseEdad(sheetEdad))

  return graficas
}

// Sheet 1: Paired municipality tables (Torreón+GP, Matamoros+Lerdo) with Hombre/Mujer/Total
function parseGenero(sheet: XLSX.Sheet): GeneratedGrafica[] {
  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: null})

  const graficas: GeneratedGrafica[] = []
  const blocks: {name: string; startRow: number; colOffset: number}[] = []

  // Find municipality name rows
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (!row) continue
    for (const col of [2, 7]) {
      const val = row[col]
      if (val && typeof val === 'string' && val.trim() && !val.includes('Hombre') && !val.includes('Mujer') && !val.includes('Total')) {
        const nextRow = data[i + 1]
        if (nextRow && nextRow[col] && String(nextRow[col]).includes('Hombre')) {
          blocks.push({name: val.trim(), startRow: i + 2, colOffset: col})
        }
      }
    }
  }

  for (const block of blocks) {
    const anios: string[] = []
    const hombres: string[] = []
    const mujeres: string[] = []

    for (let i = block.startRow; i < data.length; i++) {
      const row = data[i]
      if (!row) continue

      // Period is one column before the municipality's data columns
      const periodo = row[block.colOffset - 1]
      if (!periodo || (typeof periodo !== 'number' && !String(periodo).match(/^\d{4}$/))) break

      anios.push(String(periodo))
      hombres.push(String(row[block.colOffset] || '0'))
      mujeres.push(String(row[block.colOffset + 1] || '0'))
    }

    if (anios.length === 0) continue

    const name = displayName(block.name)
    const ubicacion = MUNICIPIO_UBICACION[block.name.toLowerCase()] || ['torreon']

    const tablaDatos: TableValue = {
      rows: [
        makeRow(['', ...anios]),
        makeRow(['Hombres', ...hombres]),
        makeRow(['Mujeres', ...mujeres]),
      ],
    }

    graficas.push({
      titulo: `Trabajadores IMSS por Género en ${name}`,
      tipo: 'bar',
      ubicacion,
      tablaDatos,
      unidadMedida: 'unidades',
      fuente: 'otra',
      fuentePersonalizada: 'IMSS',
      descripcionContexto: `Trabajadores registrados en el IMSS por género en ${name}.`,
    })
  }

  return graficas
}

// Sheet 2: Activity by municipality columns
function parseActividad(sheet: XLSX.Sheet): GeneratedGrafica[] {
  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: null})

  // Find header row with municipality names
  let headerIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row[0] && String(row[0]).includes('ACTIVIDADES')) {
      headerIdx = i
      break
    }
  }
  if (headerIdx === -1) return []

  const municipioRow = data[headerIdx]
  const periodRow = data[headerIdx + 1]
  if (!municipioRow || !periodRow) return []

  // Find municipality column pairs
  const muniBlocks: {name: string; col1: number; col2: number; label1: string; label2: string}[] = []
  for (let c = 1; c < municipioRow.length; c++) {
    const val = municipioRow[c]
    if (val && typeof val === 'string' && val.trim() && MUNICIPIO_UBICACION[val.trim().toLowerCase()]) {
      const l1 = String(periodRow[c] || '').replace(/\n/g, ' ').trim()
      const l2 = String(periodRow[c + 1] || '').replace(/\n/g, ' ').trim()
      muniBlocks.push({name: val.trim(), col1: c, col2: c + 1, label1: l1, label2: l2})
    }
  }

  const graficas: GeneratedGrafica[] = []

  // Collect activities (skip TOTAL row)
  const actividades: string[] = []
  const activityRows: (string | number | null)[][] = []
  for (let i = headerIdx + 2; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[0]) break
    const act = String(row[0]).trim()
    if (act.toUpperCase() === 'TOTAL') break
    actividades.push(act)
    activityRows.push(row)
  }

  for (const block of muniBlocks) {
    const serie1: string[] = []
    const serie2: string[] = []

    for (const row of activityRows) {
      serie1.push(String(row[block.col1] || '0'))
      serie2.push(String(row[block.col2] || '0'))
    }

    const name = displayName(block.name)
    const ubicacion = MUNICIPIO_UBICACION[block.name.toLowerCase()] || ['torreon']

    const tablaDatos: TableValue = {
      rows: [
        makeRow(['', ...actividades]),
        makeRow([block.label1, ...serie1]),
        makeRow([block.label2, ...serie2]),
      ],
    }

    graficas.push({
      titulo: `Trabajadores IMSS por Actividad Económica en ${name}`,
      tipo: 'horizontalBar',
      ubicacion,
      tablaDatos,
      unidadMedida: 'unidades',
      fuente: 'otra',
      fuentePersonalizada: 'IMSS',
      descripcionContexto: `Trabajadores registrados en el IMSS por actividad económica en ${name}.`,
    })
  }

  return graficas
}

// Sheet 3: Age ranges by municipality columns
// Structure: Row 1 has municipality names at col 1,3,5,7
//            Row 2 has Excel date serials (pairs per municipality)
//            Row 3+ has age range in col 0, values in municipality columns
function parseEdad(sheet: XLSX.Sheet): GeneratedGrafica[] {
  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: null})

  // Find municipality header row
  let headerIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && c.toLowerCase().includes('matamoros'))) {
      headerIdx = i
      break
    }
  }
  if (headerIdx === -1) return []

  const municipioRow = data[headerIdx]
  const periodRow = data[headerIdx + 1]
  if (!municipioRow || !periodRow) return []

  // Convert Excel date serial to label
  function dateSerialToLabel(val: string | number | null): string {
    if (!val) return ''
    const num = Number(val)
    if (!isNaN(num) && num > 40000) {
      // Excel date serial - convert
      const date = new Date((num - 25569) * 86400 * 1000)
      const year = date.getFullYear()
      return `Dic ${year}`
    }
    const str = String(val)
    if (str.includes('2024')) return 'Dic 2024'
    if (str.includes('2025')) return 'Dic 2025'
    return str
  }

  // Find municipality column pairs (municipalities at odd columns: 1,3,5,7)
  const muniBlocks: {name: string; col1: number; col2: number; label1: string; label2: string}[] = []
  for (let c = 0; c < municipioRow.length; c++) {
    const val = municipioRow[c]
    if (val && typeof val === 'string' && val.trim() && MUNICIPIO_UBICACION[val.trim().toLowerCase()]) {
      const label1 = dateSerialToLabel(periodRow[c])
      const label2 = dateSerialToLabel(periodRow[c + 1])
      muniBlocks.push({name: val.trim(), col1: c, col2: c + 1, label1, label2})
    }
  }

  // Collect age ranges from col 0
  const rangos: string[] = []
  const rangoRows: (string | number | null)[][] = []
  for (let i = headerIdx + 2; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[0]) break
    const rango = String(row[0]).trim()
    if (!rango) break
    rangos.push(rango)
    rangoRows.push(row)
  }

  const graficas: GeneratedGrafica[] = []

  for (const block of muniBlocks) {
    const serie1: string[] = []
    const serie2: string[] = []

    for (const row of rangoRows) {
      serie1.push(String(row[block.col1] || '0'))
      serie2.push(String(row[block.col2] || '0'))
    }

    const name = displayName(block.name)
    const ubicacion = MUNICIPIO_UBICACION[block.name.toLowerCase()] || ['torreon']

    const tablaDatos: TableValue = {
      rows: [
        makeRow(['', ...rangos]),
        makeRow([block.label1, ...serie1]),
        makeRow([block.label2, ...serie2]),
      ],
    }

    graficas.push({
      titulo: `Trabajadores IMSS por Edad en ${name}`,
      tipo: 'bar',
      ubicacion,
      tablaDatos,
      unidadMedida: 'unidades',
      fuente: 'otra',
      fuentePersonalizada: 'IMSS',
      descripcionContexto: `Trabajadores registrados en el IMSS por rango de edad en ${name}.`,
    })
  }

  return graficas
}
