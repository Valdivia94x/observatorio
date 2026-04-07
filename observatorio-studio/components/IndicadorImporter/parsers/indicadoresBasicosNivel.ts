import {nanoid} from 'nanoid'
import * as XLSX from 'xlsx'
import type {GeneratedGrafica} from '../types'
import type {TableRow, TableValue} from '../../ExcelImporter/types'

function makeRow(cells: string[]): TableRow {
  return {_type: 'tableRow', _key: nanoid(), cells}
}

const MUNICIPIO_UBICACION: Record<string, string[]> = {
  torreón: ['torreon'],
  'gómez palacio': ['gomez-palacio'],
  lerdo: ['lerdo'],
  matamoros: ['matamoros'],
  zml: ['torreon', 'gomez-palacio', 'lerdo', 'matamoros'],
}

const DISPLAY_NAMES: Record<string, string> = {
  torreón: 'Torreón',
  'gómez palacio': 'Gómez Palacio',
  lerdo: 'Lerdo',
  matamoros: 'Matamoros',
  zml: 'ZML',
}

function displayName(name: string): string {
  return DISPLAY_NAMES[name.toLowerCase()] || name.trim()
}

function parseSimpleTable(
  data: (string | number | null)[][],
  sectionMarker: string,
): {periodos: string[]; byMunicipio: Map<string, string[]>} | null {
  let headerIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && c.includes(sectionMarker))) {
      headerIdx = i
      break
    }
  }
  if (headerIdx === -1) return null

  const municipioRow = data[headerIdx + 1]
  if (!municipioRow) return null

  const municipios: {name: string; colIdx: number}[] = []
  for (let c = 2; c < municipioRow.length; c++) {
    const val = municipioRow[c]
    if (val && typeof val === 'string' && val.trim()) {
      municipios.push({name: val.trim().toLowerCase(), colIdx: c})
    }
  }

  const periodos: string[] = []
  const byMunicipio = new Map<string, string[]>()
  for (const m of municipios) {
    byMunicipio.set(m.name, [])
  }

  for (let i = headerIdx + 2; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[1]) continue

    const periodo = String(row[1]).trim()
    if (!periodo.includes('-')) break

    periodos.push(periodo)
    for (const m of municipios) {
      byMunicipio.get(m.name)!.push(String(row[m.colIdx] || '0'))
    }
  }

  return {periodos, byMunicipio}
}

function parseEscuelas(
  data: (string | number | null)[][],
  nivel: string,
): GeneratedGrafica[] {
  let sectionStart = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && c.toLowerCase().includes(`escuelas de ${nivel.toLowerCase()}`))) {
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
      titulo: `Escuelas de ${nivel} en ${name}`,
      tipo: 'bar',
      ubicacion,
      tablaDatos,
      unidadMedida: 'unidades',
      fuente: 'sep',
      descripcionContexto: `Número de escuelas de ${nivel.toLowerCase()} por tipo de sostenimiento en ${name}.`,
    })
  }

  return graficas
}

export function createIndicadoresBasicosParser(nivel: string) {
  return function (workbook: XLSX.WorkBook): GeneratedGrafica[] {
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    if (!sheet) return []

    const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
    })

    const graficas: GeneratedGrafica[] = []

    const alumnosData = parseSimpleTable(data, `Alumnos de ${nivel}`)
    const maestrosData = parseSimpleTable(data, `Maestros de ${nivel}`)

    if (alumnosData && maestrosData) {
      const municipios = [...alumnosData.byMunicipio.keys()]

      for (const municipio of municipios) {
        const alumnos = alumnosData.byMunicipio.get(municipio)
        const maestros = maestrosData.byMunicipio.get(municipio)
        if (!alumnos || !maestros) continue

        const name = displayName(municipio)
        const ubicacion = MUNICIPIO_UBICACION[municipio] || ['torreon']

        const tablaDatos: TableValue = {
          rows: [
            makeRow(['', ...alumnosData.periodos]),
            makeRow(['Alumnos', ...alumnos]),
            makeRow(['Maestros', ...maestros]),
          ],
        }

        graficas.push({
          titulo: `Alumnos y Maestros de ${nivel} en ${name}`,
          tipo: 'bar',
          ubicacion,
          tablaDatos,
          unidadMedida: 'unidades',
          fuente: 'sep',
          descripcionContexto: `Alumnos (barras) y maestros (línea) de ${nivel.toLowerCase()} en ${name}. Fuente: Sistema de Estadísticas Continuas de Educación, Formato 911.`,
          series: [
            {nombre: 'Alumnos', tipoSerie: 'bar', color: '#3b82f6'},
            {nombre: 'Maestros', tipoSerie: 'line', color: '#ef4444', ejeSecundario: true},
          ],
        })
      }
    }

    graficas.push(...parseEscuelas(data, nivel))

    return graficas
  }
}
