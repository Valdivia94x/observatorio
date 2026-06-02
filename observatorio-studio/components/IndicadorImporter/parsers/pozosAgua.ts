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

function isND(cell: string | number | null): boolean {
  return cell === null || cell === undefined || cell === '' || String(cell).trim().toUpperCase() === 'ND'
}

const NOTA_ND = 'ND: No hay Datos.'

export function parsePozosAgua(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const graficas: GeneratedGrafica[] = []

  for (const sheetName of workbook.SheetNames) {
    const ub = ubicacionDe(sheetName)
    if (!ub) continue
    const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: null,
    })

    let idx = -1
    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      if (row && row.some((c) => typeof c === 'string' && c.includes('Pozos de agua registrados'))) {
        idx = i
        break
      }
    }
    if (idx === -1) continue

    const anios: string[] = []
    const activos: string[] = []
    const inactivos: string[] = []
    for (let i = idx + 2; i < data.length; i++) {
      const row = data[i]
      if (!row) break
      const año = row[0]
      if (!año || !String(año).match(/^\d{4}$/)) break
      anios.push(String(año))
      activos.push(isND(row[1]) ? '' : Math.round(Number(row[1])).toString())
      inactivos.push(isND(row[2]) ? '' : Math.round(Number(row[2])).toString())
    }
    if (anios.length === 0 || !activos.some((v) => v !== '')) continue

    graficas.push({
      titulo: `Pozos de Agua Registrados en ${sheetName.trim()}`,
      tipo: 'stackedBar',
      ubicacion: [ub],
      tablaDatos: {
        rows: [
          makeRow(['', ...anios]),
          makeRow(['Activos', ...activos]),
          makeRow(['Inactivos', ...inactivos]),
        ],
      },
      unidadMedida: 'unidades',
      fuente: 'otra',
      fuentePersonalizada: 'CONAGUA / Transparencia municipal',
      descripcionContexto: `Pozos de agua registrados en ${sheetName.trim()}, desglosados en activos e inactivos.`,
      nota: NOTA_ND,
      // Orden de series: Activos (azul), Inactivos (gris)
      colores: ['#3b82f6', '#9ca3af'],
    })
  }

  return graficas
}
