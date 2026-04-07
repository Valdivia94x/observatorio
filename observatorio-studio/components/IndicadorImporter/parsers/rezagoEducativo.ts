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

// Map municipality names to ubicacion slugs
const MUNICIPIO_UBICACION: Record<string, string> = {
  torreón: 'torreon',
  'gómez palacio': 'gomez-palacio',
  lerdo: 'lerdo',
  matamoros: 'matamoros',
}

function resolveUbicacion(municipio: string): string[] {
  const slug = MUNICIPIO_UBICACION[municipio.toLowerCase().trim()]
  return slug ? [slug] : []
}

export function parseRezagoEducativo(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const graficas: GeneratedGrafica[] = []

  // === HOJA 1: Datos Metropolitanos ===
  const sheetMetro = workbook.Sheets['Datos Metropolitanos']
  if (sheetMetro) {
    graficas.push(...parseDatosMetropolitanos(sheetMetro))
  }

  // === HOJA 2: Ranking Estatales ===
  const sheetRanking = workbook.Sheets['Ranking Estatales']
  if (sheetRanking) {
    graficas.push(...parseRankingEstatales(sheetRanking))
  }

  return graficas
}

function parseDatosMetropolitanos(sheet: XLSX.Sheet): GeneratedGrafica[] {
  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  })

  // Find the header row (contains "Analfabetas")
  let headerRowIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((cell) => typeof cell === 'string' && cell.includes('Analfabetas'))) {
      headerRowIdx = i
      break
    }
  }

  if (headerRowIdx === -1) return []

  // Data rows start after header
  const categorias = ['Analfabetas', 'Sin primaria terminada', 'Sin secundaria terminada', 'Rezago total']

  // Find column indices for absolute values (the column before each '%' column)
  const headerRow = data[headerRowIdx] as (string | null)[]
  const absColIndices: number[] = []
  for (let c = 0; c < headerRow.length; c++) {
    if (headerRow[c] === '%' && c > 0) absColIndices.push(c - 1)
  }

  // Find the municipio column (first string column in data rows)
  const sampleRow = data[headerRowIdx + 1] as (string | number | null)[]
  let municipioCol = 0
  if (sampleRow) {
    for (let c = 0; c < sampleRow.length; c++) {
      if (typeof sampleRow[c] === 'string') {
        municipioCol = c
        break
      }
    }
  }

  const graficas: GeneratedGrafica[] = []

  for (let i = headerRowIdx + 1; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[municipioCol]) continue // Skip empty rows
    if (typeof row[municipioCol] !== 'string') continue // Skip non-string first cells

    const municipio = String(row[municipioCol]).trim()
    const ubicacion = resolveUbicacion(municipio)

    const valores = absColIndices.map((colIdx) => {
      const val = row[colIdx]
      if (val === null || val === undefined) return '0'
      return Math.round(Number(val)).toString()
    })

    const tablaDatos: TableValue = {
      rows: [
        makeRow(['', ...categorias]),
        makeRow([municipio, ...valores]),
      ],
    }

    graficas.push({
      titulo: `Rezago Educativo en ${municipio}`,
      tipo: 'bar',
      ubicacion: ubicacion.length > 0 ? ubicacion : ['torreon'],
      tablaDatos,
      unidadMedida: 'habitantes',
      fuente: 'otra',
      fuentePersonalizada: 'Instituto Nacional para la Educación de los Adultos',
      descripcionContexto: `Población de 15 años y más en rezago educativo en ${municipio}`,
    })
  }

  return graficas
}

function parseRankingEstatales(sheet: XLSX.Sheet): GeneratedGrafica[] {
  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  })

  const graficas: GeneratedGrafica[] = []

  // Parse Coahuila (columns B=1, C=2) and Durango (columns G=6, H=7)
  const configs = [
    {
      nameCol: 1,
      valueCol: 2,
      estado: 'Coahuila',
      ubicacion: ['estatal-coahuila'],
      stateRowMarker: 'Estado de Coahuila',
    },
    {
      nameCol: 6,
      valueCol: 7,
      estado: 'Durango',
      ubicacion: ['estatal-durango'],
      stateRowMarker: 'Estado de Durango',
    },
  ]

  // Find the data start row (first row where col A has number 1)
  let dataStartRow = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row[0] === 1) {
      dataStartRow = i
      break
    }
  }

  if (dataStartRow === -1) return graficas

  for (const config of configs) {
    const municipios: string[] = []
    const valores: string[] = []

    for (let i = dataStartRow; i < data.length; i++) {
      const row = data[i]
      if (!row) continue

      const name = row[config.nameCol]
      const value = row[config.valueCol]

      if (!name || value === null || value === undefined) continue

      const nameStr = String(name).trim()

      // Skip the state total row
      if (nameStr.toLowerCase().includes('estado de')) continue

      municipios.push(nameStr)
      valores.push(round2(Number(value)))
    }

    if (municipios.length === 0) continue

    const tablaDatos: TableValue = {
      rows: [
        makeRow(['', ...municipios]),
        makeRow(['% Rezago Educativo', ...valores]),
      ],
    }

    graficas.push({
      titulo: `Ranking de Rezago Educativo en ${config.estado}`,
      tipo: 'horizontalBar',
      ubicacion: config.ubicacion,
      tablaDatos,
      unidadMedida: 'porcentaje',
      fuente: 'otra',
      fuentePersonalizada: 'Instituto Nacional para la Educación de los Adultos',
      descripcionContexto: `Ranking de municipios de ${config.estado} por porcentaje de población de 15 años y más en rezago educativo`,
    })
  }

  return graficas
}
