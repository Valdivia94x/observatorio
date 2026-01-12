import {useCallback} from 'react'
import {Box, Card, Text, Flex, Stack} from '@sanity/ui'
import {UploadIcon} from '@sanity/icons'
import styled from 'styled-components'

interface FileDropzoneProps {
  onFileSelect: (file: File) => void
  isLoading?: boolean
}

const DropzoneContainer = styled(Card)`
  border: 2px dashed #ccc;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #2276fc;
    background-color: #f0f7ff;
  }

  &.dragging {
    border-color: #2276fc;
    background-color: #e3f2fd;
  }
`

const HiddenInput = styled.input`
  display: none;
`

export function FileDropzone({onFileSelect, isLoading}: FileDropzoneProps) {
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.classList.add('dragging')
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.classList.remove('dragging')
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      e.currentTarget.classList.remove('dragging')

      const files = e.dataTransfer.files
      if (files.length > 0) {
        const file = files[0]
        if (isValidFile(file)) {
          onFileSelect(file)
        }
      }
    },
    [onFileSelect]
  )

  const handleClick = useCallback(() => {
    const input = document.getElementById('excel-file-input') as HTMLInputElement
    input?.click()
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        onFileSelect(files[0])
      }
    },
    [onFileSelect]
  )

  return (
    <DropzoneContainer
      padding={5}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <HiddenInput
        id="excel-file-input"
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
      />

      <Flex direction="column" align="center" justify="center" gap={3}>
        <Box
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            backgroundColor: '#e3f2fd',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <UploadIcon style={{fontSize: 32, color: '#2276fc'}} />
        </Box>

        <Stack space={2} style={{textAlign: 'center'}}>
          <Text size={2} weight="semibold">
            {isLoading ? 'Procesando archivo...' : 'Arrastra un archivo aqui'}
          </Text>
          <Text size={1} muted>
            o haz clic para seleccionar
          </Text>
          <Text size={1} muted>
            Formatos: .xlsx, .xls, .csv
          </Text>
        </Stack>
      </Flex>
    </DropzoneContainer>
  )
}

function isValidFile(file: File): boolean {
  const validExtensions = ['.xlsx', '.xls', '.csv']
  const fileName = file.name.toLowerCase()
  return validExtensions.some((ext) => fileName.endsWith(ext))
}
