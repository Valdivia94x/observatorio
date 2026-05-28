import type {IndicadorParser} from './types'
import {parseRezagoEducativo} from './parsers/rezagoEducativo'
import {parseResultadosPlanea} from './parsers/resultadosPlanea'
import {parseNivelEscolaridad} from './parsers/nivelEscolaridad'
import {parseMatriculaUniversitaria} from './parsers/matriculaUniversitaria'
import {parseMatriculaPosgrado} from './parsers/matriculaPosgrado'
import {parseIndicadoresSecundaria} from './parsers/indicadoresSecundaria'
import {parseIndicadoresPrimaria} from './parsers/indicadoresPrimaria'
import {parseIndicadoresPreescolar} from './parsers/indicadoresPreescolar'
import {parseIndicadoresMediaSuperior} from './parsers/indicadoresMediaSuperior'
import {parseEgresadosUniversitarios} from './parsers/egresadosUniversitarios'
import {parseEgresadosPosgrado} from './parsers/egresadosPosgrado'
import {parseAniosEscolaridad} from './parsers/aniosEscolaridad'
import {parseCrecimientoPIB} from './parsers/crecimientoPIB'
import {parseExportaciones} from './parsers/exportaciones'
import {parseInflacion} from './parsers/inflacion'
import {parseInversionExtranjera} from './parsers/inversionExtranjera'
import {parseProductividadLaboral} from './parsers/productividadLaboral'
import {parseUnidadesEconomicas} from './parsers/unidadesEconomicas'
import {parseRemesas} from './parsers/remesas'
import {parseIndicadoresOcupacion} from './parsers/indicadoresOcupacion'
import {parseIndicadoresDesocupacion} from './parsers/indicadoresDesocupacion'
import {parseTrabajadoresIMSS} from './parsers/trabajadoresIMSS'
import {parseSalariosIMSS} from './parsers/salariosIMSS'
import {parsePatronesIMSS} from './parsers/patronesIMSS'
import {parseDeudaTotalRegistrada} from './parsers/deudaTotalRegistrada'
import {parseDeudaSOMA} from './parsers/deudaSOMA'
import {parseEgresosSOMA} from './parsers/egresosSOMA'
import {parseGastoRubros} from './parsers/gastoRubros'
import {parseIngresosMunicipales} from './parsers/ingresosMunicipales'
import {parseIngresosSOMA} from './parsers/ingresosSOMA'
import {parseRecaudacionPredial} from './parsers/recaudacionPredial'
import {parseTrabajadoresNomina} from './parsers/trabajadoresNomina'
import {parseCasosDepresion} from './parsers/casosDepresion'
import {parseCoberturaSalud} from './parsers/coberturaSalud'
import {parseMortalidadRegistrada} from './parsers/mortalidadRegistrada'
import {parseNatalidadRegistrada} from './parsers/natalidadRegistrada'
import {parseRecursosSalud} from './parsers/recursosSalud'
import {parseSuicidiosRegistrados} from './parsers/suicidiosRegistrados'
import {parseAccidentesTransito} from './parsers/accidentesTransito'
import {parseCreditosVivienda} from './parsers/creditosVivienda'
import {parseMatrimoniosDivorcios} from './parsers/matrimoniosDivorcios'
import {parseJefaturaHogar} from './parsers/jefaturaHogar'
import {parseMovilidad} from './parsers/movilidad'
import {parsePobrezaMultidimensional} from './parsers/pobrezaMultidimensional'
import {parseCarenciasSociales} from './parsers/carenciasSociales'
import {parseTecnologiasInformacion} from './parsers/tecnologiasInformacion'
import {parseVehiculosMotor} from './parsers/vehiculosMotor'
import {parsePiramidePoblacional} from './parsers/piramidePoblacional'

// Registry: maps indicator name (lowercase) to its parser
const registry = new Map<string, IndicadorParser>()

function register(name: string, parser: IndicadorParser) {
  registry.set(name.toLowerCase().trim(), parser)
}

