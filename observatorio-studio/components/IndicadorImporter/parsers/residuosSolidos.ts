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

// Header con municipios en columnas, filas [año, ...valores]. Una gráfica de barras por municipio.
export function parseResiduosSolidos(workbook: XLSX.WorkBook): GeneratedGrafica[] {
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
    if (row.filter((c) => typeof c === 'string' && ubicacionDe(c)).length >= 2) {
      headerIdx = i
      break
    }
  }
  if (headerIdx === -1) return []

  const headerRow = data[headerIdx]
  const muniCols: {col: number; display: string; ubicacion: string}[] = []
  for (let c = 0; c < headerRow.length; c++) {
    const v = headerRow[c]
    if (typeof v === 'string') {
      const ub = ubicacionDe(v)
      if (ub) muniCols.push({col: c, display: v.trim(), ubicacion: ub})
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
    if (!año || !String(año).match(/^\d{4}$/)) break
    anios.push(String(año))
    for (const m of muniCols) {
      const v = row[m.col]
      valoresPorMuni[m.col].push(
        v === null || v === undefined || v === '' ? '' : Math.round(Number(v)).toString(),
      )
    }
  }
  if (anios.length === 0) return []

  return muniCols.map((m) => ({
    titulo: `Residuos Sólidos Urbanos Recolectados en ${m.display}`,
    tipo: 'bar' as const,
    ubicacion: [m.ubicacion],
    tablaDatos: {rows: [makeRow(['', ...anios]), makeRow([m.display, ...valoresPorMuni[m.col]])]},
    unidadMedida: 'toneladas',
    fuente: 'inegi',
    descripcionContexto: `Promedio anual de residuos sólidos urbanos recolectados en ${m.display}, en toneladas. Censo Nacional de Gobiernos Municipales y Delegacionales.`,
  }))
}
