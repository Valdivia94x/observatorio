/**
 * Migration: elimina las gráficas "Matrimonios Registrados en {Muni}" del indicador "Divorcios".
 *
 * Uso:
 *   Dry-run:  pnpm exec sanity exec scripts/remove-matrimonios.ts --with-user-token
 *   Aplicar:  APPLY=1 pnpm exec sanity exec scripts/remove-matrimonios.ts --with-user-token
 */
import {getCliClient} from 'sanity/cli'

const APPLY = process.env.APPLY === '1'

interface Grafica {
  _key: string
  titulo?: string
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
    `*[_type == "indicador" && title == "Divorcios"]{_id, title, contenido[]}`,
  )

  let totalRemoved = 0
  let docsToUpdate = 0

  for (const ind of indicadores) {
    if (!ind.contenido) continue
    const keep = ind.contenido.filter((g) => !g.titulo?.startsWith('Matrimonios Registrados'))
    const removed = ind.contenido.length - keep.length
    if (removed === 0) continue

    ind.contenido
      .filter((g) => g.titulo?.startsWith('Matrimonios Registrados'))
      .forEach((g) => console.log(`[${ind.title}] eliminar: "${g.titulo}"`))

    totalRemoved += removed
    docsToUpdate++

    if (APPLY) {
      await client.patch(ind._id).set({contenido: keep}).commit()
      console.log(`  ✓ Doc ${ind._id} actualizado (${keep.length} gráficas restantes).`)
    }
  }

  console.log(`\nResumen:`)
  console.log(`  Gráficas a eliminar: ${totalRemoved}`)
  console.log(`  Documentos a actualizar: ${docsToUpdate}`)
  if (!APPLY) console.log(`\n(Dry-run completado — no se escribió nada.)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
