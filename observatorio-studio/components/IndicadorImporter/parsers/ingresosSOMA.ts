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

export function parseIngresosSOMA(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const graficas: GeneratedGrafica[] = []

  for (const sheetName of workbook.SheetNames) {
    const muni = normalizeMunicipio(sheetName)
    if (!muni) continue

    const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: null,
    })

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
    if (yearRowIdx === -1) continue

    const yearRow = data[yearRowIdx]
    const anios: string[] = []
    for (let c = 1; c < yearRow.length; c++) {
      const val = yearRow[c]
      if (val && String(val).match(/^\d{4}$/)) anios.push(String(val))
      else break
    }
    if (anios.length === 0) continue

    const dataRow = data[yearRowIdx + 1]
    if (!dataRow || !dataRow[0]) continue
    const nombre = String(dataRow[0]).trim()
    const valores = anios.map((_, idx) => Math.round(Number(dataRow[idx + 1] || 0)).toString())

    const tableRows: TableRow[] = [
      makeRow(['', ...anios]),
      makeRow([nombre, ...valores]),
    ]

    graficas.push({
      titulo: `Ingresos del Sistema Operador de Agua en ${muni.display}`,
      tipo: 'bar',
      ubicacion: [muni.ubicacion],
      tablaDatos: {rows: tableRows},
      unidadMedida: 'pesos',
      fuente: 'municipal',
      descripcionContexto: `Ingresos totales del Sistema Operador de Agua de ${muni.display}, montos anuales en pesos. Fuente: Transparencia Municipal del Ayuntamiento de ${muni.display}.`,
    })
  }

  return graficas
}
