import { requireAuth, getUserProfile } from '@/lib/auth'
import { ApplicationLayout } from './application-layout'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // This will redirect to login if user is not authenticated
  const user = await requireAuth()
  const profile = await getUserProfile(user.id)

  return <ApplicationLayout user={user} profile={profile}>{children}</ApplicationLayout>
}
