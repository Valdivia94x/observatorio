/**
 * Migration: limpia la frase "Fuente: ..." duplicada al final de descripcionContexto
 * en gráficas del eje Finanzas Públicas, y mueve la fuente municipal específica al
 * campo fuentePersonalizada.
 *
 * Uso:
 *   Dry-run (no escribe):
 *     pnpm exec sanity exec scripts/fix-fuentes.ts --with-user-token
 *   Aplicar cambios:
 *     APPLY=1 pnpm exec sanity exec scripts/fix-fuentes.ts --with-user-token
 */
import {getCliClient} from 'sanity/cli'

const APPLY = process.env.APPLY === '1'

interface Grafica {
  _key: string
  _type: string
  titulo?: string
  fuente?: string
  fuentePersonalizada?: string
  descripcionContexto?: string
  [k: string]: unknown
}

interface Indicador {
  _id: string
  _rev: string
  title?: string
  eje?: {title?: string}
  contenido?: Grafica[]
}

interface Patch {
  fuente?: string
  fuentePersonalizada?: string
  descripcionContexto?: string
}

const MUNI_REGEX = /Fuente:\s+Transparencia Municipal del Ayuntamiento de\s+([^.]+?)\.\s*$/i
const SHCP_REGEX = /\s*Fuente:\s+Secretaría de Hacienda[^.]*\.\s*$/i
const INEGI_REGEX = /\s*Fuente:\s+INEGI[^.]*\.\s*$/i

function diffGrafica(g: Grafica): Patch | null {
  const desc = g.descripcionContexto || ''
  // Caso 1: municipal — captura municipio del texto
  const muniMatch = desc.match(MUNI_REGEX)
  if (muniMatch) {
    const muni = muniMatch[1].trim()
    return {
      fuente: 'otra',
      fuentePersonalizada: `Transparencia Municipal del Ayuntamiento de ${muni}`,
      descripcionContexto: desc.replace(MUNI_REGEX, '').trim(),
    }
  }
  // Caso 2: SHCP — quita la frase
  if (SHCP_REGEX.test(desc)) {
    return {descripcionContexto: desc.replace(SHCP_REGEX, '').trim()}
  }
  // Caso 3: INEGI — quita la frase
  if (INEGI_REGEX.test(desc)) {
    return {descripcionContexto: desc.replace(INEGI_REGEX, '').trim()}
  }
  return null
}

async function main() {
  const client = getCliClient()
  console.log(`Modo: ${APPLY ? 'APPLY (escribe)' : 'DRY-RUN (sin escribir)'}\n`)

  const indicadores = await client.fetch<Indicador[]>(
    `*[_type == "indicador" && eje->title == "Finanzas Públicas"]{
      _id,
      _rev,
      title,
      "eje": eje->{title},
      contenido[]
    }`,
  )

  console.log(`Indicadores encontrados: ${indicadores.length}`)

  let totalChanges = 0
  let docsToUpdate = 0

  for (const ind of indicadores) {
    if (!ind.contenido) continue
    const updatedContenido = [...ind.contenido]
    let docChanged = false

    for (let i = 0; i < updatedContenido.length; i++) {
      const g = updatedContenido[i]
      const patch = diffGrafica(g)
      if (!patch) continue
      console.log(`\n[${ind.title}] → "${g.titulo}"`)
      if (g.fuente !== patch.fuente && patch.fuente !== undefined) {
        console.log(`  fuente: ${JSON.stringify(g.fuente)} → ${JSON.stringify(patch.fuente)}`)
      }
      if (patch.fuentePersonalizada !== undefined) {
        console.log(
          `  fuentePersonalizada: ${JSON.stringify(g.fuentePersonalizada)} → ${JSON.stringify(patch.fuentePersonalizada)}`,
        )
      }
      console.log(
        `  descripcionContexto: ${JSON.stringify(g.descripcionContexto?.slice(-80))} → ${JSON.stringify(patch.descripcionContexto?.slice(-80))}`,
      )
      updatedContenido[i] = {...g, ...patch}
      totalChanges++
      docChanged = true
    }

    if (docChanged) {
      docsToUpdate++
      if (APPLY) {
        await client.patch(ind._id).set({contenido: updatedContenido}).commit()
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
