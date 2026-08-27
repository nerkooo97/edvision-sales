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

    return list.map((w) => ({
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
 * Dohvata listu nedavnih egzekucija sa n8n servera
 */
export async function fetchN8nExecutions(limit = 15): Promise<N8nExecution[]> {
  if (!N8N_API_KEY) {
    return [];
  }

  try {
    const res = await fetch(`${N8N_BASE_URL}/api/v1/executions?limit=${limit}`, {
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

      return {
        id: String(item.id),
        finished: Boolean(item.finished),
        mode: item.mode || 'manual',
        retryOf: item.retryOf,
        retrySuccessId: item.retrySuccessId,
        status,
        startedAt: item.startedAt,
        stoppedAt: item.stoppedAt,
        workflowId: item.workflowId,
        durationMs,
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
      return {
        success: true,
        message: `Zahtjev poslan (Status: ${response.status}). n8n je započeo procesiranje.`,
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
