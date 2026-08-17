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
    const endpoint = normalizeEndpoint(config.endpoint);
    const params = new URLSearchParams();

    params.append(
        "queries[]",
        JSON.stringify({
            method: "equal",
            attribute: "company_name",
            values: [String(companyName)]
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
        `/tables/${encodeURIComponent(config.tableId)}/rows?${params.toString()}`;

    const response = await fetch(url, {
        method: "GET",
        headers: appwriteHeaders(config)
    });

    const body = await parseAppwriteResponse(response);
    const rows = body?.rows || body?.documents || [];
    return rows.length ? rows[0] : null;
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
