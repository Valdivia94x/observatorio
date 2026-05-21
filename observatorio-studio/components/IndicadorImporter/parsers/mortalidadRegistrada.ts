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

interface MuniCol {
  col: number
  display: string
  ubicacion: string
}

function findSection(data: (string | number | null)[][], marker: string): number {
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && c.includes(marker))) return i
  }
  return -1
}

function readMuniCols(headerRow: (string | number | null)[]): MuniCol[] {
  const cols: MuniCol[] = []
  for (let c = 0; c < headerRow.length; c++) {
    const val = headerRow[c]
    if (typeof val === 'string') {
      const ub = ubicacionDe(val)
      if (ub) cols.push({col: c, display: val.trim(), ubicacion: ub})
    }
  }
  return cols
}

export function parseMortalidadRegistrada(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []

  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  })

  const graficas: GeneratedGrafica[] = []
  graficas.push(...parsePorAnio(data))
  graficas.push(...parseCausas(data))
  return graficas
}

// Sección 1: barras por año (años × municipios)
function parsePorAnio(data: (string | number | null)[][]): GeneratedGrafica[] {
  const sectionIdx = findSection(data, 'Mortalidad registrada')
  if (sectionIdx === -1) return []

  const headerRow = data[sectionIdx + 1]
  if (!headerRow) return []
  const muniCols = readMuniCols(headerRow)
  if (muniCols.length === 0) return []

  const anios: string[] = []
  const valores: Record<number, string[]> = {}
  muniCols.forEach((m) => (valores[m.col] = []))

  for (let i = sectionIdx + 2; i < data.length; i++) {
    const row = data[i]
    if (!row) continue
    const año = row[0]
    if (!año || !String(año).match(/^\d{4}$/)) break
    anios.push(String(año))
    for (const m of muniCols) {
      const v = row[m.col]
      valores[m.col].push(v === null || v === undefined || v === '' ? '' : Math.round(Number(v)).toString())
    }
  }
  if (anios.length === 0) return []

  return muniCols.map((m) => ({
    titulo: `Mortalidad Registrada en ${m.display}`,
    tipo: 'bar' as const,
    ubicacion: [m.ubicacion],
    tablaDatos: {rows: [makeRow(['', ...anios]), makeRow([m.display, ...valores[m.col]])]},
    unidadMedida: 'unidades',
    fuente: 'inegi',
    descripcionContexto: `Defunciones registradas anualmente en ${m.display}.`,
  }))
}

// Sección 2: principales causas 2024 (barras laterales / horizontalBar), causas × municipios
function parseCausas(data: (string | number | null)[][]): GeneratedGrafica[] {
  const sectionIdx = findSection(data, 'Principales causas')
  if (sectionIdx === -1) return []

  const headerRow = data[sectionIdx + 1]
  if (!headerRow) return []
  const muniCols = readMuniCols(headerRow)
  if (muniCols.length === 0) return []

  const causas: string[] = []
  const valores: Record<number, string[]> = {}
  muniCols.forEach((m) => (valores[m.col] = []))

  for (let i = sectionIdx + 2; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[0]) break
    const causa = String(row[0]).trim()
    if (!causa || causa.toLowerCase().startsWith('fuente')) break
    causas.push(causa)
    for (const m of muniCols) {
      const v = row[m.col]
      valores[m.col].push(v === null || v === undefined || v === '' ? '0' : Math.round(Number(v)).toString())
    }
  }
  if (causas.length === 0) return []

  return muniCols.map((m) => ({
    titulo: `Principales Causas de Mortalidad en ${m.display} (2024)`,
    tipo: 'horizontalBar' as const,
    ubicacion: [m.ubicacion],
    tablaDatos: {rows: [makeRow(['', ...causas]), makeRow([m.display, ...valores[m.col]])]},
    unidadMedida: 'unidades',
    fuente: 'inegi',
    descripcionContexto: `Principales causas de mortalidad registradas en ${m.display} durante 2024.`,
  }))
}
