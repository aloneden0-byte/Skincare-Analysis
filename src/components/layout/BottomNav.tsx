import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface IconProps {
  active: boolean
}

/** Crossfades arbitrary shape elements from outline to a solid fill —
 * shapes should not set their own fill/stroke so the wrapping <g> controls it. */
function MorphShapes({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <>
      <g fill="currentColor" stroke="none" className={cn('transition-opacity duration-300 ease-out', active ? 'opacity-100' : 'opacity-0')}>
        {children}
      </g>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn('transition-opacity duration-300 ease-out', active ? 'opacity-0' : 'opacity-100')}
      >
        {children}
      </g>
    </>
  )
}

/** Same crossfade, for icons whose outline is one coherent closed silhouette. */
function MorphPath({ d, active }: { d: string; active: boolean }) {
  return (
    <MorphShapes active={active}>
      <path d={d} />
    </MorphShapes>
  )
}

function HomeIcon({ active }: IconProps) {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24">
      <MorphPath active={active} d="M12 3.2 3 10.8V20a1 1 0 0 0 1 1h5v-6.5h6V21h5a1 1 0 0 0 1-1v-9.2L12 3.2Z" />
    </svg>
  )
}

function ScanIcon({ active }: IconProps) {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="3.2"
        fill="currentColor"
        stroke="none"
        className={cn('transition-opacity duration-300 ease-out', active ? 'opacity-100' : 'opacity-0')}
      />
      <circle
        cx="12"
        cy="12"
        r="3.2"
        fill="none"
        className={cn('transition-opacity duration-300 ease-out', active ? 'opacity-0' : 'opacity-100')}
      />
    </svg>
  )
}

function RoutineIcon({ active }: IconProps) {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24">
      <MorphPath active={active} d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4.2L5 21V4.5a1 1 0 0 1 1-1Z" />
    </svg>
  )
}

function SettingsIcon({ active }: IconProps) {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24">
      <MorphShapes active={active}>
        <rect x="3.5" y="4.5" width="17" height="6" rx="3" />
        <circle cx="15" cy="7.5" r="1.4" fill="var(--color-surface)" stroke="none" />
        <rect x="3.5" y="13.5" width="17" height="6" rx="3" />
        <circle cx="9" cy="16.5" r="1.4" fill="var(--color-surface)" stroke="none" />
      </MorphShapes>
    </svg>
  )
}

function ProfileIcon({ active }: IconProps) {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24">
      <MorphPath active={active} d="M12 4.2a3.6 3.6 0 1 1 0 7.2 3.6 3.6 0 0 1 0-7.2ZM4.5 20c1.1-4.2 4.4-6.4 7.5-6.4s6.4 2.2 7.5 6.4a1 1 0 0 1-1 1.3H5.5a1 1 0 0 1-1-1.3Z" />
    </svg>
  )
}

const links = [
  { to: '/home', label: 'בית', icon: HomeIcon },
  { to: '/routines', label: 'שגרות', icon: RoutineIcon },
  { to: '/scan', label: 'סריקה', icon: ScanIcon, center: true },
  { to: '/settings', label: 'הגדרות', icon: SettingsIcon },
  { to: '/profile', label: 'פרופיל', icon: ProfileIcon },
]

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface shadow-nav">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {links.map(({ to, label, icon: Icon, center }) => (
          <NavLink key={to} to={to} className="flex flex-col items-center gap-1">
            {({ isActive }) =>
              center ? (
                <div
                  className={cn(
                    'flex flex-col items-center gap-1 transition-transform duration-200',
                    'active:scale-90',
                  )}
                >
                  <div
                    className={cn(
                      '-mt-7 flex items-center justify-center rounded-full bg-primary p-3.5 text-white shadow-card transition-all duration-200',
                      isActive
                        ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface scale-105'
                        : 'hover:scale-105',
                    )}
                  >
                    <Icon active={isActive} />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-0.5 transition-transform duration-150 active:scale-90">
                  <div
                    className={cn(
                      'flex items-center justify-center rounded-2xl px-3 py-1.5 transition-colors duration-300 ease-out',
                      isActive ? 'bg-primary-light text-primary' : 'text-muted',
                    )}
                  >
                    <Icon active={isActive} />
                  </div>
                  <span
                    className={cn(
                      'text-[11px] transition-colors duration-200',
                      isActive ? 'font-semibold text-primary' : 'font-normal text-muted',
                    )}
                  >
                    {label}
                  </span>
                </div>
              )
            }
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
