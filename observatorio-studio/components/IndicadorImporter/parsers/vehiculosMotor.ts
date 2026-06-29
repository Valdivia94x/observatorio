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

// Grid con varios bloques por municipio. Cada bloque: etiqueta del municipio en (R, C),
// header de clases en R+1 (col C+1..), datos en R+2+ con el año en col C.
// Genera 1 gráfica de barras por municipio con las clases de vehículo como series (se excluye Total).
export function parseVehiculosMotor(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []

  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  })

  const graficas: GeneratedGrafica[] = []
  const vistos = new Set<string>()

  for (let R = 0; R < data.length; R++) {
    const row = data[R]
    if (!row) continue
    for (let C = 0; C < row.length; C++) {
      const cell = row[C]
      if (typeof cell !== 'string') continue
      const ub = ubicacionDe(cell)
      if (!ub || vistos.has(ub)) continue

      // Validar que sea una etiqueta de bloque: la fila siguiente debe tener clases de vehículo
      const headerRow = data[R + 1]
      if (!headerRow) continue

      // Clases en col C+1.. (hasta 5: Total, Automóviles, Camiones pasajeros, Camiones carga, Motocicletas)
      const clases: {col: number; nombre: string}[] = []
      for (let c = C + 1; c < Math.min(C + 6, headerRow.length); c++) {
        const v = headerRow[c]
        if (typeof v === 'string' && v.trim()) clases.push({col: c, nombre: v.trim()})
      }
      // Debe incluir al menos "Total" o "Automóviles" para ser un bloque válido
      if (!clases.some((cl) => /total|autom/i.test(cl.nombre))) continue

      // Filas de datos: desde R+2, año en col C
      const anios: string[] = []
      const dataRows: (string | number | null)[][] = []
      for (let r = R + 2; r < data.length; r++) {
        const dr = data[r]
        if (!dr) break
        const año = dr[C]
        if (!año || !String(año).match(/^\d{4}$/)) break
        anios.push(String(año))
        dataRows.push(dr)
      }
      if (anios.length === 0) continue

      // Series = clases excepto "Total"; "Automóviles" se mueve al final
      const series = clases
        .filter((cl) => cl.nombre.toLowerCase() !== 'total')
        .sort((a, b) => {
          const aAuto = a.nombre.toLowerCase().startsWith('autom') ? 1 : 0
          const bAuto = b.nombre.toLowerCase().startsWith('autom') ? 1 : 0
          return aAuto - bAuto
        })
      const tableRows: TableRow[] = [makeRow(['', ...anios])]
      for (const cl of series) {
        const valores = dataRows.map((dr) => {
          const v = dr[cl.col]
          return v === null || v === undefined || v === '' ? '' : Math.round(Number(v)).toString()
        })
        tableRows.push(makeRow([cl.nombre, ...valores]))
      }

      vistos.add(ub)
      graficas.push({
        titulo: `Vehículos de Motor Registrados en ${cell.trim()}`,
        tipo: 'bar',
        ubicacion: [ub],
        tablaDatos: {rows: tableRows},
        unidadMedida: 'unidades',
        fuente: 'inegi',
        descripcionContexto: `Vehículos de motor registrados en circulación en ${cell.trim()} por clase de vehículo, evolución anual.`,
      })
    }
  }

  return graficas
}
