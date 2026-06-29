/**
 * Migration: en las gráficas "Vehículos de Motor Registrados en {Muni}", mueve la serie
 * "Automóviles" al final (última fila de tablaDatos, después del encabezado).
 *
 * Uso:
 *   Dry-run:  pnpm exec sanity exec scripts/reorder-vehiculos.ts --with-user-token
 *   Aplicar:  APPLY=1 pnpm exec sanity exec scripts/reorder-vehiculos.ts --with-user-token
 */
import {getCliClient} from 'sanity/cli'

const APPLY = process.env.APPLY === '1'

interface Row {
  _key?: string
  _type?: string
  cells: string[]
}
interface Grafica {
  _key: string
  titulo?: string
  tablaDatos?: {rows: Row[]}
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
    `*[_type == "indicador" && count(contenido[titulo match "Vehículos de Motor Registrados*"]) > 0]{_id, title, contenido[]}`,
  )

  let totalCharts = 0
  let docsToUpdate = 0

  for (const ind of indicadores) {
    if (!ind.contenido) continue
    let changed = false
    const updated = ind.contenido.map((g) => {
      if (!g.titulo?.startsWith('Vehículos de Motor Registrados') || !g.tablaDatos?.rows) return g
      const rows = g.tablaDatos.rows
      const header = rows[0]
      const body = rows.slice(1)
      const autoIdx = body.findIndex((r) => typeof r.cells?.[0] === 'string' && r.cells[0].toLowerCase().startsWith('autom'))
      if (autoIdx === -1 || autoIdx === body.length - 1) return g // no está o ya es el último
      const reordered = [...body]
      const [auto] = reordered.splice(autoIdx, 1)
      reordered.push(auto)
      console.log(`[${ind.title}] "${g.titulo}": Automóviles ${autoIdx} → ${reordered.length - 1}`)
      totalCharts++
      changed = true
      return {...g, tablaDatos: {...g.tablaDatos, rows: [header, ...reordered]}}
    })
    if (changed) {
      docsToUpdate++
      if (APPLY) {
        await client.patch(ind._id).set({contenido: updated}).commit()
        console.log(`  ✓ Doc ${ind._id} actualizado.`)
      }
    }
  }

  console.log(`\nResumen:\n  Gráficas a reordenar: ${totalCharts}\n  Documentos: ${docsToUpdate}`)
  if (!APPLY) console.log(`\n(Dry-run completado — no se escribió nada.)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
