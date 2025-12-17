import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import {Bar, Line, Doughnut, Pie, Radar, Chart} from 'react-chartjs-2'
import {useEffect, useState} from 'react'

// Registrar todos los componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
)

// Paleta de colores para gráficas
const COLORS = [
  '#FF6384',
  '#36A2EB',
  '#FFCE56',
  '#4BC0C0',
  '#9966FF',
  '#FF9F40',
  '#E7E9ED',
  '#7CB342',
  '#EA80FC',
  '#00BCD4',
  '#8BC34A',
  '#FF5722',
]

interface TableRow {
  _key: string
  _type: string
  cells: string[]
}

interface TableData {
  rows: TableRow[]
}

interface SerieConfig {
  _key?: string
  nombre?: string
  tipoSerie?: 'line' | 'bar'
  color?: string
}

interface GraficaWidgetValue {
  titulo?: string
  tipo?: string
  tablaDatos?: TableData
  colores?: string[]
  series?: SerieConfig[]
}

interface ChartPreviewProps {
  value?: GraficaWidgetValue
  renderDefault: (props: any) => React.ReactElement
}

function parseTableData(
  tablaDatos: TableData | undefined,
  tipo: string,
  coloresPersonalizados?: string[],
  seriesConfig?: SerieConfig[]
) {
  if (!tablaDatos?.rows || tablaDatos.rows.length < 2) {
    return null
  }

  const rows = tablaDatos.rows

  // Primera fila: categorias (eje X), ignorando la primera celda vacia
  const categorias = rows[0].cells.slice(1).filter((c) => c && c.trim() !== '')

  if (categorias.length === 0) {
    return null
  }

  const isPieOrDoughnut = tipo === 'doughnut' || tipo === 'pie'
  const isComboChart =
    seriesConfig && seriesConfig.length > 0 && (tipo === 'bar' || tipo === 'line')

  // Resto de filas: series de datos
  const datasets = rows.slice(1).map((row, index) => {
    const label = row.cells[0] || `Serie ${index + 1}`
    const data = row.cells.slice(1, categorias.length + 1).map((cell) => {
      const num = parseFloat(cell)
      return isNaN(num) ? 0 : num
    })

    // Para pie/doughnut: cada segmento tiene un color diferente
    if (isPieOrDoughnut) {
      const segmentColors = data.map((_, i) => {
        if (coloresPersonalizados && coloresPersonalizados[i]) {
          return coloresPersonalizados[i]
        }
        return COLORS[i % COLORS.length]
      })
      return {
        label,
        data,
        backgroundColor: segmentColors,
        borderColor: '#fff',
        borderWidth: 2,
      }
    }

    // Para gráficas combinadas: buscar configuración de la serie
    if (isComboChart) {
      const config =
        seriesConfig.find((s) => s.nombre?.toLowerCase() === label.toLowerCase()) ||
        seriesConfig[index]

      const color = config?.color || COLORS[index % COLORS.length]
      const serieType = config?.tipoSerie || 'bar'

      return {
        type: serieType as 'line' | 'bar',
        label,
        data,
        backgroundColor: serieType === 'line' ? 'transparent' : color,
        borderColor: color,
        borderWidth: 2,
        fill: false,
        tension: 0.1,
        pointRadius: serieType === 'line' ? 4 : 0,
        pointBackgroundColor: color,
        order: serieType === 'line' ? 0 : 1,
      }
    }

    // Para barras, líneas normales
    const color =
      coloresPersonalizados && coloresPersonalizados[index]
        ? coloresPersonalizados[index]
        : COLORS[index % COLORS.length]

    return {
      label,
      data,
      backgroundColor: color,
      borderColor: color,
      borderWidth: 2,
      fill: false,
    }
  })

  return {
    labels: categorias,
    datasets: datasets.filter((ds) => ds.data.some((d) => d !== 0)),
  }
}

export function ChartPreview(props: ChartPreviewProps) {
  const {value, renderDefault} = props
  const [chartData, setChartData] = useState<any>(null)

  const isComboChart =
    value?.series && value.series.length > 0 && (value.tipo === 'bar' || value.tipo === 'line')

  useEffect(() => {
    if (value?.tablaDatos) {
      const parsed = parseTableData(
        value.tablaDatos,
        value.tipo || 'bar',
        value.colores,
        value.series
      )
      setChartData(parsed)
    } else {
      setChartData(null)
    }
  }, [value?.tablaDatos, value?.tipo, value?.colores, value?.series])

  const getChartOptions = () => {
    return {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom' as const,
        },
        title: {
          display: !!value?.titulo,
          text: value?.titulo || '',
        },
      },
    }
  }

  const renderChart = () => {
    if (!chartData || !chartData.datasets.length) {
      return (
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
            backgroundColor: '#f3f3f3',
            borderRadius: '8px',
            color: '#666',
          }}
        >
          <p style={{margin: 0, fontSize: '14px'}}>Llena la tabla para ver la grafica.</p>
          <p style={{margin: '8px 0 0', fontSize: '12px', color: '#999'}}>
            Primera fila = categorias | Primera columna = nombres de series
          </p>
        </div>
      )
    }

    const tipo = value?.tipo || 'bar'
    const chartOptions = getChartOptions()

    // Gráfica combinada (mixed chart)
    if (isComboChart) {
      return <Chart type="bar" data={chartData} options={chartOptions} />
    }

    switch (tipo) {
      case 'line':
        return <Line data={chartData} options={chartOptions} />
      case 'doughnut':
        return (
          <Doughnut data={chartData} options={{...chartOptions, maintainAspectRatio: true}} />
        )
      case 'pie':
        return <Pie data={chartData} options={{...chartOptions, maintainAspectRatio: true}} />
      case 'radar':
        return <Radar data={chartData} options={chartOptions} />
      case 'horizontalBar':
        return <Bar data={chartData} options={{...chartOptions, indexAxis: 'y' as const}} />
      case 'bar':
      default:
        return <Bar data={chartData} options={chartOptions} />
    }
  }

  return (
    <div>
      {renderDefault(props)}
      <div
        style={{
          marginTop: '20px',
          padding: '16px',
          backgroundColor: '#fff',
          border: '1px solid #e5e5e5',
          borderRadius: '8px',
        }}
      >
        <h4
          style={{
            margin: '0 0 16px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#333',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Vista Previa de la Grafica {isComboChart && '(Combinada)'}
        </h4>
        <div style={{maxWidth: '100%', height: 'auto'}}>{renderChart()}</div>
      </div>
    </div>
  )
}
