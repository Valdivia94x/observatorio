import {useMemo} from 'react'
import {nanoid} from 'nanoid'
import type {NormalizedRow, IndicatorPlan, PlannedGraficaWidget, TableRow, TableValue} from './types'
import {
  formatTimePeriod,
  sortTimePeriods,
  matchFuente,
  matchUnidades,
  matchPeriodicidad,
  resolveUbicacion,
  UBICACION_LABELS,
} from './mappings'

export function useDataTransformer(rows: NormalizedRow[]): IndicatorPlan[] {
  return useMemo(() => transformRows(rows), [rows])
}

export function transformRows(rows: NormalizedRow[]): IndicatorPlan[] {
  if (rows.length === 0) return []

  // Group rows by indicator name
  const groups = new Map<string, NormalizedRow[]>()
  for (const row of rows) {
    const key = row.indicador.trim()
    if (!key) continue
    const existing = groups.get(key) || []
    existing.push(row)
    groups.set(key, existing)
  }

  // Transform each group into an IndicatorPlan
  const plans: IndicatorPlan[] = []

  for (const [indicadorName, indicadorRows] of groups) {
    const plan = buildIndicatorPlan(indicadorName, indicadorRows)
    if (plan) plans.push(plan)
  }

  return plans
}

function buildIndicatorPlan(
  indicadorName: string,
  rows: NormalizedRow[],
): IndicatorPlan | null {
  if (rows.length === 0) return null

  // Extract metadata from first row
  const first = rows[0]
  const periodicidad = first.periodicidad || 'Anual'
  const descripcion = first.descripcion
  const unidades = first.unidades
  const fuente = first.fuente
  const grupo = first.grupo || ''

  // Group rows by ubicacion
  const ubicacionGroups = new Map<string, NormalizedRow[]>()
  for (const row of rows) {
    const ubicacion = resolveUbicacion(row)
    if (!ubicacion) continue // Skip rows with unrecognized ubicacion
    const existing = ubicacionGroups.get(ubicacion) || []
    existing.push(row)
    ubicacionGroups.set(ubicacion, existing)
  }

  // Build one chart per ubicacion
  const graficas: PlannedGraficaWidget[] = []
  for (const [ubicacion, ubicacionRows] of ubicacionGroups) {
    const chart = buildChart(
      indicadorName,
      ubicacionRows,
      periodicidad,
      ubicacion,
      {descripcion, unidades, fuente},
    )
    if (chart) graficas.push(chart)
  }

  if (graficas.length === 0) return null

  return {
    indicadorName,
    grupo,
    existingDocId: null, // Will be set later by sanityOperations
    periodicidad: matchPeriodicidad(periodicidad),
    descripcion,
    fuente: fuente ? matchFuente(fuente) : null,
    fuenteTexto: fuente,
    unidades,
    graficas,
  }
}

function buildChart(
  indicadorName: string,
  rows: NormalizedRow[],
  periodicidad: string,
  ubicacion: string,
  metadata: {descripcion: string | null; unidades: string | null; fuente: string | null},
): PlannedGraficaWidget | null {
  // Collect unique time periods
  const periodsSet = new Set<string>()
  for (const row of rows) {
    const period = formatTimePeriod(periodicidad, row.anio, row.trimestre, row.mes)
    periodsSet.add(period)
  }
  const periods = sortTimePeriods(Array.from(periodsSet))

  if (periods.length === 0) return null

  // Determine which value column to use
  const useAbsolute = ['anual', 'bianual', 'quinquenal'].includes(periodicidad.toLowerCase())

  // Build lookup map: "period" → value
  const valueMap = new Map<string, string>()
  for (const row of rows) {
    const period = formatTimePeriod(periodicidad, row.anio, row.trimestre, row.mes)

    let value: string | null = null
    if (useAbsolute) {
      value = row.valorAbsoluto ?? row.valorRelativo
    } else {
      value = row.valorRelativo ?? row.valorAbsoluto
    }

    if (value !== null) {
      const num = parseFloat(value)
      if (!isNaN(num)) {
        value = parseFloat(num.toFixed(2)).toString()
      }
    }

    valueMap.set(period, value ?? '')
  }

  // Build @sanity/table format
  // Row 0 (header): ["", period1, period2, ...]
  // Row 1 (data):   ["SeriesName", value1, value2, ...]
  const seriesName = UBICACION_LABELS[ubicacion] || indicadorName
  const tableRows: TableRow[] = [
    {
      _type: 'tableRow',
      _key: nanoid(),
      cells: ['', ...periods],
    },
    {
      _type: 'tableRow',
      _key: nanoid(),
      cells: [seriesName, ...periods.map((p) => valueMap.get(p) ?? '')],
    },
  ]

  const tablaDatos: TableValue = {rows: tableRows}

  // Determine year range
  const years = rows
    .map((r) => parseInt(r.anio, 10))
    .filter((y) => !isNaN(y))
  const anioInicio = Math.min(...years)
  const anioFin = Math.max(...years)

  // Chart title: "Indicador (Ubicacion)"
  const ubicacionLabel = UBICACION_LABELS[ubicacion] || ubicacion
  const titulo = `${indicadorName} (${ubicacionLabel})`

  return {
    titulo,
    tipo: 'line',
    ubicacion,
    anioInicio,
    anioFin,
    unidadMedida: metadata.unidades ? matchUnidades(metadata.unidades) : 'unidades',
    fuente: metadata.fuente ? matchFuente(metadata.fuente) : 'otra',
    fuentePersonalizada: metadata.fuente && matchFuente(metadata.fuente) === 'otra' ? metadata.fuente : undefined,
    descripcionContexto: metadata.descripcion || '',
    tablaDatos,
  }
}
