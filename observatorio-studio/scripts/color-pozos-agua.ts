/**
 * Migration: asigna colores a las gráficas "Pozos de Agua Registrados en {Muni}"
 * Activos = rojo (#ef4444), Inactivos = azul (#3b82f6), por orden de serie.
 *
 * Uso:
 *   Dry-run:  pnpm exec sanity exec scripts/color-pozos-agua.ts --with-user-token
 *   Aplicar:  APPLY=1 pnpm exec sanity exec scripts/color-pozos-agua.ts --with-user-token
 */
import {getCliClient} from 'sanity/cli'

const APPLY = process.env.APPLY === '1'
const COLORES = ['#3b82f6', '#9ca3af'] // Activos (azul), Inactivos (gris)

interface TableRow {
  cells: string[]
}

interface Grafica {
  _key: string
  titulo?: string
  colores?: string[]
  tablaDatos?: {rows: TableRow[]}
  [k: string]: unknown
}

interface Indicador {
  _id: string
  title?: string
  contenido?: Grafica[]
}

async function main() {
  const client = getCliClient()
  console.log(`Modo: ${APPLY ? 'APPLY (escribe)' : 'DRY-RUN (sin escribir)'}\n`)

  const indicadores = await client.fetch<Indicador[]>(
    `*[_type == "indicador" && title match "Pozos de agua registrados*"]{_id, title, contenido[]}`,
  )

  let totalChanges = 0
  let docsToUpdate = 0

  for (const ind of indicadores) {
    if (!ind.contenido) continue
    const updated = [...ind.contenido]
    let changed = false

    for (let i = 0; i < updated.length; i++) {
      const g = updated[i]
      if (!g.titulo?.startsWith('Pozos de Agua Registrados')) continue

      const serieLabels = (g.tablaDatos?.rows || []).slice(1).map((r) => r.cells[0])
      console.log(`[${ind.title}] "${g.titulo}"`)
      console.log(`  series: ${JSON.stringify(serieLabels)}`)
      console.log(`  colores: ${JSON.stringify(g.colores)} → ${JSON.stringify(COLORES)}`)

      updated[i] = {...g, colores: COLORES}
      totalChanges++
      changed = true
    }

    if (changed) {
      docsToUpdate++
      if (APPLY) {
        await client.patch(ind._id).set({contenido: updated}).commit()
        console.log(`  ✓ Doc ${ind._id} actualizado.`)
      }
    }
  }

  console.log(`\nResumen:`)
  console.log(`  Gráficas a modificar: ${totalChanges}`)
  console.log(`  Documentos a actualizar: ${docsToUpdate}`)
  if (!APPLY) console.log(`\n(Dry-run completado — no se escribió nada.)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
