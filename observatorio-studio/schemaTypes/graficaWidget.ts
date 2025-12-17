import {defineField, defineType} from 'sanity'
import {ChartPreview} from '../components/ChartPreview'

export const graficaWidget = defineType({
  name: 'graficaWidget',
  title: 'Grafica Widget',
  type: 'object',
  components: {
    input: ChartPreview,
  },
  fieldsets: [
    {
      name: 'estiloAvanzado',
      title: 'Configuracion Avanzada de Estilo',
      options: {
        collapsible: true,
        collapsed: true,
      },
    },
  ],
  fields: [
    defineField({
      name: 'titulo',
      title: 'Titulo de la Grafica',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'tipo',
      title: 'Tipo de Grafica',
      type: 'string',
      options: {
        list: [
          {title: 'Barras', value: 'bar'},
          {title: 'Linea', value: 'line'},
          {title: 'Dona', value: 'doughnut'},
          {title: 'Pie', value: 'pie'},
          {title: 'Barras Horizontales', value: 'horizontalBar'},
        ],
        layout: 'dropdown',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'ubicacion',
      title: 'Ubicacion (Filtro 1)',
      type: 'string',
      description: 'Selecciona el municipio o region que cubre esta grafica',
      options: {
        list: [
          {title: 'Torreon', value: 'torreon'},
          {title: 'Gomez Palacio', value: 'gomez-palacio'},
          {title: 'Lerdo', value: 'lerdo'},
          {title: 'Matamoros', value: 'matamoros'},
          {title: 'Zona Metropolitana', value: 'zona-metropolitana'},
          {title: 'Estatal (Coahuila)', value: 'estatal-coahuila'},
          {title: 'Estatal (Durango)', value: 'estatal-durango'},
          {title: 'Nacional', value: 'nacional'},
          {title: 'General', value: 'general'},
        ],
        layout: 'dropdown',
      },
      validation: (rule) => rule.required(),
    }),
    // === RANGO DE AÑOS (Filtro 2 - Opción principal) ===
    defineField({
      name: 'anioInicio',
      title: 'Año Inicio',
      type: 'number',
      description: 'Año inicial del rango de datos',
      validation: (rule) => rule.integer().min(1900).max(2100),
    }),
    defineField({
      name: 'anioFin',
      title: 'Año Fin',
      type: 'number',
      description: 'Año final del rango de datos',
      validation: (rule) =>
        rule
          .integer()
          .min(1900)
          .max(2100)
          .custom((anioFin, context) => {
            const parent = context.parent as {anioInicio?: number}
            if (anioFin && parent?.anioInicio && anioFin < parent.anioInicio) {
              return 'El año fin no puede ser menor que el año inicio'
            }
            return true
          }),
    }),
    // === AÑOS ESPECÍFICOS (Fallback para datos discontinuos) ===
    defineField({
      name: 'aniosDisponibles',
      title: 'Años Especificos (Solo para datos discontinuos)',
      type: 'array',
      of: [{type: 'number'}],
      description:
        'Usa este campo SOLO si tus datos tienen huecos (ej: 2010, 2015, 2020). Si tienes un rango continuo, usa los campos de arriba.',
      options: {
        layout: 'tags',
      },
      hidden: ({parent}) => {
        const p = parent as {anioInicio?: number; anioFin?: number}
        return !!(p?.anioInicio && p?.anioFin)
      },
    }),
    defineField({
      name: 'periodoEspecifico',
      title: 'Periodo Especifico',
      type: 'string',
      description: 'Opcional. Texto para subtitulo si difiere del indicador (ej: "2010 - 2022")',
    }),
    defineField({
      name: 'tablaDatos',
      title: 'Tabla de Datos',
      type: 'table',
      description:
        'La primera fila son los Años/Categorias. La primera columna son los nombres de las series. Llena los datos como en Excel.',
    }),
    // === CONFIGURACION DE SERIES (Para gráficas combinadas) ===
    defineField({
      name: 'series',
      title: 'Configuracion de Series',
      type: 'array',
      fieldset: 'estiloAvanzado',
      description:
        'Opcional. Configura el estilo visual y color de cada serie. El orden debe coincidir con las filas de la tabla (excluyendo la fila de encabezados).',
      hidden: ({parent}) => {
        const p = parent as {tipo?: string}
        const tiposNoCombo = ['pie', 'doughnut', 'radar', 'polarArea']
        return tiposNoCombo.includes(p?.tipo || '')
      },
      of: [
        {
          type: 'object',
          name: 'serieConfig',
          title: 'Serie',
          fields: [
            defineField({
              name: 'nombre',
              title: 'Nombre de la Serie',
              type: 'string',
              description: 'Referencia para identificar la serie (debe coincidir con la primera columna de la tabla)',
            }),
            defineField({
              name: 'tipoSerie',
              title: 'Estilo Visual de esta Serie',
              type: 'string',
              options: {
                list: [
                  {title: 'Linea (Line)', value: 'line'},
                  {title: 'Barra (Bar)', value: 'bar'},
                ],
                layout: 'radio',
              },
              initialValue: 'line',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'color',
              title: 'Color',
              type: 'string',
              description: 'Color hexadecimal (ej: #FF5733)',
            }),
          ],
          preview: {
            select: {
              nombre: 'nombre',
              tipoSerie: 'tipoSerie',
              color: 'color',
            },
            prepare({nombre, tipoSerie, color}) {
              const tipoIcon = tipoSerie === 'bar' ? '📊' : '📈'
              return {
                title: `${tipoIcon} ${nombre || 'Serie sin nombre'}`,
                subtitle: color || 'Color automatico',
              }
            },
          },
        },
      ],
    }),
    // === COLORES PERSONALIZADOS (Fallback simple) ===
    defineField({
      name: 'colores',
      title: 'Colores Personalizados (Simple)',
      type: 'array',
      fieldset: 'estiloAvanzado',
      of: [{type: 'string'}],
      description:
        'Alternativa simple: solo colores hexadecimales (#FF5733) para cada serie. Usa "Configuracion de Series" para graficas combinadas.',
      options: {
        layout: 'tags',
      },
      hidden: ({parent}) => {
        const p = parent as {series?: unknown[]}
        return !!(p?.series && p.series.length > 0)
      },
    }),
  ],
  preview: {
    select: {
      titulo: 'titulo',
      tipo: 'tipo',
      ubicacion: 'ubicacion',
      anioInicio: 'anioInicio',
      anioFin: 'anioFin',
      aniosDisponibles: 'aniosDisponibles',
    },
    prepare({titulo, tipo, ubicacion, anioInicio, anioFin, aniosDisponibles}) {
      const tipoLabels: Record<string, string> = {
        bar: 'Barras',
        line: 'Linea',
        doughnut: 'Dona',
        pie: 'Pie',
        horizontalBar: 'Barras Horiz.',
      }
      const ubicacionLabels: Record<string, string> = {
        torreon: 'Torreon',
        'gomez-palacio': 'Gomez Palacio',
        lerdo: 'Lerdo',
        matamoros: 'Matamoros',
        'zona-metropolitana': 'ZM',
        'estatal-coahuila': 'Coahuila',
        'estatal-durango': 'Durango',
        nacional: 'Nacional',
        general: 'General',
      }

      // Mostrar rango o años específicos
      let aniosText = ''
      if (anioInicio && anioFin) {
        aniosText = `[${anioInicio} - ${anioFin}]`
      } else if (anioInicio) {
        aniosText = `[${anioInicio}]`
      } else if (aniosDisponibles?.length) {
        aniosText = `[${aniosDisponibles.join(', ')}]`
      }

      return {
        title: titulo || 'Sin titulo',
        subtitle: `${tipoLabels[tipo] || tipo} | ${ubicacionLabels[ubicacion] || ubicacion} ${aniosText}`,
      }
    },
  },
})
