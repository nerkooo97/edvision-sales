import { NextResponse } from "next/server"
import { sendSlackNotification } from "@/lib/slack"

export async function POST() {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    return NextResponse.json(
      { success: false, error: "SLACK_WEBHOOK_URL nije postavljen u .env fajlu." },
      { status: 400 }
    );
  }

  const success = await sendSlackNotification({
    title: "🔔 Testna Notifikacija (ED Vision Sales)",
    companyName: "ED Vision Test Kompanija d.o.o.",
    recipient: "test@ed-vision.com",
    channel: "Slack Test",
    status: "Operativno",
    message: "Ovo je testna poruka iz Podešavanja sistema. Slack integracija radi uredno!",
  })

  if (success) {
    return NextResponse.json({ success: true })
  } else {
    return NextResponse.json(
      { success: false, error: "Slanje nije uspjelo. Provjerite validnost Slack Webhook URL-a." },
      { status: 500 }
    )
  }
}
