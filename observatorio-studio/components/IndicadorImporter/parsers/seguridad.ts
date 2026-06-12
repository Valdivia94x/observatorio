import {nanoid} from 'nanoid'
import * as XLSX from 'xlsx'
import type {GeneratedGrafica} from '../types'
import type {TableRow} from '../../ExcelImporter/types'

function makeRow(cells: string[]): TableRow {
  return {_type: 'tableRow', _key: nanoid(), cells}
}

function round2(n: number): string {
  return parseFloat(n.toFixed(2)).toString()
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

// Nombre canónico de despliegue por ubicación (el Excel a veces escribe "Gomez Palacio" sin acento)
const UBICACION_DISPLAY: Record<string, string> = {
  matamoros: 'Matamoros',
  torreon: 'Torreón',
  'gomez-palacio': 'Gómez Palacio',
  lerdo: 'Lerdo',
}

const FUENTE_DEFAULT = 'Plataforma de Incidencia Delictiva, Observatorio Nacional Ciudadano'

// Estructura común de las hojas de Seguridad: fila de municipios (cada uno con 2 columnas:
// Número absoluto y Tasa por 100 mil hab.), fila de años. Genera una gráfica dual-axis por
// municipio (barras = número, línea = tasa en eje secundario).
function parseHoja(sheet: XLSX.Sheet | undefined, indicadorNombre: string): GeneratedGrafica[] {
  if (!sheet) return []
  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: null})

  // Fila de municipios: row con >=2 nombres reconocidos
  let muniRowIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.filter((c) => typeof c === 'string' && ubicacionDe(c)).length >= 2) {
      muniRowIdx = i
      break
    }
  }
  if (muniRowIdx === -1) return []

  const muniRow = data[muniRowIdx]
  // Cada municipio: columna del nombre = Número absoluto; siguiente = Tasa
  const munis: {numCol: number; tasaCol: number; display: string; ubicacion: string}[] = []
  for (let c = 0; c < muniRow.length; c++) {
    const v = muniRow[c]
    if (typeof v === 'string') {
      const ub = ubicacionDe(v)
      if (ub) munis.push({numCol: c, tasaCol: c + 1, display: UBICACION_DISPLAY[ub] ?? v.trim(), ubicacion: ub})
    }
  }
  if (munis.length === 0) return []

  // Años: filas con año en col 0, empezando 2 filas debajo (salta sub-encabezado Número/Tasa)
  const anios: string[] = []
  const dataRows: (string | number | null)[][] = []
  for (let i = muniRowIdx + 2; i < data.length; i++) {
    const row = data[i]
    if (!row) continue
    const año = row[0]
    if (!año || !String(año).match(/^\d{4}$/)) break
    anios.push(String(año))
    dataRows.push(row)
  }
  if (anios.length === 0) return []

  // Fuente (si aparece en la hoja)
  let fuente = FUENTE_DEFAULT
  for (const row of data) {
    const c0 = row?.[1] ?? row?.[0]
    if (typeof c0 === 'string' && /^fuente/i.test(c0.trim())) {
      fuente = c0.replace(/^fuente\s*:?\s*/i, '').trim()
      break
    }
  }

  return munis.map((m) => {
    const numeros = dataRows.map((row) => {
      const v = row[m.numCol]
      return v === null || v === undefined || v === '' ? '' : Math.round(Number(v)).toString()
    })
    const tasas = dataRows.map((row) => {
      const v = row[m.tasaCol]
      return v === null || v === undefined || v === '' ? '' : round2(Number(v))
    })
    return {
      titulo: `${indicadorNombre} en ${m.display}`,
      tipo: 'bar' as const,
      ubicacion: [m.ubicacion],
      tablaDatos: {
        rows: [
          makeRow(['', ...anios]),
          makeRow(['Número absoluto', ...numeros]),
          makeRow(['Tasa por cada 100 mil hab.', ...tasas]),
        ],
      },
      unidadMedida: 'unidades',
      fuente: 'otra',
      fuentePersonalizada: fuente,
      descripcionContexto: `${indicadorNombre} en ${m.display}: número absoluto de casos y tasa por cada 100 mil habitantes.`,
      series: [
        {nombre: 'Número absoluto', tipoSerie: 'bar', color: '#3b82f6'},
        {nombre: 'Tasa por cada 100 mil hab.', tipoSerie: 'line', color: '#ef4444', ejeSecundario: true},
      ],
    }
  })
}

// Cada hoja del libro corresponde a un indicador; el parser de cada indicador lee SU hoja.
export function parseHomicidioDoloso(wb: XLSX.WorkBook): GeneratedGrafica[] {
  return parseHoja(wb.Sheets['Homicidio Doloso'], 'Homicidio Doloso')
}
export function parseFeminicidio(wb: XLSX.WorkBook): GeneratedGrafica[] {
  return parseHoja(wb.Sheets['Feminicidio'], 'Feminicidio')
}
export function parseRoboConViolencia(wb: XLSX.WorkBook): GeneratedGrafica[] {
  return parseHoja(wb.Sheets['Robo con violencia'], 'Robo con Violencia')
}
export function parseViolenciaFamiliar(wb: XLSX.WorkBook): GeneratedGrafica[] {
  return parseHoja(wb.Sheets['Violencia Familiar'], 'Violencia Familiar')
}
