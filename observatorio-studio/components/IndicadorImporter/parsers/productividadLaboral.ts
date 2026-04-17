import {nanoid} from 'nanoid'
import * as XLSX from 'xlsx'
import type {GeneratedGrafica} from '../types'
import type {TableRow, TableValue} from '../../ExcelImporter/types'

function makeRow(cells: string[]): TableRow {
  return {_type: 'tableRow', _key: nanoid(), cells}
}

function round2(n: number): string {
  return parseFloat(n.toFixed(2)).toString()
}

const MUNICIPIO_UBICACION: Record<string, string[]> = {
  coahuila: ['estatal-coahuila'],
  matamoros: ['matamoros'],
  torreón: ['torreon'],
  durango: ['estatal-durango'],
  'gómez palacio': ['gomez-palacio'],
  lerdo: ['lerdo'],
}

export function parseProductividadLaboral(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []

  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  })

  const graficas: GeneratedGrafica[] = []
  graficas.push(...parseSeccionBarras(data, 'Productividad Bruta Total', 'Productividad Bruta Total', 'millones-pesos', 'Productividad Bruta Total en millones de pesos.'))
  graficas.push(...parseSeccionBarras(data, 'Productividad por trabajador', 'Productividad por Trabajador', 'pesos', 'Productividad por trabajador en pesos.'))
  graficas.push(...parseSeccion3Tablas(data))
  return graficas
}

// Parse a bar chart section with multiple series (locations) by census year
function parseSeccionBarras(
  data: (string | number | null)[][],
  marker: string,
  titulo: string,
  unidad: string,
  descripcion: string,
): GeneratedGrafica[] {
  let sectionIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && c.includes(marker))) {
      sectionIdx = i
      break
    }
  }
  if (sectionIdx === -1) return []

  // Year row
  const yearRow = data[sectionIdx + 1]
  if (!yearRow) return []

  const anios: string[] = []
  for (let c = 2; c < yearRow.length; c++) {
    const val = yearRow[c]
    if (val && String(val).match(/^\d{4}$/)) anios.push(String(val))
    else break
  }

  // Collect all location rows
  const tableRows: TableRow[] = [makeRow(['', ...anios])]

  for (let i = sectionIdx + 2; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[1]) break
    const name = String(row[1]).trim()
    if (!name) break
    const valores = anios.map((_, idx) => round2(Number(row[idx + 2] || 0)))
    tableRows.push(makeRow([name, ...valores]))
  }

  if (tableRows.length <= 1) return []

  return [{
    titulo,
    tipo: 'bar',
    ubicacion: ['estatal-coahuila', 'estatal-durango', 'torreon', 'gomez-palacio', 'lerdo', 'matamoros'],
    tablaDatos: {rows: tableRows},
    unidadMedida: unidad,
    fuente: 'inegi',
    descripcionContexto: `${descripcion} Fuente: INEGI, Censos Económicos.`,
    ocultarValores: true,
  }]
}

// Section 3: Tables of product by economic activity per location
function parseSeccion3Tablas(data: (string | number | null)[][]): GeneratedGrafica[] {
  let sectionIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && c.includes('Producto Bruto Total por actividad'))) {
      sectionIdx = i
      break
    }
  }
  if (sectionIdx === -1) return []

  const graficas: GeneratedGrafica[] = []
  const actividades = ['Agropecuarias', 'Minería', 'GTDCEAG', 'Construcción', 'Industrias manufactureras', 'Comercio', 'Servicios']

  // Scan for location blocks (location name followed by activities)
  let i = sectionIdx + 2
  while (i < data.length) {
    const row = data[i]
    if (!row || !row[1]) {
      i++
      continue
    }

    const name = String(row[1]).trim()
    // Check if this is a location name (not an activity)
    if (!actividades.includes(name) && name.length > 0 && !name.toLowerCase().includes('actividad') && !name.toLowerCase().includes('millones')) {
      const locationName = name
      const totalVal = row[2] ? round2(Number(row[2])) : ''

      const tableRows: TableRow[] = [
        makeRow(['Actividad Económica', 'Millones de pesos']),
        makeRow([locationName + ' (Total)', totalVal]),
      ]

      // Read activities
      for (let j = i + 1; j < i + 8 && j < data.length; j++) {
        const actRow = data[j]
        if (!actRow || !actRow[1]) break
        const actName = String(actRow[1]).trim()
        if (!actividades.includes(actName)) break
        const val = actRow[2]
        const valStr = val === 'C' || val === null || val === undefined ? 'C' : round2(Number(val))
        tableRows.push(makeRow([actName, valStr]))
      }

      const cleanName = locationName.trim()
      const ubicacion = MUNICIPIO_UBICACION[cleanName.toLowerCase()] || ['torreon']

      graficas.push({
        titulo: `Producto Bruto por Actividad en ${cleanName}`,
        tipo: 'table',
        ubicacion,
        tablaDatos: {rows: tableRows},
        unidadMedida: 'millones-pesos',
        fuente: 'inegi',
        descripcionContexto: `Producto Bruto Total por actividad económica en ${cleanName}, millones de pesos. Censo Económico 2023. Fuente: INEGI.`,
      })
    }
    i++
  }

  return graficas
}
