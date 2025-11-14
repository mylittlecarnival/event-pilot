import clsx from 'clsx'
import type React from 'react'
import { Text } from './text'

const colors = {
  red: 'bg-red-50 border-red-200 text-red-800',
  yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  green: 'bg-green-50 border-green-200 text-green-800',
  blue: 'bg-blue-50 border-blue-200 text-blue-800',
  gray: 'bg-gray-50 border-gray-200 text-gray-800',
}

export function Alert({
  color = 'gray',
  className,
  children,
  ...props
}: { 
  color?: keyof typeof colors
  className?: string
  children: React.ReactNode 
} & React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div 
      {...props}
      className={clsx(
        'flex items-start gap-3 rounded-lg border p-4',
        colors[color],
        className
      )}
    >
      {children}
    </div>
  )
}

export function AlertTitle({
  className,
  ...props
}: { className?: string } & React.ComponentPropsWithoutRef<'h3'>) {
  return (
    <h3
      {...props}
      className={clsx(
        className,
        'text-sm font-semibold'
      )}
    />
  )
}

export function AlertDescription({
  className,
  ...props
}: { className?: string } & React.ComponentPropsWithoutRef<typeof Text>) {
  return (
    <Text
      {...props}
      className={clsx(className, 'text-sm flex-1')}
    />
  )
}

export function AlertBody({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return <div {...props} className={clsx(className, 'mt-4')} />
}

export function AlertActions({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      {...props}
      className={clsx(
        className,
        'mt-6 flex flex-col-reverse items-center justify-end gap-3 *:w-full sm:mt-4 sm:flex-row sm:*:w-auto'
      )}
    />
  )
}
