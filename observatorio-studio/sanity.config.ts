import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {table} from '@sanity/table'
import {schemaTypes} from './schemaTypes'
import {structure} from './structure'
import { esESLocale } from '@sanity/locale-es-es' //

export default defineConfig({
  name: 'default',
  title: 'Observatorio',

  projectId: '0imaiwwq',
  dataset: 'production',

  plugins: [
    table(),
    structureTool({
      structure,
    }),
    visionTool(),
    esESLocale(),
  ],

  schema: {
    types: schemaTypes,
  },
})
