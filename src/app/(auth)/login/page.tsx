import type { Metadata } from "next"
import LoginForm from "@/components/pages/login/LoginForm"

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your account",
}

export default function LoginPage() {
  return (
    <div className="min-h-screen grid place-items-center px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">Log in</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Enter your credentials to continue.
        </p>
        <LoginForm />
      </div>
    </div>
  )
}
