import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { API_URL } from "@/lib/config"

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value || ""
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 401 })
  const res = await fetch(`${API_URL}/2fa`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
  const data = await res.json().catch(() => null)
  return NextResponse.json(data ?? {}, { status: res.status })
}
