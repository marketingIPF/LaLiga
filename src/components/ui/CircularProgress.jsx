import { useEffect, useRef, useState } from 'react'

/**
 * Indicador circular tipo Apple Watch.
 *
 * Si recibe `rankKey` y este cambia entre renders, el anillo SIEMPRE
 * gira hacia adelante (sentido horario):
 *   1. Anima hasta el 100% completando el círculo actual
 *   2. Salta a 0 sin transición
 *   3. Anima desde 0 hasta el nuevo progreso
 *
 * Así, cuando un agente sube de rango y su progreso cae (p.ej. de 0.25
 * en Sénior a 0.05 en Élite), el anillo no retrocede visualmente.
 */
export default function CircularProgress({
  progress = 0, // 0–1
  rankKey,      // identificador del rango actual; cambio = wrap forward
  size = 200,
  strokeWidth = 14,
  color = '#cf731b',
  trackColor = 'rgba(0,0,0,0.08)',
  trackColorDark = 'rgba(255,255,255,0.1)',
  children,
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  const [displayed, setDisplayed] = useState(progress)
  const [animate, setAnimate] = useState(true)
  const prevRankKey = useRef(rankKey)
  const mounted = useRef(false)

  useEffect(() => {
    // Primer render: solo sincronizar refs y valor mostrado.
    if (!mounted.current) {
      mounted.current = true
      prevRankKey.current = rankKey
      setDisplayed(progress)
      return
    }

    const oldRankKey = prevRankKey.current
    const rankChanged =
      rankKey !== undefined &&
      oldRankKey !== undefined &&
      rankKey !== oldRankKey

    if (rankChanged) {
      // 1) Completar el anillo actual (animación hacia adelante hasta 1).
      setAnimate(true)
      setDisplayed(1)

      // 2) Cuando termine, saltar a 0 sin transición y luego animar al nuevo valor.
      const t = setTimeout(() => {
        setAnimate(false)
        setDisplayed(0)
        // Doble RAF para asegurar que el snap a 0 se aplica antes de reactivar
        // la transición y arrancar el avance hasta `progress`.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setAnimate(true)
            setDisplayed(progress)
          })
        })
      }, 820)

      prevRankKey.current = rankKey
      return () => clearTimeout(t)
    }

    // Sin cambio de rango: transición normal.
    setAnimate(true)
    setDisplayed(progress)
    prevRankKey.current = rankKey
  }, [progress, rankKey])

  const clamped = Math.max(0, Math.min(1, displayed))
  const offset = circumference * (1 - clamped)

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Track claro */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
          className="dark:hidden"
        />
        {/* Track oscuro */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColorDark}
          strokeWidth={strokeWidth}
          className="hidden dark:inline"
        />
        {/* Progreso */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: animate
              ? 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
              : 'none',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  )
}
