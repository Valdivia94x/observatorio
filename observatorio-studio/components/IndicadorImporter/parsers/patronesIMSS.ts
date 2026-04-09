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
  zml: ['torreon', 'gomez-palacio', 'lerdo', 'matamoros'],
}

const DISPLAY_NAMES: Record<string, string> = {
  torreón: 'Torreón',
  'gómez palacio': 'Gómez Palacio',
  lerdo: 'Lerdo',
  matamoros: 'Matamoros',
  zml: 'ZML',
}

function displayName(name: string): string {
  return DISPLAY_NAMES[name.toLowerCase()] || name.trim()
}

export function parsePatronesIMSS(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []

  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  })

  const graficas: GeneratedGrafica[] = []
  graficas.push(...parseSeccion1Afiliados(data))
  graficas.push(...parseSeccion2Tamano(data))
  return graficas
}

// Section 1: Patrones afiliados por ubicación (first table only)
function parseSeccion1Afiliados(data: (string | number | null)[][]): GeneratedGrafica[] {
  // Find header row with municipality names after "Patrones Afiliados"
  let sectionIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && c.includes('Patrones Afiliados') && c.includes('Gráfico'))) {
      sectionIdx = i
      break
    }
  }
  if (sectionIdx === -1) return []

  const headerRow = data[sectionIdx + 1]
  if (!headerRow) return []

  // Find location columns
  const locations: {name: string; colIdx: number}[] = []
  for (let c = 1; c < headerRow.length; c++) {
    const val = headerRow[c]
    if (val && typeof val === 'string' && val.trim()) {
      locations.push({name: val.trim(), colIdx: c})
    }
  }

  const anios: string[] = []
  const valuesByLoc = new Map<number, string[]>()
  for (const loc of locations) {
    valuesByLoc.set(loc.colIdx, [])
  }

  for (let i = sectionIdx + 2; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[0]) break
    const anio = String(row[0]).trim()
    if (!anio.match(/^\d{4}$/)) break

    anios.push(anio)
    for (const loc of locations) {
      valuesByLoc.get(loc.colIdx)!.push(String(row[loc.colIdx] || '0'))
    }
  }

  const graficas: GeneratedGrafica[] = []

  for (const loc of locations) {
    const valores = valuesByLoc.get(loc.colIdx)!
    const name = displayName(loc.name)
    const ubicacion = MUNICIPIO_UBICACION[loc.name.toLowerCase()] || ['torreon']

    const tablaDatos: TableValue = {
      rows: [
        makeRow(['', ...anios]),
        makeRow(['Patrones afiliados', ...valores]),
      ],
    }

    graficas.push({
      titulo: `Patrones Afiliados en el IMSS en ${name}`,
      tipo: 'bar',
      ubicacion,
      tablaDatos,
      unidadMedida: 'unidades',
      fuente: 'otra',
      fuentePersonalizada: 'IMSS',
      descripcionContexto: `Patrones afiliados en el IMSS en ${name}.`,
    })
  }

  return graficas
}

// Section 2: Patrones por tamaño de registro patronal
function parseSeccion2Tamano(data: (string | number | null)[][]): GeneratedGrafica[] {
  let sectionIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && c.includes('tamaño de registro'))) {
      sectionIdx = i
      break
    }
  }
  if (sectionIdx === -1) return []

  // Find municipality header row (next row with "Tamaño de Registro")
  let headerIdx = -1
  for (let i = sectionIdx; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && String(c).includes('Tamaño'))) {
      headerIdx = i
      break
    }
  }
  if (headerIdx === -1) return []

  const muniRow = data[headerIdx]
  const periodRow = data[headerIdx + 1]
  if (!muniRow || !periodRow) return []

  // Convert Excel date serial to label
  function dateLabel(val: string | number | null): string {
    if (!val) return ''
    const num = Number(val)
    if (!isNaN(num) && num > 40000) {
      const date = new Date((num - 25569) * 86400 * 1000)
      return `Dic ${date.getFullYear()}`
    }
    const str = String(val)
    if (str.includes('2024')) return 'Dic 2024'
    if (str.includes('2025')) return 'Dic 2025'
    return str
  }

  // Find municipality column pairs
  const muniBlocks: {name: string; col1: number; col2: number; label1: string; label2: string}[] = []
  for (let c = 2; c < muniRow.length; c++) {
    const val = muniRow[c]
    if (val && typeof val === 'string' && val.trim() && MUNICIPIO_UBICACION[val.trim().toLowerCase()]) {
      muniBlocks.push({
        name: val.trim(),
        col1: c,
        col2: c + 1,
        label1: dateLabel(periodRow[c]),
        label2: dateLabel(periodRow[c + 1]),
      })
    }
  }

  // Collect sizes (skip TOTAL)
  const tamanos: string[] = []
  const tamanoRows: (string | number | null)[][] = []
  for (let i = headerIdx + 2; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[1]) break
    const tamano = String(row[1]).trim()
    if (tamano.toUpperCase() === 'TOTAL') break
    tamanos.push(tamano)
    tamanoRows.push(row)
  }

  const graficas: GeneratedGrafica[] = []

  for (const block of muniBlocks) {
    const serie1 = tamanoRows.map((row) => String(row[block.col1] || '0'))
    const serie2 = tamanoRows.map((row) => String(row[block.col2] || '0'))

    const name = displayName(block.name)
    const ubicacion = MUNICIPIO_UBICACION[block.name.toLowerCase()] || ['torreon']

    const tablaDatos: TableValue = {
      rows: [
        makeRow(['', ...tamanos]),
        makeRow([block.label1, ...serie1]),
        makeRow([block.label2, ...serie2]),
      ],
    }

    graficas.push({
      titulo: `Patrones por Tamaño en ${name}`,
      tipo: 'horizontalBar',
      ubicacion,
      tablaDatos,
      unidadMedida: 'unidades',
      fuente: 'otra',
      fuentePersonalizada: 'IMSS',
      descripcionContexto: `Patrones afiliados al IMSS por tamaño de registro patronal en ${name}.`,
    })
  }

  return graficas
}
