import {nanoid} from 'nanoid'
import * as XLSX from 'xlsx'
import type {GeneratedGrafica} from '../types'
import type {TableRow, TableValue} from '../../ExcelImporter/types'

function makeRow(cells: string[]): TableRow {
  return {_type: 'tableRow', _key: nanoid(), cells}
}

const MUNICIPIO_UBICACION: Record<string, string[]> = {
  'gómez palacio': ['gomez-palacio'],
  lerdo: ['lerdo'],
  matamoros: ['matamoros'],
  torreón: ['torreon'],
  zml: ['torreon', 'gomez-palacio', 'lerdo', 'matamoros'],
}

const DISPLAY_NAMES: Record<string, string> = {
  'gómez palacio': 'Gómez Palacio',
  lerdo: 'Lerdo',
  matamoros: 'Matamoros',
  torreón: 'Torreón',
  zml: 'ZML',
}

function normalizeMunicipio(name: string): string {
  return DISPLAY_NAMES[name.toLowerCase()] || name.trim()
}

export function parseMatriculaUniversitaria(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []

  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  })

  const graficas: GeneratedGrafica[] = []

  graficas.push(...parseSeccion1MatriculaGenero(data))
  graficas.push(...parseSeccion2Carreras(data))
  graficas.push(...parseSeccion3Instituciones(data))

  return graficas
}

// Section 1: Matrícula por Género (rows with periodo + municipio + mujeres + hombres + total)
function parseSeccion1MatriculaGenero(data: (string | number | null)[][]): GeneratedGrafica[] {
  // Find header row for section 1
  let headerIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && c.includes('Matrícula Mujeres'))) {
      headerIdx = i
      break
    }
  }
  if (headerIdx === -1) return []

  // Collect data: group by municipio
  const byMunicipio = new Map<string, {periodo: string; mujeres: string; hombres: string}[]>()

  for (let i = headerIdx + 1; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[1] || !row[2]) continue

    const periodo = String(row[1]).trim()
    const municipio = String(row[2]).trim().toLowerCase()
    const mujeres = String(row[3] || '0')
    const hombres = String(row[4] || '0')

    // Stop if we hit section 2 area (no periodo pattern)
    if (!periodo.includes('-')) continue

    if (!byMunicipio.has(municipio)) byMunicipio.set(municipio, [])
    byMunicipio.get(municipio)!.push({periodo, mujeres, hombres})
  }

  const graficas: GeneratedGrafica[] = []

  for (const [municipio, rows] of byMunicipio) {
    const periodos = rows.map((r) => r.periodo)
    const displayName = normalizeMunicipio(municipio)
    const ubicacion = MUNICIPIO_UBICACION[municipio] || ['torreon']

    const tablaDatos: TableValue = {
      rows: [
        makeRow(['', ...periodos]),
        makeRow(['Mujeres', ...rows.map((r) => r.mujeres)]),
        makeRow(['Hombres', ...rows.map((r) => r.hombres)]),
      ],
    }

    graficas.push({
      titulo: `Matrícula Universitaria por Género en ${displayName}`,
      tipo: 'bar',
      ubicacion,
      tablaDatos,
      unidadMedida: 'unidades',
      fuente: 'otra',
      fuentePersonalizada: 'ANUIES',
      descripcionContexto: `Matrícula universitaria por género en ${displayName} del ciclo 2016-2017 al 2024-2025.`,
    })
  }

  return graficas
}

