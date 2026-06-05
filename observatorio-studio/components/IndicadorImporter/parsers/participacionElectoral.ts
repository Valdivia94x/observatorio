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

function findRow(data: (string | number | null)[][], pred: (row: (string | number | null)[]) => boolean, from = 0): number {
  for (let i = from; i < data.length; i++) {
    if (data[i] && pred(data[i])) return i
  }
  return -1
}

export function parseParticipacionElectoral(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const graficas: GeneratedGrafica[] = []

  for (const sheetName of workbook.SheetNames) {
    const ub = ubicacionDe(sheetName)
    if (!ub) continue
    const display = sheetName.trim()
    const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: null,
    })

    // === Sección 1: histórico (Año / Tipo de Elección / Participación %) ===
    const headIdx = findRow(data, (r) => typeof r[0] === 'string' && r[0].trim() === 'Año')
    if (headIdx !== -1) {
      const labels: string[] = []
      const valores: string[] = []
      for (let i = headIdx + 1; i < data.length; i++) {
        const row = data[i]
        if (!row) break
        const año = row[0]
        if (!año || !String(año).match(/^\d{4}$/)) break
        const tipo = String(row[1] || '').trim()
        labels.push(tipo ? `${año}\n${tipo}` : String(año))
        valores.push(toPercent(Number(row[2] || 0)))
      }
      if (labels.length > 0) {
        graficas.push({
          titulo: `Participación Electoral en ${display}`,
          tipo: 'bar',
          ubicacion: [ub],
          tablaDatos: {rows: [makeRow(['', ...labels]), makeRow(['Participación', ...valores])]},
          unidadMedida: 'porcentaje',
          fuente: 'otra',
          fuentePersonalizada: 'INE / Instituto Electoral local',
          descripcionContexto: `Participación electoral histórica en ${display} por proceso electoral. El tipo de elección se indica debajo de cada año.`,
        })
      }
    }

    // === Sección 2: por edad y género (líneas Hombre/Mujer) ===
    const generoIdx = findRow(
      data,
      (r) => r.some((c) => typeof c === 'string' && c.includes('Hombre')) && r.some((c) => typeof c === 'string' && c.includes('Mujer')),
    )
    if (generoIdx !== -1) {
      const rangos: string[] = []
      const hombres: string[] = []
      const mujeres: string[] = []
      for (let i = generoIdx + 1; i < data.length; i++) {
        const row = data[i]
        if (!row || !row[0]) break
        const rango = String(row[0]).trim()
        if (rango.toLowerCase().startsWith('fuente')) break
        rangos.push(rango)
        hombres.push(toPercent(Number(row[1] || 0)))
        mujeres.push(toPercent(Number(row[2] || 0)))
      }
      if (rangos.length > 0) {
        graficas.push({
          titulo: `Participación Electoral por Edad y Género en ${display}`,
          tipo: 'line',
          ubicacion: [ub],
          tablaDatos: {
            rows: [makeRow(['', ...rangos]), makeRow(['Hombre', ...hombres]), makeRow(['Mujer', ...mujeres])],
          },
          unidadMedida: 'porcentaje',
          fuente: 'otra',
          fuentePersonalizada: 'INE, datos 2024',
          descripcionContexto: `Participación electoral en ${display} en 2024 por rango de edad y género.`,
          colores: ['#3b82f6', '#d0005f'],
        })
      }
    }
  }

  return graficas
}
