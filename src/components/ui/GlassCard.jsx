import { cn } from '../../lib/utils'

export default function GlassCard({ children, className = '', as: Tag = 'div', ...rest }) {
  return (
    <Tag className={cn('ios-card animate-fade-in', className)} {...rest}>
      {children}
    </Tag>
  )
}
