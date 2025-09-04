import { ReactNode } from 'react'
import Navbar from '@/components/Navbar'
import { requireUser } from '@/lib/server-auth'
import WelcomeTour from '@/components/WelcomeTour'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser()
  return (
    <>
      <Navbar user={user} />
      <WelcomeTour />
      {children}
    </>
  )
}
