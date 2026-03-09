import {nanoid} from 'nanoid'
import type {SanityClient} from 'sanity'
import type {IndicatorPlan, ImportResult} from './types'

interface ExistingIndicator {
  _id: string
  title: string
  contenido: any[] | null
  periodicidad: string | null
}

interface ExistingEje {
  _id: string
  title: string
}

// Find all existing indicators matching the given names
export async function findExistingIndicators(
  client: SanityClient,
  names: string[],
): Promise<Map<string, ExistingIndicator>> {
  const lowerNames = names.map((n) => n.toLowerCase())
  const query = `*[_type == "indicador" && !(_id in path("drafts.**")) && lower(title) in $names]{
    _id, title, contenido, periodicidad
  }`
  const results: ExistingIndicator[] = await client.fetch(query, {names: lowerNames})

  const map = new Map<string, ExistingIndicator>()
  for (const doc of results) {
    map.set(doc.title.toLowerCase(), doc)
  }
  return map
}

// Find or create an eje document by group name
async function findOrCreateEje(
  client: SanityClient,
  grupoName: string,
): Promise<string> {
  if (!grupoName) throw new Error('Nombre de grupo/eje vacio')

  // Try to find existing
  const existing: ExistingEje | null = await client.fetch(
    `*[_type == "eje" && !(_id in path("drafts.**")) && lower(title) == lower($name)][0]{_id, title}`,
    {name: grupoName},
  )

  if (existing) return existing._id

  // Create new eje
  const slug = grupoName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const newEje = await client.create({
    _type: 'eje',
    title: grupoName,
    slug: {_type: 'slug', current: slug},
  })

  return newEje._id
}

// Execute the bulk import: create/update all indicators
export async function executeBulkImport(
  client: SanityClient,
  plans: IndicatorPlan[],
  onProgress?: (current: number, total: number) => void,
): Promise<ImportResult> {
  const result: ImportResult = {created: 0, updated: 0, errors: []}

  // Batch-find existing indicators
  const names = plans.map((p) => p.indicadorName)
  const existingMap = await findExistingIndicators(client, names)

  // Annotate plans with existing doc IDs
  for (const plan of plans) {
    const existing = existingMap.get(plan.indicadorName.toLowerCase())
    if (existing) {
      plan.existingDocId = existing._id
    }
  }

  // Process each indicator
  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i]
    onProgress?.(i + 1, plans.length)

    try {
      if (plan.existingDocId) {
        await updateExistingIndicator(client, plan, existingMap)
        result.updated++
      } else {
        await createNewIndicator(client, plan)
        result.created++
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      result.errors.push(`Error en "${plan.indicadorName}": ${msg}`)
    }
  }

  return result
}

async function updateExistingIndicator(
  client: SanityClient,
  plan: IndicatorPlan,
  existingMap: Map<string, ExistingIndicator>,
) {
  const existing = existingMap.get(plan.indicadorName.toLowerCase())
  if (!existing) throw new Error('Indicador no encontrado')

  const existingContenido = existing.contenido || []
  const updatedContenido = mergeGraficas(existingContenido, plan)

  const patch: Record<string, any> = {
    contenido: updatedContenido,
  }

  // Update metadata only if not already set
  if (!existing.periodicidad && plan.periodicidad) {
    patch.periodicidad = plan.periodicidad
  }

  await client.patch(existing._id).set(patch).commit()
}

async function createNewIndicator(client: SanityClient, plan: IndicatorPlan) {
  // Find or create eje
  const ejeId = await findOrCreateEje(client, plan.grupo)

  const contenido = plan.graficas.map((g) => ({
    _type: 'graficaWidget',
    _key: nanoid(),
    titulo: g.titulo,
    tipo: g.tipo,
    ubicacion: g.ubicacion,
    anioInicio: g.anioInicio,
    anioFin: g.anioFin,
    unidadMedida: g.unidadMedida,
    fuente: g.fuente,
    fuentePersonalizada: g.fuentePersonalizada,
    descripcionContexto: g.descripcionContexto,
    tablaDatos: g.tablaDatos,
    configLimpieza: {
      importedAt: new Date().toISOString(),
    },
  }))

  await client.create({
    _type: 'indicador',
    title: plan.indicadorName,
    eje: {_type: 'reference', _ref: ejeId},
    periodicidad: plan.periodicidad,
    rangoCobertura: `${contenido[0]?.anioInicio || ''} - ${contenido[0]?.anioFin || ''}`,
    contenido,
  })
}

// Merge new charts into existing contenido array
// Strategy: replace charts with matching titulo, append new ones
function mergeGraficas(existingContenido: any[], plan: IndicatorPlan): any[] {
  const result = [...existingContenido]

  for (const newGrafica of plan.graficas) {
    const existingIndex = result.findIndex(
      (g: any) => g._type === 'graficaWidget' && g.titulo === newGrafica.titulo,
    )

    const graficaDoc = {
      _type: 'graficaWidget',
      _key: existingIndex >= 0 ? result[existingIndex]._key : nanoid(),
      titulo: newGrafica.titulo,
      tipo: newGrafica.tipo,
      ubicacion: newGrafica.ubicacion,
      anioInicio: newGrafica.anioInicio,
      anioFin: newGrafica.anioFin,
      unidadMedida: newGrafica.unidadMedida,
      fuente: newGrafica.fuente,
      fuentePersonalizada: newGrafica.fuentePersonalizada,
      descripcionContexto: newGrafica.descripcionContexto,
      tablaDatos: newGrafica.tablaDatos,
      configLimpieza: {
        importedAt: new Date().toISOString(),
      },
    }

    if (existingIndex >= 0) {
      result[existingIndex] = graficaDoc
    } else {
      result.push(graficaDoc)
    }
  }

  return result
}
