import {useState, useCallback} from 'react'
import {Box, Button, Dialog, Flex} from '@sanity/ui'
import {DatabaseIcon, UploadIcon} from '@sanity/icons'
import {BulkDatabaseImporter} from './BulkDatabaseImporter'
import {IndicadorImporter} from './IndicadorImporter'

export function ContenidoArrayInput(props: any) {
  const {renderDefault} = props
  const [showBulkImporter, setShowBulkImporter] = useState(false)
  const [showExcelImporter, setShowExcelImporter] = useState(false)

  const handleImportComplete = useCallback(() => {
    setShowExcelImporter(false)
    // Trigger a re-render by briefly toggling state
  }, [])

  return (
    <div>
      <Box marginBottom={3}>
        <Flex gap={3} align="center">
          <Button
            icon={UploadIcon}
            text="Importar Excel del Indicador"
            tone="positive"
            mode="ghost"
            onClick={() => setShowExcelImporter(true)}
          />
          <Button
            icon={DatabaseIcon}
            text="Importar BD Normalizada"
            tone="caution"
            mode="ghost"
            onClick={() => setShowBulkImporter(true)}
          />
        </Flex>
      </Box>

      {renderDefault(props)}

      {showExcelImporter && (
        <Dialog
          id="excel-indicador-importer-dialog"
          header="Importar Excel del Indicador"
          width={2}
          onClose={() => setShowExcelImporter(false)}
          zOffset={1000}
        >
          <Box padding={4}>
            <IndicadorImporter onComplete={handleImportComplete} />
          </Box>
        </Dialog>
      )}

      {showBulkImporter && (
        <Dialog
          id="bulk-db-importer-dialog"
          header="Importar desde Base de Datos Normalizada"
          width={3}
          onClose={() => setShowBulkImporter(false)}
          zOffset={1000}
        >
          <BulkDatabaseImporter onClose={() => setShowBulkImporter(false)} />
        </Dialog>
      )}
    </div>
  )
}
