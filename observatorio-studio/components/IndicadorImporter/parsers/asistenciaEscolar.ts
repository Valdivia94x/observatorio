import {nanoid} from 'nanoid'
import * as XLSX from 'xlsx'
import type {GeneratedGrafica} from '../types'
import type {TableRow} from '../../ExcelImporter/types'

function makeRow(cells: string[]): TableRow {
  return {_type: 'tableRow', _key: nanoid(), cells}
}

function toPercent(val: number): string {
  return parseFloat((val * 100).toFixed(1)).toString()
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

const NIVELES = new Set(['preescolar', 'primaria', 'secundaria', 'preparatoria', 'universidad'])

// Cada municipio tiene su encabezado en una celda (r,c); su nivel está en col c-1, "Asiste" en c,
// "No asiste" en c+1. Genera un stackedBar por municipio (verde asiste, rojo no asiste).
export function parseAsistenciaEscolar(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []
  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: null})

  const graficas: GeneratedGrafica[] = []

  for (let r = 0; r < data.length; r++) {
    const row = data[r]
    if (!row) continue
    for (let c = 1; c < row.length; c++) {
      const cell = row[c]
      if (typeof cell !== 'string') continue
      const ub = ubicacionDe(cell)
      if (!ub) continue

      const levelCol = c - 1
      const asisteCol = c
      const noAsisteCol = c + 1

      // Leer niveles desde 2 filas abajo (salta la fila "Asiste/No asiste")
      const niveles: string[] = []
      const asiste: string[] = []
      const noAsiste: string[] = []
      for (let i = r + 2; i < data.length; i++) {
        const dr = data[i]
        if (!dr) break
        const nivel = dr[levelCol]
        if (typeof nivel !== 'string' || !NIVELES.has(nivel.toLowerCase().trim())) break
        niveles.push(nivel.trim())
        asiste.push(toPercent(Number(dr[asisteCol] || 0)))
        noAsiste.push(toPercent(Number(dr[noAsisteCol] || 0)))
      }
      if (niveles.length === 0) continue

      graficas.push({
        titulo: `Asistencia Escolar en ${cell.trim()}`,
        tipo: 'stackedBar',
        ubicacion: [ub],
        tablaDatos: {
          rows: [makeRow(['', ...niveles]), makeRow(['Asiste', ...asiste]), makeRow(['No asiste', ...noAsiste])],
        },
        unidadMedida: 'porcentaje',
        fuente: 'inegi',
        descripcionContexto: `Porcentaje de la población que asiste y no asiste a la escuela por nivel educativo en ${cell.trim()}. Censo de Población y Vivienda 2020.`,
        // Verde = Asiste, Rojo = No asiste
        colores: ['#22c55e', '#ef4444'],
      })
    }
  }

  return graficas
}
