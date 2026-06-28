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
 * Además, dispara una pulsación de aura del color del nuevo rango.
 */
export default function CircularProgress({
  progress = 0,         // 0–1
  rankKey,              // identificador del rango actual; cambio = wrap forward + aura
  auraColor = '#cf731b',// color del aura al subir de nivel
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
  const [auraKey, setAuraKey] = useState(0)
  const [currentAuraColor, setCurrentAuraColor] = useState(auraColor)
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
      // Disparar la pulsación de aura (cambiar key fuerza remount del div).
      setCurrentAuraColor(auraColor)
      setAuraKey((k) => k + 1)

      // 1) Completar el anillo actual (animación hacia adelante hasta 1).
      setAnimate(true)
      setDisplayed(1)

      // 2) Al terminar, saltar a 0 sin transición y animar al nuevo valor.
      const t = setTimeout(() => {
        setAnimate(false)
        setDisplayed(0)
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
  }, [progress, rankKey, auraColor])

  const clamped = Math.max(0, Math.min(1, displayed))
  const offset = circumference * (1 - clamped)

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Aura — sale del anillo al subir de rango */}
      {auraKey > 0 && (
        <div
          key={auraKey}
          aria-hidden
          className="rank-aura-pulse absolute pointer-events-none rounded-full"
          style={{
            width: size,
            height: size,
            border: `4px solid ${currentAuraColor}`,
            boxShadow: `0 0 24px 4px ${currentAuraColor}66`,
          }}
        />
      )}

      <svg width={size} height={size} className="-rotate-90 relative">
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
