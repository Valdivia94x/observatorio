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

const MUNICIPIO_UBICACION: Record<string, string[]> = {
  torreón: ['torreon'],
  'gómez palacio': ['gomez-palacio'],
  lerdo: ['lerdo'],
  matamoros: ['matamoros'],
  'zml laguna': ['torreon', 'gomez-palacio', 'lerdo', 'matamoros'],
}

const DISPLAY_NAMES: Record<string, string> = {
  torreón: 'Torreón',
  'gómez palacio': 'Gómez Palacio',
  lerdo: 'Lerdo',
  matamoros: 'Matamoros',
  'zml laguna': 'ZML',
}

function displayName(name: string): string {
  return DISPLAY_NAMES[name.toLowerCase()] || name.trim()
}

export function parseSalariosIMSS(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []

  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  })

  const graficas: GeneratedGrafica[] = []
  graficas.push(...parseSeccion1Historico(data))
  graficas.push(...parseSeccion2Actividad(data))
  graficas.push(...parseSeccion3Genero(data))
  return graficas
}

// Section 1: Historical average daily salary per location
function parseSeccion1Historico(data: (string | number | null)[][]): GeneratedGrafica[] {
  let headerIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row[1] && String(row[1]).toUpperCase() === 'AÑO') {
      headerIdx = i
      break
    }
  }
  if (headerIdx === -1) return []

  const headerRow = data[headerIdx]
  if (!headerRow) return []

  // Find location columns
  const locations: {name: string; colIdx: number}[] = []
  for (let c = 2; c < headerRow.length; c++) {
    const val = headerRow[c]
    if (val && typeof val === 'string' && val.trim()) {
      locations.push({name: val.trim(), colIdx: c})
    }
  }

  // Collect years and values
  const anios: string[] = []
  const valuesByLocation = new Map<number, string[]>()
  for (const loc of locations) {
    valuesByLocation.set(loc.colIdx, [])
  }

  for (let i = headerIdx + 1; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[1]) break
    const anio = String(row[1]).trim()
    if (!anio.match(/^\d{4}$/)) break

    anios.push(anio)
    for (const loc of locations) {
      const val = row[loc.colIdx]
      valuesByLocation.get(loc.colIdx)!.push(val ? round2(Number(val)) : '0')
    }
  }

  const graficas: GeneratedGrafica[] = []

  for (const loc of locations) {
    const valores = valuesByLocation.get(loc.colIdx)!
    const name = displayName(loc.name)
    const ubicacion = MUNICIPIO_UBICACION[loc.name.toLowerCase()] || ['torreon']

    const tablaDatos: TableValue = {
      rows: [
        makeRow(['', ...anios]),
        makeRow(['Salario promedio diario', ...valores]),
      ],
    }

    graficas.push({
      titulo: `Salario Promedio Diario en ${name}`,
      tipo: 'bar',
      ubicacion,
      tablaDatos,
      unidadMedida: 'pesos',
      fuente: 'otra',
      fuentePersonalizada: 'IMSS',
      descripcionContexto: `Histórico del salario promedio diario de trabajadores registrados en el IMSS en ${name}.`,
    })
  }

  return graficas
}

// Section 2: Salary by economic activity per municipality
function parseSeccion2Actividad(data: (string | number | null)[][]): GeneratedGrafica[] {
  let headerIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row[1] && String(row[1]).toLowerCase().includes('sector económico')) {
      headerIdx = i
      break
    }
  }
  if (headerIdx === -1) return []

  const headerRow = data[headerIdx]
  if (!headerRow) return []

  // Find municipality columns
  const municipios: {name: string; colIdx: number}[] = []
  for (let c = 2; c < headerRow.length; c++) {
    const val = headerRow[c]
    if (val && typeof val === 'string' && val.trim() && MUNICIPIO_UBICACION[val.trim().toLowerCase()]) {
      municipios.push({name: val.trim(), colIdx: c})
    }
  }

  // Collect sectors
  const sectores: string[] = []
  const sectorRows: (string | number | null)[][] = []
  for (let i = headerIdx + 1; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[1]) break
    sectores.push(String(row[1]).trim())
    sectorRows.push(row)
  }

  const graficas: GeneratedGrafica[] = []

  for (const muni of municipios) {
    const valores = sectorRows.map((row) => row[muni.colIdx] ? round2(Number(row[muni.colIdx])) : '0')
    const name = displayName(muni.name)
    const ubicacion = MUNICIPIO_UBICACION[muni.name.toLowerCase()] || ['torreon']

    const tablaDatos: TableValue = {
      rows: [
        makeRow(['', ...sectores]),
        makeRow(['Salario promedio diario', ...valores]),
      ],
    }

    graficas.push({
      titulo: `Salario por Actividad Económica en ${name}`,
      tipo: 'horizontalBar',
      ubicacion,
      tablaDatos,
      unidadMedida: 'pesos',
      fuente: 'otra',
      fuentePersonalizada: 'IMSS',
      descripcionContexto: `Salario promedio diario por actividad económica en ${name}, diciembre 2025.`,
    })
  }

  return graficas
}

// Section 3: Salary by gender per municipality (paired columns)
function parseSeccion3Genero(data: (string | number | null)[][]): GeneratedGrafica[] {
  let sectionIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && c.includes('Género'))) {
      sectionIdx = i
      break
    }
  }
  if (sectionIdx === -1) return []

  // Municipality names row
  const muniRow = data[sectionIdx + 1]
  // Hombre/Mujer header row
  const genderRow = data[sectionIdx + 2]
  if (!muniRow || !genderRow) return []

  // Find municipality column pairs
  const muniBlocks: {name: string; colH: number; colM: number}[] = []
  for (let c = 2; c < muniRow.length; c++) {
    const val = muniRow[c]
    if (val && typeof val === 'string' && val.trim() && MUNICIPIO_UBICACION[val.trim().toLowerCase()]) {
      muniBlocks.push({name: val.trim(), colH: c, colM: c + 1})
    }
  }

  // Collect years
  const anios: string[] = []
  const dataRows: (string | number | null)[][] = []
  for (let i = sectionIdx + 3; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[1]) break
    const anio = String(row[1]).trim()
    if (!anio.match(/^\d{4}$/)) break
    anios.push(anio)
    dataRows.push(row)
  }

  const graficas: GeneratedGrafica[] = []

  for (const block of muniBlocks) {
    const hombres = dataRows.map((row) => row[block.colH] ? round2(Number(row[block.colH])) : '0')
    const mujeres = dataRows.map((row) => row[block.colM] ? round2(Number(row[block.colM])) : '0')

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
      titulo: `Salario Promedio Diario por Género en ${name}`,
      tipo: 'bar',
      ubicacion,
      tablaDatos,
      unidadMedida: 'pesos',
      fuente: 'otra',
      fuentePersonalizada: 'IMSS',
      descripcionContexto: `Salario promedio diario por género de trabajadores registrados en el IMSS en ${name}.`,
      colores: ['#3b82f6', '#d0005f'],
    })
  }

  return graficas
}
