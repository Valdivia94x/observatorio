import {useCallback} from 'react'
import {Box, Card, Text, Flex, Button, Select, Stack, Switch} from '@sanity/ui'
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

const TableContainer = styled.div`
  max-height: 350px;
  overflow: auto;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  font-size: 12px;
`

const DataTable = styled.table`
  border-collapse: collapse;
  width: 100%;
  min-width: 600px;
`

const TableRow = styled.tr<{$isHeader?: boolean; $isData?: boolean; $isExcluded?: boolean}>`
  background-color: ${(props) => {
    if (props.$isHeader) return '#e3f2fd'
    if (props.$isData) return '#e8f5e9'
    if (props.$isExcluded) return '#fff3e0'
    return 'transparent'
  }};
  cursor: pointer;

  &:hover {
    filter: brightness(0.95);
  }
`

const TableCell = styled.td<{$isExcluded?: boolean}>`
  padding: 6px 10px;
  border: 1px solid #e0e0e0;
  white-space: nowrap;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: ${(props) => (props.$isExcluded ? 0.4 : 1)};
  text-decoration: ${(props) => (props.$isExcluded ? 'line-through' : 'none')};
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

export function DataSelector({
  rawData,
  config,
  onConfigChange,
  sheetNames,
  activeSheet,
  onSheetChange,
}: DataSelectorProps) {
  const maxCols = Math.max(...rawData.map((row) => row.length), 0)

  const handleRowClick = useCallback(
    (rowIndex: number) => {
      // Si no hay header, establecer como header
      if (config.headerRow === undefined) {
        onConfigChange({
          ...config,
          headerRow: rowIndex,
          includedColumns: Array.from({length: maxCols}, (_, i) => i),
        })
      }
      // Si ya hay header pero no inicio de datos, establecer inicio
      else if (config.dataStartRow === undefined) {
        if (rowIndex > config.headerRow) {
          onConfigChange({
            ...config,
            dataStartRow: rowIndex,
          })
        }
      }
      // Si ya hay ambos, resetear y empezar de nuevo con este como header
      else {
        onConfigChange({
          ...config,
          headerRow: rowIndex,
          dataStartRow: undefined,
          dataEndRow: undefined,
        })
      }
    },
    [config, onConfigChange, maxCols]
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

  const handleSetDataEnd = useCallback(
    (rowIndex: number) => {
      if (config.dataStartRow !== undefined && rowIndex >= config.dataStartRow) {
        onConfigChange({...config, dataEndRow: rowIndex})
      }
    },
    [config, onConfigChange]
  )

  const resetSelection = useCallback(() => {
    onConfigChange({
      headerRow: undefined,
      dataStartRow: undefined,
      dataEndRow: undefined,
      includedColumns: Array.from({length: maxCols}, (_, i) => i),
    })
  }, [onConfigChange, maxCols])

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

      {/* Instrucciones */}
      <Card padding={3} tone="primary" radius={2}>
        <Stack space={2}>
          <Text size={1} weight="medium">
            Instrucciones:
          </Text>
          <Text size={1}>
            1. Haz clic en la fila que contiene los <strong>encabezados</strong> (titulos de
            columnas)
          </Text>
          <Text size={1}>
            2. Luego haz clic en la fila donde <strong>inician los datos</strong>
          </Text>
          <Text size={1}>3. Opcionalmente, haz clic en los encabezados de columna para excluirlas</Text>
        </Stack>
      </Card>

      {/* Leyenda y acciones */}
      <Flex justify="space-between" align="center">
        <Flex gap={4}>
          <Flex align="center" gap={2}>
            <LegendBox $color="#e3f2fd" />
            <Text size={1}>Encabezados</Text>
          </Flex>
          <Flex align="center" gap={2}>
            <LegendBox $color="#e8f5e9" />
            <Text size={1}>Datos</Text>
          </Flex>
          <Flex align="center" gap={2}>
            <LegendBox $color="#fff3e0" />
            <Text size={1}>Excluido</Text>
          </Flex>
        </Flex>

        <Button text="Reiniciar seleccion" mode="ghost" tone="critical" onClick={resetSelection} />
      </Flex>

      {/* Estado actual */}
      <Card padding={2} tone="default" radius={2}>
        <Flex gap={4}>
          <Text size={1}>
            <strong>Encabezados:</strong>{' '}
            {config.headerRow !== undefined ? `Fila ${config.headerRow + 1}` : 'No seleccionado'}
          </Text>
          <Text size={1}>
            <strong>Datos desde:</strong>{' '}
            {config.dataStartRow !== undefined
              ? `Fila ${config.dataStartRow + 1}`
              : 'No seleccionado'}
          </Text>
          <Text size={1}>
            <strong>Datos hasta:</strong>{' '}
            {config.dataEndRow !== undefined ? `Fila ${config.dataEndRow + 1}` : 'Fin del archivo'}
          </Text>
        </Flex>
      </Card>

      {/* Tabla de datos */}
      <TableContainer>
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
              const isExcluded =
                config.headerRow !== undefined &&
                (rowIdx < config.headerRow ||
                  (config.dataStartRow !== undefined &&
                    rowIdx > config.headerRow &&
                    rowIdx < config.dataStartRow))

              return (
                <TableRow
                  key={rowIdx}
                  $isHeader={isHeader}
                  $isData={isData}
                  $isExcluded={isExcluded && !isHeader}
                  onClick={() => handleRowClick(rowIdx)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    handleSetDataEnd(rowIdx)
                  }}
                  title={
                    config.headerRow === undefined
                      ? 'Clic para marcar como encabezados'
                      : config.dataStartRow === undefined
                        ? 'Clic para marcar inicio de datos'
                        : 'Clic para cambiar encabezados | Clic derecho para marcar fin de datos'
                  }
                >
                  <RowNumber>{rowIdx + 1}</RowNumber>
                  {Array.from({length: maxCols}, (_, cellIdx) => (
                    <TableCell key={cellIdx} $isExcluded={!isColumnIncluded(cellIdx)} title={row[cellIdx] || ''}>
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
        Tip: Clic derecho en una fila para marcarla como fin de datos
      </Text>
    </Stack>
  )
}
