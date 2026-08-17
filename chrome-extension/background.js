importScripts("appwrite.js");

/** @type {Map<number, (data: any) => void>} */
const pendingByTab = new Map();

let scrapeRunning = false;
let keepAliveAlarmName = "cw_scrape_keepalive";

// Klik na ikonu otvara side panel (desno, puna visina) umjesto popup-a
chrome.runtime.onInstalled.addListener(() => {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => { });
});

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => { });

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "start_scraping_pagination") {
        if (scrapeRunning) {
            sendProgress(0, 0, 0, 0, "Skrapovanje je već u toku.");
            return;
        }
        runPaginationScraper(
            request.limit,
            request.senderTabId,
            request.searchUrl || "",
            Boolean(request.overwrite)
        );
        return;
    }

    if (request.action === "company_data_extracted") {
        const tabId = sender.tab && sender.tab.id;
        if (tabId != null && pendingByTab.has(tabId)) {
            const resolve = pendingByTab.get(tabId);
            pendingByTab.delete(tabId);
            resolve(request.data);
        }
        return;
    }

    if (request.action === "test_appwrite") {
        (async () => {
            try {
                const ok = await hasAppwriteHostPermission(request.config.endpoint);
                if (!ok) {
                    sendResponse({ ok: false, error: "Nema dozvole za Appwrite host. Klikni Test u panelu." });
                    return;
                }
                await testAppwriteConnection(request.config);
                sendResponse({ ok: true });
            } catch (e) {
                sendResponse({ ok: false, error: e.message || String(e) });
            }
        })();
        return true;
    }
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === keepAliveAlarmName) {
        // No-op: alarm buđi service worker dok traje skrap
    }
});

function sendProgress(collected, saved, failed, skipped, msg) {
    chrome.runtime.sendMessage({
        action: "update_progress",
        collectedCount: collected,
        savedCount: saved,
        failedCount: failed,
        skippedCount: skipped,
        currentMessage: msg
    }).catch(() => { });
}

function finishScraping(payload) {
    chrome.runtime.sendMessage({
        action: "scraping_finished",
        total: payload.total || 0,
        saved: payload.saved || 0,
        failed: payload.failed || 0,
        skipped: payload.skipped || 0,
        updated: payload.updated || 0,
        error: payload.error || null
    }).catch(() => { });
}

async function startKeepAlive() {
    try {
        await chrome.alarms.create(keepAliveAlarmName, { periodInMinutes: 0.5 });
    } catch (_) { /* periodInMinutes min is 1 in some versions */ }
    try {
        await chrome.alarms.create(keepAliveAlarmName, { periodInMinutes: 1 });
    } catch (_) { }
}

async function stopKeepAlive() {
    try {
        await chrome.alarms.clear(keepAliveAlarmName);
    } catch (_) { }
}

function waitForTabComplete(tabId, timeoutMs = 15000) {
    return new Promise((resolve) => {
        const listener = (tId, info) => {
            if (tId === tabId && info.status === "complete") {
                chrome.tabs.onUpdated.removeListener(listener);
                clearTimeout(timer);
                resolve(true);
            }
        };
        const timer = setTimeout(() => {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve(false);
        }, timeoutMs);
        chrome.tabs.onUpdated.addListener(listener);
    });
}

function waitForCompanyData(tabId, timeoutMs = 10000) {
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            if (pendingByTab.get(tabId)) {
                pendingByTab.delete(tabId);
                resolve(null);
            }
        }, timeoutMs);

        pendingByTab.set(tabId, (data) => {
            clearTimeout(timer);
            resolve(data);
        });
    });
}

async function getAppwriteConfig() {
    const stored = await chrome.storage.local.get([
        "aw_endpoint",
        "aw_projectId",
        "aw_databaseId",
        "aw_tableId",
        "aw_apiKey"
    ]);

    const config = {
        endpoint: stored.aw_endpoint || "",
        projectId: stored.aw_projectId || "",
        databaseId: stored.aw_databaseId || "",
        tableId: stored.aw_tableId || "",
        apiKey: stored.aw_apiKey || ""
    };

    if (!config.endpoint || !config.projectId || !config.databaseId || !config.tableId || !config.apiKey) {
        throw new Error("Appwrite nije konfigurisan. Otvori panel → Settings.");
    }

    return config;
}

