import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {Card, Text, Flex, Select, Stack, Switch, TextInput} from '@sanity/ui'
import styled from 'styled-components'
import type {CleaningConfig} from './types'

interface DataSelectorProps {
  rawData: string[][]
  config: CleaningConfig
  onConfigChange: (config: CleaningConfig) => void
  sheetNames?: string[]
  activeSheet?: string
  onSheetChange?: (sheetName: string) => void
}

const TableContainer = styled.div<{$isDragging?: boolean}>`
  max-height: 300px;
  overflow: auto;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  font-size: 12px;
  ${(props) => props.$isDragging && 'user-select: none;'}
`

const DataTable = styled.table`
  border-collapse: collapse;
  width: 100%;
  min-width: 600px;
`

const TableRow = styled.tr<{$isHeader?: boolean; $isData?: boolean; $isExcluded?: boolean}>`
  background-color: ${(props) => {
    if (props.$isHeader) return '#bbdefb'
    if (props.$isData) return '#c8e6c9'
    if (props.$isExcluded) return '#ffffff'
    return '#ffffff'
  }};
  color: ${(props) => (props.$isExcluded ? '#999' : '#333')};
`

const TableCell = styled.td<{$isExcluded?: boolean; $isDragSelected?: boolean}>`
  padding: 6px 10px;
  border: 1px solid #e0e0e0;
  white-space: nowrap;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: ${(props) => (props.$isExcluded ? 0.4 : 1)};
  text-decoration: ${(props) => (props.$isExcluded ? 'line-through' : 'none')};
  cursor: crosshair;
  ${(props) =>
    props.$isDragSelected &&
    `
    background-color: rgba(33, 150, 243, 0.2) !important;
    box-shadow: inset 0 0 0 1.5px rgba(33, 150, 243, 0.5);
  `}
`

const RowNumber = styled.td`
  padding: 6px 10px;
  border: 1px solid #e0e0e0;
  background-color: #fafafa;
  color: #666;
  font-weight: 500;
  position: sticky;
  left: 0;
  z-index: 1;
  min-width: 40px;
  text-align: center;
`

const ColumnHeader = styled.th<{$isExcluded?: boolean}>`
  padding: 6px 10px;
  border: 1px solid #e0e0e0;
  background-color: #f5f5f5;
  font-weight: 500;
  cursor: pointer;
  opacity: ${(props) => (props.$isExcluded ? 0.4 : 1)};

  &:hover {
    background-color: #eeeeee;
  }
`

const LegendBox = styled.div<{$color: string}>`
  width: 16px;
  height: 16px;
  background-color: ${(props) => props.$color};
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 2px;
`

const NumberInput = styled(TextInput)`
  max-width: 80px;

  input {
    text-align: center;
  }
`

