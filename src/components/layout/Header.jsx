import { Sun, Moon, LogOut } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import NotificationBell from '../ui/NotificationBell'

export default function Header({ title, subtitle, showLogout = false }) {
  const { theme, toggle } = useTheme()
  const { signOut } = useAuth()

  return (
    <header className="flex items-start justify-between pt-4 pb-6">
      <div>
        {subtitle && (
          <p className="text-xs font-semibold uppercase tracking-wider text-rk-ink/50 dark:text-rk-cream/50">
            {subtitle}
          </p>
        )}
        <h1 className="text-2xl font-black tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <button
          onClick={toggle}
          className="w-10 h-10 rounded-full glass flex items-center justify-center"
          aria-label="Cambiar tema"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        {showLogout && (
          <button
            onClick={signOut}
            className="w-10 h-10 rounded-full glass flex items-center justify-center"
            aria-label="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </header>
  )
}
