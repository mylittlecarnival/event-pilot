'use client'

import { Logo } from '@/app/logo'
import { Button } from '@/components/button'
import { Field, Label } from '@/components/fieldset'
import { Heading } from '@/components/heading'
import { Input } from '@/components/input'
import { Strong, Text, TextLink } from '@/components/text'
import { Spinner } from '@/components/spinner'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPassword() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError('')

    const password = String(formData.get('password'))
    const confirmPassword = String(formData.get('confirm-password'))

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        setError(error.message)
        setIsLoading(false)
        return
      }

      router.push('/')
    } catch {
      setError('An unexpected error occurred')
      setIsLoading(false)
    }
  }

  return (
    <form action={handleSubmit} className="grid w-full max-w-sm grid-cols-1 gap-3">
      <Logo className="h-9 text-zinc-950 forced-colors:text-[CanvasText]" />
      <Heading>Set a new password</Heading>

      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <Text className="text-red-800 text-sm">{error}</Text>
        </div>
      )}

      <Field>
        <Label>New password</Label>
        <Input
          type="password"
          name="password"
          required
          disabled={isLoading}
          className={isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        />
      </Field>
      <Field>
        <Label>Confirm password</Label>
        <Input
          type="password"
          name="confirm-password"
          required
          disabled={isLoading}
          className={isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        />
      </Field>
      <Button
        type="submit"
        className="w-full relative transition-all duration-150 ease-out"
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-2">
            <Spinner size="sm" />
            <span>Updating...</span>
          </div>
        ) : (
          'Update password'
        )}
      </Button>
      <Text>
        <TextLink href="/login">
          <Strong>Back to sign in</Strong>
        </TextLink>
      </Text>
    </form>
  )
}
