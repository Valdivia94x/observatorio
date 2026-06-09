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

// Hoja "Histórico años promedio de escolaridad (Barras x cada municipio)":
// fila de años + una fila por municipio. Genera una barra por municipio sobre los años.
export function parseAniosEscolaridadHistorico(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  // Buscar la hoja que contiene el histórico
  let data: (string | number | null)[][] | null = null
  for (const sn of workbook.SheetNames) {
    const d: (string | number | null)[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sn], {header: 1, defval: null})
    if (d.some((row) => row && row.some((c) => typeof c === 'string' && c.includes('Histórico') && c.toLowerCase().includes('escolaridad')))) {
      data = d
      break
    }
  }
  if (!data) return []

  // Fila de años (>=2 valores de 4 dígitos)
  let yearRowIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (!row) continue
    if (row.filter((c) => c && String(c).match(/^\d{4}$/)).length >= 2) {
      yearRowIdx = i
      break
    }
  }
  if (yearRowIdx === -1) return []

  const yearRow = data[yearRowIdx]
  const yearCols: number[] = []
  const anios: string[] = []
  for (let c = 0; c < yearRow.length; c++) {
    const v = yearRow[c]
    if (v && String(v).match(/^\d{4}$/)) {
      yearCols.push(c)
      anios.push(String(v))
    }
  }
  if (anios.length === 0) return []

  // Columna del nombre del municipio: la columna no-año anterior a la primera columna de año
  const nameCol = yearCols[0] - 1

  const graficas: GeneratedGrafica[] = []
  for (let i = yearRowIdx + 1; i < data.length; i++) {
    const row = data[i]
    if (!row) continue
    const nombre = row[nameCol]
    if (typeof nombre !== 'string') continue
    const ub = ubicacionDe(nombre)
    if (!ub) continue

    const valores = yearCols.map((c) => {
      const v = row[c]
      return v === null || v === undefined || v === '' ? '' : String(v)
    })

    graficas.push({
      titulo: `Histórico de Años Promedio de Escolaridad en ${nombre.trim()}`,
      tipo: 'bar',
      ubicacion: [ub],
      tablaDatos: {rows: [makeRow(['', ...anios]), makeRow(['Años promedio', ...valores])]},
      unidadMedida: 'otro',
      unidadMedidaPersonalizada: 'Años promedio',
      fuente: 'inegi',
      descripcionContexto: `Evolución de los años promedio de escolaridad en ${nombre.trim()}. Fuente: INEGI, Censo de Población y Vivienda 2020.`,
    })
  }

  return graficas
}
