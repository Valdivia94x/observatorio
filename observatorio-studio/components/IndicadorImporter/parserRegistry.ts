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
import {parseIndicadoresOcupacion} from './parsers/indicadoresOcupacion'
import {parseIndicadoresDesocupacion} from './parsers/indicadoresDesocupacion'

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
register('Indicadores de Ocupación', parseIndicadoresOcupacion)
register('Indicadores de Desocupación', parseIndicadoresDesocupacion)

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
