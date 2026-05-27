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

function findSection(data: (string | number | null)[][], marker: string): number {
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && c.includes(marker))) return i
  }
  return -1
}

// Sección con header de modos de transporte (col 0 vacía) y una fila por municipio.
function parseSeccion(
  data: (string | number | null)[][],
  marker: string,
  grupo: string,
): GeneratedGrafica[] {
  const sectionIdx = findSection(data, marker)
  if (sectionIdx === -1) return []

  // El header de modos está en la fila siguiente al marcador (col 0 vacía, resto strings)
  let headerIdx = -1
  for (let i = sectionIdx; i < Math.min(sectionIdx + 3, data.length); i++) {
    const row = data[i]
    if (!row) continue
    if ((row[0] === null || row[0] === '') && row.slice(1).filter((c) => typeof c === 'string' && c).length >= 2) {
      headerIdx = i
      break
    }
  }
  if (headerIdx === -1) return []

  const headerRow = data[headerIdx]
  const modos: {col: number; nombre: string}[] = []
  for (let c = 1; c < headerRow.length; c++) {
    const v = headerRow[c]
    if (typeof v === 'string' && v.trim()) modos.push({col: c, nombre: v.trim()})
  }
  if (modos.length === 0) return []

  const graficas: GeneratedGrafica[] = []
  for (let i = headerIdx + 1; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[0]) break
    const nombre = String(row[0]).trim()
    if (nombre.toLowerCase().startsWith('fuente') || nombre.toLowerCase().startsWith('nota')) break
    const ub = ubicacionDe(nombre)
    if (!ub) break

    const valores = modos.map((m) => toPercent(Number(row[m.col] || 0)))
    graficas.push({
      titulo: `Medio de Transporte de ${grupo} en ${nombre}`,
      tipo: 'bar',
      ubicacion: [ub],
      tablaDatos: {rows: [makeRow(['', ...modos.map((m) => m.nombre)]), makeRow([nombre, ...valores])]},
      unidadMedida: 'porcentaje',
      fuente: 'inegi',
      descripcionContexto: `Medio de transporte de ${grupo.toLowerCase()} en ${nombre}, Censo de Población y Vivienda 2020. La suma puede superar 100% por uso de más de un medio.`,
    })
  }

  return graficas
}

export function parseMovilidad(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []

  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  })

  const graficas: GeneratedGrafica[] = []
  graficas.push(...parseSeccion(data, 'transporte de los estudiantes', 'Estudiantes'))
  graficas.push(...parseSeccion(data, 'transporte de los trabajadores', 'Trabajadores'))
  return graficas
}
