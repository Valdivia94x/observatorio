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

function displayMunicipio(raw: string): string {
  // "MATAMOROS" → "Matamoros", "GÓMEZ PALACIO" → "Gómez Palacio"
  return raw
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// Hoja "Condiciones Sociales": bloques por municipio ("Municipio: X"), header [Categoría, años],
// 5 categorías → stackedBar (años en X, categorías apiladas).
export function parsePobrezaMultidimensional(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const sheet = workbook.Sheets['Condiciones Sociales'] || workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []

  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  })

  const graficas: GeneratedGrafica[] = []

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (!row || typeof row[0] !== 'string') continue
    const cell = row[0].trim()
    const m = cell.match(/^Municipio:\s*(.+)$/i)
    if (!m) continue
    const muniRaw = m[1].trim()
    const ub = ubicacionDe(muniRaw)
    if (!ub) continue

    // Header de años: fila siguiente [Categoría, 2010, 2015, 2020]
    const headerRow = data[i + 1]
    if (!headerRow) continue
    const anios: string[] = []
    for (let c = 1; c < headerRow.length; c++) {
      const v = headerRow[c]
      if (v && String(v).match(/^\d{4}$/)) anios.push(String(v))
    }
    if (anios.length === 0) continue

    // Categorías
    const tableRows: TableRow[] = [makeRow(['', ...anios])]
    for (let j = i + 2; j < data.length; j++) {
      const r = data[j]
      if (!r || !r[0]) break
      const cat = String(r[0]).trim()
      if (cat.toLowerCase().startsWith('municipio:') || cat.toLowerCase().startsWith('fuente')) break
      const valores = anios.map((_, k) => toPercent(Number(r[k + 1] || 0)))
      tableRows.push(makeRow([cat, ...valores]))
    }
    if (tableRows.length <= 1) continue

    const display = displayMunicipio(muniRaw)
    graficas.push({
      titulo: `Condiciones Sociales de la Población en ${display}`,
      tipo: 'stackedBar',
      ubicacion: [ub],
      tablaDatos: {rows: tableRows},
      unidadMedida: 'porcentaje',
      fuente: 'coneval',
      descripcionContexto: `Distribución de la población por condición de pobreza multidimensional en ${display}, histórico.`,
      ocultarValores: true,
    })
  }

  return graficas
}
