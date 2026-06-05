import {nanoid} from 'nanoid'
import * as XLSX from 'xlsx'
import type {GeneratedGrafica} from '../types'
import type {TableRow} from '../../ExcelImporter/types'

function makeRow(cells: string[]): TableRow {
  return {_type: 'tableRow', _key: nanoid(), cells}
}

function toPercent(val: number): string {
  return parseFloat((val * 100).toFixed(1)).toString()
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

// Cada hoja tiene 2 municipios; por municipio: nombre en col c (conteo) y porcentaje en col c+1.
// Genera una gráfica de barras horizontales por municipio, ordenada de mayor a menor %.
export function parseOrganizacionesSC(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const graficas: GeneratedGrafica[] = []

  for (const sheetName of workbook.SheetNames) {
    const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: null,
    })

    // Fila de municipios (row con >=1 nombre reconocido en columnas)
    let muniRowIdx = -1
    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      if (!row) continue
      if (row.some((c, idx) => idx > 0 && typeof c === 'string' && ubicacionDe(c))) {
        muniRowIdx = i
        break
      }
    }
    if (muniRowIdx === -1) continue

    const muniRow = data[muniRowIdx]
    const munis: {pctCol: number; display: string; ubicacion: string}[] = []
    for (let c = 1; c < muniRow.length; c++) {
      const v = muniRow[c]
      if (typeof v === 'string') {
        const ub = ubicacionDe(v)
        // Evitar duplicado por celdas repetidas (ej. "Matamoros","Matamoros")
        if (ub && !munis.some((m) => m.ubicacion === ub)) {
          munis.push({pctCol: c + 1, display: v.trim(), ubicacion: ub})
        }
      }
    }
    if (munis.length === 0) continue

    // Categorías (col 0) hasta TOTAL/Total/Fuente
    const categorias: string[] = []
    const dataRows: (string | number | null)[][] = []
    for (let i = muniRowIdx + 1; i < data.length; i++) {
      const row = data[i]
      if (!row || !row[0]) break
      const cat = String(row[0]).trim()
      const low = cat.toLowerCase()
      if (low.startsWith('total') || low.startsWith('fuente')) break
      categorias.push(cat)
      dataRows.push(row)
    }
    if (categorias.length === 0) continue

    for (const m of munis) {
      const items = categorias
        .map((cat, idx) => ({cat, pct: Number(dataRows[idx][m.pctCol] || 0)}))
        .filter((it) => it.pct > 0)
        .sort((a, b) => b.pct - a.pct)
      if (items.length === 0) continue

      graficas.push({
        titulo: `Organizaciones de la Sociedad Civil en ${m.display}`,
        tipo: 'horizontalBar',
        ubicacion: [m.ubicacion],
        tablaDatos: {
          rows: [
            makeRow(['', ...items.map((it) => it.cat)]),
            makeRow(['% de organizaciones', ...items.map((it) => toPercent(it.pct))]),
          ],
        },
        unidadMedida: 'porcentaje',
        fuente: 'otra',
        fuentePersonalizada: 'Secretaría del Bienestar',
        descripcionContexto: `Distribución porcentual de las organizaciones de la sociedad civil por tipo de actividad en ${m.display}.`,
      })
    }
  }

  return graficas
}
