/**
 * Migration: agrega las gráficas "Crecimiento Poblacional en {Muni}" al indicador "Población",
 * colocándolas ANTES de las pirámides poblacionales existentes.
 *
 * Lee el Excel de crecimiento, corre el parser y antepone los widgets generados.
 *
 * Uso:
 *   Dry-run:  pnpm exec sanity exec scripts/add-crecimiento-poblacional.ts --with-user-token
 *   Aplicar:  APPLY=1 pnpm exec sanity exec scripts/add-crecimiento-poblacional.ts --with-user-token
 */
import {getCliClient} from 'sanity/cli'
import * as XLSX from 'xlsx'
import {randomUUID} from 'crypto'
import {parseCrecimientoPoblacional} from '../components/IndicadorImporter/parsers/crecimientoPoblacional'

const APPLY = process.env.APPLY === '1'
const EXCEL =
  '/Users/alejandrovaldivia/Downloads/Indicadores faltantes de educación y desarrollo urbano/Crecimiento_Poblacional_La_Laguna.xlsx'

function key(): string {
  return randomUUID().replace(/-/g, '').slice(0, 12)
}

async function main() {
  const client = getCliClient()
  console.log(`Modo: ${APPLY ? 'APPLY (escribe)' : 'DRY-RUN (sin escribir)'}\n`)

  const wb = XLSX.readFile(EXCEL)
  const nuevas = parseCrecimientoPoblacional(wb)
  if (nuevas.length === 0) {
    console.log('No se generaron gráficas de crecimiento. Abortando.')
    return
  }

  // Convertir a widgets de Sanity (con _key) en el mismo formato que el importador
  const widgets = nuevas.map((g) => ({
    _type: 'graficaWidget',
    _key: key(),
    titulo: g.titulo,
    tipo: g.tipo,
    ubicacion: g.ubicacion,
    tablaDatos: g.tablaDatos,
    unidadMedida: g.unidadMedida,
    fuente: g.fuente,
    descripcionContexto: g.descripcionContexto,
  }))

  const indicadores = await client.fetch<Array<{_id: string; title?: string; contenido?: Array<{titulo?: string}>}>>(
    `*[_type == "indicador" && title == "Población"]{_id, title, contenido[]}`,
  )

  for (const ind of indicadores) {
    const existing = ind.contenido || []
    // Evitar duplicar si ya se agregaron antes
    const yaTiene = existing.some((g) => g.titulo?.startsWith('Crecimiento Poblacional'))
    if (yaTiene) {
      console.log(`[${ind.title}] ya tiene gráficas de crecimiento. Skip.`)
      continue
    }

    console.log(`[${ind.title}] anteponiendo ${widgets.length} gráficas:`)
    widgets.forEach((w) => console.log(`  + "${w.titulo}"`))
    console.log(`  (quedan ${existing.length} pirámides después)`)

    const nuevoContenido = [...widgets, ...existing]
    if (APPLY) {
      await client.patch(ind._id).set({contenido: nuevoContenido}).commit()
      console.log(`  ✓ Doc ${ind._id} actualizado (${nuevoContenido.length} gráficas).`)
    }
  }

  if (!APPLY) console.log(`\n(Dry-run completado — no se escribió nada.)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
