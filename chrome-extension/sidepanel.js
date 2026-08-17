const pageInfo = document.getElementById("pageInfo");
const startBtn = document.getElementById("startBtn");
const settingsMsg = document.getElementById("settingsMsg");
const overwriteToggle = document.getElementById("overwriteToggle");
const restartBtn = document.getElementById("restartBtn");

const STORAGE_KEYS = [
    "aw_endpoint",
    "aw_projectId",
    "aw_databaseId",
    "aw_tableId",
    "aw_apiKey",
    "aw_overwrite"
];

function readSettingsFromForm() {
    return {
        aw_endpoint: document.getElementById("awEndpoint").value.trim(),
        aw_projectId: document.getElementById("awProjectId").value.trim(),
        aw_databaseId: document.getElementById("awDatabaseId").value.trim(),
        aw_tableId: document.getElementById("awTableId").value.trim(),
        aw_apiKey: document.getElementById("awApiKey").value.trim(),
        aw_overwrite: overwriteToggle.checked
    };
}

function settingsComplete(s) {
    return s.aw_endpoint && s.aw_projectId && s.aw_databaseId && s.aw_tableId && s.aw_apiKey;
}

async function requestAppwriteHostPermission(endpoint) {
    let originPattern;
    try {
        originPattern = `${new URL(endpoint).origin}/*`;
    } catch {
        throw new Error("Neispravan Appwrite endpoint URL.");
    }

    const already = await chrome.permissions.contains({ origins: [originPattern] });
    if (already) return true;

    return chrome.permissions.request({ origins: [originPattern] });
}

const DEFAULTS = {
    aw_endpoint: "https://appwrite.ed-vision.com/v1",
    aw_projectId: "6a7dd764002484e4cc47",
    aw_databaseId: "6a7dd77a002b3913d433",
    aw_tableId: "companies",
    aw_apiKey: ""
};

function showIdleUi() {
    document.getElementById("scrapeControls").style.display = "block";
    document.getElementById("settingsPanel").style.display = "block";
    document.getElementById("refreshTabBtn").style.display = "block";
    document.getElementById("dashboard").style.display = "none";
    restartBtn.style.display = "none";
    startBtn.disabled = pageInfo.className !== "ok";
}

function showRunningUi() {
    document.getElementById("scrapeControls").style.display = "none";
    document.getElementById("settingsPanel").style.display = "none";
    document.getElementById("refreshTabBtn").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    restartBtn.style.display = "none";
    document.getElementById("statStatus").innerText = "U toku...";
    document.getElementById("statStatus").style.color = "#d9534f";
    document.getElementById("statCount").innerText = "0";
    document.getElementById("statSaved").innerText = "0";
    document.getElementById("statSkipped").innerText = "0";
    document.getElementById("statFailed").innerText = "0";
    document.getElementById("statusText").innerText = "Povezivanje...";
}

function showFinishedUi(request) {
    document.getElementById("dashboard").style.display = "block";
    document.getElementById("settingsPanel").style.display = "block";
    document.getElementById("refreshTabBtn").style.display = "block";
    restartBtn.style.display = "block";

    document.getElementById("statStatus").innerText = request.error ? "GREŠKA" : "ZAVRŠENO";
    document.getElementById("statStatus").style.color = request.error ? "#d9534f" : "#28a745";
    document.getElementById("statCount").innerText = String(request.total ?? 0);
    document.getElementById("statSaved").innerText = String((request.saved ?? 0) + (request.updated ?? 0));
    document.getElementById("statSkipped").innerText = String(request.skipped ?? 0);
    document.getElementById("statFailed").innerText = String(request.failed ?? 0);

    if (request.error) {
        document.getElementById("statusText").innerText = request.error;
    } else {
        document.getElementById("statusText").innerText =
            `Gotovo. Skrapovano ${request.total}, novo ${request.saved || 0}, ` +
            `update ${request.updated || 0}, preskočeno ${request.skipped || 0}, greške ${request.failed || 0}.`;
    }
}

async function loadSettings() {
    const stored = await chrome.storage.local.get(STORAGE_KEYS);
    document.getElementById("awEndpoint").value = stored.aw_endpoint || DEFAULTS.aw_endpoint;
    document.getElementById("awProjectId").value = stored.aw_projectId || DEFAULTS.aw_projectId;
    document.getElementById("awDatabaseId").value = stored.aw_databaseId || DEFAULTS.aw_databaseId;
    // Migracija sa stare tabele leadovi → companies
    const tableId =
        !stored.aw_tableId || stored.aw_tableId === "leadovi"
            ? DEFAULTS.aw_tableId
            : stored.aw_tableId;
    document.getElementById("awTableId").value = tableId;
    document.getElementById("awApiKey").value = stored.aw_apiKey || "";
    overwriteToggle.checked = Boolean(stored.aw_overwrite);

    if (stored.aw_tableId === "leadovi") {
        await chrome.storage.local.set({ aw_tableId: "companies" });
    }

    const current = readSettingsFromForm();
    if (!settingsComplete(current)) {
        document.getElementById("settingsPanel").open = true;
        settingsMsg.textContent = "Zalijepi samo API Key, ostalo je već popunjeno. Sačuvaj pa Test.";
    }
}

