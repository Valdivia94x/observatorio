/**
 * Migration OBSLAG Salud:
 *  - Recursos para la Salud: renombrar la serie "Enfermeros" → "Enfermeras".
 *  - Cobertura: título "Cobertura en Salud por Institución en {Muni}" → "... (2020)".
 *
 * Uso:
 *   Dry-run:  pnpm exec sanity exec scripts/fix-salud-obslag.ts --with-user-token
 *   Aplicar:  APPLY=1 pnpm exec sanity exec scripts/fix-salud-obslag.ts --with-user-token
 */
import {getCliClient} from 'sanity/cli'

const APPLY = process.env.APPLY === '1'

interface Row {cells: string[]; [k: string]: unknown}
interface Grafica {_key: string; titulo?: string; tablaDatos?: {rows: Row[]}; [k: string]: unknown}
interface Indicador {_id: string; title?: string; contenido?: Grafica[]}

async function main() {
  const client = getCliClient()
  console.log(`Modo: ${APPLY ? 'APPLY (escribe)' : 'DRY-RUN (sin escribir)'}\n`)

  const indicadores = await client.fetch<Indicador[]>(
    `*[_type == "indicador" && (
        count(contenido[titulo match "Recursos para la Salud*"]) > 0 ||
        count(contenido[titulo match "Cobertura en Salud por Institución*"]) > 0
      )]{_id, title, contenido[]}`,
  )

  let changes = 0
  let docs = 0

  for (const ind of indicadores) {
    if (!ind.contenido) continue
    let changed = false
    const updated = ind.contenido.map((g) => {
      let ng = g
      // Cobertura: añadir (2020) al título si no lo tiene
      if (g.titulo?.startsWith('Cobertura en Salud por Institución') && !g.titulo.includes('(2020)')) {
        ng = {...ng, titulo: `${g.titulo} (2020)`}
        console.log(`[${ind.title}] título → "${ng.titulo}"`)
        changes++; changed = true
      }
      // Recursos: renombrar fila "Enfermeros" → "Enfermeras"
      if (ng.titulo?.startsWith('Recursos para la Salud') && ng.tablaDatos?.rows) {
        let rowChanged = false
        const rows = ng.tablaDatos.rows.map((r) => {
          if (typeof r.cells?.[0] === 'string' && r.cells[0].trim().toLowerCase() === 'enfermeros') {
            rowChanged = true
            return {...r, cells: ['Enfermeras', ...r.cells.slice(1)]}
          }
          return r
        })
        if (rowChanged) {
          ng = {...ng, tablaDatos: {...ng.tablaDatos, rows}}
          console.log(`[${ind.title}] "${ng.titulo}": Enfermeros → Enfermeras (leyenda)`)
          changes++; changed = true
        }
        // También corregir "enfermeros" en la descripción
        if (typeof ng.descripcionContexto === 'string' && /enfermeros/i.test(ng.descripcionContexto)) {
          ng = {...ng, descripcionContexto: ng.descripcionContexto.replace(/enfermeros/gi, 'enfermeras')}
          console.log(`[${ind.title}] "${ng.titulo}": descripción enfermeros → enfermeras`)
          changes++; changed = true
        }
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