async function runPaginationScraper(limit, tabId, searchUrl, overwrite) {
    scrapeRunning = true;
    await startKeepAlive();

    let collectedData = [];
    let savedCount = 0;
    let updatedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    let companiesToProcess = [];
    let currentTabId = tabId;

    try {
        const config = await getAppwriteConfig();
        const permitted = await hasAppwriteHostPermission(config.endpoint);
        if (!permitted) {
            sendProgress(0, 0, 0, 0, "Nema dozvole za Appwrite host. Otvori panel → Test konekcije.");
            finishScraping({ error: "Nema dozvole za Appwrite host." });
            return;
        }

        sendProgress(0, 0, 0, 0, "Sakupljam linkove sa otvorene pretrage...");

        while (companiesToProcess.length < limit) {
            let results;
            try {
                results = await chrome.scripting.executeScript({
                    target: { tabId: currentTabId },
                    func: () => {
                        const links = Array.from(
                            document.querySelectorAll('.searched-companies h3 a[href*="/firma/"]')
                        );
                        return links.map((a) => ({
                            naziv: a.innerText.trim(),
                            url: a.href
                        }));
                    }
                });
            } catch (e) {
                sendProgress(0, 0, 0, 0, "Greška: otvori CompanyWall pretragu i ostavi taj tab aktivan.");
                finishScraping({ error: "Nije moguće čitati aktivni tab pretrage." });
                return;
            }

            if (results && results[0] && results[0].result) {
                const pageCompanies = results[0].result;
                for (const comp of pageCompanies) {
                    if (companiesToProcess.length >= limit) break;
                    if (!companiesToProcess.some((c) => c.url === comp.url)) {
                        companiesToProcess.push(comp);
                    }
                }
            }

            sendProgress(
                collectedData.length,
                savedCount + updatedCount,
                failedCount,
                skippedCount,
                `Pronađeno linkova: ${companiesToProcess.length}/${limit}`
            );

            if (companiesToProcess.length >= limit) break;

            const nextPageChecked = await chrome.scripting.executeScript({
                target: { tabId: currentTabId },
                func: () => {
                    const nextBtn = document.querySelector(
                        '.pagination .page-item:last-child a, .pagination a[aria-label="Next"], .pagination .fa-caret-right'
                    );
                    if (!nextBtn) return null;
                    const aTag = nextBtn.tagName === "A" ? nextBtn : nextBtn.closest("a");
                    if (aTag && aTag.href && !aTag.parentElement.classList.contains("disabled")) {
                        return aTag.href;
                    }
                    return null;
                }
            });

            const nextUrl = nextPageChecked && nextPageChecked[0] ? nextPageChecked[0].result : null;

            if (nextUrl) {
                await chrome.tabs.update(currentTabId, { url: nextUrl });
                await waitForTabComplete(currentTabId, 7000);
                await new Promise((r) => setTimeout(r, 2000));
            } else {
                break;
            }
        }

        if (companiesToProcess.length === 0) {
            sendProgress(0, 0, 0, 0, "Greška: na ovoj stranici nema firmi (.searched-companies).");
            finishScraping({ error: "Nema firmi na stranici pretrage." });
            return;
        }

        for (let i = 0; i < companiesToProcess.length; i++) {
            const comp = companiesToProcess[i];
            let newTab = null;

            try {
                sendProgress(
                    collectedData.length,
                    savedCount + updatedCount,
                    failedCount,
                    skippedCount,
                    `Skrapujem (${i + 1}/${companiesToProcess.length}): ${comp.naziv}`
                );

                newTab = await chrome.tabs.create({ url: comp.url, active: false });
                const dataPromise = waitForCompanyData(newTab.id, 10000);
                const companyDetails = await dataPromise;

                if (newTab && newTab.id) {
                    try {
                        await chrome.tabs.remove(newTab.id);
                    } catch (_) { }
                    newTab = null;
                }

                if (!companyDetails || !companyDetails.naziv) {
                    failedCount += 1;
                    sendProgress(
                        collectedData.length,
                        savedCount + updatedCount,
                        failedCount,
                        skippedCount,
                        `Preskočeno (nema podataka): ${comp.naziv}`
                    );
                    await new Promise((r) => setTimeout(r, 800));
                    continue;
                }

                collectedData.push(companyDetails);

                try {
                    const result = await saveCompanyToAppwrite(config, companyDetails, overwrite);
                    if (result.action === "skipped") {
                        skippedCount += 1;
                        sendProgress(
                            collectedData.length,
                            savedCount + updatedCount,
                            failedCount,
                            skippedCount,
                            `Već postoji (preskočeno): ${companyDetails.naziv}`
                        );
                    } else if (result.action === "updated") {
                        updatedCount += 1;
                        sendProgress(
                            collectedData.length,
                            savedCount + updatedCount,
                            failedCount,
                            skippedCount,
                            `Overwrite: ${companyDetails.naziv}`
                        );
                    } else {
                        savedCount += 1;
                        sendProgress(
                            collectedData.length,
                            savedCount + updatedCount,
                            failedCount,
                            skippedCount,
                            `Nova firma: ${companyDetails.naziv}`
                        );
                    }
                } catch (saveErr) {
                    failedCount += 1;
                    sendProgress(
                        collectedData.length,
                        savedCount + updatedCount,
                        failedCount,
                        skippedCount,
                        `Appwrite greška (${comp.naziv}): ${saveErr.message}`
                    );
                }
            } catch (e) {
                failedCount += 1;
                if (newTab && newTab.id) {
                    try {
                        await chrome.tabs.remove(newTab.id);
                    } catch (_) { }
                }
                sendProgress(
                    collectedData.length,
                    savedCount + updatedCount,
                    failedCount,
                    skippedCount,
                    `Greška: ${comp.naziv}`
                );
            }

            await new Promise((r) => setTimeout(r, 1000));
        }

        finishScraping({
            total: collectedData.length,
            saved: savedCount,
            updated: updatedCount,
            failed: failedCount,
            skipped: skippedCount
        });
    } catch (e) {
        sendProgress(0, 0, 0, 0, e.message || String(e));
        finishScraping({ error: e.message || String(e) });
    } finally {
        scrapeRunning = false;
        await stopKeepAlive();
        pendingByTab.clear();
    }
}
