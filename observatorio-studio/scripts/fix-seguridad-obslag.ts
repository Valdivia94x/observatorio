/**
 * Migration OBSLAG Seguridad:
 *  - Gráficas de delitos (Número + Tasa): redondear la fila "Tasa por cada 100 mil hab." a 1 decimal
 *    y añadir nota "Las cifras hacen referencia a carpetas de investigación".
 *  - Percepción de Inseguridad / Confianza en la Policía Municipal en Torreón: quitar ocultarValores
 *    (mostrar los números).
 *
 * Uso:
 *   Dry-run:  pnpm exec sanity exec scripts/fix-seguridad-obslag.ts --with-user-token
 *   Aplicar:  APPLY=1 pnpm exec sanity exec scripts/fix-seguridad-obslag.ts --with-user-token
 */
import {getCliClient} from 'sanity/cli'

const APPLY = process.env.APPLY === '1'
const NOTA = 'Las cifras hacen referencia a carpetas de investigación.'

interface Row {cells: string[]; [k: string]: unknown}
interface Grafica {_key: string; titulo?: string; nota?: string; ocultarValores?: boolean; tablaDatos?: {rows: Row[]}; [k: string]: unknown}
interface Indicador {_id: string; title?: string; eje?: {title?: string}; contenido?: Grafica[]}

function round1(s: string): string {
  if (s === '' || s === null || s === undefined) return s
  const n = Number(s)
  if (isNaN(n)) return s
  return parseFloat(n.toFixed(1)).toString()
}

async function main() {
  const client = getCliClient()
  console.log(`Modo: ${APPLY ? 'APPLY (escribe)' : 'DRY-RUN (sin escribir)'}\n`)

  const indicadores = await client.fetch<Indicador[]>(
    `*[_type == "indicador" && eje->title == "Seguridad"]{_id, title, "eje": eje->{title}, contenido[]}`,
  )

  let changes = 0
  let docs = 0

  for (const ind of indicadores) {
    if (!ind.contenido) continue
    let changed = false
    const updated = ind.contenido.map((g) => {
      let ng = g
      // Delitos: tasa a 1 decimal + nota
      const tasaRow = g.tablaDatos?.rows?.find(
        (r) => typeof r.cells?.[0] === 'string' && r.cells[0].toLowerCase().includes('tasa por cada 100'),
      )
      if (tasaRow) {
        const newCells = [tasaRow.cells[0], ...tasaRow.cells.slice(1).map(round1)]
        const rowChanged = newCells.some((c, i) => c !== tasaRow.cells[i])
        const rows = g.tablaDatos!.rows.map((r) => (r === tasaRow ? {...r, cells: newCells} : r))
        if (rowChanged || g.nota !== NOTA) {
          ng = {...ng, tablaDatos: {...g.tablaDatos!, rows}, nota: NOTA}
          console.log(`[${ind.title}] "${g.titulo}": tasa 1 decimal + nota`)
          changes++; changed = true
        }
      }
      // Torreón Percepción/Desempeño: quitar ocultarValores
      if (
        (g.titulo?.startsWith('Percepción de Inseguridad en Torreón') ||
          g.titulo?.startsWith('Confianza en la Policía Municipal en Torreón')) &&
        g.ocultarValores
      ) {
        ng = {...ng, ocultarValores: false}
        console.log(`[${ind.title}] "${g.titulo}": mostrar valores (ocultarValores false)`)
        changes++; changed = true
      }
      return ng
    })
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
