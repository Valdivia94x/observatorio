import {nanoid} from 'nanoid'
import * as XLSX from 'xlsx'
import type {GeneratedGrafica} from '../types'
import type {TableRow, TableValue} from '../../ExcelImporter/types'

function makeRow(cells: string[]): TableRow {
  return {_type: 'tableRow', _key: nanoid(), cells}
}

const MUNICIPIO_UBICACION: Record<string, string> = {
  torreón: 'torreon',
  'gómez palacio': 'gomez-palacio',
  lerdo: 'lerdo',
  matamoros: 'matamoros',
}

interface PlaneaRow {
  municipio: string
  nivel: string
  materia: string
  tipoEscuela: string
  insuficiente: string
  indispensable: string
  satisfactorio: string
  sobresaliente: string
}

function parseSheet(sheet: XLSX.Sheet): PlaneaRow[] {
  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  })

  const rows: PlaneaRow[] = []

  // Find header row
  let headerIdx = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (row && row.some((c) => typeof c === 'string' && c === 'Municipio')) {
      headerIdx = i
      break
    }
  }

  if (headerIdx === -1) return rows

  for (let i = headerIdx + 1; i < data.length; i++) {
    const row = data[i]
    if (!row || !row[0]) continue // Skip empty rows

    rows.push({
      municipio: String(row[0]).trim(),
      nivel: String(row[1] || '').trim(),
      materia: String(row[2] || '').trim(),
      tipoEscuela: String(row[3] || '').trim(),
      insuficiente: String(row[4] || '0'),
      indispensable: String(row[5] || '0'),
      satisfactorio: String(row[6] || '0'),
      sobresaliente: String(row[7] || '0'),
    })
  }

  return rows
}

export function parseResultadosPlanea(workbook: XLSX.WorkBook): GeneratedGrafica[] {
  // Collect all rows from all sheets
  const allRows: PlaneaRow[] = []
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    if (sheet) {
      allRows.push(...parseSheet(sheet))
    }
  }

  if (allRows.length === 0) return []

  // Get unique municipios and niveles
  const municipios = [...new Set(allRows.map((r) => r.municipio))]
  const niveles = [...new Set(allRows.map((r) => r.nivel))]

  const graficas: GeneratedGrafica[] = []

  for (const municipio of municipios) {
    for (const nivel of niveles) {
      const filtered = allRows.filter(
        (r) => r.municipio === municipio && r.nivel === nivel,
      )

      if (filtered.length === 0) continue

      // Build X-axis labels: "Materia - TipoEscuela"
      // Order: Lenguaje Total, Lenguaje Públicas, Lenguaje Privadas, Matemáticas Total, ...
      const materias = [...new Set(filtered.map((r) => r.materia))]
      const tipos = ['Públicas', 'Privadas']

      const labels: string[] = []
      const insuficienteVals: string[] = []
      const indispensableVals: string[] = []
      const satisfactorioVals: string[] = []
      const sobresalienteVals: string[] = []

      for (const materia of materias) {
        for (const tipo of tipos) {
          const row = filtered.find(
            (r) => r.materia === materia && r.tipoEscuela === tipo,
          )
          // Abbreviate materia for label
          const materiaShort = materia === 'Lenguaje y Comunicación' ? 'Lenguaje' : materia
          labels.push(`${materiaShort} - ${tipo}`)
          insuficienteVals.push(row?.insuficiente || '0')
          indispensableVals.push(row?.indispensable || '0')
          satisfactorioVals.push(row?.satisfactorio || '0')
          sobresalienteVals.push(row?.sobresaliente || '0')
        }
      }

      const tablaDatos: TableValue = {
        rows: [
          makeRow(['', ...labels]),
          makeRow(['Insuficiente', ...insuficienteVals]),
          makeRow(['Indispensable', ...indispensableVals]),
          makeRow(['Satisfactorio', ...satisfactorioVals]),
          makeRow(['Sobresaliente', ...sobresalienteVals]),
        ],
      }

      const ubicacionSlug = MUNICIPIO_UBICACION[municipio.toLowerCase()]

      graficas.push({
        titulo: `Resultados PLANEA - ${nivel} en ${municipio}`,
        tipo: 'stackedBar',
        ubicacion: ubicacionSlug ? [ubicacionSlug] : ['torreon'],
        tablaDatos,
        unidadMedida: 'porcentaje',
        fuente: 'sep',
        descripcionContexto: `Resultados de la prueba PLANEA en nivel ${nivel} para ${municipio}. Porcentaje de alumnos por nivel de logro en Lenguaje y Comunicación y Matemáticas, desglosado por tipo de escuela.`,
      })
    }
  }

  return graficas
}
