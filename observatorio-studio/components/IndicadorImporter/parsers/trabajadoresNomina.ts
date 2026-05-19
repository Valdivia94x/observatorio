import {nanoid} from 'nanoid'
import * as XLSX from 'xlsx'
import type {GeneratedGrafica} from '../types'
import type {TableRow} from '../../ExcelImporter/types'

function makeRow(cells: string[]): TableRow {
  return {_type: 'tableRow', _key: nanoid(), cells}
}

const MUNICIPIO_UBICACION: Record<string, string> = {
  matamoros: 'matamoros',
  torreón: 'torreon',
  torreon: 'torreon',
  'gómez palacio': 'gomez-palacio',
  'gomez palacio': 'gomez-palacio',
  lerdo: 'lerdo',
}

function normalizeMunicipio(name: string): {ubicacion: string; display: string} | null {
  const key = name.toLowerCase().trim()
  const ubicacion = MUNICIPIO_UBICACION[key]
  if (!ubicacion) return null
  return {ubicacion, display: name.trim()}
}

export function parseTrabajadoresNomina(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []

  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  })

  // Locate the year row
  let yearRowIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (!row) continue
    const hasYears = row.slice(1).filter((v) => v && String(v).match(/^\d{4}$/)).length >= 3
    if (hasYears && (row[0] === null || row[0] === '')) {
      yearRowIdx = i
      break
    }
  }
  if (yearRowIdx === -1) return []

  const yearRow = data[yearRowIdx]
  const anios: string[] = []
  for (let c = 1; c < yearRow.length; c++) {
    const val = yearRow[c]
    if (val && String(val).match(/^\d{4}$/)) anios.push(String(val))
    else break
  }
  if (anios.length === 0) return []

  // One chart per municipio
  const graficas: GeneratedGrafica[] = []

  for (let i = yearRowIdx + 1; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[0]) break
    const nombre = String(row[0]).trim()
    const muni = normalizeMunicipio(nombre)
    if (!muni) break

    const valores = anios.map((_, idx) => {
      const v = row[idx + 1]
      if (v === 'ND' || v === null || v === undefined || v === '') return ''
      return Math.round(Number(v)).toString()
    })

    const tableRows: TableRow[] = [
      makeRow(['', ...anios]),
      makeRow([muni.display, ...valores]),
    ]

    graficas.push({
      titulo: `Trabajadores Registrados en la Nómina en ${muni.display}`,
      tipo: 'bar',
      ubicacion: [muni.ubicacion],
      tablaDatos: {rows: tableRows},
      unidadMedida: 'unidades',
      fuente: 'inegi',
      descripcionContexto: `Número de trabajadores registrados en la nómina del ayuntamiento de ${muni.display}.`,
    })
  }

  return graficas
}
