import {nanoid} from 'nanoid'
import * as XLSX from 'xlsx'
import type {GeneratedGrafica} from '../types'
import type {TableRow} from '../../ExcelImporter/types'

function makeRow(cells: string[]): TableRow {
  return {_type: 'tableRow', _key: nanoid(), cells}
}

function round1(n: number): string {
  return parseFloat(n.toFixed(1)).toString()
}

// Lee una sección "Costo de la Democracia en {estado}" (Barras en capas):
// fila de años + 2 series (Gasto Ordinario, Financiamiento a Partidos).
function parseSeccion(
  data: (string | number | null)[][],
  estado: 'Coahuila' | 'Durango',
  ubicacion: string,
): GeneratedGrafica | null {
  let idx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && c.includes('Costo de la Democracia') && c.includes(estado))) {
      idx = i
      break
    }
  }
  if (idx === -1) return null

  const yearRow = data[idx + 1]
  if (!yearRow) return null
  const anios: string[] = []
  const yearCols: number[] = []
  for (let c = 1; c < yearRow.length; c++) {
    const v = yearRow[c]
    if (v !== null && v !== undefined && v !== '' && String(v).match(/^\d{4}\*?$/)) {
      anios.push(String(v))
      yearCols.push(c)
    }
  }
  if (anios.length === 0) return null

  const tableRows: TableRow[] = [makeRow(['', ...anios])]
  for (let i = idx + 2; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[0]) break
    const nombre = String(row[0]).trim()
    if (nombre.toLowerCase().startsWith('fuente')) break
    const valores = yearCols.map((c) => {
      const v = row[c]
      return v === null || v === undefined || v === '' ? '' : round1(Number(v))
    })
    tableRows.push(makeRow([nombre, ...valores]))
  }
  if (tableRows.length <= 1) return null

  return {
    titulo: `Costo de la Democracia en ${estado}`,
    tipo: 'stackedBar',
    ubicacion: [ubicacion],
    tablaDatos: {rows: tableRows},
    unidadMedida: 'millones-pesos',
    fuente: 'otra',
    fuentePersonalizada: estado === 'Coahuila' ? 'Cuentas Públicas del IEC' : 'Cuentas Públicas del IEPC',
    descripcionContexto: `Costo de la democracia en ${estado}: gasto ordinario del instituto electoral y financiamiento a partidos políticos, en millones de pesos.`,
    nota: '2026 corresponde al presupuesto de egresos aprobado.',
  }
}

export function parsePresupuestoInstitutos(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []
  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: null})

  const graficas: GeneratedGrafica[] = []
  const coah = parseSeccion(data, 'Coahuila', 'estatal-coahuila')
  if (coah) graficas.push(coah)
  const dgo = parseSeccion(data, 'Durango', 'estatal-durango')
  if (dgo) graficas.push(dgo)
  return graficas
}
