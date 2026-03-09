import {StructureBuilder, StructureResolverContext} from 'sanity/structure'
import {BulkImportPane} from './components/BulkImportPane'

export const structure = (S: StructureBuilder, context: StructureResolverContext) => {
  const client = context.getClient({apiVersion: '2024-01-01'})

  return S.list()
    .title('Contenido')
    .items([
      // === INDICADORES POR EJE ===
      S.listItem()
        .title('📂 Indicadores por Eje')
        .child(
          S.documentTypeList('eje')
            .title('Selecciona un Eje')
            .child(async (ejeId) => {
              const indicators: {_id: string; title: string}[] = await client.fetch(
                `*[_type == "indicador" && eje._ref == $ejeId]|order(title asc){_id, title}`,
                {ejeId},
              )

              return S.list()
                .title('Indicadores')
                .items([
                  // Indicadores del eje
                  ...indicators.map((ind) =>
                    S.listItem()
                      .id(ind._id)
                      .title(ind.title)
                      .schemaType('indicador')
                      .child(
                        S.document()
                          .documentId(ind._id)
                          .schemaType('indicador'),
                      ),
                  ),

                  S.divider(),

                  // Boton de importacion masiva
                  S.listItem()
                    .title('📥 Importar BD Normalizada')
                    .id('bulk-import')
                    .child(
                      S.component(BulkImportPane)
                        .title('Importar desde Base de Datos Normalizada'),
                    ),
                ])
            }),
        ),

      S.divider(),

      // === TODOS LOS INDICADORES ===
      S.listItem()
        .title('📝 Todos los Indicadores')
        .schemaType('indicador')
        .child(S.documentTypeList('indicador').title('Todos los Indicadores')),

      S.divider(),

      // === PUBLICACIONES ===
      S.listItem()
        .title('📰 Publicaciones')
        .schemaType('publication')
        .child(S.documentTypeList('publication').title('Publicaciones')),

      S.divider(),

      // === DATOS DEL MAPA ===
      S.listItem()
        .title('🗺️ Datos del Mapa (Inicio)')
        .id('datosMapa')
        .child(
          S.document()
            .schemaType('datosMapa')
            .documentId('datosMapa')
            .title('Datos del Mapa (Inicio)'),
        ),

      S.divider(),

      // === CONFIGURACION ===
      S.listItem()
        .title('⚙️ Catalogos')
        .child(
          S.list()
            .title('Catalogos')
            .items([
              S.listItem()
                .title('Ejes Tematicos')
                .schemaType('eje')
                .child(S.documentTypeList('eje').title('Ejes Tematicos')),
            ]),
        ),
    ])
}
