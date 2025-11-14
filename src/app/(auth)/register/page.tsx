'use client'

import { Logo } from '@/app/logo'
import { Button } from '@/components/button'
import { Checkbox, CheckboxField } from '@/components/checkbox'
import { Field, Label } from '@/components/fieldset'
import { Heading } from '@/components/heading'
import { Input } from '@/components/input'
import { Select } from '@/components/select'
import { Strong, Text, TextLink } from '@/components/text'
import { GradientSpinner } from '@/components/spinner'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Register() {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    async function handleSubmit(formData: FormData) {
        setIsLoading(true)
        setError('')
        
        try {
            const supabase = createClient()
            const email = String(formData.get('email') || '')
            const password = String(formData.get('password') || '')

            const { error } = await supabase.auth.signUp({ email, password })

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
    <form action={handleSubmit} className="grid w-full max-w-sm grid-cols-1 gap-4 ">
      <Logo className="h-9 text-zinc-950 forced-colors:text-[CanvasText]" />
      <Heading>Create your account</Heading>
      
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
          className={isLoading ? 'opacity-50' : ''}
        />
      </Field>
      <Field>
        <Label>Full name</Label>
        <Input 
          name="name" 
          disabled={isLoading}
          className={isLoading ? 'opacity-50' : ''}
        />
      </Field>
      <Field>
        <Label>Password</Label>
        <Input 
          type="password" 
          name="password" 
          autoComplete="new-password" 
          required 
          disabled={isLoading}
          className={isLoading ? 'opacity-50' : ''}
        />
      </Field>
      <Field>
        <Label>Country</Label>
        <Select 
          name="country" 
          disabled={isLoading}
          className={isLoading ? 'opacity-50' : ''}
        >
          <option>Canada</option>
          <option>Mexico</option>
          <option>United States</option>
        </Select>
      </Field>
      <CheckboxField>
        <Checkbox name="remember" disabled={isLoading} />
        <Label>Get emails about product updates and news.</Label>
      </CheckboxField>
      <Button 
        type="submit" 
        className="w-full relative" 
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-2">
            <GradientSpinner size="sm" />
            <span>Creating account...</span>
          </div>
        ) : (
          'Create account'
        )}
      </Button>
      <Text>
        Already have an account?{' '}
        <TextLink href="/login">
          <Strong>Sign in</Strong>
        </TextLink>
      </Text>
    </form>
  )
}
