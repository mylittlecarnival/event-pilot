import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function requireAuth() {
  const supabase = await createClient()
  
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return user
}

export async function getCurrentUser() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}

export async function getUserProfile(userId: string) {
  const supabase = await createClient()
  
  console.log('Fetching profile for user ID:', userId)
  
  // First, let's test if we can access the table at all
  const { data: allProfiles, error: allError } = await supabase
    .from('profiles')
    .select('*')
    .limit(1)
  
  console.log('Test query result:', { allProfiles, allError })
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('first_name, last_name, avatar_url')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Full error object:', error)
    console.error('Error type:', typeof error)
    console.error('Error keys:', Object.keys(error))
    console.error('Error stringified:', JSON.stringify(error))
    return null
  }

  console.log('Profile fetched successfully:', profile)
  return profile
}
