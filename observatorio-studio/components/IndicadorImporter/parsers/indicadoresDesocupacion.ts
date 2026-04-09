import {nanoid} from 'nanoid'
import * as XLSX from 'xlsx'
import type {GeneratedGrafica} from '../types'
import type {TableRow, TableValue} from '../../ExcelImporter/types'

function makeRow(cells: string[]): TableRow {
  return {_type: 'tableRow', _key: nanoid(), cells}
}

const ZML_UBICACION = ['torreon', 'gomez-palacio', 'lerdo', 'matamoros']

function buildTrimLabels(yearRow: (string | number | null)[], quarterRow: (string | number | null)[], startCol: number): string[] {
  const labels: string[] = []
  for (let c = startCol; c < yearRow.length; c++) {
    const year = yearRow[c]
    const quarter = quarterRow[c]
    if (year && quarter) {
      // Normalize quarter labels
      let q = String(quarter).trim()
      if (q.toLowerCase().startsWith('primer')) q = '1T'
      else if (q.toLowerCase().startsWith('segundo')) q = '2T'
      else if (q.toLowerCase().startsWith('tercer')) q = '3T'
      else if (q.toLowerCase().startsWith('cuarto')) q = '4T'
      labels.push(`${q} ${year}`)
    }
  }
  return labels
}

export function parseIndicadoresDesocupacion(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []

  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  })

  const graficas: GeneratedGrafica[] = []
  graficas.push(...parseSeccion1Desocupada(data))
  graficas.push(...parseSeccion2NivelInstruccion(data))
  return graficas
}

function parseSeccion1Desocupada(data: (string | number | null)[][]): GeneratedGrafica[] {
  let sectionIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && c.includes('Población Desocupada') && c.includes('ZML'))) {
      sectionIdx = i
      break
    }
  }
  if (sectionIdx === -1) return []

  const yearRow = data[sectionIdx + 1]
  const quarterRow = data[sectionIdx + 2]
  if (!yearRow || !quarterRow) return []

  const labels = buildTrimLabels(yearRow, quarterRow, 2)

  const desocupadaRow = data[sectionIdx + 3]
  const tasaRow = data[sectionIdx + 4]
  if (!desocupadaRow || !tasaRow) return []

  const desocupada = desocupadaRow.slice(2, 2 + labels.length).map((v) => Math.round(Number(v || 0)).toString())
  const tasa = tasaRow.slice(2, 2 + labels.length).map((v) => String(Number(v || 0)))

  const tablaDatos: TableValue = {
    rows: [
      makeRow(['', ...labels]),
      makeRow(['Población desocupada', ...desocupada]),
      makeRow(['Tasa de desempleo (%)', ...tasa]),
    ],
  }

  return [{
    titulo: 'Población Desocupada en la ZML',
    tipo: 'bar',
    ubicacion: ZML_UBICACION,
    tablaDatos,
    unidadMedida: 'habitantes',
    fuente: 'inegi',
    descripcionContexto: 'Población desocupada (barras) y tasa de desempleo (línea) en la ZML por trimestre. Fuente: ENOE, INEGI.',
    series: [
      {nombre: 'Población desocupada', tipoSerie: 'bar', color: '#3b82f6'},
      {nombre: 'Tasa de desempleo (%)', tipoSerie: 'line', color: '#ef4444', ejeSecundario: true},
    ],
  }]
}

function parseSeccion2NivelInstruccion(data: (string | number | null)[][]): GeneratedGrafica[] {
  let sectionIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && c.includes('Nivel de Instrucción'))) {
      sectionIdx = i
      break
    }
  }
  if (sectionIdx === -1) return []

  const yearRow = data[sectionIdx + 1]
  const quarterRow = data[sectionIdx + 2]
  if (!yearRow || !quarterRow) return []

  const labels = buildTrimLabels(yearRow, quarterRow, 2)

  const tableRows: TableRow[] = [makeRow(['', ...labels])]

  for (let i = sectionIdx + 3; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[1]) break

    const nombre = String(row[1]).trim()
    const valores = row.slice(2, 2 + labels.length).map((v) => Math.round(Number(v || 0)).toString())
    tableRows.push(makeRow([nombre, ...valores]))
  }

  if (tableRows.length <= 1) return []

  const tablaDatos: TableValue = {rows: tableRows}

  return [{
    titulo: 'Desocupados por Nivel de Instrucción en la ZML',
    tipo: 'bar',
    ubicacion: ZML_UBICACION,
    tablaDatos,
    unidadMedida: 'habitantes',
    fuente: 'inegi',
    descripcionContexto: 'Población desocupada por nivel de instrucción en la ZML por trimestre. Fuente: ENOE, INEGI.',
  }]
}
