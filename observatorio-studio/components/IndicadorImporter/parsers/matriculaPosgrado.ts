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

function displayName(name: string): string {
  return DISPLAY_NAMES[name.toLowerCase()] || name.trim()
}

export function parseMatriculaPosgrado(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []

  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  })

  const graficas: GeneratedGrafica[] = []

  graficas.push(...parseSeccion1Genero(data))
  graficas.push(...parseSeccion2Carreras(data))
  graficas.push(...parseSeccion3Instituciones(data))

  return graficas
}

// Section 1: Matrícula por Género
function parseSeccion1Genero(data: (string | number | null)[][]): GeneratedGrafica[] {
  // Find header row
  let headerIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row[3] && typeof row[3] === 'string' && row[3].includes('Matrícula Mujeres')) {
      headerIdx = i
      break
    }
  }
  if (headerIdx === -1) return []

  // Collect data, carrying forward the periodo when empty
  const byMunicipio = new Map<string, {periodo: string; mujeres: string; hombres: string}[]>()
  let currentPeriodo = ''

  for (let i = headerIdx + 1; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[2]) continue

    // Check if we hit section 3
    const col2 = String(row[2] || '').trim()
    if (col2.toLowerCase().includes('instituciones')) break

    const municipio = col2.toLowerCase()
    if (!MUNICIPIO_UBICACION[municipio]) continue

    // Update periodo if present
    if (row[1] && String(row[1]).trim().includes('-')) {
      currentPeriodo = String(row[1]).trim()
    }

    if (!currentPeriodo) continue

    const mujeres = String(row[3] || '0')
    const hombres = String(row[4] || '0')

    if (!byMunicipio.has(municipio)) byMunicipio.set(municipio, [])
    byMunicipio.get(municipio)!.push({periodo: currentPeriodo, mujeres, hombres})
  }

  const graficas: GeneratedGrafica[] = []

  for (const [municipio, rows] of byMunicipio) {
    const periodos = rows.map((r) => r.periodo)
    const name = displayName(municipio)
    const ubicacion = MUNICIPIO_UBICACION[municipio] || ['torreon']

    const tablaDatos: TableValue = {
      rows: [
        makeRow(['', ...periodos]),
        makeRow(['Mujeres', ...rows.map((r) => r.mujeres)]),
        makeRow(['Hombres', ...rows.map((r) => r.hombres)]),
      ],
    }

    graficas.push({
      titulo: `Matrícula de Posgrado por Género en ${name}`,
      tipo: 'bar',
      ubicacion,
      tablaDatos,
      unidadMedida: 'unidades',
      fuente: 'otra',
      fuentePersonalizada: 'ANUIES',
      descripcionContexto: `Matrícula de posgrado por género en ${name} del ciclo 2016-2017 al 2024-2025.`,
    })
  }

  return graficas
}

// Section 2: Top 10 carreras (columns 8-11)
function parseSeccion2Carreras(data: (string | number | null)[][]): GeneratedGrafica[] {
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
      titulo: 'Top 10 Carreras de Posgrado con Mayor Matrícula en la ZML',
      tipo: 'horizontalBar',
      ubicacion: ['torreon', 'gomez-palacio', 'lerdo', 'matamoros'],
      tablaDatos,
      unidadMedida: 'unidades',
      fuente: 'otra',
      fuentePersonalizada: 'ANUIES',
      descripcionContexto:
        'Las 10 carreras de posgrado con mayor matrícula en la Zona Metropolitana de la Laguna, desglosadas por género.',
    },
  ]
}

// Section 3: Instituciones por tipo de sostenimiento
function parseSeccion3Instituciones(data: (string | number | null)[][]): GeneratedGrafica[] {
  let sectionStart = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (
      row &&
      row.some(
        (c) => typeof c === 'string' && c.toLowerCase().includes('instituciones'),
      )
    ) {
      sectionStart = i
      break
    }
  }
  if (sectionStart === -1) return []

  const graficas: GeneratedGrafica[] = []
  const municipioBlocks: {name: string; startRow: number; colOffset: number}[] = []

  for (let i = sectionStart + 1; i < data.length; i++) {
    const row = data[i]
    if (!row) continue

    for (const col of [2, 7]) {
      const val = row[col]
      if (val && typeof val === 'string' && val.trim() && !val.includes('Públ') && !val.includes('Priv') && !val.includes('Total')) {
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

    const name = displayName(block.name)
    const ubicacion = MUNICIPIO_UBICACION[block.name.toLowerCase()] || ['torreon']

    const tablaDatos: TableValue = {
      rows: [
        makeRow(['', ...periodos]),
        makeRow(['Públicas', ...publico]),
        makeRow(['Privadas', ...privado]),
      ],
    }

    graficas.push({
      titulo: `Instituciones de Posgrado en ${name}`,
      tipo: 'bar',
      ubicacion,
      tablaDatos,
      unidadMedida: 'unidades',
      fuente: 'otra',
      fuentePersonalizada: 'ANUIES',
      descripcionContexto: `Número de instituciones de posgrado por tipo de sostenimiento en ${name}.`,
    })
  }

  return graficas
}
