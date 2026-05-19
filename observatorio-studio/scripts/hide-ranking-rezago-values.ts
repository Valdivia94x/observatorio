/**
 * Migration: ocultar valores en gráficas "Ranking de Rezago Educativo en Coahuila" y
 * "Ranking de Rezago Educativo en Durango".
 *
 * Uso:
 *   Dry-run:  pnpm exec sanity exec scripts/hide-ranking-rezago-values.ts --with-user-token
 *   Aplicar:  APPLY=1 pnpm exec sanity exec scripts/hide-ranking-rezago-values.ts --with-user-token
 */
import {getCliClient} from 'sanity/cli'

const APPLY = process.env.APPLY === '1'

interface Grafica {
  _key: string
  titulo?: string
  ocultarValores?: boolean
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
    `*[_type == "indicador" && title match "Rezago educativo"]{_id, title, contenido[]}`,
  )

  let totalChanges = 0
  let docsToUpdate = 0

  for (const ind of indicadores) {
    if (!ind.contenido) continue
    const updated = [...ind.contenido]
    let changed = false

    for (let i = 0; i < updated.length; i++) {
      const g = updated[i]
      if (g.titulo?.startsWith('Ranking de Rezago Educativo en ') && !g.ocultarValores) {
        console.log(`[${ind.title}] "${g.titulo}"`)
        console.log(`  ocultarValores: ${g.ocultarValores} → true`)
        updated[i] = {...g, ocultarValores: true}
        totalChanges++
        changed = true
      }
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
