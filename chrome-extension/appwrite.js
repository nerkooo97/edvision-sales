/**
 * Appwrite TablesDB REST helper — tabela `companies`.
 */

async function hasAppwriteHostPermission(endpoint) {
    const origin = new URL(endpoint).origin;
    const originPattern = `${origin}/*`;
    return chrome.permissions.contains({ origins: [originPattern] });
}

function normalizeEndpoint(endpoint) {
    return String(endpoint || "").trim().replace(/\/+$/, "");
}

function appwriteHeaders(config) {
    return {
        "Content-Type": "application/json",
        "X-Appwrite-Project": config.projectId,
        "X-Appwrite-Key": config.apiKey,
        "X-Appwrite-Response-Format": "1.8.0"
    };
}

function cleanRowData(data) {
    const cleaned = {};
    for (const [key, value] of Object.entries(data)) {
        if (value === null || value === undefined) continue;
        if (Array.isArray(value) && value.length === 0) continue;
        cleaned[key] = value;
    }
    return cleaned;
}

function normalizeCompanyName(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\b(d\.?o\.?o\.?|a\.?d\.?|d\.?d\.?|ltd\.?|llc)\b/g, " ")
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");
}

function normalizeDomain(value) {
    let domain = String(value || "").trim().toLowerCase();
    if (!domain) return "";
    domain = domain.replace(/^mailto:/, "");
    if (domain.includes("@")) domain = domain.split("@").pop();
    try {
        if (domain.includes("://")) domain = new URL(domain).hostname;
    } catch (_) { }
    return domain.replace(/^www\./, "").replace(/\/$/, "");
}

function normalizePhone(value) {
    return String(value || "").replace(/\D/g, "");
}

async function parseAppwriteResponse(response) {
    const text = await response.text();
    let body = null;
    try {
        body = text ? JSON.parse(text) : null;
    } catch {
        body = { message: text };
    }
    if (!response.ok) {
        const msg = body?.message || body?.error || `HTTP ${response.status}`;
        throw new Error(msg);
    }
    return body;
}

function firstValue(value) {
    if (value == null) return null;
    if (Array.isArray(value)) {
        const cleaned = value.map((v) => String(v).trim()).filter(Boolean);
        return cleaned.length ? cleaned[0] : null;
    }
    const s = String(value).trim();
    return s || null;
}

function toStringArray(value) {
    if (value == null) return [];
    const raw = Array.isArray(value) ? value : [value];
    const seen = new Set();
    const out = [];
    for (const item of raw) {
        const s = String(item).trim();
        if (!s) continue;
        const key = s.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(s);
    }
    return out;
}

function buildAddress(company) {
    const parts = [company.ulica, company.postanskiBroj, company.grad]
        .map((p) => (p ? String(p).trim() : ""))
        .filter(Boolean);
    return parts.length ? parts.join(", ") : null;
}

/**
 * Mapira scraped podatke u Appwrite tabelu `companies`.
 */
function mapCompanyToRow(company) {
    const phones = toStringArray(company.telefoni);
    const email = firstValue(company.email);
    const website = firstValue(company.web);
    const city = firstValue(company.grad);

    return {
        company_name: (company.naziv || "Nepoznata firma").trim(),
        city,
        address: buildAddress(company),
        website,
        email,
        phones: phones.length ? phones : null,
        tax_id: firstValue(company.jib),
        owner_name: firstValue(company.owner_name),
        industry: firstValue(company.industry),
        company_size: firstValue(company.company_size),
        source: "CompanyWall"
    };
}

function mapCompanyToUpdate(company) {
    return mapCompanyToRow(company);
}

async function findRowByCompanyName(config, companyName) {
    return findRowByAttribute(config, config.tableId, "company_name", String(companyName));
}

async function findRowByAttribute(config, tableId, attribute, value) {
    const endpoint = normalizeEndpoint(config.endpoint);
    const params = new URLSearchParams();

    params.append(
        "queries[]",
        JSON.stringify({
            method: "equal",
            attribute,
            values: [String(value)]
        })
    );
    params.append(
        "queries[]",
        JSON.stringify({
            method: "limit",
            values: [1]
        })
    );

    const url =
        `${endpoint}/tablesdb/${encodeURIComponent(config.databaseId)}` +
        `/tables/${encodeURIComponent(tableId)}/rows?${params.toString()}`;

    const response = await fetch(url, {
        method: "GET",
        headers: appwriteHeaders(config)
    });

    const body = await parseAppwriteResponse(response);
    const rows = body?.rows || body?.documents || [];
    return rows.length ? rows[0] : null;
}

async function getProtectedCompanies(config) {
    const endpoint = normalizeEndpoint(config.endpoint);
    const params = new URLSearchParams();
    params.append("queries[]", JSON.stringify({ method: "limit", values: [100] }));
    const url =
        `${endpoint}/tablesdb/${encodeURIComponent(config.databaseId)}` +
        `/tables/protected_companies/rows?${params.toString()}`;

    const response = await fetch(url, {
        method: "GET",
        headers: appwriteHeaders(config)
    });
    const body = await parseAppwriteResponse(response);
    const rows = body?.rows || body?.documents || [];
    if ((body?.total || rows.length) > rows.length) {
        throw new Error("Lista zaštićenih klijenata ima više od 100 redova. Kontaktiraj administratora.");
    }
    return rows;
}

