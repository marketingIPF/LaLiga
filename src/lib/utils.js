/**
 * Combina classNames condicionales (versión mini de clsx).
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

/**
 * Formatea puntos con separador de miles.
 */
export function formatPoints(n) {
  return new Intl.NumberFormat('es-ES').format(n ?? 0)
}

/**
 * Formatea una fecha relativa ("hace 2h", "ayer", etc.).
 */
export function relativeDate(date) {
  if (!date) return ''
  const d = date.toDate ? date.toDate() : new Date(date)
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'hace un momento'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const days = Math.floor(h / 24)
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days} días`
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

/**
 * Genera iniciales de un nombre completo.
 */
export function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}
