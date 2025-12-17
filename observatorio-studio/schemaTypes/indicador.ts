import {defineField, defineType} from 'sanity'

export const indicador = defineType({
  name: 'indicador',
  title: 'Indicador',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Nombre del Indicador',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'eje',
      title: 'Eje Tematico',
      type: 'reference',
      to: [{type: 'eje'}],
      validation: (rule) => rule.required(),
    }),
    // === METADATOS (Ficha Tecnica) ===
    defineField({
      name: 'periodicidad',
      title: 'Periodicidad',
      type: 'string',
      description: 'Frecuencia de actualizacion del indicador',
      options: {
        list: [
          {title: 'Anual', value: 'anual'},
          {title: 'Bianual', value: 'bianual'},
          {title: 'Mensual', value: 'mensual'},
          {title: 'Trimestral', value: 'trimestral'},
          {title: 'Quinquenal', value: 'quinquenal'},
          {title: 'Unico', value: 'unico'},
        ],
        layout: 'dropdown',
      },
    }),
    defineField({
      name: 'desagregacion',
      title: 'Desagregacion',
      type: 'string',
      description: 'Alcance general del indicador (informativo)',
      options: {
        list: [
          {title: 'Municipal', value: 'municipal'},
          {title: 'Estatal', value: 'estatal'},
          {title: 'Nacional', value: 'nacional'},
        ],
        layout: 'dropdown',
      },
    }),
    defineField({
      name: 'rangoCobertura',
      title: 'Rango de Cobertura',
      type: 'string',
      description: 'Texto informativo para el listado, ej: "2010 - 2024"',
    }),
    defineField({
      name: 'infoAdicional',
      title: 'Informacion Adicional',
      type: 'text',
      description: 'Notas metodologicas u observaciones',
    }),
    // === CONTENIDO (Page Builder) ===
    defineField({
      name: 'contenido',
      title: 'Graficas',
      type: 'array',
      of: [{type: 'graficaWidget'}],
      description: 'Agrega una o mas graficas. Cada grafica tiene sus propios filtros de ubicacion y años.',
      options: {
        modal: { type: 'dialog', width: 'auto' }, 
      }
    }),
  ],
  preview: {
    select: {
      title: 'title',
      eje: 'eje.title',
      rango: 'rangoCobertura',
    },
    prepare({title, eje, rango}) {
      return {
        title: title || 'Sin titulo',
        subtitle: `${eje || 'Sin eje'} | ${rango || ''}`,
      }
    },
  },
})
