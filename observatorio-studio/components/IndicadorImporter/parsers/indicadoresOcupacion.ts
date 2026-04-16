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

const ZML_UBICACION = ['torreon', 'gomez-palacio', 'lerdo', 'matamoros']

export function parseIndicadoresOcupacion(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []

  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  })

  const graficas: GeneratedGrafica[] = []

  graficas.push(...parseSeccion1PoblacionOcupada(data))
  graficas.push(...parseSeccion2Informalidad(data))
  graficas.push(...parseSeccion3Salarios(data))

  return graficas
}

// Build trimester labels from two rows (year row + quarter row)
function buildTrimLabels(yearRow: (string | number | null)[], quarterRow: (string | number | null)[], startCol: number): string[] {
  const labels: string[] = []
  for (let c = startCol; c < yearRow.length; c++) {
    const year = yearRow[c]
    const quarter = quarterRow[c]
    if (year && quarter) {
      labels.push(`${quarter} ${year}`)
    }
  }
  return labels
}

function parseSeccion1PoblacionOcupada(data: (string | number | null)[][]): GeneratedGrafica[] {
  let sectionIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && c.includes('Población Ocupada'))) {
      sectionIdx = i
      break
    }
  }
  if (sectionIdx === -1) return []

  const yearRow = data[sectionIdx + 1]
  const quarterRow = data[sectionIdx + 2]
  if (!yearRow || !quarterRow) return []

  const labels = buildTrimLabels(yearRow, quarterRow, 2)

  // Find Hombres and Mujeres rows (skip Total)
  const hombresRow = data[sectionIdx + 3]
  const mujeresRow = data[sectionIdx + 4]
  if (!hombresRow || !mujeresRow) return []

  const hombres = hombresRow.slice(2, 2 + labels.length).map((v) => Math.round(Number(v || 0)).toString())
  const mujeres = mujeresRow.slice(2, 2 + labels.length).map((v) => Math.round(Number(v || 0)).toString())

  const tablaDatos: TableValue = {
    rows: [
      makeRow(['', ...labels]),
      makeRow(['Hombres', ...hombres]),
      makeRow(['Mujeres', ...mujeres]),
    ],
  }

  return [{
    titulo: 'Población Ocupada por Género en la ZML',
    tipo: 'bar',
    ubicacion: ZML_UBICACION,
    tablaDatos,
    unidadMedida: 'habitantes',
    fuente: 'inegi',
    descripcionContexto: 'Población ocupada por género en la Zona Metropolitana de la Laguna por trimestre. Fuente: ENOE, INEGI.',
    colores: ['#3b82f6', '#d0005f'],
  }]
}

function parseSeccion2Informalidad(data: (string | number | null)[][]): GeneratedGrafica[] {
  let sectionIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && c.includes('Ocupación informal'))) {
      sectionIdx = i
      break
    }
  }
  if (sectionIdx === -1) return []

  const yearRow = data[sectionIdx + 1]
  const quarterRow = data[sectionIdx + 2]
  if (!yearRow || !quarterRow) return []

  const labels = buildTrimLabels(yearRow, quarterRow, 2)

  const informalesRow = data[sectionIdx + 3]
  const tasaRow = data[sectionIdx + 4]
  if (!informalesRow || !tasaRow) return []

  const informales = informalesRow.slice(2, 2 + labels.length).map((v) => Math.round(Number(v || 0)).toString())
  const tasa = tasaRow.slice(2, 2 + labels.length).map((v) => toPercent(Number(v || 0)))

  const tablaDatos: TableValue = {
    rows: [
      makeRow(['', ...labels]),
      makeRow(['Ocupados informales', ...informales]),
      makeRow(['Tasa de informalidad (%)', ...tasa]),
    ],
  }

  return [{
    titulo: 'Ocupación Informal en la ZML',
    tipo: 'bar',
    ubicacion: ZML_UBICACION,
    tablaDatos,
    unidadMedida: 'habitantes',
    fuente: 'inegi',
    descripcionContexto: 'Ocupados informales (barras) y tasa de informalidad (línea) en la ZML por trimestre. Fuente: ENOE, INEGI.',
    series: [
      {nombre: 'Ocupados informales', tipoSerie: 'bar', color: '#3b82f6'},
      {nombre: 'Tasa de informalidad (%)', tipoSerie: 'line', color: '#ef4444', ejeSecundario: true},
    ],
  }]
}

function parseSeccion3Salarios(data: (string | number | null)[][]): GeneratedGrafica[] {
  let sectionIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && c.includes('Rangos Salariales'))) {
      sectionIdx = i
      break
    }
  }
  if (sectionIdx === -1) return []

  // Header row with trimester labels
  const headerRow = data[sectionIdx + 1]
  if (!headerRow) return []

  // Find columns with trimester labels
  const trimCols: {label: string; colIdx: number}[] = []
  for (let c = 2; c < headerRow.length; c++) {
    const val = headerRow[c]
    if (val && typeof val === 'string' && val.includes('Trim')) {
      trimCols.push({label: val.trim(), colIdx: c})
    }
  }

  if (trimCols.length === 0) return []

  const categorias: string[] = []
  const seriesData = new Map<string, string[]>()
  for (const tc of trimCols) {
    seriesData.set(tc.label, [])
  }

  for (let i = sectionIdx + 2; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[1]) break

    const categoria = String(row[1]).trim()
    categorias.push(categoria)

    for (const tc of trimCols) {
      const val = row[tc.colIdx]
      seriesData.get(tc.label)!.push(toPercent(Number(val || 0)))
    }
  }

  if (categorias.length === 0) return []

  const tablaDatos: TableValue = {
    rows: [
      makeRow(['', ...categorias]),
      ...trimCols.map((tc) => makeRow([tc.label, ...seriesData.get(tc.label)!])),
    ],
  }

  return [{
    titulo: 'Rangos Salariales en la ZML',
    tipo: 'bar',
    ubicacion: ZML_UBICACION,
    tablaDatos,
    unidadMedida: 'porcentaje',
    fuente: 'inegi',
    descripcionContexto: 'Distribución porcentual de la población ocupada por rango salarial en la ZML. Fuente: ENOE, INEGI.',
  }]
}
