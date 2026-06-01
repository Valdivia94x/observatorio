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

// Devuelve "" si la celda es ND/vacía; si no, el número redondeado a `dec` decimales.
function val(cell: string | number | null, dec = 1): string {
  if (cell === null || cell === undefined || cell === '' || String(cell).trim().toUpperCase() === 'ND') return ''
  const n = Number(cell)
  if (!isFinite(n)) return ''
  return parseFloat(n.toFixed(dec)).toString()
}

// Localiza una sección por marcador y devuelve años + las dos columnas de datos.
function leerSeccion(
  data: (string | number | null)[][],
  marker: string,
): {anios: string[]; col1: string[]; col2: string[]} | null {
  let idx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && c.includes(marker))) {
      idx = i
      break
    }
  }
  if (idx === -1) return null

  // header en idx+1 (Año, col1, col2); datos desde idx+2
  const anios: string[] = []
  const col1: string[] = []
  const col2: string[] = []
  for (let i = idx + 2; i < data.length; i++) {
    const row = data[i]
    if (!row) break
    const año = row[0]
    if (!año || !String(año).match(/^\d{4}$/)) break
    anios.push(String(año))
    col1.push(val(row[1]))
    col2.push(val(row[2], 0))
  }
  if (anios.length === 0) return null
  return {anios, col1, col2}
}

const NOTA_ND = 'ND: No hay Datos.'

export function parseExtraccionAgua(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const graficas: GeneratedGrafica[] = []

  for (const sheetName of workbook.SheetNames) {
    const ub = ubicacionDe(sheetName)
    if (!ub) continue
    const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: null,
    })

    const sec = leerSeccion(data, 'Extracción de agua')
    if (!sec) continue
    // ¿Tiene algún dato real?
    if (!sec.col1.some((v) => v !== '')) continue

    graficas.push({
      titulo: `Extracción de Agua en ${sheetName.trim()}`,
      tipo: 'bar',
      ubicacion: [ub],
      tablaDatos: {
        rows: [
          makeRow(['', ...sec.anios]),
          makeRow(['Millones de M³', ...sec.col1]),
          makeRow(['M³ per cápita', ...sec.col2]),
        ],
      },
      unidadMedida: 'otro',
      unidadMedidaPersonalizada: 'Millones de M³',
      fuente: 'otra',
      fuentePersonalizada: 'CONAGUA / Transparencia municipal',
      descripcionContexto: `Extracción anual de agua en ${sheetName.trim()}: volumen total (millones de M³) y consumo per cápita.`,
      nota: NOTA_ND,
      series: [
        {nombre: 'Millones de M³', tipoSerie: 'bar', color: '#3b82f6'},
        {nombre: 'M³ per cápita', tipoSerie: 'line', color: '#ef4444', ejeSecundario: true},
      ],
    })
  }

  return graficas
}
