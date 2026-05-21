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

function ubicacionDe(name: string): string | null {
  return MUNICIPIO_UBICACION[name.toLowerCase().trim()] ?? null
}

// Estructura: header con municipios en columnas, filas [año, ...valores]
export function parseSuicidiosRegistrados(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []

  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  })

  let headerIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (!row) continue
    const munis = row.filter((c) => typeof c === 'string' && ubicacionDe(c)).length
    if (munis >= 2) {
      headerIdx = i
      break
    }
  }
  if (headerIdx === -1) return []

  const headerRow = data[headerIdx]
  const muniCols: {col: number; display: string; ubicacion: string}[] = []
  for (let c = 0; c < headerRow.length; c++) {
    const val = headerRow[c]
    if (typeof val === 'string') {
      const ub = ubicacionDe(val)
      if (ub) muniCols.push({col: c, display: val.trim(), ubicacion: ub})
    }
  }
  if (muniCols.length === 0) return []

  const anios: string[] = []
  const valoresPorMuni: Record<number, string[]> = {}
  muniCols.forEach((m) => (valoresPorMuni[m.col] = []))

  for (let i = headerIdx + 1; i < data.length; i++) {
    const row = data[i]
    if (!row) continue
    const año = row[0]
    if (!año || !String(año).match(/^\d{4}$/)) {
      if (anios.length > 0) break
      continue
    }
    anios.push(String(año))
    for (const m of muniCols) {
      const v = row[m.col]
      valoresPorMuni[m.col].push(v === null || v === undefined || v === '' ? '' : Math.round(Number(v)).toString())
    }
  }
  if (anios.length === 0) return []

  return muniCols.map((m) => ({
    titulo: `Suicidios Registrados en ${m.display}`,
    tipo: 'bar' as const,
    ubicacion: [m.ubicacion],
    tablaDatos: {
      rows: [makeRow(['', ...anios]), makeRow([m.display, ...valoresPorMuni[m.col]])],
    },
    unidadMedida: 'unidades',
    fuente: 'otra',
    fuentePersonalizada: 'Fiscalías Estatales de Coahuila y Durango',
    descripcionContexto: `Suicidios registrados anualmente en ${m.display}.`,
  }))
}
