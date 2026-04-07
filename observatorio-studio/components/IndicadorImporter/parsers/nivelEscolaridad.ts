import {nanoid} from 'nanoid'
import * as XLSX from 'xlsx'
import type {GeneratedGrafica} from '../types'
import type {TableRow, TableValue} from '../../ExcelImporter/types'

function makeRow(cells: string[]): TableRow {
  return {_type: 'tableRow', _key: nanoid(), cells}
}

function toPercent(val: number): string {
  return parseFloat((val * 100).toFixed(2)).toString()
}

const UBICACION_MAP: Record<string, string[]> = {
  matamoros: ['matamoros'],
  torreón: ['torreon'],
  'gómez palacio': ['gomez-palacio'],
  lerdo: ['lerdo'],
  zml: ['torreon', 'gomez-palacio', 'lerdo', 'matamoros'],
}

export function parseNivelEscolaridad(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []

  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  })

  // Find header row (contains "Matamoros" or municipality names)
  let headerIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && c.toLowerCase().includes('matamoros'))) {
      headerIdx = i
      break
    }
  }

  if (headerIdx === -1) return []

  const headerRow = data[headerIdx]
  if (!headerRow) return []

  // Find municipality columns (start from col 2)
  const municipios: {name: string; colIdx: number}[] = []
  for (let c = 2; c < headerRow.length; c++) {
    const val = headerRow[c]
    if (val && typeof val === 'string' && val.trim()) {
      municipios.push({name: val.trim(), colIdx: c})
    }
  }

  // Collect niveles and their values
  const niveles: string[] = []
  const valuesByMunicipio = new Map<number, string[]>()

  for (const m of municipios) {
    valuesByMunicipio.set(m.colIdx, [])
  }

  for (let i = headerIdx + 1; i < data.length; i++) {
    const row = data[i]
    if (!row) continue

    const nivel = row[1]
    if (!nivel || typeof nivel !== 'string' || !nivel.trim()) continue

    niveles.push(nivel.trim())

    for (const m of municipios) {
      const val = row[m.colIdx]
      if (val === null || val === undefined) {
        valuesByMunicipio.get(m.colIdx)!.push('0')
      } else {
        const num = Number(val)
        // Values are decimals (0.05 = 5%), convert to percentage
        valuesByMunicipio.get(m.colIdx)!.push(num < 1 ? toPercent(num) : parseFloat(num.toFixed(2)).toString())
      }
    }
  }

  // Generate one chart per municipality
  const graficas: GeneratedGrafica[] = []

  for (const m of municipios) {
    const valores = valuesByMunicipio.get(m.colIdx)!
    const ubicacion = UBICACION_MAP[m.name.toLowerCase()] || ['torreon']

    const tablaDatos: TableValue = {
      rows: [
        makeRow(['', ...niveles]),
        makeRow([m.name, ...valores]),
      ],
    }

    graficas.push({
      titulo: `Nivel de Escolaridad en ${m.name}`,
      tipo: 'horizontalBar',
      ubicacion,
      tablaDatos,
      unidadMedida: 'porcentaje',
      fuente: 'inegi',
      descripcionContexto: `Distribución porcentual de la población por nivel de escolaridad en ${m.name}. Fuente: INEGI, Censo de Población y Vivienda 2020.`,
    })
  }

  return graficas
}
