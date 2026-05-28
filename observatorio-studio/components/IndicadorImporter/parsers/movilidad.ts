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

function findSection(data: (string | number | null)[][], marker: string, from = 0): number {
  for (let i = from; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && c.includes(marker))) return i
  }
  return -1
}

// Lee la fuente y la nota (texto literal del documento) dentro del rango de filas dado.
function leerFuenteYNota(
  data: (string | number | null)[][],
  start: number,
  end: number,
): {fuente: string; nota: string} {
  let fuente = ''
  let nota = ''
  for (let i = start; i < end; i++) {
    const c0 = data[i]?.[0]
    if (typeof c0 !== 'string') continue
    const t = c0.trim()
    if (/^fuente:/i.test(t)) fuente = t.replace(/^fuente:\s*/i, '').trim()
    else if (/^nota:/i.test(t)) nota = t.replace(/^nota:\s*/i, '').trim()
  }
  return {fuente, nota}
}

function parseSeccion(
  data: (string | number | null)[][],
  marker: string,
  grupo: string,
  end: number,
): GeneratedGrafica[] {
  const sectionIdx = findSection(data, marker)
  if (sectionIdx === -1) return []

  // Header de modos: fila con col 0 vacía y >=2 strings
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

  // Fuente y nota literales del documento dentro de esta sección
  const {fuente, nota} = leerFuenteYNota(data, headerIdx + 1, end)
  const descripcion = [`Medio de transporte de ${grupo.toLowerCase()}.`, nota ? `Nota: ${nota}` : '']
    .filter(Boolean)
    .join(' ')

  const graficas: GeneratedGrafica[] = []
  for (let i = headerIdx + 1; i < end; i++) {
    const row = data[i]
    if (!row || !row[0]) break
    const nombre = String(row[0]).trim()
    if (/^fuente:/i.test(nombre) || /^nota:/i.test(nombre)) break
    const ub = ubicacionDe(nombre)
    if (!ub) break

    const valores = modos.map((m) => toPercent(Number(row[m.col] || 0)))
    graficas.push({
      titulo: `Medio de Transporte de ${grupo} en ${nombre}`,
      tipo: 'bar',
      ubicacion: [ub],
      tablaDatos: {rows: [makeRow(['', ...modos.map((m) => m.nombre)]), makeRow([nombre, ...valores])]},
      unidadMedida: 'porcentaje',
      // La fuente del documento ("INEGI, Censo de Población y Vivienda 2020") no es una predeterminada → Otra
      fuente: 'otra',
      fuentePersonalizada: fuente || 'INEGI, Censo de Población y Vivienda 2020',
      descripcionContexto: descripcion,
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

  // Límites de cada sección para acotar la búsqueda de fuente/nota
  const estudiantesIdx = findSection(data, 'transporte de los estudiantes')
  const trabajadoresIdx = findSection(data, 'transporte de los trabajadores')

  const graficas: GeneratedGrafica[] = []
  graficas.push(
    ...parseSeccion(
      data,
      'transporte de los estudiantes',
      'Estudiantes',
      trabajadoresIdx > estudiantesIdx ? trabajadoresIdx : data.length,
    ),
  )
  graficas.push(...parseSeccion(data, 'transporte de los trabajadores', 'Trabajadores', data.length))
  return graficas
}
