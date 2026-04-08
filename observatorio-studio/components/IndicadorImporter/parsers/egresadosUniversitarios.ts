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

export function parseEgresadosUniversitarios(workbook: XLSX.WorkBook): GeneratedGrafica[] {
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

function parseSeccion1Genero(data: (string | number | null)[][]): GeneratedGrafica[] {
  let headerIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row[3] && typeof row[3] === 'string' && row[3].includes('Egresados Mujeres')) {
      headerIdx = i
      break
    }
  }
  if (headerIdx === -1) return []

  const byMunicipio = new Map<string, {periodo: string; mujeres: string; hombres: string}[]>()

  for (let i = headerIdx + 1; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[1] || !row[2]) continue

    const periodo = String(row[1]).trim()
    if (!periodo.includes('-')) continue

    const municipio = String(row[2]).trim().toLowerCase()
    if (!MUNICIPIO_UBICACION[municipio]) continue

    const mujeres = String(row[3] || '0')
    const hombres = String(row[4] || '0')

    if (!byMunicipio.has(municipio)) byMunicipio.set(municipio, [])
    byMunicipio.get(municipio)!.push({periodo, mujeres, hombres})
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
      titulo: `Egresados Universitarios por Género en ${name}`,
      tipo: 'bar',
      ubicacion,
      tablaDatos,
      unidadMedida: 'unidades',
      fuente: 'otra',
      fuentePersonalizada: 'ANUIES',
      descripcionContexto: `Egresados universitarios por género en ${name} del ciclo 2016-2017 al 2024-2025.`,
    })
  }

  return graficas
}

function parseSeccion2Carreras(data: (string | number | null)[][]): GeneratedGrafica[] {
  let headerIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row[9] && typeof row[9] === 'string' && row[9].includes('Egresados Mujeres')) {
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
      titulo: 'Top 10 Carreras con Mayor Egreso en la ZML',
      tipo: 'horizontalBar',
      ubicacion: ['torreon', 'gomez-palacio', 'lerdo', 'matamoros'],
      tablaDatos,
      unidadMedida: 'unidades',
      fuente: 'otra',
      fuentePersonalizada: 'ANUIES',
      descripcionContexto:
        'Las 10 carreras universitarias con mayor número de egresados en la Zona Metropolitana de la Laguna, desglosadas por género.',
    },
  ]
}

function parseSeccion3Instituciones(data: (string | number | null)[][]): GeneratedGrafica[] {
  let sectionStart = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && c.toLowerCase().includes('instituciones universitarias'))) {
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

    for (const col of [1, 6]) {
      const val = row[col]
      if (val && typeof val === 'string' && val.trim() && !val.includes('Públ') && !val.includes('Priv') && !val.includes('Total') && !val.includes('-')) {
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
      titulo: `Instituciones con Egresados Universitarios en ${name}`,
      tipo: 'bar',
      ubicacion,
      tablaDatos,
      unidadMedida: 'unidades',
      fuente: 'otra',
      fuentePersonalizada: 'ANUIES',
      descripcionContexto: `Número de instituciones universitarias con egresados por tipo de sostenimiento en ${name}.`,
    })
  }

  return graficas
}
