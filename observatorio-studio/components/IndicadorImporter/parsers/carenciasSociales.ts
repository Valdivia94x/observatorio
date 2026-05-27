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
  return raw
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// Hoja "Carencias Sociales": bloques por municipio, header [Indicador, 2015, 2020],
// 10 indicadores → horizontalBar (indicadores en Y, 2 series: 2015 y 2020).
export function parseCarenciasSociales(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const sheet = workbook.Sheets['Carencias Sociales'] || workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []

  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  })

  const graficas: GeneratedGrafica[] = []

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (!row || typeof row[0] !== 'string') continue
    const m = row[0].trim().match(/^Municipio:\s*(.+)$/i)
    if (!m) continue
    const muniRaw = m[1].trim()
    const ub = ubicacionDe(muniRaw)
    if (!ub) continue

    const headerRow = data[i + 1]
    if (!headerRow) continue
    const anios: string[] = []
    for (let c = 1; c < headerRow.length; c++) {
      const v = headerRow[c]
      if (v && String(v).match(/^\d{4}$/)) anios.push(String(v))
    }
    if (anios.length === 0) continue

    // Indicadores (filas) y sus valores por año
    const indicadores: string[] = []
    const valoresPorAnio: string[][] = anios.map(() => [])
    for (let j = i + 2; j < data.length; j++) {
      const r = data[j]
      if (!r || !r[0]) break
      const ind = String(r[0]).trim()
      if (ind.toLowerCase().startsWith('municipio:') || ind.toLowerCase().startsWith('fuente')) break
      indicadores.push(ind)
      anios.forEach((_, k) => valoresPorAnio[k].push(toPercent(Number(r[k + 1] || 0))))
    }
    if (indicadores.length === 0) continue

    const tableRows: TableRow[] = [makeRow(['', ...indicadores])]
    anios.forEach((año, k) => tableRows.push(makeRow([año, ...valoresPorAnio[k]])))

    const display = displayMunicipio(muniRaw)
    graficas.push({
      titulo: `Carencias Sociales de la Población en ${display}`,
      tipo: 'horizontalBar',
      ubicacion: [ub],
      tablaDatos: {rows: tableRows},
      unidadMedida: 'porcentaje',
      fuente: 'coneval',
      descripcionContexto: `Carencias sociales de la población en ${display}, comparativo ${anios.join(' vs ')}.`,
    })
  }

  return graficas
}
