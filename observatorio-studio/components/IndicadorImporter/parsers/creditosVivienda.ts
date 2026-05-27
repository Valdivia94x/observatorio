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

// Una hoja por municipio. Header [Año, BANCA, FOVISSSTE, INFONAVIT, SHF, Otros, Total].
// stackedBar: años en X, instituciones apiladas (se excluye Total).
export function parseCreditosVivienda(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const graficas: GeneratedGrafica[] = []

  for (const sheetName of workbook.SheetNames) {
    const ub = ubicacionDe(sheetName)
    if (!ub) continue

    const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: null,
    })

    // Buscar header con "Año"
    let headerIdx = -1
    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      if (row && typeof row[0] === 'string' && row[0].trim().toLowerCase() === 'año') {
        headerIdx = i
        break
      }
    }
    if (headerIdx === -1) continue

    const headerRow = data[headerIdx]
    // Columnas de institución (excluir col 0 = Año y la columna "Total")
    const instituciones: {col: number; nombre: string}[] = []
    for (let c = 1; c < headerRow.length; c++) {
      const v = headerRow[c]
      if (typeof v === 'string' && v.trim() && v.trim().toLowerCase() !== 'total') {
        instituciones.push({col: c, nombre: v.trim()})
      }
    }
    if (instituciones.length === 0) continue

    // Recolectar años y valores
    const anios: string[] = []
    const dataRows: (string | number | null)[][] = []
    for (let i = headerIdx + 1; i < data.length; i++) {
      const row = data[i]
      if (!row || !row[0]) break
      const año = row[0]
      if (!String(año).match(/^\d{4}$/)) break
      anios.push(String(año))
      dataRows.push(row)
    }
    if (anios.length === 0) continue

    const tableRows: TableRow[] = [makeRow(['', ...anios])]
    for (const inst of instituciones) {
      const valores = dataRows.map((row) => {
        const v = row[inst.col]
        return v === null || v === undefined || v === '' ? '' : Math.round(Number(v)).toString()
      })
      tableRows.push(makeRow([inst.nombre, ...valores]))
    }

    const display = sheetName.trim()
    graficas.push({
      titulo: `Créditos para la Vivienda por Institución en ${display}`,
      tipo: 'stackedBar',
      ubicacion: [ub],
      tablaDatos: {rows: tableRows},
      unidadMedida: 'unidades',
      fuente: 'otra',
      fuentePersonalizada: 'SNIIV',
      descripcionContexto: `Créditos para la vivienda otorgados por institución financiera en ${display}, evolución anual.`,
      ocultarValores: true,
    })
  }

  return graficas
}
