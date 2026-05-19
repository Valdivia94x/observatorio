/**
 * Migration: divide la gráfica única de "Trabajadores registrados en la nómina"
 * (1 gráfica con 4 series) en 4 gráficas independientes (una por municipio).
 *
 * Uso:
 *   Dry-run:  pnpm exec sanity exec scripts/split-trabajadores-nomina.ts --with-user-token
 *   Aplicar:  APPLY=1 pnpm exec sanity exec scripts/split-trabajadores-nomina.ts --with-user-token
 */
import {getCliClient} from 'sanity/cli'
import {randomUUID} from 'crypto'

const APPLY = process.env.APPLY === '1'

interface Cell {
  _key?: string
}

interface TableRow {
  _type: 'tableRow'
  _key: string
  cells: string[]
}

interface Grafica {
  _key: string
  _type: string
  titulo?: string
  tipo?: string
  ubicacion?: string[]
  tablaDatos?: {rows: TableRow[]}
  unidadMedida?: string
  fuente?: string
  fuentePersonalizada?: string
  descripcionContexto?: string
  [k: string]: unknown
}

interface Indicador {
  _id: string
  title?: string
  contenido?: Grafica[]
}

const MUNICIPIO_UBICACION: Record<string, string> = {
  matamoros: 'matamoros',
  torreón: 'torreon',
  torreon: 'torreon',
  'gómez palacio': 'gomez-palacio',
  'gomez palacio': 'gomez-palacio',
  lerdo: 'lerdo',
}

function makeRow(cells: string[]): TableRow {
  return {_type: 'tableRow', _key: randomUUID().replace(/-/g, '').slice(0, 12), cells}
}

async function main() {
  const client = getCliClient()
  console.log(`Modo: ${APPLY ? 'APPLY (escribe)' : 'DRY-RUN (sin escribir)'}\n`)

  const indicadores = await client.fetch<Indicador[]>(
    `*[_type == "indicador" && title == "Trabajadores registrados en la nómina"]{
      _id, title, contenido[]
    }`,
  )

  for (const ind of indicadores) {
    if (!ind.contenido || ind.contenido.length === 0) {
      console.log(`[${ind.title}] no tiene contenido. Skip.`)
      continue
    }

    // Buscar la gráfica única comparativa
    const old = ind.contenido.find(
      g => g.titulo === 'Trabajadores Registrados en la Nómina del Ayuntamiento',
    )
    if (!old) {
      console.log(`[${ind.title}] ya está dividida o no se encontró la gráfica comparativa. Skip.`)
      continue
    }

    const rows = old.tablaDatos?.rows || []
    if (rows.length < 2) {
      console.log(`[${ind.title}] tabla con pocas filas. Skip.`)
      continue
    }

    const yearRow = rows[0]
    const anios = yearRow.cells.slice(1) // primera celda es ''

    const nuevas: Grafica[] = []
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      const nombre = (row.cells[0] || '').trim()
      const key = nombre.toLowerCase()
      const ubicacion = MUNICIPIO_UBICACION[key]
      if (!ubicacion) {
        console.log(`  ⚠ Municipio no reconocido: "${nombre}". Skip.`)
        continue
      }
      const valores = row.cells.slice(1)

      const tableRows: TableRow[] = [
        makeRow(['', ...anios]),
        makeRow([nombre, ...valores]),
      ]

      nuevas.push({
        _type: old._type,
        _key: randomUUID().replace(/-/g, '').slice(0, 12),
        titulo: `Trabajadores Registrados en la Nómina en ${nombre}`,
        tipo: 'bar',
        ubicacion: [ubicacion],
        tablaDatos: {rows: tableRows},
        unidadMedida: 'unidades',
        fuente: old.fuente || 'inegi',
        descripcionContexto: `Número de trabajadores registrados en la nómina del ayuntamiento de ${nombre}.`,
      })
    }

    if (nuevas.length === 0) {
      console.log(`[${ind.title}] no se generaron gráficas nuevas. Skip.`)
      continue
    }

    // Sustituye solo la gráfica vieja por las nuevas, deja el resto del contenido como esté
    const idxOld = ind.contenido.findIndex(g => g._key === old._key)
    const updated = [...ind.contenido]
    updated.splice(idxOld, 1, ...nuevas)

    console.log(`[${ind.title}]`)
    console.log(`  Gráfica original: "${old.titulo}" (4 series)`)
    console.log(`  Reemplazo: ${nuevas.length} gráficas individuales:`)
    for (const g of nuevas) {
      console.log(`    - "${g.titulo}" → ${g.ubicacion?.[0]}`)
    }

    if (APPLY) {
      await client.patch(ind._id).set({contenido: updated}).commit()
      console.log(`  ✓ Doc ${ind._id} actualizado.`)
    }
  }

  if (!APPLY) console.log(`\n(Dry-run completado — no se escribió nada.)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
