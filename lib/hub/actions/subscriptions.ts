'use server';

import { hubErrors } from '../errors';
import { canManageSubscriptions } from '../permissions';
import { idSchema, subscriptionSchema } from '../schemas';
import { requireHubUser } from '../server/session';
import {
  createSubscription,
  deleteSubscription,
  getSubscription,
  listSubscriptions,
  updateSubscription,
} from '../server/subscriptions';
import { getExchangeRates } from '../server/exchange-rates';
import { getMember, listAllUsers } from '../server/users';
import { parseInput, runAction } from './run-action';

// Everyone with a Hub role may look at the subscriptions; only admin and finance may change them.
async function requireSubscriptionViewer() {
  return requireHubUser();
}

async function requireSubscriptionAccess() {
  const user = await requireHubUser();
  if (!canManageSubscriptions(user.role)) throw hubErrors.forbidden('pretplate');
  return user;
}

export async function listSubscriptionsAction() {
  return runAction(async () => {
    await requireSubscriptionViewer();
    return listSubscriptions();
  });
}

/** Everyone with an account (not only Hub users): a subscription can be registered to any colleague. */
export async function listSubscriptionHoldersAction() {
  return runAction(async () => {
    await requireSubscriptionViewer();
    return listAllUsers();
  });
}

async function assertHolderExists(holderId: string) {
  if (!(await getMember(holderId))) throw hubErrors.validation('Odabrani korisnik ne postoji.');
}

export async function createSubscriptionAction(input: unknown) {
  return runAction(async () => {
    await requireSubscriptionAccess();
    const data = parseInput(subscriptionSchema, input);
    await assertHolderExists(data.holder_id);
    return createSubscription(data);
  });
}

export async function updateSubscriptionAction(subscriptionId: unknown, input: unknown) {
  return runAction(async () => {
    await requireSubscriptionAccess();
    const id = parseInput(idSchema, subscriptionId);
    const data = parseInput(subscriptionSchema, input);
    if (!(await getSubscription(id))) throw hubErrors.notFound('Pretplata');
    await assertHolderExists(data.holder_id);
    return updateSubscription(id, data);
  });
}

export async function deleteSubscriptionAction(subscriptionId: unknown) {
  return runAction(async () => {
    await requireSubscriptionAccess();
    const id = parseInput(idSchema, subscriptionId);
    if (!(await getSubscription(id))) throw hubErrors.notFound('Pretplata');
    await deleteSubscription(id);
    return { id };
  });
}

/** The reference rate for converting dollar subscriptions to KM; null when it cannot be fetched. */
export async function getExchangeRatesAction() {
  return runAction(async () => {
    await requireSubscriptionViewer();
    return getExchangeRates();
  });
}
