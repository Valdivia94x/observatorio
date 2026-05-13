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

export function parseRecaudacionPredial(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []

  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  })

  const graficas: GeneratedGrafica[] = []

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[0]) continue
    const cell = String(row[0]).trim()
    const muni = normalizeMunicipio(cell)
    if (!muni) continue

    // Next row should be the year header
    const yearRow = data[i + 1]
    if (!yearRow) continue
    const anios: string[] = []
    for (let c = 1; c < yearRow.length; c++) {
      const val = yearRow[c]
      if (val && String(val).match(/^\d{4}$/)) anios.push(String(val))
      else break
    }
    if (anios.length === 0) continue

    const cuentasRow = data[i + 2]
    const recaudacionRow = data[i + 3]
    if (!cuentasRow || !recaudacionRow) continue

    const cuentasValues = anios.map((_, idx) =>
      Math.round(Number(cuentasRow[idx + 1] || 0)).toString(),
    )
    const recaudacionValues = anios.map((_, idx) =>
      Math.round(Number(recaudacionRow[idx + 1] || 0)).toString(),
    )

    const tableRows: TableRow[] = [
      makeRow(['', ...anios]),
      makeRow(['Recaudación de predial', ...recaudacionValues]),
      makeRow(['Cuentas pagadas', ...cuentasValues]),
    ]

    graficas.push({
      titulo: `Recaudación del Impuesto Predial en ${muni.display}`,
      tipo: 'bar',
      ubicacion: [muni.ubicacion],
      tablaDatos: {rows: tableRows},
      unidadMedida: 'pesos',
      fuente: 'shcp',
      descripcionContexto: `Recaudación anual del impuesto predial y número de cuentas pagadas en ${muni.display}. Fuente: Secretaría de Hacienda y Crédito Público con información de los Ayuntamientos.`,
      series: [
        {nombre: 'Recaudación de predial', tipoSerie: 'bar', color: '#3b82f6'},
        {nombre: 'Cuentas pagadas', tipoSerie: 'line', color: '#ef4444', ejeSecundario: true},
      ],
    })
  }

  return graficas
}
