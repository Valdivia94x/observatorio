/**
 * Migration OBSLAG Participación Ciudadana:
 *  - Financiamiento a Partidos Políticos: abreviar "Agrupaciones/Asociaciones Políticas" → "AP"
 *    en el encabezado de la tabla (etiqueta del eje X).
 *
 * Uso:
 *   Dry-run:  pnpm exec sanity exec scripts/fix-participacion-obslag.ts --with-user-token
 *   Aplicar:  APPLY=1 pnpm exec sanity exec scripts/fix-participacion-obslag.ts --with-user-token
 */
import {getCliClient} from 'sanity/cli'

const APPLY = process.env.APPLY === '1'
const RE_AP = /^(asociaciones|agrupaciones)\s+pol/i

interface Row {cells: string[]; [k: string]: unknown}
interface Grafica {_key: string; titulo?: string; tablaDatos?: {rows: Row[]}; [k: string]: unknown}
interface Indicador {_id: string; title?: string; contenido?: Grafica[]}

async function main() {
  const client = getCliClient()
  console.log(`Modo: ${APPLY ? 'APPLY (escribe)' : 'DRY-RUN (sin escribir)'}\n`)

  const indicadores = await client.fetch<Indicador[]>(
    `*[_type == "indicador" && count(contenido[titulo match "Financiamiento a Partidos*"]) > 0]{_id, title, contenido[]}`,
  )

  let changes = 0
  let docs = 0

  for (const ind of indicadores) {
    if (!ind.contenido) continue
    let changed = false
    const updated = ind.contenido.map((g) => {
      if (!g.titulo?.startsWith('Financiamiento a Partidos') || !g.tablaDatos?.rows) return g
      const header = g.tablaDatos.rows[0]
      if (!header?.cells?.some((c) => typeof c === 'string' && RE_AP.test(c))) return g
      const newCells = header.cells.map((c) => (typeof c === 'string' && RE_AP.test(c) ? 'AP' : c))
      const rows = g.tablaDatos.rows.map((r) => (r === header ? {...r, cells: newCells} : r))
      console.log(`[${ind.title}] "${g.titulo}": → AP`)
      changes++; changed = true
      return {...g, tablaDatos: {...g.tablaDatos, rows}}
    })
    if (changed) {
      docs++
      if (APPLY) {
        await client.patch(ind._id).set({contenido: updated}).commit()
        console.log(`  ✓ Doc ${ind._id} actualizado.`)
      }
    }
  }

  console.log(`\nResumen:\n  Cambios: ${changes}\n  Documentos: ${docs}`)
  if (!APPLY) console.log(`\n(Dry-run completado — no se escribió nada.)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
