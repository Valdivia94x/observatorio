/**
 * Migration OBSLAG Educación:
 *  - Renombrar títulos de la gráfica 2 de Egresados/Matrícula a "… por tipo de sostenimiento".
 *  - "Escuelas de {nivel}" → "Instituciones de {nivel} por tipo de sostenimiento".
 *  - Indicadores Básicos: fuente → "SEP, Sistema de Estadísticas Continuas de Educación, Formato 911".
 *
 * Uso:
 *   Dry-run:  pnpm exec sanity exec scripts/fix-educacion-obslag.ts --with-user-token
 *   Aplicar:  APPLY=1 pnpm exec sanity exec scripts/fix-educacion-obslag.ts --with-user-token
 */
import {getCliClient} from 'sanity/cli'

const APPLY = process.env.APPLY === '1'
const FUENTE_SEP = 'SEP, Sistema de Estadísticas Continuas de Educación, Formato 911'

interface Grafica {_key: string; titulo?: string; fuente?: string; fuentePersonalizada?: string; [k: string]: unknown}
interface Indicador {_id: string; title?: string; contenido?: Grafica[]}

// Renombra el prefijo del título preservando el sufijo " en {Muni}"
function renameTitulo(t: string): string | null {
  if (t.includes('por tipo de sostenimiento')) return null // ya renombrado
  const rules: {re: RegExp; rep: string}[] = [
    {re: /^Instituciones con Egresados de Posgrado( en .+)$/, rep: 'Instituciones de Posgrado por tipo de sostenimiento$1'},
    {re: /^Instituciones con Egresados Universitarios( en .+)$/, rep: 'Instituciones Universitarias por tipo de sostenimiento$1'},
    {re: /^Instituciones de Posgrado( en .+)$/, rep: 'Instituciones de Posgrado por tipo de sostenimiento$1'},
    {re: /^Instituciones Universitarias( en .+)$/, rep: 'Instituciones Universitarias por tipo de sostenimiento$1'},
    {re: /^Escuelas de (Preescolar|Primaria|Secundaria|Media Superior)( en .+)$/, rep: 'Instituciones de $1 por tipo de sostenimiento$2'},
  ]
  for (const {re, rep} of rules) if (re.test(t)) return t.replace(re, rep)
  return null
}

async function main() {
  const client = getCliClient()
  console.log(`Modo: ${APPLY ? 'APPLY (escribe)' : 'DRY-RUN (sin escribir)'}\n`)

  const indicadores = await client.fetch<Indicador[]>(
    `*[_type == "indicador" && eje->title == "Educación"]{_id, title, contenido[]}`,
  )

  let changes = 0
  let docs = 0

  for (const ind of indicadores) {
    if (!ind.contenido) continue
    const esBasicos = ind.title?.startsWith('Indicadores Básicos')
    let changed = false
    const updated = ind.contenido.map((g) => {
      let ng = g
      const nt = g.titulo ? renameTitulo(g.titulo) : null
      if (nt) {
        console.log(`[${ind.title}] título → "${nt}"`)
        ng = {...ng, titulo: nt}
        changes++; changed = true
      }
      // Fuente larga de SEP para Indicadores Básicos
      if (esBasicos && ng.fuentePersonalizada !== FUENTE_SEP) {
        ng = {...ng, fuente: 'otra', fuentePersonalizada: FUENTE_SEP}
        changes++; changed = true
      }
      return ng
    })
    if (esBasicos) console.log(`[${ind.title}] fuente → "${FUENTE_SEP}" (todas sus gráficas)`)
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
