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
    {
      name: 'importacion',
      title: 'Datos de Importacion',
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
    // === METADATOS PARA AGENTE DE VOZ ===
    defineField({
      name: 'unidadMedida',
      title: 'Unidad de Medida',
      type: 'string',
      description: 'Unidad en la que se expresan los valores de la grafica',
      options: {
        list: [
          {title: 'Porcentaje (%)', value: 'porcentaje'},
          {title: 'Pesos (MXN)', value: 'pesos'},
          {title: 'Miles de pesos', value: 'miles-pesos'},
          {title: 'Millones de pesos', value: 'millones-pesos'},
          {title: 'Habitantes', value: 'habitantes'},
          {title: 'Miles de habitantes', value: 'miles-habitantes'},
          {title: 'Tasa por 100,000 hab.', value: 'tasa-100mil'},
          {title: 'Indice (0-100)', value: 'indice'},
          {title: 'Unidades', value: 'unidades'},
          {title: 'Hectareas', value: 'hectareas'},
          {title: 'Kilometros', value: 'kilometros'},
          {title: 'Toneladas', value: 'toneladas'},
          {title: 'Litros', value: 'litros'},
          {title: 'Otro', value: 'otro'},
        ],
        layout: 'dropdown',
      },
    }),
    defineField({
      name: 'unidadMedidaPersonalizada',
      title: 'Unidad Personalizada',
      type: 'string',
      description: 'Especifica la unidad si seleccionaste "Otro"',
      hidden: ({parent}) => {
        const p = parent as {unidadMedida?: string}
        return p?.unidadMedida !== 'otro'
      },
    }),
    defineField({
      name: 'fuente',
      title: 'Fuente de Datos',
      type: 'string',
      description: 'Institucion u organizacion que genera los datos',
      options: {
        list: [
          {title: 'INEGI', value: 'inegi'},
          {title: 'CONEVAL', value: 'coneval'},
          {title: 'IMCO', value: 'imco'},
          {title: 'CONAPO', value: 'conapo'},
          {title: 'Secretaria de Salud', value: 'salud'},
          {title: 'Secretaria de Economia', value: 'economia'},
          {title: 'SESNSP (Seguridad)', value: 'sesnsp'},
          {title: 'Banco de Mexico', value: 'banxico'},
          {title: 'SHCP', value: 'shcp'},
          {title: 'SEP', value: 'sep'},
          {title: 'CONAGUA', value: 'conagua'},
          {title: 'SEMARNAT', value: 'semarnat'},
          {title: 'Gobierno Municipal', value: 'municipal'},
          {title: 'Gobierno Estatal', value: 'estatal'},
          {title: 'Otra fuente', value: 'otra'},
        ],
        layout: 'dropdown',
      },
    }),
    defineField({
      name: 'fuentePersonalizada',
      title: 'Fuente Personalizada',
      type: 'string',
      description: 'Especifica la fuente si seleccionaste "Otra fuente"',
      hidden: ({parent}) => {
        const p = parent as {fuente?: string}
        return p?.fuente !== 'otra'
      },
    }),
    defineField({
      name: 'descripcionContexto',
      title: 'Descripcion / Contexto',
      type: 'text',
      rows: 3,
      description:
        'Opcional. Informacion adicional que ayude al agente de voz a interpretar los datos (metodologia, notas importantes, contexto historico, etc.)',
    }),
    defineField({
      name: 'tablaDatos',
      title: 'Tabla de Datos',
      type: 'table',
      description:
        'La primera fila son los Años/Categorias. La primera columna son los nombres de las series. Llena los datos como en Excel.',
    }),
    // === CAMPOS DE IMPORTACION ===
    defineField({
      name: 'archivoFuente',
      title: 'Archivo Fuente',
      type: 'file',
      fieldset: 'importacion',
      options: {
        accept: '.xlsx,.xls,.csv',
      },
      description: 'Archivo original de Excel/CSV del cual se importaron los datos.',
    }),
    defineField({
      name: 'configLimpieza',
      title: 'Configuracion de Limpieza',
      type: 'object',
      fieldset: 'importacion',
      description: 'Metadata de como se procesaron los datos del archivo.',
      fields: [
        defineField({
          name: 'headerRow',
          title: 'Fila de Encabezados',
          type: 'number',
        }),
        defineField({
          name: 'dataStartRow',
          title: 'Fila Inicio de Datos',
          type: 'number',
        }),
        defineField({
          name: 'dataEndRow',
          title: 'Fila Fin de Datos',
          type: 'number',
        }),
        defineField({
          name: 'includedColumns',
          title: 'Columnas Incluidas',
          type: 'array',
          of: [{type: 'number'}],
        }),
        defineField({
          name: 'importedAt',
          title: 'Fecha de Importacion',
          type: 'datetime',
        }),
        defineField({
          name: 'transpose',
          title: 'Datos Transpuestos',
          type: 'boolean',
        }),
      ],
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
