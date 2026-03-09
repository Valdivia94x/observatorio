import {Box} from '@sanity/ui'
import {BulkDatabaseImporter} from './BulkDatabaseImporter'

export function BulkImportPane() {
  return (
    <Box padding={4} sizing="border" style={{height: '100%', overflowY: 'auto'}}>
      <BulkDatabaseImporter onClose={() => {}} />
    </Box>
  )
}
