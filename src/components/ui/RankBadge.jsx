import { cn } from '../../lib/utils'
import { RANKS } from '../../lib/constants'

export default function RankBadge({ rankId, size = 'md', className = '' }) {
  const rank = RANKS[rankId] || RANKS.prospectador

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-3 py-1',
    lg: 'text-sm px-4 py-1.5',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-bold text-white shadow-sm',
        `bg-gradient-to-r ${rank.gradient}`,
        sizes[size],
        className
      )}
    >
      {rank.id === 'embajador' && <span>🏆</span>}
      {rank.label}
    </span>
  )
}
