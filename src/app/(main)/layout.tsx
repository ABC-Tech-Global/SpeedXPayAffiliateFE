import { ReactNode } from 'react'
import ClientNavbar from '@/components/ClientNavbar'
import { requireUser } from '@/lib/server-auth'
import WelcomeTour from '@/features/onboarding/components/WelcomeTour'
import { getProfile } from '@/lib/api/users'
import { deriveTourSeenFromProfile } from '@/features/onboarding/utils/tourSeen'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser()
  let initialOpen: boolean | undefined = undefined
  try {
    const prof = await getProfile()
    const seen = deriveTourSeenFromProfile(prof?.profile)
    if (typeof seen !== 'undefined') {
      initialOpen = !seen
    }
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