function companyMatchesProtected(company, protectedRows) {
    const companyName = normalizeCompanyName(company.naziv || company.company_name);
    const companyDomain = normalizeDomain(firstValue(company.web || company.website));
    const companyEmail = String(firstValue(company.email) || "").trim().toLowerCase();
    const companyEmailDomain = normalizeDomain(companyEmail);
    const companyTaxId = String(firstValue(company.jib || company.tax_id) || "").trim();
    const companyPhones = toStringArray(company.telefoni || company.phones)
        .map(normalizePhone)
        .filter(Boolean);

    for (const row of protectedRows) {
        if (companyTaxId && String(row.tax_id || "").trim() === companyTaxId) {
            return { matched: true, reason: "JIB", row };
        }

        const names = [row.normalized_name, row.company_name, ...toStringArray(row.aliases)]
            .map(normalizeCompanyName)
            .filter(Boolean);
        if (companyName && names.includes(companyName)) {
            return { matched: true, reason: "naziv", row };
        }

        const domains = toStringArray(row.domains).map(normalizeDomain).filter(Boolean);
        if (companyDomain && domains.includes(companyDomain)) {
            return { matched: true, reason: "domena", row };
        }

        const emails = toStringArray(row.emails).map((email) => email.toLowerCase());
        if (companyEmail && emails.includes(companyEmail)) {
            return { matched: true, reason: "email", row };
        }
        if (companyEmailDomain && domains.includes(companyEmailDomain)) {
            return { matched: true, reason: "email domena", row };
        }

        const phones = toStringArray(row.phones).map(normalizePhone).filter(Boolean);
        if (companyPhones.some((phone) => phones.includes(phone))) {
            return { matched: true, reason: "telefon", row };
        }
    }

    return { matched: false };
}

function mapProtectedCompanyToRow(company) {
    const companyName = (company.naziv || company.company_name || "Nepoznata firma").trim();
    const domain = normalizeDomain(firstValue(company.web || company.website));
    const email = firstValue(company.email);
    const phones = toStringArray(company.telefoni || company.phones);

    return {
        company_name: companyName,
        normalized_name: normalizeCompanyName(companyName),
        domains: domain ? [domain] : null,
        emails: email ? [email] : null,
        phones: phones.length ? phones : null,
        tax_id: firstValue(company.jib || company.tax_id),
        status: "active_client"
    };
}

async function saveProtectedCompanyToAppwrite(config, company) {
    const row = mapProtectedCompanyToRow(company);
    const tableId = "protected_companies";
    const existing = await findRowByAttribute(config, tableId, "normalized_name", row.normalized_name);
    const protectedConfig = { ...config, tableId };

    if (existing) {
        const updated = await updateAppwriteRow(protectedConfig, existing.$id, row);
        return { action: "updated", row: updated };
    }

    const created = await createAppwriteRow(protectedConfig, row);
    return { action: "created", row: created };
}

async function createAppwriteRow(config, data) {
    const endpoint = normalizeEndpoint(config.endpoint);
    const url =
        `${endpoint}/tablesdb/${encodeURIComponent(config.databaseId)}` +
        `/tables/${encodeURIComponent(config.tableId)}/rows`;

    const response = await fetch(url, {
        method: "POST",
        headers: appwriteHeaders(config),
        body: JSON.stringify({
            rowId: "unique()",
            data: cleanRowData(data)
        })
    });

    return parseAppwriteResponse(response);
}

async function updateAppwriteRow(config, rowId, data) {
    const endpoint = normalizeEndpoint(config.endpoint);
    const url =
        `${endpoint}/tablesdb/${encodeURIComponent(config.databaseId)}` +
        `/tables/${encodeURIComponent(config.tableId)}/rows/${encodeURIComponent(rowId)}`;

    const response = await fetch(url, {
        method: "PATCH",
        headers: appwriteHeaders(config),
        body: JSON.stringify({
            data: cleanRowData(data)
        })
    });

    return parseAppwriteResponse(response);
}

/**
 * @returns {{ action: 'created'|'updated'|'skipped', row?: any }}
 */
async function saveCompanyToAppwrite(config, company, overwrite) {
    const row = mapCompanyToRow(company);
    const existing = await findRowByCompanyName(config, row.company_name);

    if (existing) {
        if (!overwrite) {
            return { action: "skipped", row: existing };
        }
        const updated = await updateAppwriteRow(config, existing.$id, mapCompanyToUpdate(company));
        return { action: "updated", row: updated };
    }

    const created = await createAppwriteRow(config, row);
    return { action: "created", row: created };
}

async function testAppwriteConnection(config) {
    const endpoint = normalizeEndpoint(config.endpoint);
    const listUrl =
        `${endpoint}/tablesdb/${encodeURIComponent(config.databaseId)}` +
        `/tables/${encodeURIComponent(config.tableId)}/rows`;

    const response = await fetch(listUrl, {
        method: "GET",
        headers: appwriteHeaders(config)
    });

    return parseAppwriteResponse(response);
}
