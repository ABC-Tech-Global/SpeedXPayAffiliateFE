import { NextResponse } from "next/server"
import { put } from "@vercel/blob"

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: 'blob token missing' }, { status: 500 })
    }
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'missing file' }, { status: 400 })
    const ext = (() => {
      const n = file.name || 'upload.bin'
      const i = n.lastIndexOf('.')
      return i >= 0 ? n.slice(i) : ''
    })()
    const key = `kyc/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
    // put() picks up BLOB_READ_WRITE_TOKEN from env automatically
    const res = await put(key, file, { access: 'public', contentType: file.type || 'application/octet-stream' })
    return NextResponse.json({ pathname: res.pathname, url: res.url })
  } catch (e: unknown) {
    const message = e instanceof Error && e.message ? e.message : 'upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