// === Register parsers here ===
register('Rezago Educativo', parseRezagoEducativo)
register('Resultados PLANEA', parseResultadosPlanea)
register('Nivel de Escolaridad', parseNivelEscolaridad)
register('Matrícula Universitaria', parseMatriculaUniversitaria)
register('Matrícula Posgrado', parseMatriculaPosgrado)
register('Indicadores básicos de secundaria', parseIndicadoresSecundaria)
register('Indicadores básicos de primaria', parseIndicadoresPrimaria)
register('Indicadores básicos de preescolar', parseIndicadoresPreescolar)
register('Indicadores básicos de media superior', parseIndicadoresMediaSuperior)
register('Egresados Universitarios', parseEgresadosUniversitarios)
register('Egresados Posgrado', parseEgresadosPosgrado)
register('Años promedio de escolaridad', parseAniosEscolaridad)
register('Crecimiento Económico PIB', parseCrecimientoPIB)
register('Exportaciones', parseExportaciones)
register('Inflación', parseInflacion)
register('Inversión Extranjera Directa', parseInversionExtranjera)
register('Productividad Laboral', parseProductividadLaboral)
register('Unidades Económicas', parseUnidadesEconomicas)
register('Remesas histórico', parseRemesas)
register('Indicadores de Ocupación', parseIndicadoresOcupacion)
register('Indicadores de Desocupación', parseIndicadoresDesocupacion)
register('Trabajadores registrados en el IMSS', parseTrabajadoresIMSS)
register('Salarios de trabajadores registrados en el IMSS', parseSalariosIMSS)
register('Patrones Afiliados en el IMSS', parsePatronesIMSS)
register('Deuda Total registrada', parseDeudaTotalRegistrada)
register('Deuda de los Sistemas Operadores de Agua', parseDeudaSOMA)
register('Egresos de los Sistemas Operadores de Agua', parseEgresosSOMA)
register('Gasto ejercido por rubros', parseGastoRubros)
register('Ingresos Municipales', parseIngresosMunicipales)
register('Ingresos de los Sistemas Operadores de Agua', parseIngresosSOMA)
register('Recaudación del impuesto predial', parseRecaudacionPredial)
register('Trabajadores registrados en la nómina', parseTrabajadoresNomina)
register('Casos de depresión registrados', parseCasosDepresion)
register('Cobertura en salud de la población', parseCoberturaSalud)
register('Mortalidad registrada', parseMortalidadRegistrada)
register('Natalidad registrada', parseNatalidadRegistrada)
register('Recursos para la salud pública', parseRecursosSalud)
register('Suicidios registrados', parseSuicidiosRegistrados)
// Eje Desarrollo Urbano — llaves = títulos de los indicadores en Sanity (nombres de los Excel)
register('Accidentes de tránsito', parseAccidentesTransito)
register('Créditos para la vivienda por institución financiera', parseCreditosVivienda)
register('Divorcios', parseMatrimoniosDivorcios)
register('Jefatura del hogar por género', parseJefaturaHogar)
register('Medio de transporte de los estudiantes y trabajadores', parseMovilidad)
// El Excel de Pobreza tiene 2 hojas (condiciones apiladas + carencias horizontales) → un solo indicador
register('Pobreza Multidimensional', (wb) => [...parsePobrezaMultidimensional(wb), ...parseCarenciasSociales(wb)])
register('Tecnologías de la información al interior de las viviendas', parseTecnologiasInformacion)
register('Vehículos de motor registrados', parseVehiculosMotor)
register('Población', parsePiramidePoblacional)

// === Public API ===
export function getParser(indicadorName: string): IndicadorParser | null {
  return registry.get(indicadorName.toLowerCase().trim()) ?? null
}

export function hasParser(indicadorName: string): boolean {
  return registry.has(indicadorName.toLowerCase().trim())
}

export function getRegisteredNames(): string[] {
  return Array.from(registry.keys())
}
