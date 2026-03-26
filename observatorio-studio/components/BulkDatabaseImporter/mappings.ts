// Periodicidad texto → schema slug
export const PERIODICIDAD_MAP: Record<string, string> = {
  anual: 'anual',
  bianual: 'bianual',
  mensual: 'mensual',
  trimestral: 'trimestral',
  quinquenal: 'quinquenal',
  unico: 'unico',
}

// Fuente texto → schema slug (busqueda parcial case-insensitive)
const FUENTE_KEYWORDS: [string, string][] = [
  ['inegi', 'inegi'],
  ['coneval', 'coneval'],
  ['imco', 'imco'],
  ['conapo', 'conapo'],
  ['salud', 'salud'],
  ['economia', 'economia'],
  ['sesnsp', 'sesnsp'],
  ['banxico', 'banxico'],
  ['banco de m', 'banxico'],
  ['shcp', 'shcp'],
  ['sep', 'sep'],
  ['conagua', 'conagua'],
  ['semarnat', 'semarnat'],
]

// Unidades texto → unidadMedida slug
export const UNIDADES_MAP: Record<string, string> = {
  porcentaje: 'porcentaje',
  '%': 'porcentaje',
  pesos: 'pesos',
  'pesos (mxn)': 'pesos',
  'miles de pesos': 'miles-pesos',
  'millones de pesos': 'millones-pesos',
  habitantes: 'habitantes',
  'miles de habitantes': 'miles-habitantes',
  'tasa por 100,000 hab.': 'tasa-100mil',
  'tasa por 100,000': 'tasa-100mil',
  'tasa por 100 mil': 'tasa-100mil',
  indice: 'indice',
  'indice (0-100)': 'indice',
  unidades: 'unidades',
  hectareas: 'hectareas',
  kilometros: 'kilometros',
  toneladas: 'toneladas',
  litros: 'litros',
}

// Municipio/Estado/Nacional del Excel → ubicacion slug del schema
// Solo estas ubicaciones son validas en la plataforma
const UBICACION_ENTRIES: [string, string, string][] = [
  // [valor municipio/nacional, valor estado, slug]
  ['torreón', '', 'torreon'],
  ['torreon', '', 'torreon'],
  ['gómez palacio', '', 'gomez-palacio'],
  ['gomez palacio', '', 'gomez-palacio'],
  ['lerdo', '', 'lerdo'],
  ['matamoros', '', 'matamoros'],
]

const ESTADO_TO_UBICACION: Record<string, string> = {
  coahuila: 'estatal-coahuila',
  durango: 'estatal-durango',
}

// Ubicacion slug → label legible para titulos
export const UBICACION_LABELS: Record<string, string> = {
  torreon: 'Torreon',
  'gomez-palacio': 'Gomez Palacio',
  lerdo: 'Lerdo',
  matamoros: 'Matamoros',
  'estatal-coahuila': 'Coahuila',
  'estatal-durango': 'Durango',
  nacional: 'Nacional',
}

// Resuelve la ubicacion de una fila del Excel
// Retorna el slug o null si no tiene ubicacion valida
export function resolveUbicacion(row: {
  municipio: string | null
  estado: string | null
  nacional: string | null
}): string | null {
  // Nacional
  if (row.nacional && row.nacional.trim().toLowerCase() === 'nacional') {
    return 'nacional'
  }

  // Municipio
  if (row.municipio && row.municipio.trim() !== '') {
    const lower = row.municipio.trim().toLowerCase()
    for (const [munVal, , slug] of UBICACION_ENTRIES) {
      if (lower === munVal) return slug
    }
    // Municipio no reconocido
    return null
  }

  // Estatal (cuando hay estado pero no municipio)
  if (row.estado && row.estado.trim() !== '') {
    const lower = row.estado.trim().toLowerCase()
    return ESTADO_TO_UBICACION[lower] ?? null
  }

  return null
}

const MESES_CORTOS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
]

// Busca el slug de fuente por coincidencia parcial en el texto
export function matchFuente(texto: string): string {
  const lower = texto.trim().toLowerCase()
  for (const [keyword, slug] of FUENTE_KEYWORDS) {
    if (lower.includes(keyword)) return slug
  }
  return 'otra'
}

// Busca el slug de unidadMedida
export function matchUnidades(texto: string): string {
  const lower = texto.trim().toLowerCase()
  return UNIDADES_MAP[lower] ?? 'otro'
}

// Busca el slug de periodicidad
export function matchPeriodicidad(texto: string): string {
  const lower = texto.trim().toLowerCase()
  return PERIODICIDAD_MAP[lower] ?? 'anual'
}

// Formato de etiqueta de periodo segun periodicidad
export function formatTimePeriod(periodicidad: string, anio: string, trimestre: string | null, mes: string | null): string {
  const lower = periodicidad.toLowerCase()
  if (lower === 'trimestral' && trimestre) {
    return `T${trimestre} ${anio}`
  }
  if (lower === 'mensual' && mes) {
    const mesNum = parseInt(mes, 10)
    if (!isNaN(mesNum) && mesNum >= 1 && mesNum <= 12) {
      return `${MESES_CORTOS[mesNum - 1]} ${anio}`
    }
    return `${mes} ${anio}`
  }
  return anio
}

// Convierte etiqueta de periodo a numero sorteable
function periodToSortKey(period: string): number {
  // "T1 2019" → 2019.1
  const trimMatch = period.match(/^T(\d)\s+(\d{4})$/)
  if (trimMatch) {
    return parseInt(trimMatch[2], 10) + parseInt(trimMatch[1], 10) / 10
  }

  // "Ene 2021" → 2021.01
  const mesMatch = period.match(/^(\w+)\s+(\d{4})$/)
  if (mesMatch) {
    const mesIndex = MESES_CORTOS.indexOf(mesMatch[1])
    if (mesIndex >= 0) {
      return parseInt(mesMatch[2], 10) + (mesIndex + 1) / 100
    }
  }

  // "2019" → 2019.0
  const yearNum = parseInt(period, 10)
  if (!isNaN(yearNum)) return yearNum

  return 0
}

// Ordena etiquetas de periodo cronologicamente
export function sortTimePeriods(periods: string[]): string[] {
  return [...periods].sort((a, b) => periodToSortKey(a) - periodToSortKey(b))
}
