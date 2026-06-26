import { initials, cn } from '../../lib/utils'

const sizes = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-base',
  xl: 'w-24 h-24 text-2xl',
}

export default function Avatar({ name, photoUrl, size = 'md', className = '' }) {
  const sz = sizes[size] || sizes.md

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={cn(sz, 'rounded-full object-cover ring-2 ring-white/60 dark:ring-white/10', className)}
      />
    )
  }

  return (
    <div
      className={cn(
        sz,
        'rounded-full flex items-center justify-center font-bold text-white',
        'bg-gradient-to-br from-rk-orange to-amber-500',
        'ring-2 ring-white/60 dark:ring-white/10',
        className
      )}
    >
      {initials(name)}
    </div>
  )
}
