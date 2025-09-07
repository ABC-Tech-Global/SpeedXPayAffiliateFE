import { ReactNode } from 'react'
import ClientNavbar from '@/components/ClientNavbar'
import { requireUser } from '@/lib/server-auth'
import WelcomeTour from '@/components/WelcomeTour'
import { getProfile } from '@/lib/api/users'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser()
  let initialOpen: boolean | undefined = undefined
  try {
    const prof = await getProfile()
    const seen = Boolean(prof?.profile?.welcomeTourSeen)
    initialOpen = !seen
  } catch {
    // Leave as undefined to let client fallback check run.
  }
  return (
    <>
      <ClientNavbar user={user} />
      <WelcomeTour initialOpen={initialOpen} />
      {children}
    </>
  )
}
