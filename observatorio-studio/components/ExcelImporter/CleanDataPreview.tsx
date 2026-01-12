import {Box, Card, Text, Stack} from '@sanity/ui'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import {Bar} from 'react-chartjs-2'
import styled from 'styled-components'
import type {CleanedData} from './types'

// Registrar componentes de Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend)

interface CleanDataPreviewProps {
  cleanedData: CleanedData | null
}

const TableContainer = styled.div`
  max-height: 200px;
  overflow: auto;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  font-size: 12px;
`

const PreviewTable = styled.table`
  border-collapse: collapse;
  width: 100%;
`

const TableCell = styled.td`
  padding: 6px 10px;
  border: 1px solid #e0e0e0;
  white-space: nowrap;
`

const TableHeader = styled.th`
  padding: 6px 10px;
  border: 1px solid #e0e0e0;
  background-color: #f5f5f5;
  font-weight: 600;
`

const COLORS = [
  '#2196F3',
  '#4CAF50',
  '#FF9800',
  '#E91E63',
  '#9C27B0',
  '#00BCD4',
  '#FF5722',
  '#607D8B',
]

export function CleanDataPreview({cleanedData}: CleanDataPreviewProps) {
  if (!cleanedData) {
    return (
      <Card padding={4} tone="caution" radius={2}>
        <Text align="center">Selecciona los encabezados y el inicio de datos para ver la vista previa</Text>
      </Card>
    )
  }

  const {headers, dataRows} = cleanedData

  // Preparar datos para Chart.js
  const chartData = {
    labels: headers.slice(1), // Excluir primera columna (nombres de series)
    datasets: dataRows.slice(0, 5).map((row, index) => ({
      label: row[0] || `Serie ${index + 1}`,
      data: row.slice(1).map((cell) => {
        const num = parseFloat(cell)
        return isNaN(num) ? 0 : num
      }),
      backgroundColor: COLORS[index % COLORS.length],
      borderColor: COLORS[index % COLORS.length],
      borderWidth: 1,
    })),
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 12,
          font: {size: 11},
        },
      },
      title: {
        display: true,
        text: 'Vista previa de la grafica',
        font: {size: 13},
      },
    },
    scales: {
      x: {
        ticks: {font: {size: 10}},
      },
      y: {
        ticks: {font: {size: 10}},
      },
    },
  }

  return (
    <Stack space={4}>
      {/* Resumen */}
      <Card padding={3} tone="positive" radius={2}>
        <Stack space={2}>
          <Text size={2} weight="semibold">
            Datos listos para importar
          </Text>
          <Text size={1}>
            {headers.length} columnas x {dataRows.length} filas de datos
          </Text>
        </Stack>
      </Card>

      {/* Tabla de datos limpios */}
      <Box>
        <Text size={1} weight="medium" style={{marginBottom: 8}}>
          Tabla de datos procesados:
        </Text>
        <TableContainer>
          <PreviewTable>
            <thead>
              <tr>
                {headers.map((header, i) => (
                  <TableHeader key={i}>{header || `Col ${i + 1}`}</TableHeader>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.slice(0, 10).map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {row.map((cell, cellIdx) => (
                    <TableCell key={cellIdx}>{cell || '-'}</TableCell>
                  ))}
                </tr>
              ))}
              {dataRows.length > 10 && (
                <tr>
                  <TableCell colSpan={headers.length} style={{textAlign: 'center', color: '#666'}}>
                    ... y {dataRows.length - 10} filas mas
                  </TableCell>
                </tr>
              )}
            </tbody>
          </PreviewTable>
        </TableContainer>
      </Box>

      {/* Gráfica de preview */}
      <Box>
        <Text size={1} weight="medium" style={{marginBottom: 8}}>
          Vista previa de la grafica:
        </Text>
        <Card padding={3} radius={2} style={{backgroundColor: '#fafafa'}}>
          <Box style={{maxHeight: 300}}>
            <Bar data={chartData} options={chartOptions} />
          </Box>
        </Card>
        {dataRows.length > 5 && (
          <Text size={1} muted style={{marginTop: 8}}>
            Nota: La vista previa muestra solo las primeras 5 series
          </Text>
        )}
      </Box>
    </Stack>
  )
}
