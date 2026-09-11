'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient, getLoggedInUser } from './server';
import { appwriteConfig } from './config';

const DATABASE_ID = appwriteConfig.databaseId || '6a7dd77a002b3913d433';
const TABLE_ID = 'automation_settings';
const ROW_ID = 'outreach';

export interface AutomationSettings {
  dailyLimit: number;
  delayMinutes: number;
}

const DEFAULT_AUTOMATION_SETTINGS: AutomationSettings = {
  dailyLimit: 50,
  delayMinutes: 15,
};

function normalizeSettings(settings: AutomationSettings): AutomationSettings {
  return {
    dailyLimit: Math.min(50, Math.max(1, Math.trunc(Number(settings.dailyLimit) || 50))),
    delayMinutes: Math.min(60, Math.max(10, Math.trunc(Number(settings.delayMinutes) || 15))),
  };
}

async function requireAuthenticatedUser() {
  const user = await getLoggedInUser();
  if (!user) throw new Error('Unauthorized');
}

export async function getAutomationSettings(): Promise<AutomationSettings> {
  await requireAuthenticatedUser();
  const { tablesDB } = await createAdminClient();

  try {
    const row = await tablesDB.getRow({ databaseId: DATABASE_ID, tableId: TABLE_ID, rowId: ROW_ID });
    return normalizeSettings({
      dailyLimit: Number(row.daily_limit),
      delayMinutes: Number(row.delay_minutes),
    });
  } catch (error) {
    const status = (error as { code?: number })?.code;
    if (status === 404) return DEFAULT_AUTOMATION_SETTINGS;
    throw error;
  }
}

export async function saveAutomationSettings(
  settings: AutomationSettings
): Promise<{ success: boolean; message: string; settings?: AutomationSettings }> {
  await requireAuthenticatedUser();
  const normalized = normalizeSettings(settings);

  try {
    const { tablesDB } = await createAdminClient();
    await tablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      rowId: ROW_ID,
      data: {
        daily_limit: normalized.dailyLimit,
        delay_minutes: normalized.delayMinutes,
      },
    });
    revalidatePath('/automations');
    return {
      success: true,
      message: `Trajno sačuvano: ${normalized.dailyLimit} firmi • ${normalized.delayMinutes} min pauza.`,
      settings: normalized,
    };
  } catch (error) {
    console.error('Greška pri spremanju automation postavki:', error);
    return { success: false, message: 'Appwrite nije potvrdio spremanje postavki.' };
  }
}
