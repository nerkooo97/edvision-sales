// Shared plumbing for Hub server actions. Not a 'use server' file: nothing here is callable from the client.

import { AppwriteException } from 'node-appwrite';
import { ZodError, type ZodType } from 'zod';
import { HubError, type HubErrorCode } from '../errors';
import { toPlain } from '../server/db';

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; code: HubErrorCode; error: string };

/** For server components: returns the data or throws so the route's error boundary takes over. */
export function unwrapResult<T>(result: ActionResult<T>): T {
  if (!result.success) throw new HubError(result.code, result.error);
  return result.data;
}

/** Validates untrusted client input; the first problem is returned as a user-facing message. */
export function parseInput<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new HubError('validation', result.error.issues[0]?.message ?? 'Neispravan unos.');
  }
  return result.data;
}

/** Next.js uses thrown errors for redirects/dynamic rendering; those must reach the framework untouched. */
function isFrameworkError(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === 'string' && (digest.startsWith('NEXT_') || digest.startsWith('DYNAMIC_SERVER_USAGE'));
}

/**
 * Runs an action body and turns every outcome into a serialisable result.
 * Expected failures (permissions, validation, not found) carry a safe message; anything unexpected is
 * logged on the server and reported generically, so internal details never reach the browser.
 */
export async function runAction<T>(body: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { success: true, data: toPlain<T>(await body()) };
  } catch (error) {
    if (isFrameworkError(error)) throw error;

    if (error instanceof HubError) return { success: false, code: error.code, error: error.message };
    if (error instanceof ZodError) {
      return { success: false, code: 'validation', error: error.issues[0]?.message ?? 'Neispravan unos.' };
    }
    if (error instanceof AppwriteException && error.code === 409) {
      return { success: false, code: 'conflict', error: 'Podatak već postoji.' };
    }

    console.error('Hub action failed:', error);
    return { success: false, code: 'unknown', error: 'Došlo je do greške. Pokušajte ponovo.' };
  }
}
