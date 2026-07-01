/**
 * Migration OBSLAG Economía:
 *  - PIB por Sector Económico: valores a 1 decimal.
 *  - Inflación por Componente: valores a 1 decimal.
 *  - Unidades Económicas: reordenar (Actividad Económica primero, Tamaño de Empresa después).
 *
 * Uso:
 *   Dry-run:  pnpm exec sanity exec scripts/fix-economia-obslag.ts --with-user-token
 *   Aplicar:  APPLY=1 pnpm exec sanity exec scripts/fix-economia-obslag.ts --with-user-token
 */
import {getCliClient} from 'sanity/cli'

const APPLY = process.env.APPLY === '1'

interface Row {cells: string[]; [k: string]: unknown}
interface Grafica {_key: string; titulo?: string; tablaDatos?: {rows: Row[]}; [k: string]: unknown}
interface Indicador {_id: string; title?: string; contenido?: Grafica[]}

// Redondea a 1 decimal las celdas numéricas de las filas de datos (salta encabezado y col 0)
function tablaUnDecimal(rows: Row[]): {rows: Row[]; changed: boolean} {
  let changed = false
  const nuevos = rows.map((r, ri) => {
    if (ri === 0) return r // encabezado
    const cells = r.cells.map((c, ci) => {
      if (ci === 0) return c // etiqueta
      if (c === '' || c === null || c === undefined) return c
      const n = Number(c)
      if (isNaN(n)) return c
      const nc = parseFloat(n.toFixed(1)).toString()
      if (nc !== c) changed = true
      return nc
    })
    return {...r, cells}
  })
  return {rows: nuevos, changed}
}

async function main() {
  const client = getCliClient()
  console.log(`Modo: ${APPLY ? 'APPLY (escribe)' : 'DRY-RUN (sin escribir)'}\n`)

  const indicadores = await client.fetch<Indicador[]>(
    `*[_type == "indicador" && eje->title == "Economía"]{_id, title, contenido[]}`,
  )

  let changes = 0
  let docs = 0

  for (const ind of indicadores) {
    if (!ind.contenido) continue
    let changed = false
    let updated: Grafica[] = ind.contenido.map((g) => {
      // 1 decimal en PIB por Sector e Inflación por Componente
      if ((g.titulo?.startsWith('PIB por Sector Económico') || g.titulo?.startsWith('Inflación por Componente')) && g.tablaDatos?.rows) {
        const {rows, changed: rc} = tablaUnDecimal(g.tablaDatos.rows)
        if (rc) {
          console.log(`[${ind.title}] "${g.titulo}": valores a 1 decimal`)
          changes++; changed = true
          return {...g, tablaDatos: {...g.tablaDatos, rows}}
        }
      }
      return g
    })

    // Reordenar Unidades Económicas: Actividad Económica primero
    if (ind.title === 'Unidades Económicas') {
      const idxAct = updated.findIndex((g) => g.titulo?.startsWith('Unidades Económicas por Actividad'))
      const idxTam = updated.findIndex((g) => g.titulo?.startsWith('Unidades Económicas por Tamaño'))
      if (idxAct > idxTam && idxTam >= 0 && idxAct >= 0) {
        const arr = [...updated]
        const [act] = arr.splice(idxAct, 1)
        arr.splice(idxTam, 0, act)
        updated = arr
        console.log(`[${ind.title}]: reordenado → Actividad Económica primero`)
        changes++; changed = true
      }
    }

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
