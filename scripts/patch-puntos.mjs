// ====================================================================
// La Liga · Parche de puntuaciones (reunión julio)
// --------------------------------------------------------------------
// Aplica 4 cambios a src/lib/constants.js:
//   1. "Área de influencia" → "Llamada de cortesía" (2 pts)
//   2. "Llamada de prospección": 10 → 2 pts
//   3. Win Win: descripción con "contrato firmado"
//   4. "Reseña de cliente" → "Bajada de precio" (5 pts)
//
// Uso desde Codespaces (en la raíz del repo):
//   node scripts/patch-puntos.mjs
// Luego: git add . && git commit -m "Puntos: cortesía, prospección 2, winwin contrato, bajada precio" && git push
// ====================================================================

import { readFileSync, writeFileSync } from 'node:fs'

const FILE = 'src/lib/constants.js'
let c = readFileSync(FILE, 'utf8')
const before = c

// 1) Área de influencia -> Llamada de cortesía
c = c.replace(`  area_influencia: {
    id: 'area_influencia',
    label: 'Área de influencia',
    shortLabel: 'Área infl.',
    points: 2,
    icon: '📍',
    description: 'Contacto trabajado en tu área de influencia.',
    leagues: ['agentes'],
    selfService: [],
  },`, `  llamada_cortesia: {
    id: 'llamada_cortesia',
    label: 'Llamada de cortesía',
    shortLabel: 'Cortesía',
    points: 2,
    icon: '📍',
    description: 'Llamada de cortesía realizada.',
    leagues: ['agentes'],
    selfService: [],
  },`)

// 2) Llamada de prospección: 10 -> 2
c = c.replace(`    id: 'llamada_prospeccion',
    label: 'Llamada de prospección',
    shortLabel: 'Prospección',
    points: 10,`, `    id: 'llamada_prospeccion',
    label: 'Llamada de prospección',
    shortLabel: 'Prospección',
    points: 2,`)

// 3) Win Win con contrato firmado
c = c.replace(
  `description: 'Colaboración Win Win materializada.',`,
  `description: 'Colaboración Win Win con contrato firmado.',`
)

// 4) Reseña de cliente -> Bajada de precio
c = c.replace(`  resena: {
    id: 'resena',
    label: 'Reseña de cliente',
    shortLabel: 'Reseña',
    points: 5,
    icon: '⭐️',
    description: 'Un cliente ha dejado una reseña.',
    leagues: ['agentes'],
    selfService: [],
  },`, `  bajada_precio: {
    id: 'bajada_precio',
    label: 'Bajada de precio',
    shortLabel: 'Bajada precio',
    points: 5,
    icon: '📉',
    description: 'Has conseguido una bajada de precio del propietario.',
    leagues: ['agentes'],
    selfService: [],
  },`)

// Verificación
const checks = [
  ['llamada_cortesia', c.includes("id: 'llamada_cortesia'")],
  ['prospección a 2 pts', c.includes("shortLabel: 'Prospección',\n    points: 2,")],
  ['winwin contrato', c.includes('con contrato firmado')],
  ['bajada_precio', c.includes("id: 'bajada_precio'")],
  ['sin area_influencia', !c.includes('area_influencia')],
  ["sin 'resena' suelto", !c.includes("id: 'resena',")],
]

let ok = true
for (const [name, passed] of checks) {
  console.log(`  ${passed ? '✓' : '✗'} ${name}`)
  if (!passed) ok = false
}

if (c === before) {
  console.error('\n⚠️  No se aplicó ningún cambio. ¿Ya estaba parcheado o el archivo difiere?')
  process.exit(1)
}
if (!ok) {
  console.error('\n⚠️  Alguna verificación falló. NO se ha guardado nada. Avisa a Claude con este output.')
  process.exit(1)
}

writeFileSync(FILE, c)
console.log('\n✓ src/lib/constants.js actualizado. Haz commit y push.')
