import { useEffect, useRef, useState } from 'react'

/**
 * Doble anillo estilo Fitness.
 *
 *  · Anillo exterior → progreso hacia el siguiente rango.
 *  · Anillo interior → zona de premio (lleno = estás dentro).
 *
 * El exterior conserva el comportamiento del anillo antiguo: si cambia
 * `rankKey`, completa la vuelta hacia adelante, salta a 0 y avanza al
 * nuevo valor, con una pulsación de aura del color del rango nuevo. Así
 * subir de nivel nunca se ve como un retroceso.
 */
export default function DualProgress({
  outer = 0, // 0–1 · progreso de rango
  inner = 0, // 0–1 · zona de premio
  rankKey,
  auraColor = '#cf731b',
  size = 158,
  outerWidth = 10,
  innerWidth = 8.5,
  outerColor = '#cf731b',
  innerColor = '#e0a021',
  trackColor = 'rgba(0,0,0,0.06)',
  trackColorDark = 'rgba(255,255,255,0.10)',
  children,
}) {
  const gap = 6
  const rOuter = (size - outerWidth) / 2
  const rInner = rOuter - outerWidth / 2 - gap - innerWidth / 2
  const cOuter = 2 * Math.PI * rOuter
  const cInner = 2 * Math.PI * rInner

  const [shownOuter, setShownOuter] = useState(outer)
  const [animate, setAnimate] = useState(true)
  const [auraKey, setAuraKey] = useState(0)
  const [currentAura, setCurrentAura] = useState(auraColor)
  const prevRank = useRef(rankKey)
  const mounted = useRef(false)

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      prevRank.current = rankKey
      setShownOuter(outer)
      return
    }
    const cambioRango =
      rankKey !== undefined &&
      prevRank.current !== undefined &&
      rankKey !== prevRank.current

    if (cambioRango) {
      setCurrentAura(auraColor)
      setAuraKey((k) => k + 1)
      setAnimate(true)
      setShownOuter(1)
      const t = setTimeout(() => {
        setAnimate(false)
        setShownOuter(0)
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setAnimate(true)
            setShownOuter(outer)
          })
        })
      }, 820)
      prevRank.current = rankKey
      return () => clearTimeout(t)
    }

    setAnimate(true)
    setShownOuter(outer)
    prevRank.current = rankKey
  }, [outer, rankKey, auraColor])

  const clamp = (v) => Math.max(0, Math.min(1, v))
  const offOuter = cOuter * (1 - clamp(shownOuter))
  const offInner = cInner * (1 - clamp(inner))

  return (
    <div className="relative inline-flex items-center justify-center">
      {auraKey > 0 && (
        <div
          key={auraKey}
          aria-hidden
          className="rank-aura-pulse absolute pointer-events-none rounded-full"
          style={{
            width: size,
            height: size,
            border: `4px solid ${currentAura}`,
            boxShadow: `0 0 24px 4px ${currentAura}66`,
          }}
        />
      )}

      <svg width={size} height={size} className="-rotate-90 relative">
        {/* Pistas */}
        <circle cx={size / 2} cy={size / 2} r={rOuter} fill="none"
          stroke={trackColor} strokeWidth={outerWidth} className="dark:hidden" />
        <circle cx={size / 2} cy={size / 2} r={rOuter} fill="none"
          stroke={trackColorDark} strokeWidth={outerWidth} className="hidden dark:inline" />
        <circle cx={size / 2} cy={size / 2} r={rInner} fill="none"
          stroke={trackColor} strokeWidth={innerWidth} className="dark:hidden" />
        <circle cx={size / 2} cy={size / 2} r={rInner} fill="none"
          stroke={trackColorDark} strokeWidth={innerWidth} className="hidden dark:inline" />

        {/* Anillo interior · premio */}
        <circle
          cx={size / 2} cy={size / 2} r={rInner} fill="none"
          stroke={innerColor} strokeWidth={innerWidth} strokeLinecap="round"
          strokeDasharray={cInner} strokeDashoffset={offInner}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
        />
        {/* Anillo exterior · rango */}
        <circle
          cx={size / 2} cy={size / 2} r={rOuter} fill="none"
          stroke={outerColor} strokeWidth={outerWidth} strokeLinecap="round"
          strokeDasharray={cOuter} strokeDashoffset={offOuter}
          style={{
            transition: animate
              ? 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)'
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
