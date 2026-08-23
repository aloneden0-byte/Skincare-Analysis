import { motion, useReducedMotion } from 'motion/react'

/**
 * Three dots breathing in sequence rather than a spinner — softer, and it
 * matches the rounded language of the rest of the design.
 */
export function LoadingSpinner({ label }: { label?: string }) {
  const reduceMotion = useReducedMotion()

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-2.5 rounded-full bg-primary"
            animate={reduceMotion ? undefined : { y: [0, -7, 0], opacity: [0.45, 1, 0.45] }}
            transition={{
              duration: 0.9,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.14,
            }}
          />
        ))}
      </div>
      {label && <p className="text-sm">{label}</p>}
    </div>
  )
}
