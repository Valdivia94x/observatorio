/**
 * Migration: transpone la tabla "Patrones por Tamaño en {Muni}" (tamaños en columnas →
 * tamaños en filas, períodos en columnas).
 *
 * Uso:
 *   Dry-run:  pnpm exec sanity exec scripts/transpose-patrones-tamano.ts --with-user-token
 *   Aplicar:  APPLY=1 pnpm exec sanity exec scripts/transpose-patrones-tamano.ts --with-user-token
 */
import {getCliClient} from 'sanity/cli'
import {randomUUID} from 'crypto'

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

function makeRow(cells: string[]): Row {
  return {_type: 'tableRow', _key: randomUUID().replace(/-/g, '').slice(0, 12), cells}
}

async function main() {
  const client = getCliClient()
  console.log(`Modo: ${APPLY ? 'APPLY (escribe)' : 'DRY-RUN (sin escribir)'}\n`)

  const indicadores = await client.fetch<Indicador[]>(
    `*[_type == "indicador" && count(contenido[titulo match "Patrones por Tamaño*"]) > 0]{_id, title, contenido[]}`,
  )

  let totalCharts = 0
  let docsToUpdate = 0

  for (const ind of indicadores) {
    if (!ind.contenido) continue
    let changed = false
    const updated = ind.contenido.map((g) => {
      if (!g.titulo?.startsWith('Patrones por Tamaño') || !g.tablaDatos?.rows) return g
      const rows = g.tablaDatos.rows
      // Detectar si ya está transpuesta (header[0] === 'Tamaño')
      if (rows[0]?.cells?.[0] === 'Tamaño') return g
      // Estructura actual: header = ['', ...tamaños]; fila1 = [label1, ...]; fila2 = [label2, ...]
      const tamanos = rows[0].cells.slice(1)
      const serie1 = rows[1]?.cells ?? []
      const serie2 = rows[2]?.cells ?? []
      const label1 = serie1[0] ?? 'Período 1'
      const label2 = serie2[0] ?? 'Período 2'
      const nuevas: Row[] = [makeRow(['Tamaño', label1, label2])]
      tamanos.forEach((t, i) => nuevas.push(makeRow([t, serie1[i + 1] ?? '', serie2[i + 1] ?? ''])))
      console.log(`[${ind.title}] "${g.titulo}": ${tamanos.length} tamaños → filas`)
      totalCharts++
      changed = true
      return {...g, tablaDatos: {...g.tablaDatos, rows: nuevas}}
    })
    if (changed) {
      docsToUpdate++
      if (APPLY) {
        await client.patch(ind._id).set({contenido: updated}).commit()
        console.log(`  ✓ Doc ${ind._id} actualizado.`)
      }
    }
  }

  console.log(`\nResumen:\n  Tablas transpuestas: ${totalCharts}\n  Documentos: ${docsToUpdate}`)
  if (!APPLY) console.log(`\n(Dry-run completado — no se escribió nada.)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
