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

export function parseExportaciones(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []

  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  })

  const graficas: GeneratedGrafica[] = []
  graficas.push(...parseSeccion1Entidades(data))
  graficas.push(...parseSeccion2Subactividades(data))
  graficas.push(...parseSeccion3Ranking(data))
  return graficas
}

// Section 1: Exports by state (dual-axis: bars + line %)
function parseSeccion1Entidades(data: (string | number | null)[][]): GeneratedGrafica[] {
  let sectionIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && c.includes('Exportaciones por Entidad'))) {
      sectionIdx = i
      break
    }
  }
  if (sectionIdx === -1) return []

  const yearRow = data[sectionIdx + 1]
  if (!yearRow) return []

  const anios: string[] = []
  for (let c = 2; c < yearRow.length; c++) {
    const val = yearRow[c]
    if (val && String(val).match(/^\d{4}$/)) anios.push(String(val))
    else break
  }

  const graficas: GeneratedGrafica[] = []

  // Parse paired rows (Eje1 = values, Eje2 = % nacional)
  for (let i = sectionIdx + 2; i < data.length; i++) {
    const row1 = data[i]
    if (!row1 || !row1[0] || !String(row1[0]).includes('Eje')) continue

    const eje1Label = String(row1[0]).trim()
    if (!eje1Label.includes('1')) continue

    const entidad = String(row1[1]).trim()
    const valores = anios.map((_, idx) => Math.round(Number(row1[idx + 2] || 0)).toString())

    // Next row should be Eje 2
    const row2 = data[i + 1]
    if (!row2 || !String(row2[0] || '').includes('2')) continue

    const porcentajes = anios.map((_, idx) => toPercent(Number(row2[idx + 2] || 0)))

    const ubicacion = entidad.toLowerCase().includes('coahuila')
      ? ['estatal-coahuila']
      : entidad.toLowerCase().includes('durango')
        ? ['estatal-durango']
        : ['estatal-coahuila']

    const tablaDatos: TableValue = {
      rows: [
        makeRow(['', ...anios]),
        makeRow([entidad, ...valores]),
        makeRow(['% del nacional', ...porcentajes]),
      ],
    }

    graficas.push({
      titulo: `Exportaciones de ${entidad}`,
      tipo: 'bar',
      ubicacion,
      tablaDatos,
      unidadMedida: 'miles-pesos',
      fuente: 'inegi',
      descripcionContexto: `Exportaciones trimestrales de ${entidad} en miles de dólares (barras) y porcentaje del total nacional (línea). Fuente: INEGI.`,
      series: [
        {nombre: entidad, tipoSerie: 'bar', color: '#3b82f6'},
        {nombre: '% del nacional', tipoSerie: 'line', color: '#ef4444', ejeSecundario: true},
      ],
    })
  }

  return graficas
}

// Section 2: Exports by sub-activity (horizontal bars per state)
function parseSeccion2Subactividades(data: (string | number | null)[][]): GeneratedGrafica[] {
  let sectionIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && c.includes('subactividad económica'))) {
      sectionIdx = i
      break
    }
  }
  if (sectionIdx === -1) return []

  // Header row has state names
  const stateRow = data[sectionIdx + 1]
  const periodRow = data[sectionIdx + 2]
  if (!stateRow || !periodRow) return []

  // Find state blocks: Coahuila at col 1, Durango at col 5
  const blocks: {name: string; nameCol: number; col2024: number; col2025: number; ubicacion: string[]}[] = []

  for (let c = 1; c < stateRow.length; c++) {
    const val = stateRow[c]
    if (val && typeof val === 'string' && val.trim()) {
      const name = val.trim()
      // Find 2024 and 2025 columns
      let col2024 = -1
      let col2025 = -1
      for (let pc = c; pc < periodRow.length; pc++) {
        const pVal = periodRow[pc]
        if (pVal && String(pVal).includes('2024')) col2024 = pc
        if (pVal && String(pVal).includes('2025')) col2025 = pc
      }
      if (col2024 >= 0 && col2025 >= 0) {
        const ubicacion = name.toLowerCase().includes('coahuila')
          ? ['estatal-coahuila']
          : name.toLowerCase().includes('durango')
            ? ['estatal-durango']
            : ['estatal-coahuila']
        blocks.push({name, nameCol: c, col2024, col2025, ubicacion})
      }
    }
  }

  const graficas: GeneratedGrafica[] = []

  for (const block of blocks) {
    const actividades: string[] = []
    const val2024: string[] = []
    const val2025: string[] = []

    for (let i = sectionIdx + 3; i < data.length; i++) {
      const row = data[i]
      if (!row) continue

      const actName = row[block.nameCol]
      if (!actName || typeof actName !== 'string' || !actName.trim()) break

      const name = actName.trim()
      if (name.toLowerCase().includes('exportaciones totales')) continue

      // Truncate long names
      actividades.push(name.length > 50 ? name.substring(0, 47) + '...' : name)
      val2024.push(Math.round(Number(row[block.col2024] || 0)).toString())
      val2025.push(Math.round(Number(row[block.col2025] || 0)).toString())
    }

    if (actividades.length === 0) continue

    const tablaDatos: TableValue = {
      rows: [
        makeRow(['', ...actividades]),
        makeRow(['2024', ...val2024]),
        makeRow(['2025', ...val2025]),
      ],
    }

    graficas.push({
      titulo: `Exportaciones por Subactividad en ${block.name}`,
      tipo: 'table',
      ubicacion: block.ubicacion,
      tablaDatos,
      unidadMedida: 'miles-pesos',
      fuente: 'inegi',
      descripcionContexto: `Principales subactividades de exportación en ${block.name}, miles de dólares. Fuente: INEGI.`,
    })
  }

  return graficas
}

// Section 3: National ranking
function parseSeccion3Ranking(data: (string | number | null)[][]): GeneratedGrafica[] {
  let sectionIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && c.includes('Ranking Nacional'))) {
      sectionIdx = i
      break
    }
  }
  if (sectionIdx === -1) return []

  // Skip header row
  const dataStartRow = sectionIdx + 2

  const entidades: string[] = []
  const valores: string[] = []

  for (let i = dataStartRow; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[1]) break
    const name = String(row[1]).trim()
    const val = row[2]
    if (val === null || val === undefined) continue
    entidades.push(name)
    valores.push(Math.round(Number(val)).toString())
  }

  if (entidades.length === 0) return []

  const tablaDatos: TableValue = {
    rows: [
      makeRow(['', ...entidades]),
      makeRow(['Exportaciones (miles USD)', ...valores]),
    ],
  }

  return [{
    titulo: 'Ranking Nacional de Exportaciones 2025',
    tipo: 'table',
    ubicacion: ['estatal-coahuila', 'estatal-durango'],
    tablaDatos,
    unidadMedida: 'miles-pesos',
    fuente: 'inegi',
    descripcionContexto: 'Ranking de entidades federativas por exportaciones totales en miles de dólares, 2025. Fuente: INEGI.',
    ocultarValores: true,
  }]
}
