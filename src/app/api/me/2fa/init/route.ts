import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { API_URL } from "@/lib/config"

export async function POST() {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value || ""
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 401 })
  const res = await fetch(`${API_URL}/me/2fa/init`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
  const data = await res.json().catch(() => null)
  return NextResponse.json(data ?? {}, { status: res.status })
}

