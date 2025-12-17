import {StructureBuilder} from 'sanity/structure'

export const structure = (S: StructureBuilder) =>
  S.list()
    .title('Contenido')
    .items([
      // === INDICADORES POR EJE ===
      S.listItem()
        .title('📂 Indicadores por Eje')
        .child(
          S.documentTypeList('eje')
            .title('Selecciona un Eje')
            .child((ejeId) =>
              S.documentList()
                .title('Indicadores')
                .filter('_type == "indicador" && eje._ref == $ejeId')
                .params({ejeId})
            )
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
            ])
        ),
    ])
