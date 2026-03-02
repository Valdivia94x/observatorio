import {useState, useCallback, useEffect} from 'react'
import {Box, Button, Card, Flex, Stack, Text, Spinner} from '@sanity/ui'
import {CloseIcon, CheckmarkIcon} from '@sanity/icons'
import {useClient} from 'sanity'

import {FileDropzone} from '../ExcelImporter/FileDropzone'
import {useNormalizedExcelParser} from './useNormalizedExcelParser'
import {useDataTransformer} from './useDataTransformer'
import {executeBulkImport, findExistingIndicators} from './sanityOperations'
import {IndicatorPreview} from './IndicatorPreview'
import type {BulkImportStep, ImportResult} from './types'

interface BulkDatabaseImporterProps {
  onClose: () => void
}

export function BulkDatabaseImporter({onClose}: BulkDatabaseImporterProps) {
  const [step, setStep] = useState<BulkImportStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState({current: 0, total: 0})
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  const client = useClient({apiVersion: '2024-01-01'})
  const {rows, errors: parseErrors, isLoading} = useNormalizedExcelParser(file)
  const plans = useDataTransformer(rows)

  // When rows are parsed and plans are ready, move to preview
  useEffect(() => {
    if (rows.length > 0 && plans.length > 0 && step === 'upload') {
      // Annotate plans with existing doc IDs
      findExistingIndicators(
        client,
        plans.map((p) => p.indicadorName),
      ).then((existingMap) => {
        for (const plan of plans) {
          const existing = existingMap.get(plan.indicadorName.toLowerCase())
          if (existing) {
            plan.existingDocId = existing._id
          }
        }
        setStep('preview')
      })
    }
  }, [rows, plans, step, client])

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile)
    setStep('upload')
    setImportResult(null)
  }, [])

  const handleConfirm = useCallback(async () => {
    if (plans.length === 0) return

    setStep('processing')
    setProgress({current: 0, total: plans.length})

    try {
      const result = await executeBulkImport(client, plans, (current, total) => {
        setProgress({current, total})
      })
      setImportResult(result)
      setStep('done')
    } catch (err) {
      setImportResult({
        created: 0,
        updated: 0,
        errors: [err instanceof Error ? err.message : String(err)],
      })
      setStep('done')
    }
  }, [plans, client])

  const handleReset = useCallback(() => {
    setFile(null)
    setStep('upload')
    setImportResult(null)
    setProgress({current: 0, total: 0})
  }, [])

  return (
    <Box padding={4}>
      <Stack space={4}>
        {/* Header */}
        <Flex justify="space-between" align="center">
          <Text size={2} weight="semibold">
            {step === 'upload' && 'Paso 1: Selecciona el archivo de BD'}
            {step === 'preview' && 'Paso 2: Revisa los datos detectados'}
            {step === 'processing' && 'Procesando...'}
            {step === 'done' && 'Importacion completada'}
          </Text>
          <Button
            icon={CloseIcon}
            mode="bleed"
            tone="default"
            onClick={onClose}
            title="Cerrar"
          />
        </Flex>

        {/* Step: Upload */}
        {step === 'upload' && (
          <Stack space={4}>
            <Card padding={3} radius={2} tone="primary" border>
              <Text size={1}>
                Sube un archivo Excel con formato de base de datos normalizada. El sistema
                detectara automaticamente los indicadores y creara las graficas correspondientes.
              </Text>
            </Card>

            <FileDropzone onFileSelect={handleFileSelect} isLoading={isLoading} />

            {parseErrors.length > 0 && (
              <Stack space={2}>
                {parseErrors.map((err, i) => (
                  <Card key={i} padding={3} tone="critical" radius={2}>
                    <Text size={1}>{err}</Text>
                  </Card>
                ))}
              </Stack>
            )}

            {isLoading && (
              <Flex justify="center" padding={4} gap={3} align="center">
                <Spinner muted />
                <Text size={1} muted>
                  Leyendo archivo...
                </Text>
              </Flex>
            )}
          </Stack>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <Stack space={4}>
            {parseErrors.length > 0 && (
              <Stack space={2}>
                {parseErrors.map((err, i) => (
                  <Card key={i} padding={3} tone="caution" radius={2}>
                    <Text size={1}>{err}</Text>
                  </Card>
                ))}
              </Stack>
            )}

            <IndicatorPreview plans={plans} totalRows={rows.length} />

            <Flex justify="space-between" paddingTop={3}>
              <Button text="Cambiar archivo" mode="ghost" onClick={handleReset} />
              <Button
                icon={CheckmarkIcon}
                text="Confirmar e Importar"
                tone="positive"
                onClick={handleConfirm}
              />
            </Flex>
          </Stack>
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <Card padding={5} radius={2}>
            <Stack space={4}>
              <Flex justify="center" gap={3} align="center">
                <Spinner muted />
                <Text size={1}>
                  Procesando indicador {progress.current} de {progress.total}...
                </Text>
              </Flex>
              {/* Progress bar */}
              <Box
                style={{
                  width: '100%',
                  height: 8,
                  backgroundColor: '#e0e0e0',
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <Box
                  style={{
                    width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                    height: '100%',
                    backgroundColor: '#2276fc',
                    borderRadius: 4,
                    transition: 'width 0.3s ease',
                  }}
                />
              </Box>
            </Stack>
          </Card>
        )}

        {/* Step: Done */}
        {step === 'done' && importResult && (
          <Stack space={4}>
            <Card
              padding={4}
              radius={2}
              tone={importResult.errors.length > 0 ? 'caution' : 'positive'}
              border
            >
              <Stack space={3}>
                <Text size={2} weight="semibold">
                  Resultado de la importacion
                </Text>
                <Flex gap={4} wrap="wrap">
                  {importResult.created > 0 && (
                    <Text size={1}>
                      Creados: <strong>{importResult.created}</strong>
                    </Text>
                  )}
                  {importResult.updated > 0 && (
                    <Text size={1}>
                      Actualizados: <strong>{importResult.updated}</strong>
                    </Text>
                  )}
                </Flex>
              </Stack>
            </Card>

            {importResult.errors.length > 0 && (
              <Stack space={2}>
                <Text size={1} weight="semibold">
                  Errores:
                </Text>
                {importResult.errors.map((err, i) => (
                  <Card key={i} padding={3} tone="critical" radius={2}>
                    <Text size={1}>{err}</Text>
                  </Card>
                ))}
              </Stack>
            )}

            <Flex justify="space-between" paddingTop={3}>
              <Button text="Importar otro archivo" mode="ghost" onClick={handleReset} />
              <Button text="Cerrar" tone="primary" onClick={onClose} />
            </Flex>
          </Stack>
        )}
      </Stack>
    </Box>
  )
}
