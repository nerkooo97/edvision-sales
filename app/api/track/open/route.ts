import { NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite/server";
import { appwriteConfig } from "@/lib/appwrite/config";

// 1x1 transparent GIF (43 bytes base64)
const TRANSPARENT_GIF_BUFFER = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

const DATABASE_ID = appwriteConfig.databaseId || "6a7dd77a002b3913d433";
const TABLE_ID = "contact_logs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const logId = searchParams.get("logId");
  const leadId = searchParams.get("leadId");
  const companyId = searchParams.get("companyId");
  const recipient = searchParams.get("recipient");

  // Asynchronously process tracking to keep the image response ultra-fast
  try {
    const adminClient = await createAdminClient();
    const tablesDB = adminClient.tablesDB;

    let targetLogId = logId;
    let targetRow: any = null;

    if (targetLogId) {
      try {
        targetRow = await tablesDB.getRow({
          databaseId: DATABASE_ID,
          tableId: TABLE_ID,
          rowId: targetLogId,
        });
      } catch (e) {
        // Fallback to query
      }
    }

    if (!targetRow) {
      const queries: string[] = [Query.limit(1), Query.orderDesc("$createdAt")];

      if (leadId) {
        queries.push(Query.equal("lead", leadId));
      } else if (companyId) {
        queries.push(Query.equal("company", companyId));
      } else if (recipient) {
        queries.push(Query.equal("recipient", recipient));
      }

      if (queries.length > 2) {
        const listRes = await tablesDB.listRows({
          databaseId: DATABASE_ID,
          tableId: TABLE_ID,
          queries,
        });

        if (listRes.rows.length > 0) {
          targetRow = listRes.rows[0];
          targetLogId = targetRow.$id;
        }
      }
    }

    if (targetRow && targetLogId) {
      const currentStatus = targetRow.status || "";
      const isAlreadyOpened =
        currentStatus === "Otvoreno" ||
        currentStatus === "Odgovoreno" ||
        currentStatus === "Zainteresovan";

      if (!isAlreadyOpened) {
        await tablesDB.updateRow({
          databaseId: DATABASE_ID,
          tableId: TABLE_ID,
          rowId: targetLogId,
          data: {
            status: "Otvoreno",
            outcome: "Email otvoren i pregledan od strane klijenta",
          },
        });

        // Opcionalna Slack notifikacija
        const slackWebhook = process.env.SLACK_WEBHOOK_URL;
        if (slackWebhook) {
          try {
            const companyName =
              typeof targetRow.company === "object" && targetRow.company?.company_name
                ? targetRow.company.company_name
                : targetRow.recipient || "Klijent";

            await fetch(slackWebhook, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: `📬 *Email Otvoren!* Klijent *${companyName}* (${targetRow.recipient || "Email"}) je upravo otvorio vašu prodajnu ponudu! 🎯`,
              }),
            });
          } catch (slackErr) {
            console.error("Slack tracking alert error:", slackErr);
          }
        }
      }
    }
  } catch (error) {
    console.error("Greška pri bilježenju otvaranja emaila:", error);
  }

  // Uvijek vrati 1x1 transparentni GIF sa strogim no-cache zaglavljima
  return new NextResponse(TRANSPARENT_GIF_BUFFER, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": TRANSPARENT_GIF_BUFFER.length.toString(),
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
