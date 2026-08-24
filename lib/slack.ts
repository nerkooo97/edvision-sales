/**
 * Slack Notification Service for ED Vision Sales System
 */

export interface SlackNotificationPayload {
  title: string
  companyName?: string
  recipient?: string
  channel?: string
  status?: string
  message?: string
  leadId?: string
}

export async function sendSlackNotification(payload: SlackNotificationPayload): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn("SLACK_WEBHOOK_URL is not configured in .env")
    return false
  }

  try {
    const blocks: Record<string, unknown>[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: payload.title || "🔔 ED Vision Sales Notifikacija",
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          ...(payload.companyName
            ? [
                {
                  type: "mrkdwn",
                  text: `*Kompanija:*\n${payload.companyName}`,
                },
              ]
            : []),
          ...(payload.recipient
            ? [
                {
                  type: "mrkdwn",
                  text: `*Kontakt / Email:*\n${payload.recipient}`,
                },
              ]
            : []),
          ...(payload.channel
            ? [
                {
                  type: "mrkdwn",
                  text: `*Kanal:*\n${payload.channel}`,
                },
              ]
            : []),
          ...(payload.status
            ? [
                {
                  type: "mrkdwn",
                  text: `*Status:*\n${payload.status}`,
                },
              ]
            : []),
        ],
      },
    ]

    if (payload.message) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Detalji:*\n${payload.message}`,
        },
      })
    }

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `${payload.title}: ${payload.companyName || ""}`,
        blocks,
      }),
    })

    return res.ok
  } catch (error) {
    console.error("Greška pri slanju Slack notifikacije:", error)
    return false
  }
}