async function detectActiveSearchTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
        pageInfo.className = "bad";
        pageInfo.textContent = "Nema aktivnog taba.";
        startBtn.disabled = true;
        return null;
    }

    let ok = false;
    try {
        const u = new URL(tab.url);
        ok = u.hostname === "www.companywall.ba" || u.hostname === "companywall.ba";
    } catch {
        ok = false;
    }

    if (!ok) {
        pageInfo.className = "bad";
        pageInfo.textContent =
            "Otvori pretragu na companywall.ba (stranica sa listom firmi), pa klikni Osvježi aktivni tab.";
        startBtn.disabled = true;
        return null;
    }

    pageInfo.className = "ok";
    pageInfo.textContent = `Pretraga (trenutni tab):\n${tab.url}`;
    startBtn.disabled = false;
    return tab;
}

document.getElementById("refreshTabBtn").addEventListener("click", () => {
    detectActiveSearchTab();
});

overwriteToggle.addEventListener("change", async () => {
    await chrome.storage.local.set({ aw_overwrite: overwriteToggle.checked });
});

document.getElementById("saveSettingsBtn").addEventListener("click", async () => {
    const data = readSettingsFromForm();
    await chrome.storage.local.set(data);
    settingsMsg.textContent = settingsComplete(data)
        ? "Settings sačuvani."
        : "Sačuvano, ali neka polja fale.";
    settingsMsg.style.color = settingsComplete(data) ? "#1b6e30" : "#a94442";
});

document.getElementById("testSettingsBtn").addEventListener("click", async () => {
    const form = readSettingsFromForm();
    if (!settingsComplete(form)) {
        settingsMsg.textContent = "Popuni sva polja prije testa.";
        settingsMsg.style.color = "#a94442";
        return;
    }

    settingsMsg.textContent = "Tražim dozvolu za Appwrite host...";
    settingsMsg.style.color = "#555";

    let granted = false;
    try {
        granted = await requestAppwriteHostPermission(form.aw_endpoint);
    } catch (e) {
        settingsMsg.textContent = e.message || String(e);
        settingsMsg.style.color = "#a94442";
        return;
    }

    if (!granted) {
        settingsMsg.textContent = "Dozvola za Appwrite host odbijena.";
        settingsMsg.style.color = "#a94442";
        return;
    }

    await chrome.storage.local.set(form);
    settingsMsg.textContent = "Testiram...";

    const config = {
        endpoint: form.aw_endpoint,
        projectId: form.aw_projectId,
        databaseId: form.aw_databaseId,
        tableId: form.aw_tableId,
        apiKey: form.aw_apiKey
    };

    chrome.runtime.sendMessage({ action: "test_appwrite", config }, (response) => {
        if (chrome.runtime.lastError) {
            settingsMsg.textContent = chrome.runtime.lastError.message;
            settingsMsg.style.color = "#a94442";
            return;
        }
        if (response && response.ok) {
            settingsMsg.textContent = "Konekcija OK — tabela je dostupna.";
            settingsMsg.style.color = "#1b6e30";
        } else {
            settingsMsg.textContent = `Greška: ${(response && response.error) || "nepoznato"}`;
            settingsMsg.style.color = "#a94442";
        }
    });
});

async function startScrape() {
    const form = readSettingsFromForm();

    if (!settingsComplete(form)) {
        document.getElementById("settingsPanel").open = true;
        settingsMsg.textContent = "Prvo sačuvaj kompletne Appwrite settings.";
        settingsMsg.style.color = "#a94442";
        return;
    }

    let granted = false;
    try {
        granted = await requestAppwriteHostPermission(form.aw_endpoint);
    } catch (e) {
        settingsMsg.textContent = e.message || String(e);
        settingsMsg.style.color = "#a94442";
        return;
    }

    if (!granted) {
        document.getElementById("settingsPanel").open = true;
        settingsMsg.textContent = "Dozvola za Appwrite host odbijena.";
        settingsMsg.style.color = "#a94442";
        return;
    }

    await chrome.storage.local.set(form);

    const tab = await detectActiveSearchTab();
    if (!tab) return;

    const limit = parseInt(document.getElementById("limitInput").value, 10) || 20;
    showRunningUi();

    chrome.runtime.sendMessage({
        action: "start_scraping_pagination",
        limit,
        senderTabId: tab.id,
        searchUrl: tab.url,
        overwrite: overwriteToggle.checked
    });
}

startBtn.addEventListener("click", () => {
    startScrape();
});

restartBtn.addEventListener("click", async () => {
    showIdleUi();
    await detectActiveSearchTab();
});

chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "update_progress") {
        document.getElementById("statCount").innerText = String(request.collectedCount ?? 0);
        document.getElementById("statSaved").innerText = String(request.savedCount ?? 0);
        document.getElementById("statSkipped").innerText = String(request.skippedCount ?? 0);
        document.getElementById("statFailed").innerText = String(request.failedCount ?? 0);
        document.getElementById("statusText").innerText = request.currentMessage || "";
    }

    if (request.action === "scraping_finished") {
        showFinishedUi(request);
    }
});

chrome.tabs.onActivated.addListener(() => {
    detectActiveSearchTab();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === "complete" || changeInfo.url) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id === tabId) {
                detectActiveSearchTab();
            }
        });
    }
});

(async () => {
    await loadSettings();
    await detectActiveSearchTab();
})();
