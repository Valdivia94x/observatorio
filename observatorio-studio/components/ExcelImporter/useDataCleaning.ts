import {useMemo} from 'react'
import {nanoid} from 'nanoid'
import type {CleaningConfig, CleanedData, TableValue, TableRow} from './types'

// Función helper para transponer matriz (intercambiar filas por columnas)
function transposeMatrix(matrix: string[][]): string[][] {
  if (!matrix.length) return []
  const maxCols = Math.max(...matrix.map((row) => row.length))
  const result: string[][] = []
  for (let col = 0; col < maxCols; col++) {
    result.push(matrix.map((row) => row[col] || ''))
  }
  return result
}

export function useDataCleaning(rawData: string[][] | null, config: CleaningConfig) {
  // Calcular datos limpios basados en la selección
  const cleanedData = useMemo<CleanedData | null>(() => {
    if (!rawData || config.headerRow === undefined || config.dataStartRow === undefined) {
      return null
    }

    const {headerRow, dataStartRow, dataEndRow, includedColumns} = config

    // Determinar número máximo de columnas
    const maxCols = Math.max(...rawData.map((row) => row.length))

    // Columnas incluidas (por defecto todas)
    const cols = includedColumns ?? Array.from({length: maxCols}, (_, i) => i)

    // Extraer headers
    const headers = cols.map((colIdx) => rawData[headerRow]?.[colIdx] || '')

    // Extraer filas de datos
    const endRow = dataEndRow ?? rawData.length - 1
    const dataRows = rawData
      .slice(dataStartRow, endRow + 1)
      .filter((row) => {
        // Filtrar filas completamente vacías
        const includedCells = cols.map((colIdx) => row[colIdx] || '')
        return includedCells.some((cell) => cell.trim() !== '')
      })
      .map((row) => cols.map((colIdx) => row[colIdx] || ''))

    return {headers, dataRows}
  }, [rawData, config.headerRow, config.dataStartRow, config.dataEndRow, config.includedColumns])

  // Aplicar transposición si está habilitada
  const finalData = useMemo<CleanedData | null>(() => {
    if (!cleanedData) return null
    if (!config.transpose) return cleanedData

    // Transponer: headers + dataRows se convierten en columnas
    const allRows = [cleanedData.headers, ...cleanedData.dataRows]
    const transposed = transposeMatrix(allRows)

    return {
      headers: transposed[0] || [],
      dataRows: transposed.slice(1),
    }
  }, [cleanedData, config.transpose])

  // Transformar a formato @sanity/table
  const tableValue = useMemo<TableValue | null>(() => {
    if (!finalData) return null

    const {headers, dataRows} = finalData

    // Construir filas: primera fila son headers, resto son datos
    const rows: TableRow[] = [
      // Fila de headers
      {
        _type: 'tableRow',
        _key: nanoid(),
        cells: headers,
      },
      // Filas de datos
      ...dataRows.map((row) => ({
        _type: 'tableRow' as const,
        _key: nanoid(),
        cells: row,
      })),
    ]

    return {rows}
  }, [finalData])

  return {cleanedData: finalData, tableValue}
}

// Función helper para auto-detectar headers y datos
export function autoDetectDataRange(rawData: string[][]): Partial<CleaningConfig> {
  if (!rawData || rawData.length === 0) return {}

  let headerRow: number | undefined
  let dataStartRow: number | undefined

  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i]
    const nonEmptyCells = row.filter((cell) => cell && cell.trim() !== '')

    // Si la fila tiene al menos 2 celdas no vacías
    if (nonEmptyCells.length >= 2) {
      // Verificar si parece una fila de datos numéricos
      const numericCells = row.filter((cell) => {
        const num = parseFloat(cell)
        return !isNaN(num)
      })

      // Si la mayoría de celdas son numéricas, probablemente es data
      const isDataRow = numericCells.length > row.length / 3

      if (headerRow === undefined && !isDataRow) {
        // Primera fila con texto que parece header
        headerRow = i
      } else if (headerRow !== undefined && dataStartRow === undefined && isDataRow) {
        // Primera fila con datos numéricos después del header
        dataStartRow = i
        break
      }
    }
  }

  return {
    headerRow,
    dataStartRow,
    includedColumns: rawData[0]
      ? Array.from({length: rawData[headerRow || 0]?.length || 0}, (_, i) => i)
      : [],
  }
}
