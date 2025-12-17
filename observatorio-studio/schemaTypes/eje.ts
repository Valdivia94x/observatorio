import {defineField, defineType} from 'sanity'

export const eje = defineType({
  name: 'eje',
  title: 'Eje Tematico',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Nombre del Eje',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'color',
      title: 'Color (Hexadecimal)',
      type: 'string',
      description: 'Ejemplo: #FF5733',
      validation: (rule) =>
        rule.regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
          name: 'hex color',
          invert: false,
        }),
    }),
    defineField({
      name: 'icon',
      title: 'Icono',
      type: 'image',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      color: 'color',
      media: 'icon',
    },
    prepare({title, color, media}) {
      return {
        title: title || 'Sin nombre',
        subtitle: color || 'Sin color',
        media: media,
      }
    },
  },
})
