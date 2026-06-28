import { Outlet } from 'react-router-dom'

export default function PanelLayout() {
  return (
    <div className="min-h-screen bg-rk-cream dark:bg-rk-ink">
      <main className="min-h-screen p-5 md:p-8 overflow-x-auto">
        <div className="max-w-[1400px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
