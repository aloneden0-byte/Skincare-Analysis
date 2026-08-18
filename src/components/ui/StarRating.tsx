interface StarRatingProps {
  value: number // 0-5
  max?: number
}

export function StarRating({ value, max = 5 }: StarRatingProps) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} מתוך ${max}`}>
      {Array.from({ length: max }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          width={16}
          height={16}
          fill={i < Math.round(value) ? '#f59e0b' : '#e5e0f5'}
        >
          <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L10 14.9l-5.2 2.61.99-5.79-4.21-4.1 5.82-.85z" />
        </svg>
      ))}
    </div>
  )
}
