/**
 * Migration: poner ocultarValores=false en las gráficas "Ingresos Municipales por Fuente de
 * Financiamiento en {Muni}" (4 docs × 1 grafica) para que se muestren los valores en las barras.
 *
 * Uso:
 *   Dry-run:  pnpm exec sanity exec scripts/show-ingresos-values.ts --with-user-token
 *   Aplicar:  APPLY=1 pnpm exec sanity exec scripts/show-ingresos-values.ts --with-user-token
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
    `*[_type == "indicador" && title == "Ingresos Municipales"]{_id, title, contenido[]}`,
  )

  let totalChanges = 0
  let docsToUpdate = 0

  for (const ind of indicadores) {
    if (!ind.contenido) continue
    const updated = [...ind.contenido]
    let changed = false

    for (let i = 0; i < updated.length; i++) {
      const g = updated[i]
      if (
        g.titulo?.includes('Ingresos Municipales por Fuente de Financiamiento') &&
        g.ocultarValores === true
      ) {
        console.log(`[${ind.title}] "${g.titulo}"`)
        console.log(`  ocultarValores: true → false`)
        updated[i] = {...g, ocultarValores: false}
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
