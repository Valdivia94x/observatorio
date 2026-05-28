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

// Estructura: fila de años (header), una fila por municipio con sus valores.
export function parseAccidentesTransito(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []

  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  })

  // Fila de años: varios valores de 4 dígitos, col 0 vacía
  let yearRowIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (!row) continue
    const years = row.slice(1).filter((v) => v && String(v).match(/^\d{4}$/)).length
    if (years >= 3 && (row[0] === null || row[0] === '')) {
      yearRowIdx = i
      break
    }
  }
  if (yearRowIdx === -1) return []

  const yearRow = data[yearRowIdx]
  const anios: string[] = []
  for (let c = 1; c < yearRow.length; c++) {
    const v = yearRow[c]
    if (v && String(v).match(/^\d{4}$/)) anios.push(String(v))
    else break
  }
  if (anios.length === 0) return []

  const graficas: GeneratedGrafica[] = []
  for (let i = yearRowIdx + 1; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[0]) continue
    const nombre = String(row[0]).trim()
    const ub = ubicacionDe(nombre)
    if (!ub) {
      if (graficas.length > 0) break
      continue
    }
    const valores = anios.map((_, idx) => {
      const v = row[idx + 1]
      return v === null || v === undefined || v === '' ? '' : Math.round(Number(v)).toString()
    })
    graficas.push({
      titulo: `Accidentes de Tránsito Registrados en ${nombre}`,
      tipo: 'bar',
      ubicacion: [ub],
      tablaDatos: {rows: [makeRow(['', ...anios]), makeRow([nombre, ...valores])]},
      unidadMedida: 'unidades',
      fuente: 'otra',
      fuentePersonalizada: 'INEGI, Accidentes de tránsito terrestre en zonas urbanas y suburbanas',
    })
  }

  return graficas
}
