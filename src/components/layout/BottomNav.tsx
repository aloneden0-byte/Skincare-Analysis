import { NavLink } from 'react-router-dom'

const HomeIcon = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const ScanIcon = () => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="3.2" />
  </svg>
)

const RoutineIcon = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="M8 10h8M8 14h5" strokeLinecap="round" />
  </svg>
)

const ProfileIcon = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="8" r="3.2" />
    <path d="M5 20c1.2-3.5 4-5.2 7-5.2s5.8 1.7 7 5.2" strokeLinecap="round" />
  </svg>
)

const links = [
  { to: '/home', label: 'בית', icon: HomeIcon },
  { to: '/scan', label: 'סריקה', icon: ScanIcon, center: true },
  { to: '/routines', label: 'שגרות', icon: RoutineIcon },
  { to: '/profile', label: 'פרופיל', icon: ProfileIcon },
]

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 bg-surface shadow-nav">
      <div className="mx-auto flex max-w-md items-center justify-around px-4 py-2">
        {links.map(({ to, label, icon: Icon, center }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 rounded-2xl px-3 py-1.5 text-xs transition-all duration-150 active:scale-90 ${
                center
                  ? 'bg-primary text-white -mt-6 rounded-full p-3 shadow-card hover:scale-105'
                  : isActive
                    ? 'text-primary scale-110'
                    : 'text-muted hover:text-primary/70'
              }`
            }
          >
            <Icon />
            {!center && <span>{label}</span>}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
