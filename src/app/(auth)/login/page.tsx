'use client'

import { Logo } from '@/app/logo'
import { Button } from '@/components/button'
import { Checkbox, CheckboxField } from '@/components/checkbox'
import { Field, Label } from '@/components/fieldset'
import { Heading } from '@/components/heading'
import { Input } from '@/components/input'
import { Strong, Text, TextLink } from '@/components/text'
import { Spinner } from '@/components/spinner'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Login() {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    useEffect(() => {
        // Detect recovery token in URL hash and redirect to reset-password page
        const hash = window.location.hash
        if (hash && hash.includes('type=recovery')) {
            const supabase = createClient()
            // Supabase client auto-detects the token from the hash and sets the session
            supabase.auth.onAuthStateChange((event) => {
                if (event === 'PASSWORD_RECOVERY') {
                    router.replace('/reset-password')
                }
            })
        }
    }, [router])

    async function handleSubmit(formData: FormData) {
        // Immediate feedback
        setIsLoading(true)
        setError('')

        try {
            const supabase = createClient()
            const { error } = await supabase.auth.signInWithPassword({
                email: String(formData.get('email')),
                password: String(formData.get('password')),
            })

            if (error) {
                setError(error.message)
                setIsLoading(false)
                return
            }

            // Don't reset loading state on success - let redirect handle it
            router.push('/')
        } catch {
            setError('An unexpected error occurred')
            setIsLoading(false)
        }
    }

  return (
    <form action={handleSubmit} className="grid w-full max-w-sm grid-cols-1 gap-3">
      <Logo className="h-9 text-zinc-950 forced-colors:text-[CanvasText]" />
      <Heading>Sign in to your account</Heading>
      
      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <Text className="text-red-800 text-sm">{error}</Text>
        </div>
      )}
      
      <Field>
        <Label>Email</Label>
        <Input
          type="email"
          name="email"
          required
          disabled={isLoading}
          className={isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        />
      </Field>
      <Field>
        <Label>Password</Label>
        <Input
          type="password"
          name="password"
          required
          disabled={isLoading}
          className={isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        />
      </Field>
      <div className="flex items-center justify-between">
        <CheckboxField>
          <Checkbox name="remember" disabled={isLoading} />
          <Label>Remember me</Label>
        </CheckboxField>
        <Text>
          <TextLink href="/forgot-password">
            <Strong>Forgot password?</Strong>
          </TextLink>
        </Text>
      </div>
      <Button
        type="submit"
        className="w-full relative transition-all duration-150 ease-out"
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-2">
            <Spinner size="sm" />
            <span>Signing in...</span>
          </div>
        ) : (
          'Sign in'
        )}
      </Button>
      <Text>
        Don&apos;t have an account?{' '}
        <TextLink href="/register">
          <Strong>Sign up</Strong>
        </TextLink>
      </Text>
    </form>
  )
}
