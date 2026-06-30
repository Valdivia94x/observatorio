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

function round1(n: number): string {
  return parseFloat(n.toFixed(1)).toString()
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
      return v === null || v === undefined || v === '' ? '' : round1(Number(v))
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
      nota: 'Las cifras hacen referencia a carpetas de investigación.',
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
export function parseRobosPatrimoniales(wb: XLSX.WorkBook): GeneratedGrafica[] {
  return parseHoja(wb.Sheets['Robos patrimoniales'], 'Robos Patrimoniales')
}

// Hojas "Percepción de inseguridad" / "Desempeño de autoridades":
// por trimestre, columnas La Laguna / Torreón / Nacional (valores en %).
// Genera una gráfica de barras por municipio: Torreón con 3 series (La Laguna, Torreón, Nacional);
// Matamoros/Gómez/Lerdo con 2 (La Laguna, Nacional), pues no tienen dato propio.
function parsePercepcion(sheet: XLSX.Sheet | undefined, indicadorNombre: string): GeneratedGrafica[] {
  if (!sheet) return []
  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: null})

  // Header: [Periodo, La Laguna, Torreón, Nacional]
  let headerIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && typeof row[0] === 'string' && row[0].trim().toLowerCase() === 'periodo') {
      headerIdx = i
      break
    }
  }
  if (headerIdx === -1) return []
  const header = data[headerIdx]
  const colDe = (name: string) =>
    header.findIndex((c) => typeof c === 'string' && c.trim().toLowerCase() === name.toLowerCase())
  const lagCol = colDe('La Laguna')
  const torCol = colDe('Torreón') >= 0 ? colDe('Torreón') : colDe('Torreon')
  const nacCol = colDe('Nacional')
  if (lagCol === -1 || nacCol === -1) return []

  const periodos: string[] = []
  const dataRows: (string | number | null)[][] = []
  for (let i = headerIdx + 1; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[0]) break
    const p = String(row[0]).trim()
    if (p.toLowerCase().startsWith('fuente') || p.toLowerCase().startsWith('nota')) break
    periodos.push(p)
    dataRows.push(row)
  }
  if (periodos.length === 0) return []

  const valoresDe = (col: number) =>
    dataRows.map((row) => {
      const v = row[col]
      return v === null || v === undefined || v === '' ? '' : parseFloat(Number(v).toFixed(1)).toString()
    })
  const laguna = valoresDe(lagCol)
  const nacional = valoresDe(nacCol)
  const torreon = torCol >= 0 ? valoresDe(torCol) : []

  const COLOR_LAGUNA = '#3b82f6'
  const COLOR_TORREON = '#22c55e'
  const COLOR_NACIONAL = '#9ca3af'

  const graficas: GeneratedGrafica[] = []

  // La Laguna (cubre Matamoros, Gómez Palacio y Lerdo, que no tienen dato propio): La Laguna vs Nacional.
  // Se muestra al filtrar cualquiera de esos municipios y una sola vez en "todas las ubicaciones".
  graficas.push({
    titulo: `${indicadorNombre} en La Laguna`,
    tipo: 'bar',
    ubicacion: ['matamoros', 'gomez-palacio', 'lerdo'],
    tablaDatos: {rows: [makeRow(['', ...periodos]), makeRow(['La Laguna', ...laguna]), makeRow(['Nacional', ...nacional])]},
    unidadMedida: 'porcentaje',
    fuente: 'inegi',
    descripcionContexto: `${indicadorNombre} en la Zona Metropolitana de La Laguna, comparativo vs el promedio Nacional por trimestre. Fuente: INEGI, Encuesta Nacional de Seguridad Pública Urbana.`,
    colores: [COLOR_LAGUNA, COLOR_NACIONAL],
  })

  // Torreón: La Laguna vs Torreón vs Nacional (3 barras; se muestran los valores en fuente pequeña)
  if (torreon.length) {
    graficas.push({
      titulo: `${indicadorNombre} en Torreón`,
      tipo: 'bar',
      ubicacion: ['torreon'],
      tablaDatos: {
        rows: [
          makeRow(['', ...periodos]),
          makeRow(['La Laguna', ...laguna]),
          makeRow(['Torreón', ...torreon]),
          makeRow(['Nacional', ...nacional]),
        ],
      },
      unidadMedida: 'porcentaje',
      fuente: 'inegi',
      descripcionContexto: `${indicadorNombre} en Torreón, comparativo con La Laguna y el promedio Nacional por trimestre. Fuente: INEGI, Encuesta Nacional de Seguridad Pública Urbana.`,
      colores: [COLOR_LAGUNA, COLOR_TORREON, COLOR_NACIONAL],
    })
  }

  return graficas
}

export function parsePercepcionInseguridad(wb: XLSX.WorkBook): GeneratedGrafica[] {
  return parsePercepcion(wb.Sheets['Percepción de inseguridad'], 'Percepción de Inseguridad')
}
export function parseDesempenoAutoridades(wb: XLSX.WorkBook): GeneratedGrafica[] {
  return parsePercepcion(wb.Sheets['Desempeño de autoridades'], 'Confianza en la Policía Municipal')
}
