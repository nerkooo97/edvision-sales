import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

const OPENWA_BASE_URL = "https://whatsapp-api.178.104.27.210.nip.io"

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key")
  const expectedApiKey = process.env.WHATSAPP_API_KEY
  const sessionId = process.env.WHATSAPP_SESSION_ID

  if (!expectedApiKey || !sessionId) {
    return NextResponse.json(
      { success: false, error: "WhatsApp proxy nije konfigurisan." },
      { status: 503 }
    )
  }

  if (!apiKey || apiKey !== expectedApiKey) {
    return NextResponse.json({ success: false, error: "Neovlasten zahtjev." }, { status: 401 })
  }

  let payload: { chatId?: unknown; text?: unknown } = {}

  try {
    payload = await request.json()
  } catch {
    // n8n can send an empty body in some self-hosted versions. The protected
    // query fallback keeps the proxy reliable while OpenWA still receives JSON.
    payload = {
      chatId: request.nextUrl.searchParams.get("chatId"),
      text: request.nextUrl.searchParams.get("text"),
    }
  }

  const chatId = typeof payload.chatId === "string" ? payload.chatId.trim() : ""
  const text = typeof payload.text === "string" ? payload.text.trim() : ""

  if (!chatId || !text) {
    return NextResponse.json(
      { success: false, error: "chatId i text su obavezni." },
      { status: 400 }
    )
  }

  try {
    const response = await fetch(
      `${OPENWA_BASE_URL}/api/sessions/${encodeURIComponent(sessionId)}/messages/send-text`,
      {
        method: "POST",
        headers: {
          "x-api-key": expectedApiKey,
          "content-type": "application/json",
          accept: "*/*",
        },
        body: JSON.stringify({ chatId, text }),
        signal: AbortSignal.timeout(30_000),
      }
    )

    const body = await response.text()
    const contentType = response.headers.get("content-type") || ""

    return new NextResponse(body, {
      status: response.status,
      headers: {
        "content-type": contentType.includes("application/json")
          ? "application/json"
          : "text/plain; charset=utf-8",
      },
    })
  } catch (error) {
    console.error("WhatsApp proxy error:", error)
    return NextResponse.json({ success: false, error: "OpenWA servis nije dostupan." }, { status: 502 })
  }
}
