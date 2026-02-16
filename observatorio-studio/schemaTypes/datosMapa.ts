import {defineField, defineType} from 'sanity'

export const datosMapa = defineType({
  name: 'datosMapa',
  title: 'Datos del Mapa (Inicio)',
  type: 'document',
  fields: [
    defineField({
      name: 'indicadores',
      title: 'Indicadores (Etiquetas)',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'indicadorMapa',
          fields: [
            defineField({
              name: 'label',
              title: 'Nombre del Indicador',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'sufijo',
              title: 'Sufijo (opcional)',
              type: 'string',
              description: 'Texto que aparece después del valor, ej: " años", " hab"',
            }),
          ],
          preview: {
            select: {title: 'label', subtitle: 'sufijo'},
            prepare({title, subtitle}) {
              return {
                title: title || 'Sin nombre',
                subtitle: subtitle ? `Sufijo: "${subtitle}"` : 'Sin sufijo',
              }
            },
          },
        },
      ],
      validation: (rule) => rule.required().length(5),
      description: 'Define exactamente 5 indicadores. El orden aquí determina el orden en el tooltip del mapa.',
    }),
    defineField({
      name: 'municipios',
      title: 'Municipios',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'municipioData',
          fields: [
            defineField({
              name: 'clave',
              title: 'Municipio',
              type: 'string',
              options: {
                list: [
                  {title: 'Torreón', value: 'torreon'},
                  {title: 'Gómez Palacio', value: 'gomez-palacio'},
                  {title: 'Lerdo', value: 'lerdo'},
                  {title: 'Matamoros', value: 'matamoros'},
                ],
                layout: 'dropdown',
              },
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'valores',
              title: 'Valores',
              type: 'array',
              of: [{type: 'string'}],
              validation: (rule) => rule.required().length(5),
              description: 'Exactamente 5 valores, uno por cada indicador en el mismo orden definido arriba.',
            }),
          ],
          preview: {
            select: {clave: 'clave'},
            prepare({clave}) {
              const labels: Record<string, string> = {
                torreon: 'Torreón',
                'gomez-palacio': 'Gómez Palacio',
                lerdo: 'Lerdo',
                matamoros: 'Matamoros',
              }
              return {title: labels[clave] || clave || 'Sin municipio'}
            },
          },
        },
      ],
      validation: (rule) => rule.required().length(4),
      description: 'Los 4 municipios de la Zona Metropolitana con sus valores.',
    }),
  ],
  preview: {
    prepare() {
      return {title: 'Datos del Mapa (Inicio)'}
    },
  },
})
