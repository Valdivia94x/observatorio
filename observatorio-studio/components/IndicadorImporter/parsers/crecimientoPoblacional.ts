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

// Una hoja por municipio: header [Año, Población Total, Tasa...], filas [año, población, tasa].
// Genera una gráfica de barras de Población Total por municipio.
export function parseCrecimientoPoblacional(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const graficas: GeneratedGrafica[] = []

  for (const sheetName of workbook.SheetNames) {
    const ub = ubicacionDe(sheetName)
    if (!ub) continue
    const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: null,
    })

    // Header con "Año" en col 0 y "Población" en col 1
    let headerIdx = -1
    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      if (row && typeof row[0] === 'string' && row[0].trim() === 'Año' && typeof row[1] === 'string' && row[1].includes('Población')) {
        headerIdx = i
        break
      }
    }
    if (headerIdx === -1) continue

    const anios: string[] = []
    const poblacion: string[] = []
    for (let i = headerIdx + 1; i < data.length; i++) {
      const row = data[i]
      if (!row) continue
      const año = row[0]
      if (!año || !String(año).match(/^\d{4}$/)) break
      anios.push(String(año))
      poblacion.push(row[1] === null || row[1] === undefined || row[1] === '' ? '' : Math.round(Number(row[1])).toString())
    }
    if (anios.length === 0) continue

    graficas.push({
      titulo: `Crecimiento Poblacional en ${sheetName.trim()}`,
      tipo: 'bar',
      ubicacion: [ub],
      tablaDatos: {rows: [makeRow(['', ...anios]), makeRow(['Población total', ...poblacion])]},
      unidadMedida: 'habitantes',
      fuente: 'inegi',
      descripcionContexto: `Población total histórica de ${sheetName.trim()} según censos y encuestas intercensales.`,
    })
  }

  return graficas
}
