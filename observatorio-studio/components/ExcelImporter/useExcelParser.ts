import {useState, useEffect, useCallback} from 'react'
import * as XLSX from 'xlsx'
import type {ParsedFileState} from './types'

export function useExcelParser(file: File | null) {
  const [state, setState] = useState<ParsedFileState>({
    rawData: null,
    sheetNames: [],
    activeSheet: '',
    isLoading: false,
    error: null,
  })

  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null)

  // Parsear archivo cuando cambia
  useEffect(() => {
    if (!file) {
      setState({
        rawData: null,
        sheetNames: [],
        activeSheet: '',
        isLoading: false,
        error: null,
      })
      setWorkbook(null)
      return
    }

    setState((prev) => ({...prev, isLoading: true, error: null}))

    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const wb = XLSX.read(data, {type: 'array'})

        setWorkbook(wb)

        // Parsear primera hoja por defecto
        const firstSheetName = wb.SheetNames[0]
        const sheet = wb.Sheets[firstSheetName]
        const jsonData = XLSX.utils.sheet_to_json<string[]>(sheet, {
          header: 1, // Retorna array de arrays
          defval: '', // Valor por defecto para celdas vacías
          raw: false, // Convertir todo a strings
        })

        setState({
          rawData: jsonData as string[][],
          sheetNames: wb.SheetNames,
          activeSheet: firstSheetName,
          isLoading: false,
          error: null,
        })
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err as Error,
        }))
      }
    }

    reader.onerror = () => {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: new Error('Error al leer el archivo'),
      }))
    }

    reader.readAsArrayBuffer(file)
  }, [file])

  // Cambiar hoja activa
  const setActiveSheet = useCallback(
    (sheetName: string) => {
      if (!workbook || !workbook.SheetNames.includes(sheetName)) return

      const sheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json<string[]>(sheet, {
        header: 1,
        defval: '',
        raw: false,
      })

      setState((prev) => ({
        ...prev,
        rawData: jsonData as string[][],
        activeSheet: sheetName,
      }))
    },
    [workbook]
  )

  return {
    ...state,
    setActiveSheet,
  }
}
