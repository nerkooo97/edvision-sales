import { ID, Query } from 'node-appwrite';
import { HUB_TABLES } from '../config';
import type { SubscriptionInput } from '../schemas';
import type { HubSubscription } from '../types';
import { getHubDb, isNotFound, toPlain } from './db';

// A company has a few dozen subscriptions, so the whole table is read in one bounded query.
const MAX_SUBSCRIPTIONS = 500;

export async function listSubscriptions(): Promise<HubSubscription[]> {
  const { tablesDB, databaseId } = await getHubDb();
  const { rows } = await tablesDB.listRows({
    databaseId,
    tableId: HUB_TABLES.subscriptions,
    queries: [Query.orderAsc('payment_date'), Query.limit(MAX_SUBSCRIPTIONS)],
  });
  return toPlain<HubSubscription[]>(rows);
}

export async function getSubscription(subscriptionId: string): Promise<HubSubscription | null> {
  const { tablesDB, databaseId } = await getHubDb();
  try {
    const row = await tablesDB.getRow({ databaseId, tableId: HUB_TABLES.subscriptions, rowId: subscriptionId });
    return toPlain<HubSubscription>(row);
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export async function createSubscription(data: SubscriptionInput): Promise<HubSubscription> {
  const { tablesDB, databaseId } = await getHubDb();
  const row = await tablesDB.createRow({
    databaseId,
    tableId: HUB_TABLES.subscriptions,
    rowId: ID.unique(),
    data,
  });
  return toPlain<HubSubscription>(row);
}

export async function updateSubscription(subscriptionId: string, data: SubscriptionInput): Promise<HubSubscription> {
  const { tablesDB, databaseId } = await getHubDb();
  const row = await tablesDB.updateRow({
    databaseId,
    tableId: HUB_TABLES.subscriptions,
    rowId: subscriptionId,
    data,
  });
  return toPlain<HubSubscription>(row);
}

export async function deleteSubscription(subscriptionId: string): Promise<void> {
  const { tablesDB, databaseId } = await getHubDb();
  await tablesDB.deleteRow({ databaseId, tableId: HUB_TABLES.subscriptions, rowId: subscriptionId });
}
