/**
 * Migration OBSLAG Economía — Exportaciones a MDD:
 * Divide entre 1,000 los valores en miles de dólares para dejarlos en millones de dólares (MDD)
 * en los datos ya importados, y cambia la unidad a 'millones-dolares'. NO toca las filas de
 * porcentaje ("% del nacional"). Idempotente (salta si la unidad ya es millones-dolares).
 *
 * Nota: el bug Coahuila=Durango en la tabla de subactividad y la fila "Total de la entidad"
 * solo se corrigen re-importando (esta migración solo aplica la división).
 *
 * Uso:
 *   Dry-run:  pnpm exec sanity exec scripts/fix-exportaciones-mdd.ts --with-user-token
 *   Aplicar:  APPLY=1 pnpm exec sanity exec scripts/fix-exportaciones-mdd.ts --with-user-token
 */
import {getCliClient} from 'sanity/cli'

const APPLY = process.env.APPLY === '1'

interface Row {cells: string[]; [k: string]: unknown}
interface Grafica {_key: string; titulo?: string; unidadMedida?: string; tablaDatos?: {rows: Row[]}; [k: string]: unknown}
interface Indicador {_id: string; title?: string; contenido?: Grafica[]}

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
      if (g.unidadMedida === 'millones-dolares') return g // ya convertido

      const isRanking = t.startsWith('Ranking Nacional de Exportaciones')
      const rows = g.tablaDatos.rows.map((r, ri) => {
        if (ri === 0) {
          // Ranking: actualizar encabezado "miles USD" → "millones USD"
          if (isRanking) return {...r, cells: r.cells.map((c) => (typeof c === 'string' ? c.replace(/miles USD/i, 'millones USD') : c))}
          return r
        }
        if (isRanking) {
          // Divide solo la columna de valor (índice 2), preserva # y entidad
          return {...r, cells: r.cells.map((c, ci) => (ci === 2 ? div1000(c) : c))}
        }
        // Barras / subactividad: no dividir filas de porcentaje; saltar la etiqueta (col 0)
        if (esFilaPorcentaje(r.cells[0])) return r
        return {...r, cells: r.cells.map((c, ci) => (ci === 0 ? c : div1000(c)))}
      })
      console.log(`[${ind.title}] "${t}": ÷1000 → MDD`)
      charts++
      changed = true
      return {...g, tablaDatos: {...g.tablaDatos, rows}, unidadMedida: 'millones-dolares'}
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
