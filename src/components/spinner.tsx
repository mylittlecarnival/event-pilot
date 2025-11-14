import { clsx } from 'clsx'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  return (
    <div
      className={clsx(
        'animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}

// Modern gradient spinner variant
export function GradientSpinner({ size = 'md', className }: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  return (
    <div
      className={clsx(
        'animate-spin rounded-full border-2 border-transparent bg-gradient-to-r from-zinc-600 to-zinc-400 bg-clip-border',
        sizeClasses[size],
        className
      )}
      style={{
        background: 'conic-gradient(from 0deg, #71717a, #a1a1aa, #71717a)',
        borderRadius: '50%',
        border: '2px solid transparent',
        backgroundClip: 'padding-box'
      }}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}

// Pulse loading dots
export function PulseDots({ className }: { className?: string }) {
  return (
    <div className={clsx('flex space-x-1', className)}>
      <div className="h-2 w-2 animate-pulse rounded-full bg-zinc-600 [animation-delay:-0.3s]"></div>
      <div className="h-2 w-2 animate-pulse rounded-full bg-zinc-600 [animation-delay:-0.15s]"></div>
      <div className="h-2 w-2 animate-pulse rounded-full bg-zinc-600"></div>
    </div>
  )
}
