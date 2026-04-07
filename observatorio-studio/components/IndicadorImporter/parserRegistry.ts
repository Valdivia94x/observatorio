import type {IndicadorParser} from './types'
import {parseRezagoEducativo} from './parsers/rezagoEducativo'

// Registry: maps indicator name (lowercase) to its parser
const registry = new Map<string, IndicadorParser>()

function register(name: string, parser: IndicadorParser) {
  registry.set(name.toLowerCase().trim(), parser)
}

// === Register parsers here ===
register('Rezago Educativo', parseRezagoEducativo)

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
