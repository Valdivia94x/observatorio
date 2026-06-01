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

function isND(cell: string | number | null): boolean {
  return cell === null || cell === undefined || cell === '' || String(cell).trim().toUpperCase() === 'ND'
}

function num(cell: string | number | null, dec: number, factor = 1): string {
  if (isND(cell)) return ''
  const n = Number(cell) * factor
  if (!isFinite(n)) return ''
  return parseFloat(n.toFixed(dec)).toString()
}

const NOTA_ND = 'ND: No hay Datos.'

export function parseTratamientoAguas(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const graficas: GeneratedGrafica[] = []

  for (const sheetName of workbook.SheetNames) {
    const ub = ubicacionDe(sheetName)
    if (!ub) continue
    const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: null,
    })

    // Localiza la sección de tratamiento
    let idx = -1
    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      if (row && row.some((c) => typeof c === 'string' && c.includes('Tratamiento de aguas residuales'))) {
        idx = i
        break
      }
    }
    if (idx === -1) continue

    const anios: string[] = []
    const volumen: string[] = []
    const porcentaje: string[] = []
    for (let i = idx + 2; i < data.length; i++) {
      const row = data[i]
      if (!row) break
      const año = row[0]
      if (!año || !String(año).match(/^\d{4}$/)) break
      anios.push(String(año))
      volumen.push(num(row[1], 1))
      porcentaje.push(num(row[2], 2, 100)) // fracción → porcentaje
    }
    if (anios.length === 0 || !volumen.some((v) => v !== '')) continue

    graficas.push({
      titulo: `Tratamiento de Aguas Residuales en ${sheetName.trim()}`,
      tipo: 'bar',
      ubicacion: [ub],
      tablaDatos: {
        rows: [
          makeRow(['', ...anios]),
          makeRow(['Millones de M³', ...volumen]),
          makeRow(['% en relación a la extracción', ...porcentaje]),
        ],
      },
      unidadMedida: 'otro',
      unidadMedidaPersonalizada: 'Millones de M³',
      fuente: 'otra',
      fuentePersonalizada: 'CONAGUA / Transparencia municipal',
      descripcionContexto: `Tratamiento anual de aguas residuales en ${sheetName.trim()}: volumen tratado (millones de M³) y su proporción respecto a la extracción.`,
      nota: NOTA_ND,
      series: [
        {nombre: 'Millones de M³', tipoSerie: 'bar', color: '#3b82f6'},
        {nombre: '% en relación a la extracción', tipoSerie: 'line', color: '#ef4444', ejeSecundario: true},
      ],
    })
  }

  return graficas
}
