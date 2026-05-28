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

// Header doble: fila de municipios y fila de Hombre/Mujer. Filas de años con proporciones.
export function parseJefaturaHogar(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []

  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  })

  // Fila de municipios: contiene >=2 nombres de municipio
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
  // Cada municipio: su columna (Hombre) y la siguiente (Mujer)
  const munis: {hombreCol: number; mujerCol: number; display: string; ubicacion: string}[] = []
  for (let c = 0; c < muniRow.length; c++) {
    const v = muniRow[c]
    if (typeof v === 'string') {
      const ub = ubicacionDe(v)
      if (ub) munis.push({hombreCol: c, mujerCol: c + 1, display: v.trim(), ubicacion: ub})
    }
  }
  if (munis.length === 0) return []

  // Años: filas después de la fila de Hombre/Mujer (muniRowIdx + 2)
  const anios: string[] = []
  const dataRows: (string | number | null)[][] = []
  for (let i = muniRowIdx + 2; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[0]) break
    const año = row[0]
    if (!String(año).match(/^\d{4}$/)) break
    anios.push(String(año))
    dataRows.push(row)
  }
  if (anios.length === 0) return []

  return munis.map((m) => {
    const hombres = dataRows.map((row) => toPercent(Number(row[m.hombreCol] || 0)))
    const mujeres = dataRows.map((row) => toPercent(Number(row[m.mujerCol] || 0)))
    return {
      titulo: `Jefatura del Hogar por Género en ${m.display}`,
      tipo: 'bar' as const,
      ubicacion: [m.ubicacion],
      tablaDatos: {
        rows: [makeRow(['', ...anios]), makeRow(['Hombre', ...hombres]), makeRow(['Mujer', ...mujeres])],
      },
      unidadMedida: 'porcentaje',
      fuente: 'inegi',
      descripcionContexto: `Distribución porcentual de la jefatura del hogar por género en ${m.display}, histórico censal.`,
      // Invertido respecto al default: Hombre azul, Mujer rosa
      colores: ['#3b82f6', '#d0005f'],
    }
  })
}
