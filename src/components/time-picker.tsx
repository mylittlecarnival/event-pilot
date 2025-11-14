'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/button'
import { ClockIcon } from '@heroicons/react/24/outline'

interface TimeOption {
  label: string
  value: string
}

interface TimePickerProps {
  startTime?: string | null
  endTime?: string | null
  onStartTimeChange: (time: string | null) => void
  onEndTimeChange: (time: string | null) => void
  className?: string
  disabled?: boolean
}

export function TimePicker({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  className = '',
  disabled = false
}: TimePickerProps) {
  const [timeOptions, setTimeOptions] = useState<TimeOption[]>([])

  // Generate time options in 30-minute increments
  const generateTimeOptions = (): TimeOption[] => {
    const start = new Date()
    start.setHours(7, 30, 0, 0) // 7:30 AM
    const end = new Date()
    end.setHours(19, 30, 0, 0) // 7:30 PM

    const options: TimeOption[] = []

    while (start <= end) {
      const label = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
      const hours = start.getHours().toString().padStart(2, '0')
      const minutes = start.getMinutes().toString().padStart(2, '0')
      const value = `${hours}:${minutes}` // Ensure consistent "HH:MM" format
      options.push({ label, value })
      start.setMinutes(start.getMinutes() + 30)
    }

    return options
  }

  // Initialize time options
  useEffect(() => {
    setTimeOptions(generateTimeOptions())
  }, [])

  // Normalize time format (remove seconds if present)
  const normalizeTime = (timeStr: string | null): string | null => {
    if (!timeStr) return null
    // If time has seconds (HH:MM:SS), remove them to get HH:MM
    return timeStr.length > 5 ? timeStr.slice(0, 5) : timeStr
  }

  // Convert time string to minutes for comparison
  const timeToMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number)
    return h * 60 + m
  }

  // Check if end time option should be disabled
  const isEndTimeDisabled = (endTimeValue: string): boolean => {
    if (!startTime) return false
    const normalizedStartTime = normalizeTime(startTime)
    if (!normalizedStartTime) return false
    return timeToMinutes(endTimeValue) <= timeToMinutes(normalizedStartTime)
  }

  // Handle start time selection
  const handleStartTimeSelect = (value: string) => {
    onStartTimeChange(value)
    // Clear end time if it becomes invalid
    if (endTime && isEndTimeDisabled(endTime)) {
      onEndTimeChange(null)
    }
  }

  // Format time for display
  const displayTime = (timeStr: string | null): string => {
    if (!timeStr) return ''
    const [hour, minute] = timeStr.split(':').map(Number)
    const date = new Date()
    date.setHours(hour)
    date.setMinutes(minute)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
  }

  // Check if event is longer than 3 hours
  const isLongEvent = useMemo((): boolean => {
    if (!startTime || !endTime) return false
    const normalizedStartTime = normalizeTime(startTime)
    const normalizedEndTime = normalizeTime(endTime)
    if (!normalizedStartTime || !normalizedEndTime) return false
    const start = timeToMinutes(normalizedStartTime)
    const end = timeToMinutes(normalizedEndTime)
    return end - start > 180 // 3 hours = 180 minutes
  }, [startTime, endTime])

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Start Time */}
        <div>
          <label className="block text-sm/6 font-medium text-zinc-950 dark:text-white mb-3">
            Event Start Time
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {timeOptions.map((option) => {
              const normalizedStartTime = normalizeTime(startTime || null)
              const isSelected = normalizedStartTime === option.value
              return (
                <button
                  key={`start-${option.value}`}
                  type="button"
                  onClick={() => !disabled && handleStartTimeSelect(option.value)}
                  disabled={disabled}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                    isSelected
                      ? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
                      : 'bg-white text-zinc-800 border-zinc-300 hover:border-red-500 hover:bg-zinc-50'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* End Time */}
        <div>
          <label className="block text-sm/6 font-medium text-zinc-950 dark:text-white mb-3">
            Event End Time
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {timeOptions.map((option) => {
              const isDisabled = disabled || isEndTimeDisabled(option.value)
              const normalizedEndTime = normalizeTime(endTime || null)
              const isSelected = normalizedEndTime === option.value
              return (
                <button
                  key={`end-${option.value}`}
                  type="button"
                  onClick={() => !isDisabled && onEndTimeChange(option.value)}
                  disabled={isDisabled}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                    isDisabled
                      ? 'bg-zinc-100 text-zinc-400 border-zinc-200 opacity-60 cursor-not-allowed'
                      : isSelected
                        ? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
                        : 'bg-white text-zinc-800 border-zinc-300 hover:border-red-500 hover:bg-zinc-50'
                  }`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Time Summary */}
      {isLongEvent && (
        <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4">
          <div className="flex">
            <div className="shrink-0">
              <svg viewBox="0 0 20 20" fill="currentColor" data-slot="icon" aria-hidden="true" className="size-5 text-yellow-400">
                <path d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" fillRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Note: Events longer than 3 hours may incur additional charges.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}