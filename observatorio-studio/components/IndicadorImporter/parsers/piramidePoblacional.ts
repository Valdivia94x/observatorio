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

// Header doble: fila de municipios y fila de Hombre/Mujer. Filas = grupos de edad.
// Genera una pirámide poblacional por municipio (grupos de edad en Y, Hombre/Mujer divergentes).
export function parsePiramidePoblacional(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []

  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  })

  // Fila de municipios (>=2 nombres reconocidos)
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
  // Cada municipio: columna Hombre (la suya) y Mujer (siguiente)
  const munis: {hombreCol: number; mujerCol: number; display: string; ubicacion: string}[] = []
  for (let c = 0; c < muniRow.length; c++) {
    const v = muniRow[c]
    if (typeof v === 'string') {
      const ub = ubicacionDe(v)
      if (ub) munis.push({hombreCol: c, mujerCol: c + 1, display: v.trim(), ubicacion: ub})
    }
  }
  if (munis.length === 0) return []

  // Grupos de edad: filas después de la de Hombre/Mujer (muniRowIdx + 2)
  const grupos: string[] = []
  const dataRows: (string | number | null)[][] = []
  for (let i = muniRowIdx + 2; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[0]) break
    const g = String(row[0]).trim()
    if (g.toLowerCase().startsWith('fuente')) break
    grupos.push(g)
    dataRows.push(row)
  }
  if (grupos.length === 0) return []

  return munis.map((m) => {
    const hombres = dataRows.map((row) => Math.round(Number(row[m.hombreCol] || 0)).toString())
    const mujeres = dataRows.map((row) => Math.round(Number(row[m.mujerCol] || 0)).toString())
    return {
      titulo: `Pirámide Poblacional de ${m.display}`,
      tipo: 'pyramid' as const,
      ubicacion: [m.ubicacion],
      tablaDatos: {
        rows: [makeRow(['', ...grupos]), makeRow(['Hombre', ...hombres]), makeRow(['Mujer', ...mujeres])],
      },
      unidadMedida: 'habitantes',
      fuente: 'inegi',
      descripcionContexto: `Distribución de la población de ${m.display} por grupo de edad y sexo. Censo de Población y Vivienda 2020.`,
      // Hombre (izquierda) azul, Mujer (derecha) rosa
      colores: ['#3b82f6', '#ec4899'],
      ocultarValores: true,
    }
  })
}
