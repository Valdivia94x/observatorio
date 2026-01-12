// Configuración de limpieza de datos
export interface CleaningConfig {
  headerRow?: number
  dataStartRow?: number
  dataEndRow?: number
  includedColumns?: number[]
  importedAt?: string
  transpose?: boolean
}

// Estructura de fila para @sanity/table
export interface TableRow {
  _type: 'tableRow'
  _key: string
  cells: string[]
}

// Estructura de tabla para @sanity/table
export interface TableValue {
  rows: TableRow[]
}

// Referencia a archivo de Sanity
export interface FileReference {
  _type: 'file'
  asset: {
    _type: 'reference'
    _ref: string
  }
}

// Datos importados que se guardarán en Sanity
export interface ImportedData {
  archivoFuente: FileReference
  tablaDatos: TableValue
  configLimpieza: CleaningConfig
}

// Props del componente importador
export interface ExcelImporterProps {
  onImportComplete: (data: ImportedData) => void
  onCancel: () => void
}

// Estado de parseo del archivo
export interface ParsedFileState {
  rawData: string[][] | null
  sheetNames: string[]
  activeSheet: string
  isLoading: boolean
  error: Error | null
}

// Datos limpios procesados
export interface CleanedData {
  headers: string[]
  dataRows: string[][]
}

// Pasos del flujo de importación
export type ImportStep = 'upload' | 'select' | 'preview'
