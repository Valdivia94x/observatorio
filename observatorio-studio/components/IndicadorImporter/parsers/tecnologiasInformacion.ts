import {nanoid} from 'nanoid'
import * as XLSX from 'xlsx'
import type {GeneratedGrafica} from '../types'
import type {TableRow} from '../../ExcelImporter/types'

function makeRow(cells: string[]): TableRow {
  return {_type: 'tableRow', _key: nanoid(), cells}
}

function toPercent(val: number): string {
  return parseFloat((val * 100).toFixed(2)).toString()
}

const MUNICIPIO_UBICACION: Record<string, string> = {
  matamoros: 'matamoros',
  torreón: 'torreon',
  torreon: 'torreon',
  'gómez palacio': 'gomez-palacio',
  'gomez palacio': 'gomez-palacio',
  lerdo: 'lerdo',
}

function ubicacionDe(name: string): string | null {
  return MUNICIPIO_UBICACION[name.toLowerCase().trim()] ?? null
}

// Header doble: municipios y años (2010, 2020). Filas = tecnologías con proporciones.
export function parseTecnologiasInformacion(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []

  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  })

  let muniRowIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (!row) continue
    const munis = row.filter((c) => typeof c === 'string' && ubicacionDe(c)).length
    if (munis >= 2) {
      muniRowIdx = i
      break
    }
  }
  if (muniRowIdx === -1) return []

  const muniRow = data[muniRowIdx]
  const yearRow = data[muniRowIdx + 1]
  if (!yearRow) return []

  // Cada municipio: columna inicial (primer año) y siguiente (segundo año)
  const munis: {col: number; display: string; ubicacion: string}[] = []
  for (let c = 0; c < muniRow.length; c++) {
    const v = muniRow[c]
    if (typeof v === 'string') {
      const ub = ubicacionDe(v)
      if (ub) munis.push({col: c, display: v.trim(), ubicacion: ub})
    }
  }
  if (munis.length === 0) return []

  // Tecnologías y sus valores
  const tecnologias: string[] = []
  const dataRows: (string | number | null)[][] = []
  for (let i = muniRowIdx + 2; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[0]) break
    const nombre = String(row[0]).trim()
    if (nombre.toLowerCase().startsWith('fuente')) break
    tecnologias.push(nombre)
    dataRows.push(row)
  }
  if (tecnologias.length === 0) return []

  return munis.map((m) => {
    const year1 = String(yearRow[m.col] ?? '2010')
    const year2 = String(yearRow[m.col + 1] ?? '2020')
    const serie1 = dataRows.map((row) => toPercent(Number(row[m.col] || 0)))
    const serie2 = dataRows.map((row) => toPercent(Number(row[m.col + 1] || 0)))
    return {
      titulo: `Tecnologías de la Información en las Viviendas de ${m.display}`,
      tipo: 'bar' as const,
      ubicacion: [m.ubicacion],
      tablaDatos: {
        rows: [makeRow(['', ...tecnologias]), makeRow([year1, ...serie1]), makeRow([year2, ...serie2])],
      },
      unidadMedida: 'porcentaje',
      fuente: 'inegi',
      descripcionContexto: `Porcentaje de viviendas con cada tecnología de la información en ${m.display}, comparativo ${year1} vs ${year2}.`,
    }
  })
}
