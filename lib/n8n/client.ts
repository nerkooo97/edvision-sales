'use server';

import { revalidatePath } from 'next/cache';
import type { N8nWorkflow, N8nExecution, N8nExecutionDetail, N8nNodeExecutionSummary } from './types';

const N8N_BASE_URL = (process.env.N8N_BASE_URL || 'https://edvision.app.n8n.cloud').replace(/\/+$/, '');
const N8N_API_KEY = process.env.N8N_API_KEY || '';
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://edvision.app.n8n.cloud/webhook/pokreni-sales';

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-N8N-API-KEY': N8N_API_KEY,
  };
}

/**
 * Dohvata listu svih workflow-a sa n8n instance
 */
export async function fetchN8nWorkflows(): Promise<N8nWorkflow[]> {
  if (!N8N_API_KEY) {
    console.warn('N8N_API_KEY nije postavljen u konfiguraciji.');
    return [];
  }

  try {
    const res = await fetch(`${N8N_BASE_URL}/api/v1/workflows`, {
      method: 'GET',
      headers: getHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error(`n8n API greška pri dohvatanju workflows: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    const list = (data.data || data) as Array<{
      id: string;
      name: string;
      active: boolean;
      createdAt: string;
      updatedAt: string;
      nodes?: unknown[];
      tags?: { id: string; name: string }[];
    }>;

    const sortedList = list.sort((a, b) => {
      if (a.active === b.active) {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      return b.active ? 1 : -1;
    });

    return sortedList.map((w) => ({
      id: w.id,
      name: w.name,
      active: Boolean(w.active),
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
      nodesCount: Array.isArray(w.nodes) ? w.nodes.length : undefined,
      tags: w.tags || [],
    }));
  } catch (err) {
    console.error('Greška pri komunikaciji sa n8n workflows API:', err);
    return [];
  }
}

/**
 * Mijenja status aktivnosti workflow-a (Aktiviraj / Deaktiviraj raspored)
 */
export async function setWorkflowActiveStatus(
  workflowId: string,
  active: boolean
): Promise<{ success: boolean; message: string; active?: boolean }> {
  if (!N8N_API_KEY) {
    return { success: false, message: 'N8N_API_KEY nije konfigurisan.' };
  }

  try {
    const endpoint = active ? 'activate' : 'deactivate';
    const res = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${encodeURIComponent(workflowId)}/${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        success: false,
        message: `n8n server je vratio grešku (${res.status}): ${errText || 'Nepoznata greška'}`,
      };
    }

    revalidatePath('/automations');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: active ? 'Workflow raspored je uspješno aktiviran!' : 'Workflow raspored je uspješno pauziran/deaktiviran.',
      active,
    };
  } catch (err) {
    console.error('Greška pri promjeni statusa workflow-a:', err);
    return {
      success: false,
      message: 'Greška u mrežnoj komunikaciji sa n8n serverom.',
    };
  }
}

/**
 * Pomoćna funkcija za nepogrešivu detekciju tipa toka iz n8n egzekucije
 */
function detectFlowTypeFromExecution(item: {
  mode?: string;
  data?: {
    resultData?: {
      runData?: Record<string, unknown>;
    };
    startData?: Record<string, unknown>;
  };
  startedAt?: string;
}): { flowType: import('./types').N8nFlowType; flowLabel: string } {
  const runData = item.data?.resultData?.runData || {};
  const nodeNames = Object.keys(runData).map((n) => n.toLowerCase());

  // 1. Provjera Tracking piksela (otvaranje emaila)
  if (
    nodeNames.some(
      (n) =>
        n.includes('track email open') ||
        n.includes('pronadji log za otvaranje') ||
        n.includes('azuriraj status na otvoreno')
    )
  ) {
    return { flowType: 'tracking', flowLabel: 'Email Otvaranje (Tracking)' };
  }

  // 2. Provjera Follow-up toka
  if (
    nodeNames.some(
      (n) =>
        n.includes('follow-up') ||
        n.includes('followup') ||
        n.includes('imap') ||
        n.includes('poslata pisma') ||
        n.includes('split out: pisma') ||
        n.includes('obrađene kontakte') ||
        n.includes('obradjene kontakte') ||
        n.includes('whatsapp') ||
        n.includes('openwa') ||
        n.includes('da li je klijent odgovorio')
    )
  ) {
    return { flowType: 'followup', flowLabel: 'Follow-up & WhatsApp' };
  }

  // 3. Provjera Email Outreach toka
  if (
    nodeNames.some(
      (n) =>
        n.includes('ručno pokretanje') ||
        n.includes('rucno pokretanje') ||
        n.includes('09:00h') ||
        n.includes('firme (companies)') ||
        n.includes('split out: firme') ||
        n.includes('pagespeed') ||
        n.includes('openai vision') ||
        n.includes('parsiraj openai') ||
        n.includes('pripremi lead') ||
        n.includes('smtp') ||
        n.includes('warmup pauza') ||
        n.includes('loop over firme')
    )
  ) {
    return { flowType: 'outreach', flowLabel: 'Email Outreach' };
  }

  // 4. Fallback za Schedule Trigger
  if (item.mode === 'trigger' && item.startedAt) {
    try {
      const d = new Date(item.startedAt);
      const hours = d.getUTCHours();
      if (hours === 8 || hours === 9) {
        return { flowType: 'followup', flowLabel: 'Follow-up & WhatsApp' };
      }
      return { flowType: 'outreach', flowLabel: 'Email Outreach' };
    } catch (e) {}
  }

  if (item.mode === 'webhook') {
    return { flowType: 'outreach', flowLabel: 'Email Outreach' };
  }

  return { flowType: 'unknown', flowLabel: 'n8n Proces' };
}

/**
 * Dohvata listu nedavnih egzekucija sa n8n servera sa detaljnim podacima
 */
export async function fetchN8nExecutions(limit = 15): Promise<N8nExecution[]> {
  if (!N8N_API_KEY) {
    return [];
  }

  try {
    const res = await fetch(`${N8N_BASE_URL}/api/v1/executions?limit=${limit}&includeData=true`, {
      method: 'GET',
      headers: getHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error(`n8n API greška pri dohvatanju executions: ${res.status}`);
      return [];
    }

    const data = await res.json();
    const rawList = (data.data || []) as Array<{
      id: string;
      finished: boolean;
      mode: string;
      retryOf?: string | null;
      retrySuccessId?: string | null;
      status: string;
      startedAt: string;
      stoppedAt?: string | null;
      workflowId: string;
      waitTill?: string | null;
      data?: {
        resultData?: {
          runData?: Record<string, unknown>;
        };
        startData?: Record<string, unknown>;
      };
    }>;

    return rawList.map((item) => {
      let durationMs: number | undefined;
      if (item.startedAt && item.stoppedAt) {
        const start = new Date(item.startedAt).getTime();
        const stop = new Date(item.stoppedAt).getTime();
        if (!isNaN(start) && !isNaN(stop) && stop >= start) {
          durationMs = stop - start;
        }
      }

      let status: N8nExecution['status'] = 'unknown';
      const s = (item.status || '').toLowerCase();
      if (s === 'success' || s === 'finished') status = 'success';
      else if (s === 'error' || s === 'failed') status = 'error';
      else if (s === 'running') status = 'running';
      else if (s === 'waiting') status = 'waiting';
      else if (s === 'canceled' || s === 'stopped') status = 'canceled';
      else status = s as N8nExecution['status'];

      const isFinished = item.finished === true || status === 'error' || status === 'success' || status === 'canceled';
      const { flowType, flowLabel } = detectFlowTypeFromExecution(item);

      return {
        id: String(item.id),
        finished: isFinished,
        mode: item.mode || 'manual',
        retryOf: item.retryOf,
        retrySuccessId: item.retrySuccessId,
        status,
        startedAt: item.startedAt,
        stoppedAt: item.stoppedAt,
        workflowId: item.workflowId,
        durationMs,
        flowType,
        flowLabel,
      };
    });
  } catch (err) {
    console.error('Greška pri dohvatanju n8n egzekucija:', err);
    return [];
  }
}

/**
 * Dohvata detalje o pojedinačnoj egzekuciji (izvršeni čvorovi, greške)
 */
export async function fetchN8nExecutionDetail(executionId: string): Promise<N8nExecutionDetail | null> {
  if (!N8N_API_KEY) {
    return null;
  }

  try {
    const res = await fetch(`${N8N_BASE_URL}/api/v1/executions/${encodeURIComponent(executionId)}?includeData=true`, {
      method: 'GET',
      headers: getHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error(`n8n API greška pri dohvatanju detalja egzekucije ${executionId}: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const runData = data.data?.resultData?.runData || {};
    const errorData = data.data?.resultData?.error;

    const nodesRun: N8nNodeExecutionSummary[] = [];

    Object.keys(runData).forEach((nodeName) => {
      const nodeExecutions = runData[nodeName];
      let executionTime = 0;
      let hasError = false;
      let errorMessage: string | undefined;

      if (Array.isArray(nodeExecutions)) {
        nodeExecutions.forEach((exec) => {
          if (exec.executionTime) executionTime += exec.executionTime;
          if (exec.error) {
            hasError = true;
            errorMessage = exec.error.message || exec.error.description || String(exec.error);
          }
        });
      }

      nodesRun.push({
        nodeName,
        executionTime,
        hasError,
        errorMessage,
      });
    });

    let durationMs: number | undefined;
    if (data.startedAt && data.stoppedAt) {
      const start = new Date(data.startedAt).getTime();
      const stop = new Date(data.stoppedAt).getTime();
      if (!isNaN(start) && !isNaN(stop) && stop >= start) {
        durationMs = stop - start;
      }
    }

    let status: N8nExecution['status'] = 'unknown';
    const s = (data.status || '').toLowerCase();
    if (s === 'success' || s === 'finished') status = 'success';
    else if (s === 'error' || s === 'failed') status = 'error';
    else if (s === 'running') status = 'running';
    else if (s === 'waiting') status = 'waiting';
    else if (s === 'canceled' || s === 'stopped') status = 'canceled';
    else status = s as N8nExecution['status'];

    const { flowType, flowLabel } = detectFlowTypeFromExecution(data);

    return {
      id: String(data.id),
      finished: Boolean(data.finished),
      mode: data.mode || 'manual',
      retryOf: data.retryOf,
      retrySuccessId: data.retrySuccessId,
      status,
      startedAt: data.startedAt,
      stoppedAt: data.stoppedAt,
      workflowId: data.workflowId,
      workflowName: data.workflowData?.name,
      durationMs,
      flowType,
      flowLabel,
      nodesRun,
      error: errorData
        ? {
            message: errorData.message || 'Došlo je do greške tokom izvršavanja toka.',
            description: errorData.description,
            nodeName: errorData.node?.name,
            stack: errorData.stack,
          }
        : undefined,
    };
  } catch (err) {
    console.error(`Greška pri dohvatanju detalja za egzekuciju ${executionId}:`, err);
    return null;
  }
}

/**
 * Zaustavlja aktivnu egzekuciju na n8n serveru
 */
export async function stopN8nExecution(executionId: string): Promise<{ success: boolean; message: string }> {
  if (!N8N_API_KEY) {
    return { success: false, message: 'N8N_API_KEY nije konfigurisan.' };
  }

  try {
    const res = await fetch(`${N8N_BASE_URL}/api/v1/executions/${encodeURIComponent(executionId)}/stop`, {
      method: 'POST',
      headers: getHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errText = await res.text();
      // Ako je već završena ili ne postoji, smatraj uspješnim zaustavljanjem
      if (res.status === 400 || res.status === 404) {
        revalidatePath('/automations');
        return {
          success: true,
          message: `Egzekucija #${executionId} je već bila završena ili zaustavljena.`,
        };
      }
      return {
        success: false,
        message: `Nije uspjelo zaustavljanje egzekucije (${res.status}): ${errText || 'Greška'}`,
      };
    }

    revalidatePath('/automations');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: `Egzekucija #${executionId} je uspješno zaustavljena.`,
    };
  } catch (err) {
    console.error('Greška pri zaustavljanju egzekucije:', err);
    return {
      success: false,
      message: 'Greška u mrežnoj komunikaciji sa n8n serverom.',
    };
  }
}

/**
 * Zaustavlja sve aktivne ili čekajuće egzekucije na n8n serveru
 */
export async function stopAllActiveN8nExecutions(): Promise<{
  success: boolean;
  message: string;
  stoppedCount: number;
  stoppedIds: string[];
}> {
  if (!N8N_API_KEY) {
    return { success: false, message: 'N8N_API_KEY nije konfigurisan.', stoppedCount: 0, stoppedIds: [] };
  }

  try {
    const listRes = await fetch(`${N8N_BASE_URL}/api/v1/executions?limit=15`, {
      method: 'GET',
      headers: getHeaders(),
      cache: 'no-store',
    });

    if (!listRes.ok) {
      return { success: true, message: 'Nema aktivnih procesa na serveru.', stoppedCount: 0, stoppedIds: [] };
    }

    const listData = await listRes.json();
    const runningList = ((listData.data || []) as Array<{ id: string; status: string; finished: boolean }>).filter(
      (e) => e.status === 'running' || e.status === 'waiting'
    );

    if (runningList.length === 0) {
      revalidatePath('/automations');
      revalidatePath('/dashboard');
      return { success: true, message: 'Svi n8n procesi su već završeni.', stoppedCount: 0, stoppedIds: [] };
    }

    const stoppedIds: string[] = [];
    for (const exec of runningList) {
      try {
        const stopRes = await fetch(`${N8N_BASE_URL}/api/v1/executions/${encodeURIComponent(exec.id)}/stop`, {
          method: 'POST',
          headers: getHeaders(),
          cache: 'no-store',
        });
        if (stopRes.ok || stopRes.status === 400 || stopRes.status === 404) {
          stoppedIds.push(String(exec.id));
        }
      } catch (e) {
        console.error(`Greška pri stopiranju #${exec.id}:`, e);
      }
    }

    revalidatePath('/automations');
    revalidatePath('/dashboard');

    return {
      success: true,
      message:
        stoppedIds.length > 0
          ? `Uspješno zaustavljeno ${stoppedIds.length} aktivnih procesa na n8n serveru.`
          : 'Proces je zaustavljen.',
      stoppedCount: stoppedIds.length,
      stoppedIds,
    };
  } catch (err) {
    console.error('Greška pri zaustavljanju aktivnih procesa:', err);
    return {
      success: false,
      message: 'Greška u komunikaciji sa n8n serverom.',
      stoppedCount: 0,
      stoppedIds: [],
    };
  }
}

/**
 * Pokreće tok (Email Outreach, Follow-up ili cijeli sistem) putem n8n Webhooka
 */
export interface TriggerFlowOptions {
  dailyLimit?: number;
  delayMinutes?: number;
}

export async function triggerN8nFlow(
  flowType: 'outreach' | 'followup' | 'full' = 'full',
  options?: TriggerFlowOptions
): Promise<{ success: boolean; message: string }> {
  try {
    const targetUrl =
      flowType === 'followup'
        ? `${N8N_BASE_URL}/webhook/pokreni-followup`
        : N8N_WEBHOOK_URL;

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'edvision_dashboard_manual',
        flowType,
        dailyLimit: options?.dailyLimit ?? 25,
        delayMinutes: options?.delayMinutes ?? 15,
        triggeredAt: new Date().toISOString(),
      }),
      cache: 'no-store',
    });

    revalidatePath('/automations');
    revalidatePath('/dashboard');
    revalidatePath('/contact-logs');

    if (response.ok || response.status === 200 || response.status === 201) {
      const flowLabels: Record<string, string> = {
        outreach: 'Email Outreach tok',
        followup: 'Follow-up & WhatsApp tok',
        full: 'Kompletan prodajni ciklus',
      };
      return {
        success: true,
        message: `${flowLabels[flowType] || 'Tok'} je uspješno pokrenut na n8n serveru!`,
      };
    } else {
      let errorDetail = '';
      try {
        const errJson = await response.json();
        errorDetail = errJson.message || errJson.hint || '';
      } catch (e) {}

      return {
        success: false,
        message: errorDetail
          ? `n8n greška (${response.status}): ${errorDetail}`
          : `n8n server je vratio status ${response.status}. Provjerite da li je workflow objavljen (Published) u n8n-u.`,
      };
    }
  } catch (error) {
    console.error('Greška pri slanju trigger zahtjeva ka n8n:', error);
    return {
      success: false,
      message: 'Nije uspjelo povezivanje sa n8n Webhookom. Provjerite da li je n8n aktivan.',
    };
  }
}
