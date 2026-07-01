/**
 * Migration OBSLAG Economía — Exportaciones a MILES DE MILLONES de dólares:
 * Deja los valores en miles de millones de dólares (÷1,000,000 respecto a los miles originales)
 * y la unidad como 'otro' con subleyenda "Miles de millones de dólares". No toca filas de
 * porcentaje ("% del nacional"). Idempotente (guard por unidadMedidaPersonalizada).
 *
 * Los datos actuales ya venían divididos entre 1,000 (millones) por la migración previa, así que
 * aquí solo se divide entre 1,000 adicional. Si se corre sobre datos en miles originales, ajustar.
 *
 * El bug Coahuila=Durango y la fila "Total de la entidad" solo se corrigen re-importando.
 *
 * Uso:
 *   Dry-run:  pnpm exec sanity exec scripts/fix-exportaciones-mdd.ts --with-user-token
 *   Aplicar:  APPLY=1 pnpm exec sanity exec scripts/fix-exportaciones-mdd.ts --with-user-token
 */
import {getCliClient} from 'sanity/cli'

const APPLY = process.env.APPLY === '1'
const UNIDAD = 'Miles de millones de dólares'

interface Row {cells: string[]; [k: string]: unknown}
interface Grafica {_key: string; titulo?: string; unidadMedida?: string; unidadMedidaPersonalizada?: string; tablaDatos?: {rows: Row[]}; [k: string]: unknown}
interface Indicador {_id: string; title?: string; contenido?: Grafica[]}

// Divide entre 1,000 (millones → miles de millones), 1 decimal
function div1000(cell: string): string {
  if (cell === '' || cell === null || cell === undefined) return cell
  const n = Number(cell)
  if (isNaN(n)) return cell
  return parseFloat((n / 1000).toFixed(1)).toString()
}

const esFilaPorcentaje = (label: string) =>
  typeof label === 'string' && (/%/.test(label) || /porcentaje|nacional/i.test(label))

async function main() {
  const client = getCliClient()
  console.log(`Modo: ${APPLY ? 'APPLY (escribe)' : 'DRY-RUN (sin escribir)'}\n`)

  const inds = await client.fetch<Indicador[]>(
    `*[_type == "indicador" && title == "Exportaciones"]{_id, title, contenido[]}`,
  )

  let charts = 0
  let docs = 0

  for (const ind of inds) {
    if (!ind.contenido) continue
    let changed = false
    const updated = ind.contenido.map((g) => {
      const t = g.titulo || ''
      const esExport =
        t.startsWith('Exportaciones de') ||
        t.startsWith('Exportaciones por Subactividad') ||
        t.startsWith('Ranking Nacional de Exportaciones')
      if (!esExport || !g.tablaDatos?.rows) return g
      if (g.unidadMedidaPersonalizada === UNIDAD) return g // ya convertido

      const isRanking = t.startsWith('Ranking Nacional de Exportaciones')
      const rows = g.tablaDatos.rows.map((r, ri) => {
        if (ri === 0) {
          if (isRanking) return {...r, cells: r.cells.map((c) => (typeof c === 'string' ? c.replace(/\(millones USD\)|\(miles USD\)/i, '(miles de millones USD)') : c))}
          return r
        }
        if (isRanking) return {...r, cells: r.cells.map((c, ci) => (ci === 2 ? div1000(c) : c))}
        if (esFilaPorcentaje(r.cells[0])) return r
        return {...r, cells: r.cells.map((c, ci) => (ci === 0 ? c : div1000(c)))}
      })
      console.log(`[${ind.title}] "${t}": ÷1000 → miles de millones`)
      charts++
      changed = true
      return {...g, tablaDatos: {...g.tablaDatos, rows}, unidadMedida: 'otro', unidadMedidaPersonalizada: UNIDAD}
    })
    if (changed) {
      docs++
      if (APPLY) {
        await client.patch(ind._id).set({contenido: updated}).commit()
        console.log(`  ✓ Doc ${ind._id} actualizado.`)
      }
    }
  }

  console.log(`\nResumen:\n  Gráficas convertidas: ${charts}\n  Documentos: ${docs}`)
  if (!APPLY) console.log(`\n(Dry-run completado — no se escribió nada.)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