export function DataSelector({
  rawData,
  config,
  onConfigChange,
  sheetNames,
  activeSheet,
  onSheetChange,
}: DataSelectorProps) {
  const maxCols = Math.max(...rawData.map((row) => row.length), 0)
  const totalRows = rawData.length

  // --- Drag selection ---
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{row: number; col: number} | null>(null)
  const [dragEnd, setDragEnd] = useState<{row: number; col: number} | null>(null)

  const isDraggingRef = useRef(false)
  const dragSelectionRef = useRef<{
    startRow: number
    endRow: number
    startCol: number
    endCol: number
  } | null>(null)
  const configRef = useRef(config)
  const onConfigChangeRef = useRef(onConfigChange)

  isDraggingRef.current = isDragging
  configRef.current = config
  onConfigChangeRef.current = onConfigChange

  const dragSelection = useMemo(() => {
    if (!dragStart || !dragEnd) return null
    return {
      startRow: Math.min(dragStart.row, dragEnd.row),
      endRow: Math.max(dragStart.row, dragEnd.row),
      startCol: Math.min(dragStart.col, dragEnd.col),
      endCol: Math.max(dragStart.col, dragEnd.col),
    }
  }, [dragStart, dragEnd])

  dragSelectionRef.current = dragSelection

  const isCellInDragSelection = useCallback(
    (row: number, col: number) => {
      if (!dragSelection) return false
      return (
        row >= dragSelection.startRow &&
        row <= dragSelection.endRow &&
        col >= dragSelection.startCol &&
        col <= dragSelection.endCol
      )
    },
    [dragSelection],
  )

  const handleCellMouseDown = useCallback(
    (rowIdx: number, colIdx: number, e: React.MouseEvent) => {
      e.preventDefault()
      setIsDragging(true)
      setDragStart({row: rowIdx, col: colIdx})
      setDragEnd({row: rowIdx, col: colIdx})
    },
    [],
  )

  const handleCellMouseEnter = useCallback((rowIdx: number, colIdx: number) => {
    if (isDraggingRef.current) {
      setDragEnd({row: rowIdx, col: colIdx})
    }
  }, [])

  useEffect(() => {
    const handleMouseUp = () => {
      if (!isDraggingRef.current) return

      const sel = dragSelectionRef.current
      if (sel) {
        const {startRow, endRow, startCol, endCol} = sel
        const selectedCols = Array.from({length: endCol - startCol + 1}, (_, i) => startCol + i)
        const current = configRef.current

        if (startRow === endRow && startCol === endCol) {
          // Clic en una sola celda — sin acción de drag
        } else if (startRow === endRow) {
          // Drag horizontal — solo actualizar columnas incluidas
          onConfigChangeRef.current({...current, includedColumns: selectedCols})
        } else {
          // Drag multi-fila — actualizar rango completo
          onConfigChangeRef.current({
            ...current,
            headerRow: startRow,
            dataStartRow: startRow + 1,
            dataEndRow: endRow,
            includedColumns: selectedCols,
          })
        }
      }

      setIsDragging(false)
      setDragStart(null)
      setDragEnd(null)
    }

    document.addEventListener('mouseup', handleMouseUp)
    return () => document.removeEventListener('mouseup', handleMouseUp)
  }, [])

  // Auto-detectar valores iniciales si no hay configuración
  useEffect(() => {
    if (config.headerRow === undefined && rawData.length > 0) {
      // Intentar detectar la primera fila que parece ser encabezado
      // (tiene texto y la siguiente tiene números)
      let detectedHeader = 0
      let detectedDataStart = 1

      for (let i = 0; i < Math.min(rawData.length - 1, 10); i++) {
        const currentRow = rawData[i]
        const nextRow = rawData[i + 1]

        if (currentRow && nextRow) {
          const currentHasText = currentRow.some((cell) => cell && isNaN(Number(cell.replace(/,/g, ''))))
          const nextHasNumbers = nextRow.some((cell) => cell && !isNaN(Number(cell.replace(/,/g, ''))))

          if (currentHasText && nextHasNumbers) {
            detectedHeader = i
            detectedDataStart = i + 1
            break
          }
        }
      }

      onConfigChange({
        ...config,
        headerRow: detectedHeader,
        dataStartRow: detectedDataStart,
        dataEndRow: totalRows - 1,
        includedColumns: Array.from({length: maxCols}, (_, i) => i),
      })
    }
  }, [rawData, config.headerRow, maxCols, totalRows])

  const handleHeaderRowChange = useCallback(
    (value: string) => {
      const num = parseInt(value, 10)
      if (!isNaN(num) && num >= 1 && num <= totalRows) {
        const newHeaderRow = num - 1 // Convertir a índice 0
        onConfigChange({
          ...config,
          headerRow: newHeaderRow,
          // Si el inicio de datos es menor o igual al nuevo header, ajustarlo
          dataStartRow:
            config.dataStartRow !== undefined && config.dataStartRow <= newHeaderRow
              ? newHeaderRow + 1
              : config.dataStartRow,
        })
      }
    },
    [config, onConfigChange, totalRows]
  )

  const handleDataStartChange = useCallback(
    (value: string) => {
      const num = parseInt(value, 10)
      if (!isNaN(num) && num >= 1 && num <= totalRows) {
        const newDataStart = num - 1
        // Solo permitir si es mayor que headerRow
        if (config.headerRow === undefined || newDataStart > config.headerRow) {
          onConfigChange({
            ...config,
            dataStartRow: newDataStart,
            // Si el fin de datos es menor que el nuevo inicio, ajustarlo
            dataEndRow:
              config.dataEndRow !== undefined && config.dataEndRow < newDataStart
                ? newDataStart
                : config.dataEndRow,
          })
        }
      }
    },
    [config, onConfigChange, totalRows]
  )

  const handleDataEndChange = useCallback(
    (value: string) => {
      const num = parseInt(value, 10)
      if (!isNaN(num) && num >= 1 && num <= totalRows) {
        const newDataEnd = num - 1
        // Solo permitir si es mayor o igual que dataStartRow
        if (config.dataStartRow === undefined || newDataEnd >= config.dataStartRow) {
          onConfigChange({
            ...config,
            dataEndRow: newDataEnd,
          })
        }
      }
    },
    [config, onConfigChange, totalRows]
  )

  const handleColumnToggle = useCallback(
    (colIndex: number) => {
      const current = config.includedColumns || Array.from({length: maxCols}, (_, i) => i)
      const isIncluded = current.includes(colIndex)

      const newColumns = isIncluded
        ? current.filter((c) => c !== colIndex)
        : [...current, colIndex].sort((a, b) => a - b)

      onConfigChange({...config, includedColumns: newColumns})
    },
    [config, onConfigChange, maxCols]
  )

  const isColumnIncluded = (colIndex: number) => {
    const cols = config.includedColumns || Array.from({length: maxCols}, (_, i) => i)
    return cols.includes(colIndex)
  }

  return (
    <Stack space={3}>
      {/* Selector de hoja si hay múltiples */}
      {sheetNames && sheetNames.length > 1 && (
        <Flex gap={2} align="center">
          <Text size={1} weight="medium">
            Hoja:
          </Text>
          <Select
            value={activeSheet}
            onChange={(e) => onSheetChange?.(e.currentTarget.value)}
            style={{maxWidth: 200}}
          >
            {sheetNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        </Flex>
      )}

      {/* Toggle para transponer datos */}
      <Card padding={3} tone="caution" radius={2}>
        <Flex gap={3} align="center">
          <Switch
            checked={config.transpose || false}
            onChange={() => onConfigChange({...config, transpose: !config.transpose})}
          />
          <Stack space={1}>
            <Text size={1} weight="medium">
              Transponer datos (intercambiar filas por columnas)
            </Text>
            <Text size={1} muted>
              Activa esto si los años están en filas en vez de columnas (formato vertical del INEGI)
            </Text>
          </Stack>
        </Flex>
      </Card>

      {/* Controles numéricos para selección de filas */}
      <Card padding={3} tone="primary" radius={2}>
        <Stack space={3}>
          <Text size={1} weight="medium">
            Selecciona el rango de datos (total: {totalRows} filas)
          </Text>

          <Flex gap={4} wrap="wrap">
            <Flex gap={2} align="center">
              <Text size={1}>Fila de encabezados:</Text>
              <NumberInput
                type="number"
                min={1}
                max={totalRows}
                value={config.headerRow !== undefined ? config.headerRow + 1 : ''}
                onChange={(e) => handleHeaderRowChange(e.currentTarget.value)}
                placeholder="1"
              />
            </Flex>

            <Flex gap={2} align="center">
              <Text size={1}>Primera fila de datos:</Text>
              <NumberInput
                type="number"
                min={1}
                max={totalRows}
                value={config.dataStartRow !== undefined ? config.dataStartRow + 1 : ''}
                onChange={(e) => handleDataStartChange(e.currentTarget.value)}
                placeholder="2"
              />
            </Flex>

            <Flex gap={2} align="center">
              <Text size={1}>Última fila de datos:</Text>
              <NumberInput
                type="number"
                min={1}
                max={totalRows}
                value={config.dataEndRow !== undefined ? config.dataEndRow + 1 : ''}
                onChange={(e) => handleDataEndChange(e.currentTarget.value)}
                placeholder={String(totalRows)}
              />
            </Flex>
          </Flex>
        </Stack>
      </Card>

      {/* Leyenda */}
      <Flex justify="space-between" align="center">
        <Flex gap={4}>
          <Flex align="center" gap={2}>
            <LegendBox $color="#bbdefb" />
            <Text size={1}>Encabezados</Text>
          </Flex>
          <Flex align="center" gap={2}>
            <LegendBox $color="#c8e6c9" />
            <Text size={1}>Datos a importar</Text>
          </Flex>
          <Flex align="center" gap={2}>
            <LegendBox $color="#ffffff" />
            <Text size={1} muted>Excluido</Text>
          </Flex>
        </Flex>
      </Flex>

      {/* Tabla de datos - Vista previa */}
      <TableContainer $isDragging={isDragging}>
        <DataTable>
          <thead>
            <tr>
              <RowNumber as="th">#</RowNumber>
              {Array.from({length: maxCols}, (_, i) => (
                <ColumnHeader
                  key={i}
                  $isExcluded={!isColumnIncluded(i)}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleColumnToggle(i)
                  }}
                  title={isColumnIncluded(i) ? 'Clic para excluir columna' : 'Clic para incluir columna'}
                >
                  {isColumnIncluded(i) ? '✓' : '✗'} Col {i + 1}
                </ColumnHeader>
              ))}
            </tr>
          </thead>
          <tbody>
            {rawData.map((row, rowIdx) => {
              const isHeader = rowIdx === config.headerRow
              const isData =
                config.dataStartRow !== undefined &&
                rowIdx >= config.dataStartRow &&
                (config.dataEndRow === undefined || rowIdx <= config.dataEndRow)
              const isExcluded = !isHeader && !isData

              return (
                <TableRow
                  key={rowIdx}
                  $isHeader={isHeader}
                  $isData={isData}
                  $isExcluded={isExcluded}
                >
                  <RowNumber>{rowIdx + 1}</RowNumber>
                  {Array.from({length: maxCols}, (_, cellIdx) => (
                    <TableCell
                      key={cellIdx}
                      $isExcluded={!isColumnIncluded(cellIdx)}
                      $isDragSelected={isCellInDragSelection(rowIdx, cellIdx)}
                      title={row[cellIdx] || ''}
                      onMouseDown={(e) => handleCellMouseDown(rowIdx, cellIdx, e)}
                      onMouseEnter={() => handleCellMouseEnter(rowIdx, cellIdx)}
                    >
                      {row[cellIdx] || <span style={{color: '#999'}}>-</span>}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })}
          </tbody>
        </DataTable>
      </TableContainer>

      <Text size={1} muted>
        Tip: Arrastra sobre las celdas para seleccionar el rango de datos. Clic en encabezados de
        columna (✓/✗) para incluir/excluir columnas
      </Text>
    </Stack>
  )
}
