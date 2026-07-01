import {nanoid} from 'nanoid'
import * as XLSX from 'xlsx'
import type {GeneratedGrafica} from '../types'
import type {TableRow} from '../../ExcelImporter/types'

function makeRow(cells: string[]): TableRow {
  return {_type: 'tableRow', _key: nanoid(), cells}
}

const SHEET_ESTADO: Record<string, {estado: string; ubicacion: string}> = {
  coahuila: {estado: 'Coahuila', ubicacion: 'estatal-coahuila'},
  durango: {estado: 'Durango', ubicacion: 'estatal-durango'},
}

// Hoja por estado. Busca el bloque "Partido Político / Financiamiento {año}" (sin columna Votos)
// y genera una gráfica de barras: un partido por categoría, valor = financiamiento.
export function parseFinanciamientoPartidos(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  const graficas: GeneratedGrafica[] = []

  for (const sheetName of workbook.SheetNames) {
    const info = SHEET_ESTADO[sheetName.toLowerCase().trim()]
    if (!info) continue
    const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: null,
    })

    // Header del bloque de financiamiento por partido: col0 = "Partido Político",
    // col1 empieza con "Financiamiento", y NO tiene columna "Votos" (col2 vacía).
    let headerIdx = -1
    let anioFin = ''
    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      if (!row) continue
      if (
        typeof row[0] === 'string' &&
        row[0].includes('Partido') &&
        typeof row[1] === 'string' &&
        row[1].includes('Financiamiento') &&
        (row[2] === null || row[2] === undefined || row[2] === '')
      ) {
        headerIdx = i
        const m = row[1].match(/(\d{4})/)
        anioFin = m ? m[1] : ''
        break
      }
    }
    if (headerIdx === -1) continue

    const partidos: string[] = []
    const valores: string[] = []
    for (let i = headerIdx + 1; i < data.length; i++) {
      const row = data[i]
      if (!row || !row[0]) break
      const partido = String(row[0]).trim()
      if (partido.toLowerCase().startsWith('fuente') || partido.toLowerCase().startsWith('partido')) break
      if (row[1] === null || row[1] === undefined || row[1] === '') break
      // Abreviar "Asociaciones/Agrupaciones Políticas" → "AP" (etiqueta muy larga encoge el gráfico)
      const nombre = /^(asociaciones|agrupaciones)\s+pol/i.test(partido) ? 'AP' : partido
      partidos.push(nombre)
      valores.push(Math.round(Number(row[1])).toString())
    }
    if (partidos.length === 0) continue

    graficas.push({
      titulo: `Financiamiento a Partidos Políticos en ${info.estado}`,
      tipo: 'bar',
      ubicacion: [info.ubicacion],
      tablaDatos: {
        rows: [makeRow(['', ...partidos]), makeRow([`Financiamiento ${anioFin}`.trim(), ...valores])],
      },
      unidadMedida: 'pesos',
      fuente: 'otra',
      fuentePersonalizada: info.estado === 'Coahuila' ? 'IEC' : 'IEPC',
      descripcionContexto: `Financiamiento público otorgado a cada partido político en ${info.estado}${anioFin ? `, ${anioFin}` : ''}.`,
    })
  }

  return graficas
}
