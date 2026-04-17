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

export function parseInflacion(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []

  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  })

  const graficas: GeneratedGrafica[] = []
  graficas.push(...parseSeccion1Anual(data))
  graficas.push(...parseSeccion2Componentes(data))
  return graficas
}

// Section 1: Annual inflation lines (ZML vs Nacional)
function parseSeccion1Anual(data: (string | number | null)[][]): GeneratedGrafica[] {
  let sectionIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && c.includes('Inflación anual') && c.toLowerCase().includes('linea'))) {
      sectionIdx = i
      break
    }
  }
  if (sectionIdx === -1) return []

  // Header row with ZML, Nacional
  const headerRow = data[sectionIdx + 1]
  if (!headerRow) return []

  const meses: string[] = []
  const zmlVals: string[] = []
  const nacVals: string[] = []

  for (let i = sectionIdx + 2; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[1]) break

    const mes = String(row[0]).trim()
    if (!mes) break

    meses.push(mes)
    zmlVals.push(toPercent(Number(row[1] || 0)))
    nacVals.push(toPercent(Number(row[2] || 0)))
  }

  if (meses.length === 0) return []

  const tablaDatos: TableValue = {
    rows: [
      makeRow(['', ...meses]),
      makeRow(['ZML', ...zmlVals]),
      makeRow(['Nacional', ...nacVals]),
    ],
  }

  return [{
    titulo: 'Inflación Anual: ZML vs Nacional',
    tipo: 'line',
    ubicacion: ZML_UBICACION,
    tablaDatos,
    unidadMedida: 'porcentaje',
    fuente: 'inegi',
    descripcionContexto: 'Inflación anual comparativa entre la ZML y el promedio nacional. Fuente: INEGI, INPC.',
  }]
}

// Section 2: Inflation by component (horizontal bars)
function parseSeccion2Componentes(data: (string | number | null)[][]): GeneratedGrafica[] {
  let sectionIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && c.includes('componente'))) {
      sectionIdx = i
      break
    }
  }
  if (sectionIdx === -1) return []

  // Find header row with "Componentes"
  let headerIdx = -1
  for (let i = sectionIdx; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && c.includes('Componentes'))) {
      headerIdx = i
      break
    }
  }
  if (headerIdx === -1) return []

  const componentes: string[] = []
  const zmlVals: string[] = []
  const nacVals: string[] = []

  for (let i = headerIdx + 1; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[0]) break

    const nombre = String(row[0]).trim()
    if (!nombre || nombre.toLowerCase().includes('fuente')) break

    componentes.push(nombre)
    zmlVals.push(toPercent(Number(row[1] || 0)))
    nacVals.push(toPercent(Number(row[2] || 0)))
  }

  if (componentes.length === 0) return []

  const tablaDatos: TableValue = {
    rows: [
      makeRow(['', ...componentes]),
      makeRow(['ZML', ...zmlVals]),
      makeRow(['Nacional', ...nacVals]),
    ],
  }

  return [{
    titulo: 'Inflación por Componente: ZML vs Nacional',
    tipo: 'horizontalBar',
    ubicacion: ZML_UBICACION,
    tablaDatos,
    unidadMedida: 'porcentaje',
    fuente: 'inegi',
    descripcionContexto: 'Inflación anual por componente del INPC, comparativo ZML vs Nacional. Fuente: INEGI, INPC.',
  }]
}
