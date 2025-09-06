import { ReactNode } from 'react'
import ClientNavbar from '@/components/ClientNavbar'
import { requireUser } from '@/lib/server-auth'
import WelcomeTour from '@/components/WelcomeTour'
import { cookies } from 'next/headers'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser()
  const cookieStore = await cookies()
  const tourSeen = cookieStore.get('tourSeen')?.value === '1'
  return (
    <>
      <ClientNavbar user={user} />
      <WelcomeTour initialOpen={!tourSeen} />
      {children}
    </>
  )
}
