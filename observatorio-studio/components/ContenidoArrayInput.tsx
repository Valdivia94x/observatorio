import {useState} from 'react'
import {Box, Button, Dialog, Flex} from '@sanity/ui'
import {DatabaseIcon} from '@sanity/icons'
import {BulkDatabaseImporter} from './BulkDatabaseImporter'

export function ContenidoArrayInput(props: any) {
  const {renderDefault} = props
  const [showBulkImporter, setShowBulkImporter] = useState(false)

  return (
    <div>
      <Box marginBottom={3}>
        <Flex gap={3} align="center">
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
