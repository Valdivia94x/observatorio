import {useState, useCallback, useEffect} from 'react'
import {Box, Button, Card, Flex, Stack, Text, Spinner} from '@sanity/ui'
import {ArrowLeftIcon, CheckmarkIcon, CloseIcon} from '@sanity/icons'
import {useClient} from 'sanity'

import {FileDropzone} from './FileDropzone'
import {DataSelector} from './DataSelector'
import {CleanDataPreview} from './CleanDataPreview'
import {useExcelParser} from './useExcelParser'
import {useDataCleaning, autoDetectDataRange} from './useDataCleaning'
import type {ExcelImporterProps, CleaningConfig, ImportStep} from './types'

export function ExcelImporter({onImportComplete, onCancel}: ExcelImporterProps) {
  const [step, setStep] = useState<ImportStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [config, setConfig] = useState<CleaningConfig>({})
  const [isUploading, setIsUploading] = useState(false)

  const client = useClient({apiVersion: '2024-01-01'})
  const {rawData, sheetNames, activeSheet, setActiveSheet, isLoading, error} = useExcelParser(file)
  const {cleanedData, tableValue} = useDataCleaning(rawData, config)

  // Auto-detectar rango cuando se carga el archivo
  useEffect(() => {
    if (rawData && step === 'upload') {
      const detected = autoDetectDataRange(rawData)
      setConfig(detected)
      setStep('select')
    }
  }, [rawData, step])

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile)
    setConfig({})
  }, [])

  const handleBack = useCallback(() => {
    if (step === 'select') {
      setFile(null)
      setConfig({})
      setStep('upload')
    } else if (step === 'preview') {
      setStep('select')
    }
  }, [step])

  const handleNext = useCallback(() => {
    if (step === 'select' && cleanedData) {
      setStep('preview')
    }
  }, [step, cleanedData])

  const handleConfirm = useCallback(async () => {
    if (!file || !tableValue) return

    setIsUploading(true)

    try {
      // 1. Subir archivo original a Sanity assets
      const assetDoc = await client.assets.upload('file', file, {
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
      })

      // 2. Retornar datos al componente padre
      onImportComplete({
        archivoFuente: {
          _type: 'file',
          asset: {_type: 'reference', _ref: assetDoc._id},
        },
        tablaDatos: tableValue,
        configLimpieza: {
          ...config,
          importedAt: new Date().toISOString(),
        },
      })
    } catch (err) {
      console.error('Error al importar:', err)
      // Podrías mostrar un toast de error aquí
    } finally {
      setIsUploading(false)
    }
  }, [file, tableValue, config, client, onImportComplete])

  const canProceedToPreview =
    config.headerRow !== undefined && config.dataStartRow !== undefined && cleanedData !== null

  return (
    <Box padding={4}>
      <Stack space={4}>
        {/* Header con pasos */}
        <Flex justify="space-between" align="center">
          <Flex gap={3} align="center">
            <StepIndicator step={1} current={step} label="Subir" />
            <Text muted>→</Text>
            <StepIndicator step={2} current={step} label="Seleccionar" />
            <Text muted>→</Text>
            <StepIndicator step={3} current={step} label="Confirmar" />
          </Flex>
          <Button icon={CloseIcon} mode="bleed" tone="default" onClick={onCancel} title="Cancelar" />
        </Flex>

        {/* Contenido según paso */}
        {step === 'upload' && (
          <Stack space={4}>
            <Text size={2} weight="semibold">
              Paso 1: Selecciona el archivo
            </Text>
            <FileDropzone onFileSelect={handleFileSelect} isLoading={isLoading} />
            {error && (
              <Card padding={3} tone="critical" radius={2}>
                <Text>Error al leer el archivo: {error.message}</Text>
              </Card>
            )}
          </Stack>
        )}

        {step === 'select' && rawData && (
          <Stack space={4}>
            <Text size={2} weight="semibold">
              Paso 2: Selecciona los datos
            </Text>
            <DataSelector
              rawData={rawData}
              config={config}
              onConfigChange={setConfig}
              sheetNames={sheetNames}
              activeSheet={activeSheet}
              onSheetChange={setActiveSheet}
            />
          </Stack>
        )}

        {step === 'preview' && (
          <Stack space={4}>
            <Text size={2} weight="semibold">
              Paso 3: Confirma los datos
            </Text>
            <CleanDataPreview cleanedData={cleanedData} />
          </Stack>
        )}

        {/* Loading spinner */}
        {isLoading && (
          <Flex justify="center" padding={4}>
            <Spinner muted />
          </Flex>
        )}

        {/* Botones de navegación */}
        {step !== 'upload' && (
          <Flex justify="space-between" paddingTop={3}>
            <Button
              icon={ArrowLeftIcon}
              text="Anterior"
              mode="ghost"
              onClick={handleBack}
              disabled={isUploading}
            />

            {step === 'select' && (
              <Button
                text="Siguiente: Vista previa"
                tone="primary"
                onClick={handleNext}
                disabled={!canProceedToPreview}
              />
            )}

            {step === 'preview' && (
              <Button
                icon={isUploading ? undefined : CheckmarkIcon}
                text={isUploading ? 'Importando...' : 'Confirmar e Importar'}
                tone="positive"
                onClick={handleConfirm}
                disabled={isUploading || !tableValue}
              />
            )}
          </Flex>
        )}
      </Stack>
    </Box>
  )
}

// Componente auxiliar para indicadores de paso
function StepIndicator({
  step,
  current,
  label,
}: {
  step: number
  current: ImportStep
  label: string
}) {
  const stepOrder: ImportStep[] = ['upload', 'select', 'preview']
  const currentIndex = stepOrder.indexOf(current)
  const isActive = currentIndex >= step - 1
  const isCurrent = currentIndex === step - 1

  return (
    <Flex gap={2} align="center">
      <Box
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          backgroundColor: isActive ? '#2276fc' : '#e0e0e0',
          color: isActive ? 'white' : '#666',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        {step}
      </Box>
      <Text size={1} weight={isCurrent ? 'semibold' : 'regular'} muted={!isActive}>
        {label}
      </Text>
    </Flex>
  )
}

// Re-exportar tipos
export type {ImportedData, ExcelImporterProps} from './types'
