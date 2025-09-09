import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { API_URL } from "@/lib/config"

export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value || ""
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 401 })
  const { username } = await params
  const res = await fetch(`${API_URL}/referrals/${encodeURIComponent(username)}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
  const data = await res.json().catch(() => null)
  return NextResponse.json(data, { status: res.status })
}