// Section 2: Top 10 carreras (columns 8-11)
function parseSeccion2Carreras(data: (string | number | null)[][]): GeneratedGrafica[] {
  // Find the row with career headers (Matrícula Mujeres in col 9)
  let headerIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row[9] && typeof row[9] === 'string' && row[9].includes('Matrícula Mujeres')) {
      headerIdx = i
      break
    }
  }
  if (headerIdx === -1) return []

  const carreras: string[] = []
  const mujeres: string[] = []
  const hombres: string[] = []

  for (let i = headerIdx + 1; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[8]) break

    const carrera = String(row[8]).trim()
    if (carrera.toLowerCase().includes('total general')) break

    carreras.push(carrera)
    mujeres.push(String(row[9] || '0'))
    hombres.push(String(row[10] || '0'))
  }

  if (carreras.length === 0) return []

  const tablaDatos: TableValue = {
    rows: [
      makeRow(['', ...carreras]),
      makeRow(['Mujeres', ...mujeres]),
      makeRow(['Hombres', ...hombres]),
    ],
  }

  return [
    {
      titulo: 'Top 10 Carreras con Mayor Matrícula en la ZML',
      tipo: 'horizontalBar',
      ubicacion: ['torreon', 'gomez-palacio', 'lerdo', 'matamoros'],
      tablaDatos,
      unidadMedida: 'unidades',
      fuente: 'otra',
      fuentePersonalizada: 'ANUIES',
      descripcionContexto:
        'Las 10 carreras universitarias con mayor matrícula en la Zona Metropolitana de la Laguna, desglosadas por género.',
    },
  ]
}

// Section 3: Instituciones por tipo de sostenimiento
function parseSeccion3Instituciones(data: (string | number | null)[][]): GeneratedGrafica[] {
  // Find the section 3 marker
  let sectionStart = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (
      row &&
      row.some(
        (c) => typeof c === 'string' && c.toLowerCase().includes('instituciones universitarias'),
      )
    ) {
      sectionStart = i
      break
    }
  }
  if (sectionStart === -1) return []

  const graficas: GeneratedGrafica[] = []

  // Parse paired municipality tables (Torreón+GP, Lerdo+Matamoros) and ZML
  // Strategy: scan for municipality name rows after sectionStart
  const municipioBlocks: {name: string; startRow: number; colOffset: number}[] = []

  for (let i = sectionStart + 1; i < data.length; i++) {
    const row = data[i]
    if (!row) continue

    // Check columns 2 and 7 for municipality names
    for (const col of [2, 7]) {
      const val = row[col]
      if (val && typeof val === 'string' && val.trim() && !val.includes('Públi') && !val.includes('Privad') && !val.includes('Total')) {
        // Check next row has "Público/Privado" header
        const nextRow = data[i + 1]
        if (nextRow && nextRow[col + 1] && String(nextRow[col + 1]).toLowerCase().includes('públ')) {
          municipioBlocks.push({name: val.trim(), startRow: i + 2, colOffset: col})
        }
      }
    }
  }

  for (const block of municipioBlocks) {
    const periodos: string[] = []
    const publico: string[] = []
    const privado: string[] = []

    for (let i = block.startRow; i < data.length; i++) {
      const row = data[i]
      if (!row) continue

      const periodo = row[block.colOffset]
      if (!periodo || typeof periodo !== 'string' || !periodo.includes('-')) break

      periodos.push(periodo.trim())
      publico.push(String(row[block.colOffset + 1] || '0'))
      privado.push(String(row[block.colOffset + 2] || '0'))
    }

    if (periodos.length === 0) continue

    const displayName = normalizeMunicipio(block.name)
    const ubicacion = MUNICIPIO_UBICACION[block.name.toLowerCase()] || ['torreon']

    const tablaDatos: TableValue = {
      rows: [
        makeRow(['', ...periodos]),
        makeRow(['Públicas', ...publico]),
        makeRow(['Privadas', ...privado]),
      ],
    }

    graficas.push({
      titulo: `Instituciones Universitarias en ${displayName}`,
      tipo: 'bar',
      ubicacion,
      tablaDatos,
      unidadMedida: 'unidades',
      fuente: 'otra',
      fuentePersonalizada: 'ANUIES',
      descripcionContexto: `Número de instituciones universitarias por tipo de sostenimiento (públicas y privadas) en ${displayName}.`,
    })
  }

  return graficas
}
