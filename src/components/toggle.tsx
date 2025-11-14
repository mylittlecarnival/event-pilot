import clsx from 'clsx'
import type React from 'react'

export function Toggle({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  color = 'blue',
  className,
  ...props
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'pink' | 'indigo'
  className?: string
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'>) {
  const sizes = {
    sm: 'h-4 w-7',
    md: 'h-5 w-9',
    lg: 'h-6 w-11'
  }

  const thumbSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  const thumbPositions = {
    sm: checked ? 'translate-x-3' : 'translate-x-0',
    md: checked ? 'translate-x-4' : 'translate-x-0',
    lg: checked ? 'translate-x-5' : 'translate-x-0'
  }

  const colors = {
    blue: {
      bg: checked ? 'bg-blue-600' : 'bg-gray-200',
      dark: checked ? 'dark:bg-blue-500' : 'dark:bg-gray-700'
    },
    green: {
      bg: checked ? 'bg-green-600' : 'bg-gray-200',
      dark: checked ? 'dark:bg-green-500' : 'dark:bg-gray-700'
    },
    red: {
      bg: checked ? 'bg-red-600' : 'bg-gray-200',
      dark: checked ? 'dark:bg-red-500' : 'dark:bg-gray-700'
    },
    yellow: {
      bg: checked ? 'bg-yellow-500' : 'bg-gray-200',
      dark: checked ? 'dark:bg-yellow-400' : 'dark:bg-gray-700'
    },
    purple: {
      bg: checked ? 'bg-purple-600' : 'bg-gray-200',
      dark: checked ? 'dark:bg-purple-500' : 'dark:bg-gray-700'
    },
    pink: {
      bg: checked ? 'bg-pink-600' : 'bg-gray-200',
      dark: checked ? 'dark:bg-pink-500' : 'dark:bg-gray-700'
    },
    indigo: {
      bg: checked ? 'bg-indigo-600' : 'bg-gray-200',
      dark: checked ? 'dark:bg-indigo-500' : 'dark:bg-gray-700'
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative inline-flex flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2',
        sizes[size],
        colors[color].bg,
        colors[color].dark,
        disabled && 'opacity-50 cursor-not-allowed',
        checked ? 'focus:ring-blue-500' : 'focus:ring-gray-500',
        className
      )}
      {...props}
    >
      <span
        className={clsx(
          'pointer-events-none inline-block rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out',
          thumbSizes[size],
          thumbPositions[size]
        )}
      />
    </button>
  )
}

export function ToggleField({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  size = 'md',
  color = 'blue',
  className,
  ...props
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'pink' | 'indigo'
  className?: string
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'>) {
  return (
    <div className={clsx('flex items-center justify-between', className)}>
      <div className="flex-1">
        <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {label}
        </label>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className={clsx(
          'text-sm font-medium',
          checked 
            ? 'text-green-600 dark:text-green-400' 
            : 'text-gray-500 dark:text-gray-400'
        )}>
          {checked ? 'Active' : 'Inactive'}
        </span>
        <Toggle
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          size={size}
          color={color}
          {...props}
        />
      </div>
    </div>
  )
}

export function SimpleToggle({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  color = 'blue',
  className,
  ...props
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'pink' | 'indigo'
  className?: string
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'>) {
  return (
    <div className={clsx('flex items-center gap-3', className)}>
      <span className={clsx(
        'text-sm font-medium',
        checked 
          ? 'text-green-600 dark:text-green-400' 
          : 'text-gray-500 dark:text-gray-400'
      )}>
        {checked ? 'Active' : 'Inactive'}
      </span>
      <Toggle
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        size={size}
        color={color}
        {...props}
      />
    </div>
  )
}
