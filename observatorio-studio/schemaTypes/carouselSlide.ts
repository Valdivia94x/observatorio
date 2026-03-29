import {defineField, defineType} from 'sanity'

export const carouselSlide = defineType({
  name: 'carouselSlide',
  title: 'Slide del Carousel',
  type: 'document',
  fields: [
    defineField({
      name: 'image',
      title: 'Imagen',
      type: 'image',
      options: {
        hotspot: true,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Descripción',
      type: 'text',
      rows: 3,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'order',
      title: 'Orden',
      type: 'number',
      description: 'Número para ordenar los slides (menor = primero)',
      validation: (Rule) => Rule.required().integer().min(1),
    }),
  ],
  orderings: [
    {
      title: 'Orden',
      name: 'orderAsc',
      by: [{field: 'order', direction: 'asc'}],
    },
  ],
  preview: {
    select: {
      description: 'description',
      order: 'order',
      media: 'image',
    },
    prepare({description, order, media}) {
      return {
        title: `Slide ${order ?? '?'}`,
        subtitle: description,
        media,
      }
    },
  },
})
