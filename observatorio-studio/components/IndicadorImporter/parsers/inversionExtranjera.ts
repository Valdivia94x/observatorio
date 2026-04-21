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

export function parseInversionExtranjera(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const graficas: GeneratedGrafica[] = []

  const sheetTipo = workbook.Sheets['Tipo de inversión']
  if (sheetTipo) graficas.push(...parseTipoInversion(sheetTipo))

  const sheetRanking = workbook.Sheets['Ranking Nacional']
  if (sheetRanking) graficas.push(...parseRanking(sheetRanking))

  return graficas
}

function parseTipoInversion(sheet: XLSX.Sheet): GeneratedGrafica[] {
  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  })

  const graficas: GeneratedGrafica[] = []

  // Find all "Gráfico de barras con totales" sections
  const totalSections: number[] = []
  const tipoSections: number[] = []

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (!row) continue
    const text = row.some((c) => typeof c === 'string' && c.includes('barras con totales'))
    if (text) totalSections.push(i)
    const tipoText = row.some((c) => typeof c === 'string' && c.includes('Tabla con tipo'))
    if (tipoText) tipoSections.push(i)
  }

  // Parse total sections
  for (const sectionIdx of totalSections) {
    const headerRow = data[sectionIdx + 1]
    if (!headerRow) continue

    const anios: string[] = []
    for (let c = 1; c < headerRow.length; c++) {
      const val = headerRow[c]
      if (val && String(val).match(/^\d{4}$/)) anios.push(String(val))
      else break
    }

    const dataRow = data[sectionIdx + 2]
    if (!dataRow || !dataRow[0]) continue

    const estado = String(dataRow[0]).trim()
    const valores = anios.map((_, idx) => round2(Number(dataRow[idx + 1] || 0)))

    const isCoahuila = estado.toLowerCase().includes('coahuila')
    const ubicacion = isCoahuila ? ['estatal-coahuila'] : ['estatal-durango']
    const displayName = isCoahuila ? 'Coahuila' : 'Durango'

    const tablaDatos: TableValue = {
      rows: [
        makeRow(['', ...anios]),
        makeRow([displayName, ...valores]),
      ],
    }

    graficas.push({
      titulo: `Inversión Extranjera Directa en ${displayName}`,
      tipo: 'bar',
      ubicacion,
      tablaDatos,
      unidadMedida: 'millones-pesos',
      fuente: 'economia',
      descripcionContexto: `Inversión Extranjera Directa total en ${displayName}, millones de dólares. Fuente: Secretaría de Economía.`,
    })
  }

  // Parse tipo de inversión sections (stacked bars)
  for (const sectionIdx of tipoSections) {
    const headerRow = data[sectionIdx + 1]
    if (!headerRow) continue

    const anios: string[] = []
    for (let c = 1; c < headerRow.length; c++) {
      const val = headerRow[c]
      if (val && String(val).match(/^\d{4}$/)) anios.push(String(val))
      else break
    }

    const tableRows: TableRow[] = [makeRow(['', ...anios])]

    // Determine state from previous total section
    let estado = ''
    for (let i = sectionIdx - 1; i >= 0; i--) {
      const row = data[i]
      if (row && row[0] && typeof row[0] === 'string') {
        const name = row[0].trim()
        if (name.toLowerCase().includes('coahuila') || name.toLowerCase().includes('durango')) {
          estado = name.toLowerCase().includes('coahuila') ? 'Coahuila' : 'Durango'
          break
        }
      }
    }
    if (!estado) continue

    for (let i = sectionIdx + 2; i < data.length; i++) {
      const row = data[i]
      if (!row || !row[0]) break
      const nombre = String(row[0]).trim()
      if (!nombre) break
      const valores = anios.map((_, idx) => round2(Number(row[idx + 1] || 0)))
      tableRows.push(makeRow([nombre, ...valores]))
    }

    if (tableRows.length <= 1) continue

    const ubicacion = estado === 'Coahuila' ? ['estatal-coahuila'] : ['estatal-durango']

    graficas.push({
      titulo: `IED por Tipo de Inversión en ${estado}`,
      tipo: 'table',
      ubicacion,
      tablaDatos: {rows: tableRows},
      unidadMedida: 'millones-pesos',
      fuente: 'economia',
      descripcionContexto: `Inversión Extranjera Directa por tipo de inversión en ${estado}, millones de dólares. Fuente: Secretaría de Economía.`,
    })
  }

  return graficas
}

function parseRanking(sheet: XLSX.Sheet): GeneratedGrafica[] {
  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  })

  // Find header row
  let headerIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && c.includes('Entidad Federativa'))) {
      headerIdx = i
      break
    }
  }
  if (headerIdx === -1) return []

  const entidades: string[] = []
  const valores: string[] = []

  for (let i = headerIdx + 1; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[0]) break
    entidades.push(String(row[0]).trim())
    valores.push(round2(Number(row[1] || 0)))
  }

  if (entidades.length === 0) return []

  const tableRows: TableRow[] = [
    makeRow(['Entidad Federativa', 'IED (millones USD)']),
  ]
  for (let i = 0; i < entidades.length; i++) {
    tableRows.push(makeRow([entidades[i], valores[i]]))
  }

  return [{
    titulo: 'Ranking Nacional de IED 2025',
    tipo: 'table',
    ubicacion: ['estatal-coahuila', 'estatal-durango'],
    tablaDatos: {rows: tableRows},
    unidadMedida: 'millones-pesos',
    fuente: 'economia',
    descripcionContexto: 'Ranking de entidades federativas por Inversión Extranjera Directa, millones de dólares, 2025. Fuente: Secretaría de Economía.',
  }]
}
