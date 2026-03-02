import {useMemo} from 'react'
import {nanoid} from 'nanoid'
import type {NormalizedRow, IndicatorPlan, PlannedGraficaWidget, TableRow, TableValue} from './types'
import {
  formatTimePeriod,
  sortTimePeriods,
  matchFuente,
  matchUnidades,
  matchPeriodicidad,
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

  // Separate municipal vs nacional rows
  const municipalRows = rows.filter(
    (r) => r.municipio && r.municipio.trim() !== '' && r.nacional !== 'Nacional',
  )
  const nacionalRows = rows.filter((r) => r.nacional === 'Nacional')

  const graficas: PlannedGraficaWidget[] = []

  // Build municipal chart
  if (municipalRows.length > 0) {
    const chart = buildChart(
      indicadorName,
      municipalRows,
      periodicidad,
      'municipal',
      {descripcion, unidades, fuente},
    )
    if (chart) graficas.push(chart)
  }

  // Build nacional chart
  if (nacionalRows.length > 0) {
    const chart = buildChart(
      indicadorName,
      nacionalRows,
      periodicidad,
      'nacional',
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
  level: 'municipal' | 'nacional',
  metadata: {descripcion: string | null; unidades: string | null; fuente: string | null},
): PlannedGraficaWidget | null {
  // Determine series names (municipalities or "Nacional")
  const seriesNames: string[] = []
  if (level === 'municipal') {
    const uniqueMunicipios = new Set<string>()
    for (const row of rows) {
      if (row.municipio) uniqueMunicipios.add(row.municipio.trim())
    }
    seriesNames.push(...Array.from(uniqueMunicipios).sort())
  } else {
    seriesNames.push('Nacional')
  }

  if (seriesNames.length === 0) return null

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

  // Build lookup map: "series|period" → value
  const valueMap = new Map<string, string>()
  for (const row of rows) {
    const seriesKey = level === 'municipal' ? (row.municipio?.trim() || '') : 'Nacional'
    const period = formatTimePeriod(periodicidad, row.anio, row.trimestre, row.mes)
    const key = `${seriesKey}|${period}`

    let value: string | null = null
    if (useAbsolute) {
      value = row.valorAbsoluto ?? row.valorRelativo
    } else {
      value = row.valorRelativo ?? row.valorAbsoluto
    }

    if (value !== null) {
      // Round to 2 decimal places if numeric
      const num = parseFloat(value)
      if (!isNaN(num)) {
        value = parseFloat(num.toFixed(2)).toString()
      }
    }

    valueMap.set(key, value ?? '')
  }

  // Build @sanity/table format
  const tableRows: TableRow[] = []

  // Header row: ["", period1, period2, ...]
  tableRows.push({
    _type: 'tableRow',
    _key: nanoid(),
    cells: ['', ...periods],
  })

  // Data rows: ["SeriesName", value1, value2, ...]
  for (const series of seriesNames) {
    const cells = [series]
    for (const period of periods) {
      cells.push(valueMap.get(`${series}|${period}`) ?? '')
    }
    tableRows.push({
      _type: 'tableRow',
      _key: nanoid(),
      cells,
    })
  }

  const tablaDatos: TableValue = {rows: tableRows}

  // Determine year range
  const years = rows
    .map((r) => parseInt(r.anio, 10))
    .filter((y) => !isNaN(y))
  const anioInicio = Math.min(...years)
  const anioFin = Math.max(...years)

  // Chart title
  const suffix = level === 'municipal' ? '(Municipal)' : '(Nacional)'
  const titulo = `${indicadorName} ${suffix}`

  return {
    titulo,
    tipo: 'line',
    ubicacion: level === 'nacional' ? 'nacional' : 'general',
    anioInicio,
    anioFin,
    unidadMedida: metadata.unidades ? matchUnidades(metadata.unidades) : 'unidades',
    fuente: metadata.fuente ? matchFuente(metadata.fuente) : 'otra',
    fuentePersonalizada: metadata.fuente && matchFuente(metadata.fuente) === 'otra' ? metadata.fuente : undefined,
    descripcionContexto: metadata.descripcion || '',
    tablaDatos,
  }
}
