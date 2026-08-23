import type { Transition, Variants } from 'motion/react'

/**
 * One place for motion timings, so the app moves like a single system
 * rather than each component inventing its own easing.
 *
 * Every consumer pairs these with `useReducedMotion()`. That isn't a
 * formality here: this app is animation-heavy by design, and a viewer who
 * has asked their OS for reduced motion should get the layout instantly,
 * not the same choreography played faster.
 */

/** General-purpose spring: settles quickly, with just enough overshoot to feel alive. */
export const springSoft: Transition = {
  type: 'spring',
  stiffness: 190,
  damping: 24,
  mass: 0.9,
}

/** Snappier spring for direct manipulation — presses, sheets, tab indicators. */
export const springSnappy: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 30,
}

/** Shared-element transition for the sliding nav/tab indicators. */
export const springIndicator: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 34,
}

/** Rise-and-fade, the default entrance for a card or a row. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: springSoft },
}

/** Scale-and-fade, for things that should feel like they pop into place. */
export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: springSoft },
}

/**
 * Parent variant that walks its children in one after another. Pair with
 * `fadeUp`/`popIn` on the children — they inherit `hidden`/`visible` from
 * the parent, so children need no `initial`/`animate` of their own.
 */
export function staggerContainer(stagger = 0.06, delayChildren = 0): Variants {
  return {
    hidden: {},
    visible: {
      transition: { staggerChildren: stagger, delayChildren },
    },
  }
}

/** Page-level transition used by the route crossfade in AppShell. */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { ...springSoft, staggerChildren: 0.05 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: 'easeIn' } },
}

/**
 * Collapses any of the above to a no-op. Returning `undefined` for the
 * variants lets a component drop its animation wholesale while keeping the
 * same JSX shape.
 */
export function motionProps(reduce: boolean | null, variants: Variants) {
  if (reduce) return {}
  return { variants, initial: 'hidden' as const, animate: 'visible' as const }
}
