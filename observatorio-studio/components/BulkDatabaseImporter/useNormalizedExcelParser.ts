import {useState, useEffect} from 'react'
import * as XLSX from 'xlsx'
import type {NormalizedRow} from './types'

// Map of expected column headers (lowercase) to NormalizedRow keys
const COLUMN_MAP: Record<string, keyof NormalizedRow> = {
  id: 'id',
  grupo: 'grupo',
  indicador: 'indicador',
  'sector 1': 'sector1',
  'sector 2': 'sector2',
  'sector 3': 'sector3',
  'sector 4': 'sector4',
  periodicidad: 'periodicidad',
  mes: 'mes',
  trimestre: 'trimestre',
  año: 'anio',
  ano: 'anio',
  'valor absoluto (anual)': 'valorAbsoluto',
  'valor absoluto': 'valorAbsoluto',
  'valor relativo (mensual)': 'valorRelativo',
  'valor relativo': 'valorRelativo',
  nacional: 'nacional',
  estado: 'estado',
  municipio: 'municipio',
  descripción: 'descripcion',
  descripcion: 'descripcion',
  unidades: 'unidades',
  fuente: 'fuente',
  tipo: 'tipo',
}

const REQUIRED_COLUMNS: (keyof NormalizedRow)[] = ['indicador', 'anio']

export interface ParseResult {
  rows: NormalizedRow[]
  errors: string[]
  isLoading: boolean
}

export function useNormalizedExcelParser(file: File | null): ParseResult {
  const [rows, setRows] = useState<NormalizedRow[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!file) {
      setRows([])
      setErrors([])
      return
    }

    setIsLoading(true)
    setErrors([])

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, {type: 'array'})
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const rawData: string[][] = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: '',
          raw: false,
        })

        if (rawData.length < 2) {
          setErrors(['El archivo esta vacio o no tiene datos suficientes.'])
          setIsLoading(false)
          return
        }

        // Find header row by matching column names
        const {headerRowIndex, columnMapping, unmapped} = detectHeaderRow(rawData)

        if (headerRowIndex === -1) {
          setErrors([
            'No se pudo detectar la fila de encabezados. Asegurate de que el archivo tiene columnas: Indicador, Ano, Municipio, etc.',
          ])
          setIsLoading(false)
          return
        }

        // Check required columns
        const missingRequired = REQUIRED_COLUMNS.filter(
          (col) => !Object.values(columnMapping).includes(col),
        )
        if (missingRequired.length > 0) {
          setErrors([`Columnas requeridas no encontradas: ${missingRequired.join(', ')}`])
          setIsLoading(false)
          return
        }

        // Parse data rows
        const parseErrors: string[] = []
        if (unmapped.length > 0) {
          parseErrors.push(`Columnas no reconocidas (ignoradas): ${unmapped.join(', ')}`)
        }

        const parsedRows: NormalizedRow[] = []

        for (let i = headerRowIndex + 1; i < rawData.length; i++) {
          const rawRow = rawData[i]

          // Skip completely empty rows
          if (rawRow.every((cell) => !cell || cell.toString().trim() === '')) continue

          const row = mapRowToNormalized(rawRow, columnMapping)

          // Skip rows without indicator name
          if (!row.indicador || row.indicador.trim() === '') continue

          // Skip rows without year
          if (!row.anio || row.anio.trim() === '') continue

          parsedRows.push(row)
        }

        if (parsedRows.length === 0) {
          parseErrors.push('No se encontraron filas de datos validas.')
        }

        setRows(parsedRows)
        setErrors(parseErrors)
      } catch (err) {
        setErrors([`Error al leer el archivo: ${err instanceof Error ? err.message : String(err)}`])
      } finally {
        setIsLoading(false)
      }
    }

    reader.onerror = () => {
      setErrors(['Error al leer el archivo.'])
      setIsLoading(false)
    }

    reader.readAsArrayBuffer(file)
  }, [file])

  return {rows, errors, isLoading}
}

// Scan first 10 rows to find the header row
function detectHeaderRow(rawData: string[][]): {
  headerRowIndex: number
  columnMapping: Record<number, keyof NormalizedRow>
  unmapped: string[]
} {
  const maxScan = Math.min(rawData.length, 10)

  let bestRowIndex = -1
  let bestMapping: Record<number, keyof NormalizedRow> = {}
  let bestUnmapped: string[] = []
  let bestMatchCount = 0

  for (let i = 0; i < maxScan; i++) {
    const row = rawData[i]
    const mapping: Record<number, keyof NormalizedRow> = {}
    const unmapped: string[] = []
    let matchCount = 0

    for (let col = 0; col < row.length; col++) {
      const cellValue = String(row[col]).trim().toLowerCase()
      if (!cellValue) continue

      // Remove accents for matching
      const normalized = cellValue
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()

      const mappedKey = COLUMN_MAP[cellValue] || COLUMN_MAP[normalized]
      if (mappedKey) {
        mapping[col] = mappedKey
        matchCount++
      } else {
        unmapped.push(String(row[col]).trim())
      }
    }

    if (matchCount > bestMatchCount && matchCount >= 3) {
      bestRowIndex = i
      bestMapping = mapping
      bestUnmapped = unmapped
      bestMatchCount = matchCount
    }
  }

  return {
    headerRowIndex: bestRowIndex,
    columnMapping: bestMapping,
    unmapped: bestUnmapped,
  }
}

// Map a raw row array to a NormalizedRow using the column mapping
function mapRowToNormalized(
  rawRow: string[],
  columnMapping: Record<number, keyof NormalizedRow>,
): NormalizedRow {
  const row: Record<string, string | null> = {
    id: '',
    grupo: '',
    indicador: '',
    sector1: '',
    sector2: '',
    sector3: '',
    sector4: '',
    periodicidad: '',
    mes: null,
    trimestre: null,
    anio: '',
    valorAbsoluto: null,
    valorRelativo: null,
    nacional: null,
    estado: null,
    municipio: null,
    descripcion: null,
    unidades: null,
    fuente: null,
    tipo: null,
  }

  for (const [colIndex, key] of Object.entries(columnMapping)) {
    const cellValue = rawRow[parseInt(colIndex, 10)]
    const strValue = cellValue !== undefined ? String(cellValue).trim() : ''

    // Treat "NULL" as null
    if (strValue.toUpperCase() === 'NULL' || strValue === '') {
      row[key] = null
    } else {
      row[key] = strValue
    }
  }

  return row as unknown as NormalizedRow
}
