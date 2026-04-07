import {useState, useCallback} from 'react'
import {Box, Button, Card, Flex, Stack, Text, Spinner, Badge} from '@sanity/ui'
import {UploadIcon, CheckmarkIcon, ResetIcon} from '@sanity/icons'
import {useClient, useFormValue} from 'sanity'
import {nanoid} from 'nanoid'
import * as XLSX from 'xlsx'

import {FileDropzone} from '../ExcelImporter/FileDropzone'
import {getParser, hasParser} from './parserRegistry'
import type {GeneratedGrafica} from './types'

type ImportStep = 'idle' | 'parsing' | 'preview' | 'saving' | 'done'

interface IndicadorImporterProps {
  onComplete: () => void
}

export function IndicadorImporter({onComplete}: IndicadorImporterProps) {
  const [step, setStep] = useState<ImportStep>('idle')
  const [graficas, setGraficas] = useState<GeneratedGrafica[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [savedCount, setSavedCount] = useState(0)

  const client = useClient({apiVersion: '2024-01-01'})

  // Get current indicator info from form context
  const docId = useFormValue(['_id']) as string | undefined
  const indicadorName = useFormValue(['title']) as string | undefined

  const parserAvailable = indicadorName ? hasParser(indicadorName) : false

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!indicadorName) {
        setError('El indicador no tiene nombre. Guárdalo primero.')
        return
      }

      const parser = getParser(indicadorName)
      if (!parser) {
        setError(`No hay un importador configurado para "${indicadorName}"`)
        return
      }

      setStep('parsing')
      setError(null)
      setWarnings([])

      try {
        const arrayBuffer = await file.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, {type: 'array'})

        const result = parser(workbook)

        if (result.length === 0) {
          setError('No se generaron gráficas del archivo. Verifica que el formato sea correcto.')
          setStep('idle')
          return
        }

        setGraficas(result)
        setStep('preview')
      } catch (err) {
        setError(`Error al procesar el archivo: ${err instanceof Error ? err.message : String(err)}`)
        setStep('idle')
      }
    },
    [indicadorName],
  )

  const handleConfirm = useCallback(async () => {
    if (!docId || graficas.length === 0) return

    setStep('saving')

    try {
      // Build the contenido array
      const contenido = graficas.map((g) => ({
        _type: 'graficaWidget',
        _key: nanoid(),
        titulo: g.titulo,
        tipo: g.tipo,
        ubicacion: g.ubicacion,
        tablaDatos: g.tablaDatos,
        unidadMedida: g.unidadMedida,
        fuente: g.fuente,
        fuentePersonalizada: g.fuentePersonalizada,
        descripcionContexto: g.descripcionContexto,
        series: g.series?.map((s) => ({
          _type: 'serieConfig',
          _key: nanoid(),
          nombre: s.nombre,
          tipoSerie: s.tipoSerie,
          color: s.color,
          ejeSecundario: s.ejeSecundario,
        })),
        configLimpieza: {
          importedAt: new Date().toISOString(),
        },
      }))

      // Replace contenido in the indicator document
      const realDocId = docId.replace(/^drafts\./, '')
      await client
        .patch(realDocId)
        .set({contenido})
        .commit()

      setSavedCount(contenido.length)
      setStep('done')
    } catch (err) {
      setError(`Error al guardar: ${err instanceof Error ? err.message : String(err)}`)
      setStep('preview')
    }
  }, [docId, graficas, client])

  const handleReset = useCallback(() => {
    setStep('idle')
    setGraficas([])
    setWarnings([])
    setError(null)
    setSavedCount(0)
  }, [])

  // No parser available for this indicator
  if (!parserAvailable) {
    return (
      <Card padding={4} radius={2} tone="transparent" border>
        <Flex gap={3} align="center">
          <UploadIcon style={{fontSize: 24, color: '#999'}} />
          <Text size={1} muted>
            No hay importador configurado para este indicador
          </Text>
        </Flex>
      </Card>
    )
  }

  return (
    <Stack space={4}>
      {/* Step: Idle - Show dropzone */}
      {step === 'idle' && (
        <Stack space={3}>
          <Card padding={3} radius={2} tone="primary" border>
            <Text size={1}>
              Sube el archivo Excel para <strong>{indicadorName}</strong>. Las gráficas se
              generarán automáticamente.
            </Text>
          </Card>
          <FileDropzone onFileSelect={handleFileSelect} />
        </Stack>
      )}

      {/* Step: Parsing */}
      {step === 'parsing' && (
        <Card padding={5} radius={2}>
          <Flex justify="center" gap={3} align="center">
            <Spinner muted />
            <Text size={1}>Procesando archivo...</Text>
          </Flex>
        </Card>
      )}

      {/* Step: Preview */}
      {step === 'preview' && (
        <Stack space={4}>
          <Card padding={3} radius={2} tone="positive" border>
            <Text size={1} weight="semibold">
              Se generarán {graficas.length} gráfica{graficas.length !== 1 ? 's' : ''}
            </Text>
          </Card>

          {warnings.length > 0 && (
            <Stack space={2}>
              {warnings.map((w, i) => (
                <Card key={i} padding={3} tone="caution" radius={2}>
                  <Text size={1}>{w}</Text>
                </Card>
              ))}
            </Stack>
          )}

          {/* List of charts to create */}
          <Stack space={2}>
            {graficas.map((g, i) => (
              <Card key={i} padding={3} radius={2} border>
                <Flex justify="space-between" align="center">
                  <Stack space={2}>
                    <Text size={1} weight="semibold">
                      {g.titulo}
                    </Text>
                    <Flex gap={2}>
                      <Badge tone="primary" fontSize={0}>
                        {g.tipo === 'horizontalBar' ? 'Barras Horiz.' : g.tipo === 'bar' ? 'Barras' : g.tipo}
                      </Badge>
                      <Badge tone="default" fontSize={0}>
                        {g.tablaDatos.rows.length - 1} serie{g.tablaDatos.rows.length - 1 !== 1 ? 's' : ''} ×{' '}
                        {g.tablaDatos.rows[0]?.cells.length - 1} datos
                      </Badge>
                    </Flex>
                  </Stack>
                </Flex>
              </Card>
            ))}
          </Stack>

          <Card padding={3} radius={2} tone="caution" border>
            <Text size={1}>
              ⚠ Esto reemplazará todas las gráficas actuales del indicador.
            </Text>
          </Card>

          <Flex justify="space-between" paddingTop={2}>
            <Button icon={ResetIcon} text="Cancelar" mode="ghost" onClick={handleReset} />
            <Button
              icon={CheckmarkIcon}
              text="Confirmar e importar"
              tone="positive"
              onClick={handleConfirm}
            />
          </Flex>
        </Stack>
      )}

      {/* Step: Saving */}
      {step === 'saving' && (
        <Card padding={5} radius={2}>
          <Flex justify="center" gap={3} align="center">
            <Spinner muted />
            <Text size={1}>Guardando gráficas...</Text>
          </Flex>
        </Card>
      )}

      {/* Step: Done */}
      {step === 'done' && (
        <Stack space={4}>
          <Card padding={4} radius={2} tone="positive" border>
            <Stack space={2}>
              <Text size={2} weight="semibold">
                ✓ Importación completada
              </Text>
              <Text size={1}>
                Se guardaron {savedCount} gráfica{savedCount !== 1 ? 's' : ''} en el indicador.
              </Text>
            </Stack>
          </Card>

          <Flex justify="space-between">
            <Button text="Importar otro archivo" mode="ghost" icon={ResetIcon} onClick={handleReset} />
            <Button text="Listo" tone="primary" onClick={onComplete} />
          </Flex>
        </Stack>
      )}

      {/* Error */}
      {error && (
        <Card padding={3} radius={2} tone="critical" border>
          <Text size={1}>{error}</Text>
        </Card>
      )}
    </Stack>
  )
}
