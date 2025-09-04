import type { Metadata } from "next"
import LoginForm from "../LoginForm"

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your account",
}

type Props = {
  params: { login?: string[] }
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function LoginPage({ params, searchParams }: Props) {
  const spObj = await searchParams
  const usp = new URLSearchParams()
  for (const [k, v] of Object.entries(spObj)) {
    if (typeof v === 'string') usp.set(k, v)
    else if (Array.isArray(v)) v.forEach((vv) => usp.append(k, vv))
  }
  const path = params.login?.length ? `/${params.login.join('/')}` : "/"
  const target = path === "/" ? "/dashboard" : path
  const search = usp.toString() ? `?${usp.toString()}` : ""
  const nextHref = `${target}${search}`

  return (
    <div className="min-h-screen grid place-items-center px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">Log in</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Enter your credentials to continue.
        </p>
        <LoginForm nextHref={nextHref} />
      </div>
    </div>
  )
}
