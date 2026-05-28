import {nanoid} from 'nanoid'
import * as XLSX from 'xlsx'
import type {GeneratedGrafica} from '../types'
import type {TableRow} from '../../ExcelImporter/types'

function makeRow(cells: string[]): TableRow {
  return {_type: 'tableRow', _key: nanoid(), cells}
}

function round2(n: number): string {
  return parseFloat(n.toFixed(2)).toString()
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

interface Seccion {
  anios: string[]
  porMuni: Record<string, {display: string; valores: number[]}>
}

function leerSeccion(data: (string | number | null)[][], marker: string): Seccion | null {
  let idx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && c.includes(marker))) {
      idx = i
      break
    }
  }
  if (idx === -1) return null

  const yearRow = data[idx + 1]
  if (!yearRow) return null
  const anios: string[] = []
  for (let c = 1; c < yearRow.length; c++) {
    const v = yearRow[c]
    if (v && String(v).match(/^\d{4}$/)) anios.push(String(v))
    else break
  }
  if (anios.length === 0) return null

  const porMuni: Seccion['porMuni'] = {}
  for (let i = idx + 2; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[0]) break
    const nombre = String(row[0]).trim()
    const ub = ubicacionDe(nombre)
    if (!ub) break
    const valores = anios.map((_, k) => Number(row[k + 1] || 0))
    porMuni[ub] = {display: nombre, valores}
  }
  return {anios, porMuni}
}

// Hoja con 2 secciones: divorcios (barras) y divorcios por 100 matrimonios (línea, eje 2).
export function parseMatrimoniosDivorcios(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  // Buscar la hoja que contiene la sección de barras de divorcios
  let data: (string | number | null)[][] | null = null
  for (const sheetName of workbook.SheetNames) {
    const d: (string | number | null)[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: null,
    })
    if (d.some((row) => row && row.some((c) => typeof c === 'string' && c.includes('Histórico de divorcios') && c.includes('EJE')))) {
      data = d
      break
    }
  }
  if (!data) return []

  const divorcios = leerSeccion(data, 'Histórico de divorcios')
  const tasa = leerSeccion(data, 'Divorcios por cada 100 matrimonios')
  if (!divorcios) return []

  const graficas: GeneratedGrafica[] = []
  for (const ub of Object.keys(divorcios.porMuni)) {
    const d = divorcios.porMuni[ub]
    const t = tasa?.porMuni[ub]
    const tableRows: TableRow[] = [
      makeRow(['', ...divorcios.anios]),
      makeRow(['Divorcios', ...d.valores.map((v) => Math.round(v).toString())]),
    ]
    if (t) {
      tableRows.push(makeRow(['Divorcios por cada 100 matrimonios', ...t.valores.map((v) => round2(v))]))
    }

    graficas.push({
      titulo: `Relación de Matrimonios y Divorcios en ${d.display}`,
      tipo: 'bar',
      ubicacion: [ub],
      tablaDatos: {rows: tableRows},
      unidadMedida: 'unidades',
      fuente: 'otra',
      fuentePersonalizada: 'INEGI, Estadística de Divorcios',
      descripcionContexto: `Divorcios registrados anualmente en ${d.display} y su relación por cada 100 matrimonios.`,
      series: t
        ? [
            {nombre: 'Divorcios', tipoSerie: 'bar', color: '#3b82f6'},
            {nombre: 'Divorcios por cada 100 matrimonios', tipoSerie: 'line', color: '#ef4444', ejeSecundario: true},
          ]
        : undefined,
    })
  }

  return graficas
}
