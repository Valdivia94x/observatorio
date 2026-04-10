import {nanoid} from 'nanoid'
import * as XLSX from 'xlsx'
import type {GeneratedGrafica} from '../types'
import type {TableRow, TableValue} from '../../ExcelImporter/types'

function makeRow(cells: string[]): TableRow {
  return {_type: 'tableRow', _key: nanoid(), cells}
}

export function parseAniosEscolaridad(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!sheet) return []

  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  })

  // Find the data start (first row where col 2 has a municipality name and col 3 has a number)
  let dataStartRow = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row[2] && typeof row[2] === 'string' && row[3] && typeof row[3] === 'number') {
      dataStartRow = i
      break
    }
  }
  if (dataStartRow === -1) return []

  const configs = [
    {nameCol: 2, valueCol: 3, estado: 'Coahuila', ubicacion: ['estatal-coahuila']},
    {nameCol: 5, valueCol: 6, estado: 'Durango', ubicacion: ['estatal-durango']},
  ]

  const graficas: GeneratedGrafica[] = []

  for (const config of configs) {
    const municipios: string[] = []
    const valores: string[] = []

    for (let i = dataStartRow; i < data.length; i++) {
      const row = data[i]
      if (!row) continue

      const name = row[config.nameCol]
      const value = row[config.valueCol]

      if (!name || value === null || value === undefined) continue

      municipios.push(String(name).trim())
      valores.push(String(value))
    }

    if (municipios.length === 0) continue

    const tablaDatos: TableValue = {
      rows: [
        makeRow(['', ...municipios]),
        makeRow(['Años promedio', ...valores]),
      ],
    }

    graficas.push({
      titulo: `Años Promedio de Escolaridad en ${config.estado}`,
      tipo: 'bar',
      ubicacion: config.ubicacion,
      tablaDatos,
      unidadMedida: 'otro',
      fuente: 'inegi',
      descripcionContexto: `Ranking de municipios de ${config.estado} por años promedio de escolaridad. Fuente: INEGI, Censo de Población y Vivienda 2020.`,
    })
  }

  return graficas
}
