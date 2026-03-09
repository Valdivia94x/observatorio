import {useState} from 'react'
import {Box, Card, Flex, Stack, Text, Badge, Button, Select} from '@sanity/ui'
import {ChevronDownIcon, ChevronRightIcon} from '@sanity/icons'
import type {ChartType, IndicatorPlan} from './types'

const CHART_TYPE_OPTIONS: {title: string; value: ChartType}[] = [
  {title: 'Barras', value: 'bar'},
  {title: 'Linea', value: 'line'},
  {title: 'Dona', value: 'doughnut'},
  {title: 'Pie', value: 'pie'},
  {title: 'Barras Horizontales', value: 'horizontalBar'},
  {title: 'Tabla', value: 'table'},
]

interface IndicatorPreviewProps {
  plans: IndicatorPlan[]
  totalRows: number
}

export function IndicatorPreview({plans, totalRows}: IndicatorPreviewProps) {
  const newCount = plans.filter((p) => !p.existingDocId).length
  const updateCount = plans.filter((p) => p.existingDocId).length
  const totalCharts = plans.reduce((sum, p) => sum + p.graficas.length, 0)

  return (
    <Stack space={4}>
      {/* Summary card */}
      <Card padding={3} radius={2} tone="primary" border>
        <Flex gap={4} wrap="wrap">
          <SummaryItem label="Filas leidas" value={totalRows} />
          <SummaryItem label="Indicadores" value={plans.length} />
          <SummaryItem label="Graficas a generar" value={totalCharts} />
          {newCount > 0 && <SummaryItem label="Nuevos" value={newCount} tone="positive" />}
          {updateCount > 0 && <SummaryItem label="A actualizar" value={updateCount} tone="caution" />}
        </Flex>
      </Card>

      {/* Indicator list */}
      <Stack space={2}>
        {plans.map((plan, index) => (
          <IndicatorRow key={index} plan={plan} />
        ))}
      </Stack>
    </Stack>
  )
}

function SummaryItem({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: 'positive' | 'caution' | 'critical'
}) {
  return (
    <Flex gap={2} align="center">
      <Text size={1} muted>
        {label}:
      </Text>
      <Text size={1} weight="semibold" style={tone === 'positive' ? {color: '#43a047'} : tone === 'caution' ? {color: '#e65100'} : undefined}>
        {value}
      </Text>
    </Flex>
  )
}

function IndicatorRow({plan}: {plan: IndicatorPlan}) {
  const [expanded, setExpanded] = useState(false)
  const isNew = !plan.existingDocId

  return (
    <Card padding={3} radius={2} border>
      <Stack space={3}>
        {/* Header row */}
        <Flex align="center" gap={3}>
          <Button
            icon={expanded ? ChevronDownIcon : ChevronRightIcon}
            mode="bleed"
            padding={1}
            onClick={() => setExpanded(!expanded)}
          />
          <Box flex={1}>
            <Text size={1} weight="semibold">
              {plan.indicadorName}
            </Text>
          </Box>
          <Badge tone={isNew ? 'positive' : 'caution'} fontSize={0}>
            {isNew ? 'NUEVO' : 'ACTUALIZAR'}
          </Badge>
          <Text size={0} muted>
            {plan.graficas.length} {plan.graficas.length === 1 ? 'grafica' : 'graficas'}
          </Text>
        </Flex>

        {/* Expanded detail */}
        {expanded && (
          <Box paddingLeft={5}>
            <Stack space={3}>
              {/* Metadata */}
              <Flex gap={4} wrap="wrap">
                {plan.periodicidad && (
                  <MetadataChip label="Periodicidad" value={plan.periodicidad} />
                )}
                {plan.unidades && <MetadataChip label="Unidades" value={plan.unidades} />}
                {plan.grupo && <MetadataChip label="Grupo/Eje" value={plan.grupo} />}
              </Flex>

              {/* Charts detail */}
              {plan.graficas.map((grafica, i) => (
                <ChartRow key={i} grafica={grafica} />
              ))}
            </Stack>
          </Box>
        )}
      </Stack>
    </Card>
  )
}

function ChartRow({grafica}: {grafica: IndicatorPlan['graficas'][number]}) {
  const [tipo, setTipo] = useState<ChartType>(grafica.tipo as ChartType)

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.currentTarget.value as ChartType
    setTipo(newType)
    grafica.tipo = newType
  }

  return (
    <Card padding={3} radius={2} tone="default" border>
      <Stack space={2}>
        <Flex gap={3} align="center">
          <Text size={1} weight="semibold">
            {grafica.titulo}
          </Text>
          <Badge fontSize={0}>{grafica.ubicacion}</Badge>
        </Flex>
        <Flex gap={4} wrap="wrap" align="center">
          <Flex gap={2} align="center">
            <Text size={0} muted>
              Tipo:
            </Text>
            <Select
              value={tipo}
              onChange={handleTypeChange}
              style={{maxWidth: 180}}
              fontSize={1}
            >
              {CHART_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.title}
                </option>
              ))}
            </Select>
          </Flex>
          <Text size={0} muted>
            Periodo: {grafica.anioInicio} - {grafica.anioFin}
          </Text>
          <Text size={0} muted>
            Series: {grafica.tablaDatos.rows.length - 1}
          </Text>
          <Text size={0} muted>
            Columnas: {grafica.tablaDatos.rows[0]?.cells.length - 1 || 0}
          </Text>
        </Flex>
        {/* Mini table preview */}
        <Box style={{overflowX: 'auto', maxHeight: 160}}>
          <MiniTable rows={grafica.tablaDatos.rows} />
        </Box>
      </Stack>
    </Card>
  )
}

function MetadataChip({label, value}: {label: string; value: string}) {
  return (
    <Flex gap={1} align="center">
      <Text size={0} muted>
        {label}:
      </Text>
      <Text size={0} weight="medium">
        {value}
      </Text>
    </Flex>
  )
}

function MiniTable({rows}: {rows: {cells: string[]}[]}) {
  if (rows.length === 0) return null

  // Show max 6 columns and all rows
  const maxCols = 7
  const displayRows = rows

  return (
    <table
      style={{
        fontSize: 11,
        borderCollapse: 'collapse',
        width: '100%',
      }}
    >
      <thead>
        <tr>
          {displayRows[0].cells.slice(0, maxCols).map((cell, i) => (
            <th
              key={i}
              style={{
                padding: '3px 6px',
                borderBottom: '2px solid #ddd',
                textAlign: i === 0 ? 'left' : 'right',
                whiteSpace: 'nowrap',
                fontWeight: 600,
              }}
            >
              {cell || '-'}
            </th>
          ))}
          {displayRows[0].cells.length > maxCols && (
            <th style={{padding: '3px 6px', color: '#999'}}>...</th>
          )}
        </tr>
      </thead>
      <tbody>
        {displayRows.slice(1).map((row, i) => (
          <tr key={i}>
            {row.cells.slice(0, maxCols).map((cell, j) => (
              <td
                key={j}
                style={{
                  padding: '2px 6px',
                  borderBottom: '1px solid #eee',
                  textAlign: j === 0 ? 'left' : 'right',
                  whiteSpace: 'nowrap',
                  fontWeight: j === 0 ? 500 : 400,
                }}
              >
                {cell || '-'}
              </td>
            ))}
            {row.cells.length > maxCols && (
              <td style={{padding: '2px 6px', color: '#999'}}>...</td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
