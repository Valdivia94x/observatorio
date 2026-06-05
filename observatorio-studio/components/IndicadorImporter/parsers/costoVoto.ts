import {nanoid} from 'nanoid'
import * as XLSX from 'xlsx'
import type {GeneratedGrafica} from '../types'
import type {TableRow} from '../../ExcelImporter/types'

function makeRow(cells: string[]): TableRow {
  return {_type: 'tableRow', _key: nanoid(), cells}
}

function round0(n: number): string {
  return Math.round(n).toString()
}

function round2(n: number): string {
  return parseFloat(n.toFixed(2)).toString()
}

// Tabla: Partido Político / Financiamiento / Votos / Costo por Voto.
function parseTabla(
  data: (string | number | null)[][],
  estado: 'Coahuila' | 'Durango',
  ubicacion: string,
  fuente: string,
): GeneratedGrafica | null {
  // Localiza el marcador del estado
  let markerIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && c.includes('Costo del voto') && c.includes(estado))) {
      markerIdx = i
      break
    }
  }
  if (markerIdx === -1) return null

  // Header [Partido Político, Financiamiento ..., Votos, Costo por Voto] tras el marcador.
  // Empieza después del marcador y exige coincidencia exacta (la fila del marcador también
  // contiene "Partido", por eso no sirve includes()).
  let headerIdx = -1
  for (let i = markerIdx + 1; i < Math.min(markerIdx + 5, data.length); i++) {
    const row = data[i]
    if (row && typeof row[0] === 'string' && row[0].trim() === 'Partido Político') {
      headerIdx = i
      break
    }
  }
  if (headerIdx === -1) return null

  const tableRows: TableRow[] = [makeRow(['Partido Político', 'Financiamiento (pesos)', 'Votos', 'Costo por voto (pesos)'])]
  for (let i = headerIdx + 1; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[0]) break
    const partido = String(row[0]).trim()
    if (partido.toLowerCase().startsWith('fuente')) break
    const esTotal = partido.toUpperCase() === 'TOTAL'
    const label = esTotal ? 'Total estatal' : partido
    tableRows.push(
      makeRow([label, round0(Number(row[1] || 0)), round0(Number(row[2] || 0)), round2(Number(row[3] || 0))]),
    )
    if (esTotal) break
  }
  if (tableRows.length <= 1) return null

  return {
    titulo: `Costo del Voto por Partido Político en ${estado}`,
    tipo: 'table',
    ubicacion: [ubicacion],
    tablaDatos: {rows: tableRows},
    unidadMedida: 'unidades',
    fuente: 'otra',
    fuentePersonalizada: fuente,
    descripcionContexto: `Financiamiento, votos obtenidos y costo por voto de cada partido político en ${estado}.`,
  }
}

export function parseCostoVoto(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []
  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: null})

  const graficas: GeneratedGrafica[] = []
  const coah = parseTabla(data, 'Coahuila', 'estatal-coahuila', 'IEC, Estadísticas del proceso electoral 2024')
  if (coah) graficas.push(coah)
  const dgo = parseTabla(data, 'Durango', 'estatal-durango', 'IEPC, Estadísticas del proceso electoral 2025')
  if (dgo) graficas.push(dgo)
  return graficas
}
