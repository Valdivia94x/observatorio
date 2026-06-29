import {nanoid} from 'nanoid'
import * as XLSX from 'xlsx'
import type {GeneratedGrafica} from '../types'
import type {TableRow} from '../../ExcelImporter/types'

function makeRow(cells: string[]): TableRow {
  return {_type: 'tableRow', _key: nanoid(), cells}
}

const MUNICIPIO_UBICACION: Record<string, string> = {
  matamoros: 'matamoros',
  torreón: 'torreon',
  torreon: 'torreon',
  'gómez palacio': 'gomez-palacio',
  'gomez palacio': 'gomez-palacio',
  lerdo: 'lerdo',
}

function ubicacionDe(name: string): string | null {
  return MUNICIPIO_UBICACION[name.toLowerCase().trim()] ?? null
}

// Estructura: fila de años (cada bloque de 4 columnas = un año), fila de recursos
// que se repiten por año [Consultorios, Médicos, Camas, Enfermeros], y una fila por municipio.
// Genera 1 gráfica por municipio con los 4 recursos como series sobre los años.
export function parseRecursosSalud(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []

  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  })

  // Buscar la fila de años (varios valores de 4 dígitos)
  let yearRowIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (!row) continue
    const years = row.filter((c) => c && String(c).match(/^\d{4}$/)).length
    if (years >= 3) {
      yearRowIdx = i
      break
    }
  }
  if (yearRowIdx === -1) return []

  const yearRow = data[yearRowIdx]
  const resourceRow = data[yearRowIdx + 1]
  if (!resourceRow) return []

  // Columnas de inicio de cada año
  const yearCols: {col: number; year: string}[] = []
  for (let c = 0; c < yearRow.length; c++) {
    const v = yearRow[c]
    if (v && String(v).match(/^\d{4}$/)) yearCols.push({col: c, year: String(v)})
  }
  if (yearCols.length === 0) return []

  // Recursos del primer bloque (desde la primera columna de año)
  const firstYearCol = yearCols[0].col
  const blockSize = yearCols.length > 1 ? yearCols[1].col - yearCols[0].col : 4
  const recursos: {offset: number; nombre: string}[] = []
  for (let o = 0; o < blockSize; o++) {
    const nombre = resourceRow[firstYearCol + o]
    if (typeof nombre === 'string' && nombre.trim()) {
      // "Enfermeros" → "Enfermeras"
      const limpio = nombre.trim().toLowerCase() === 'enfermeros' ? 'Enfermeras' : nombre.trim()
      recursos.push({offset: o, nombre: limpio})
    }
  }
  if (recursos.length === 0) return []

  const anios = yearCols.map((y) => y.year)

  const graficas: GeneratedGrafica[] = []
  for (let i = yearRowIdx + 2; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[0]) continue
    const nombre = String(row[0]).trim()
    if (nombre.toLowerCase().startsWith('fuente')) break
    const ub = ubicacionDe(nombre)
    if (!ub) continue

    const tableRows: TableRow[] = [makeRow(['', ...anios])]
    for (const r of recursos) {
      const valores = yearCols.map((yc) => {
        const v = row[yc.col + r.offset]
        return v === null || v === undefined || v === '' ? '' : Math.round(Number(v)).toString()
      })
      tableRows.push(makeRow([r.nombre, ...valores]))
    }

    graficas.push({
      titulo: `Recursos para la Salud en ${nombre}`,
      tipo: 'bar',
      ubicacion: [ub],
      tablaDatos: {rows: tableRows},
      unidadMedida: 'unidades',
      fuente: 'salud',
      descripcionContexto: `Recursos para la salud pública (consultorios, médicos, camas, enfermeras) en ${nombre}, evolución anual.`,
    })
  }

  return graficas
}
