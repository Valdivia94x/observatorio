/**
 * Migration: agrega las gráficas "Histórico de Años Promedio de Escolaridad en {Muni}" al
 * indicador "Años promedio de escolaridad", al inicio (antes de los rankings existentes).
 *
 * Uso:
 *   Dry-run:  pnpm exec sanity exec scripts/add-anios-historico.ts --with-user-token
 *   Aplicar:  APPLY=1 pnpm exec sanity exec scripts/add-anios-historico.ts --with-user-token
 */
import {getCliClient} from 'sanity/cli'
import * as XLSX from 'xlsx'
import {randomUUID} from 'crypto'
import {parseAniosEscolaridadHistorico} from '../components/IndicadorImporter/parsers/aniosEscolaridadHistorico'

const APPLY = process.env.APPLY === '1'
const EXCEL =
  '/Users/alejandrovaldivia/Downloads/Indicadores faltantes de educación y desarrollo urbano/Años promedio de escolaridad.xlsx'

function key(): string {
  return randomUUID().replace(/-/g, '').slice(0, 12)
}

async function main() {
  const client = getCliClient()
  console.log(`Modo: ${APPLY ? 'APPLY (escribe)' : 'DRY-RUN (sin escribir)'}\n`)

  const wb = XLSX.readFile(EXCEL)
  const nuevas = parseAniosEscolaridadHistorico(wb)
  if (nuevas.length === 0) {
    console.log('No se generaron gráficas históricas. Abortando.')
    return
  }

  const widgets = nuevas.map((g) => ({
    _type: 'graficaWidget',
    _key: key(),
    titulo: g.titulo,
    tipo: g.tipo,
    ubicacion: g.ubicacion,
    tablaDatos: g.tablaDatos,
    unidadMedida: g.unidadMedida,
    unidadMedidaPersonalizada: g.unidadMedidaPersonalizada,
    fuente: g.fuente,
    descripcionContexto: g.descripcionContexto,
  }))

  const indicadores = await client.fetch<Array<{_id: string; title?: string; contenido?: Array<{titulo?: string}>}>>(
    `*[_type == "indicador" && title == "Años promedio de escolaridad"]{_id, title, contenido[]}`,
  )

  for (const ind of indicadores) {
    const existing = ind.contenido || []
    if (existing.some((g) => g.titulo?.startsWith('Histórico de Años Promedio'))) {
      console.log(`[${ind.title}] ya tiene gráficas históricas. Skip.`)
      continue
    }
    console.log(`[${ind.title}] anteponiendo ${widgets.length} gráficas:`)
    widgets.forEach((w) => console.log(`  + "${w.titulo}"`))
    console.log(`  (quedan ${existing.length} gráficas existentes después)`)

    if (APPLY) {
      await client.patch(ind._id).set({contenido: [...widgets, ...existing]}).commit()
      console.log(`  ✓ Doc ${ind._id} actualizado.`)
    }
  }

  if (!APPLY) console.log(`\n(Dry-run completado — no se escribió nada.)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
