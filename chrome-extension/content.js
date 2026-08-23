(function () {
    const getText = (selector, root = document) => {
        const el = root.querySelector(selector);
        return el ? el.innerText.trim() : null;
    };

    const unique = (values) => {
        const seen = new Set();
        const out = [];
        for (const v of values) {
            const key = String(v).toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                out.push(String(v).trim());
            }
        }
        return out.filter(Boolean);
    };

    /**
     * Kontakti iz .contact-summary (ne iz headera).
     * Vraća niz stringova.
     */
    const getContactValues = (iconSelector) => {
        const root = document.querySelector(".contact-summary") || document;
        const icons = root.querySelectorAll(iconSelector);

        for (const icon of icons) {
            const dt = icon.closest("dt");
            if (!dt) continue;

            const dd = dt.nextElementSibling;
            if (!dd || dd.tagName !== "DD") continue;

            const spans = dd.querySelectorAll("span");
            const fromSpans = unique(
                Array.from(spans).map((s) => s.innerText.trim()).filter(Boolean)
            );
            if (fromSpans.length) return fromSpans;

            const text = dd.innerText.trim();
            if (text) return unique([text]);
        }

        return [];
    };

    const getLabelValue = (labelText) => {
        const nodes = document.querySelectorAll(".short-details .col-lg-auto, .short-details .col-md-12");
        for (const node of nodes) {
            const label = node.querySelector(".text-bold, .mr-2");
            if (!label) continue;
            if (label.innerText.trim().toUpperCase() !== labelText.toUpperCase()) continue;
            const spans = node.querySelectorAll("span");
            for (const span of spans) {
                if (span === label) continue;
                const text = span.innerText.trim();
                if (text) return text;
            }
        }
        return null;
    };

    const getDlValue = (labelText) => {
        const target = labelText.toUpperCase();
        const dts = document.querySelectorAll("dt");
        for (const dt of dts) {
            const label = dt.innerText.replace(/\s+/g, " ").trim().toUpperCase();
            if (label !== target && !label.includes(target)) continue;
            const dd = dt.nextElementSibling;
            if (dd && dd.tagName === "DD") {
                const text = dd.innerText.replace(/\s+/g, " ").trim();
                if (text) return text;
            }
        }
        return null;
    };

    const getJsonLdTelephone = () => {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const script of scripts) {
            try {
                const data = JSON.parse(script.textContent);
                const items = Array.isArray(data) ? data : [data];
                for (const item of items) {
                    if (item && item.telephone) {
                        return String(item.telephone).trim();
                    }
                }
            } catch (_) { /* ignore */ }
        }
        return null;
    };

    let phones = getContactValues(".fa-phone, .fas.fa-phone, .far.fa-phone");
    if (!phones.length) {
        const ldPhone = getJsonLdTelephone();
        if (ldPhone) phones = [ldPhone];
    }

    const emails = getContactValues(".fa-envelope, .fas.fa-envelope, .far.fa-envelope");
    const webs = getContactValues(".fa-globe, .fas.fa-globe");

    let industry = getDlValue("Djelatnost");
    if (industry) {
        // Uklanja šifre djelatnosti poput "M 69.20 - ", "C 33.20 - ", "49.41 - " itd.
        industry = industry
            .replace(/^[A-Z]?\s*\d{2}(?:\.\d{1,3})?\s*[-–—:]\s*/i, "")
            .replace(/\)\s*;?\s*$/, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    const companyData = {
        naziv: getText('h1[itemprop="name"]'),
        ulica: getText('span[itemprop="streetAddress"]'),
        postanskiBroj: getText('span[itemprop="postalCode"]'),
        grad: getDlValue("Regija") || getText('span[itemprop="addressLocality"]'),
        jib: getText('span[itemprop="vatID"]') || getDlValue("JIB"),
        mbs: getLabelValue("MBS") || getDlValue("MBS"),
        datumOsnivanja: getLabelValue("Datum osnivanja") || getDlValue("Datum osnivanja"),
        telefoni: phones,
        email: emails[0] || null,
        web: webs[0] || null,
        owner_name: getDlValue("Vlasnik"),
        industry,
        company_size: getDlValue("Veličina kompanije") || getDlValue("Velicina kompanije")
    };

    chrome.runtime.sendMessage({ action: "company_data_extracted", data: companyData });
})();
