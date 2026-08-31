import { NextRequest, NextResponse } from "next/server";
import dns from "dns/promises";

// Common disposable/invalid email domains or patterns
const COMMON_TYPOS: Record<string, string> = {
  "gmai.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmial.com": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "yaho.com": "yahoo.com",
};

export interface EmailValidationResult {
  valid: boolean;
  email: string;
  domain: string;
  reason?: string;
  suggestedCorrection?: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = (searchParams.get("email") || "").trim();

  const result = await validateEmailAddress(email);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || "").trim();

    const result = await validateEmailAddress(email);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { valid: false, email: "", domain: "", reason: "Neispravan format zahtjeva" },
      { status: 400 }
    );
  }
}

async function validateEmailAddress(rawEmail: string): Promise<EmailValidationResult> {
  const email = (rawEmail || "").trim().toLowerCase();

  // 1. Basic syntax check
  if (!email || email.length < 5 || !email.includes("@")) {
    return {
      valid: false,
      email,
      domain: "",
      reason: "Email adresa je prazna ili ne sadrži znak @",
    };
  }

  // Strict email regex RFC 5322 approximation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(email)) {
    return {
      valid: false,
      email,
      domain: "",
      reason: "Email adresa ima neispravan format ili nedozvoljene znakove",
    };
  }

  const parts = email.split("@");
  if (parts.length !== 2) {
    return {
      valid: false,
      email,
      domain: "",
      reason: "Neispravan format adrese",
    };
  }

  const domain = parts[1].trim();

  // 2. Check for common domain typos
  if (COMMON_TYPOS[domain]) {
    return {
      valid: false,
      email,
      domain,
      suggestedCorrection: `${parts[0]}@${COMMON_TYPOS[domain]}`,
      reason: `Moguća greška u kucanju domene (predloženo: @${COMMON_TYPOS[domain]})`,
    };
  }

  // 3. DNS MX Record Validation
  try {
    const mxRecords = await dns.resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      // Fallback: check if domain has an A record (some simple mail servers use A record)
      try {
        const aRecords = await dns.resolve4(domain);
        if (!aRecords || aRecords.length === 0) {
          return {
            valid: false,
            email,
            domain,
            reason: `Domena '${domain}' nema podešene mail servere (nema MX/A zapisa)`,
          };
        }
      } catch {
        return {
          valid: false,
          email,
          domain,
          reason: `Domena '${domain}' ne postoji ili nema mail server (DNS greška)`,
        };
      }
    }

    return {
      valid: true,
      email,
      domain,
      reason: "Email domena je aktivna i ima validne MX zapise",
    };
  } catch (dnsError: unknown) {
    const errCode = (dnsError as { code?: string })?.code;

    if (errCode === "ENOTFOUND" || errCode === "NXDOMAIN" || errCode === "ENODATA") {
      return {
        valid: false,
        email,
        domain,
        reason: `Domena '${domain}' ne postoji na internetu (NXDOMAIN)`,
      };
    }

    if (errCode === "ETIMEOUT" || errCode === "ECONNREFUSED") {
      // In case of temporary DNS timeout, allow with warning or mark
      return {
        valid: false,
        email,
        domain,
        reason: `DNS server za domenu '${domain}' ne odgovara (Timeout)`,
      };
    }

    return {
      valid: false,
      email,
      domain,
      reason: `Nije moguće pronaći mail server za domenu '${domain}'`,
    };
  }
}
