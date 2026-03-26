import type {TableRow, TableValue} from '../ExcelImporter/types'

// Re-export for convenience
export type {TableRow, TableValue}

// A single row from the flat Excel table
export interface NormalizedRow {
  id: string
  grupo: string
  indicador: string
  sector1: string
  sector2: string
  sector3: string
  sector4: string
  periodicidad: string
  mes: string | null
  trimestre: string | null
  anio: string
  valorAbsoluto: string | null
  valorRelativo: string | null
  nacional: string | null
  estado: string | null
  municipio: string | null
  descripcion: string | null
  unidades: string | null
  fuente: string | null
  tipo: string | null
}

// Result of transformation for a single indicator
export interface IndicatorPlan {
  indicadorName: string
  grupo: string
  existingDocId: string | null
  periodicidad: string
  descripcion: string | null
  fuente: string | null
  fuenteTexto: string | null
  unidades: string | null
  graficas: PlannedGraficaWidget[]
}

// A chart that will be created/updated
export interface PlannedGraficaWidget {
  titulo: string
  tipo: string
  ubicacion: string[]
  anioInicio: number
  anioFin: number
  unidadMedida: string
  fuente: string
  fuentePersonalizada?: string
  descripcionContexto: string
  tablaDatos: TableValue
}

// Available chart types
export type ChartType = 'bar' | 'line' | 'doughnut' | 'pie' | 'horizontalBar' | 'table'

// Steps of the bulk import flow
export type BulkImportStep = 'upload' | 'preview' | 'processing' | 'done'

// Result of processing
export interface ImportResult {
  created: number
  updated: number
  errors: string[]
}
