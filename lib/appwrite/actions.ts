'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppwriteException } from 'node-appwrite';
import { createAdminClient, createSessionClient, getLoggedInUser } from './server';
import { appwriteConfig, getSessionCookieName, isAppwriteConfigured } from './config';

export type AuthActionResult = {
  success: boolean;
  error?: string;
};

/**
 * Server action to log in a user with email and password.
 */
export async function loginAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get('email')?.toString().trim();
  const password = formData.get('password')?.toString().trim();

  if (!email || !password) {
    return { success: false, error: 'Please enter both email and password.' };
  }

  if (!isAppwriteConfigured()) {
    return {
      success: false,
      error: 'Appwrite is not configured. Please set NEXT_PUBLIC_APPWRITE_PROJECT_ID in .env.local',
    };
  }

  try {
    const { account } = await createAdminClient();
    const session = await account.createEmailPasswordSession({
      email,
      password,
    });

    const cookieStore = await cookies();
    const cookieName = getSessionCookieName(appwriteConfig.projectId);

    cookieStore.set(cookieName, session.secret, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(session.expire),
    });
  } catch (error) {
    if (error instanceof AppwriteException) {
      if (error.code === 401) {
        return { success: false, error: 'Invalid email or password.' };
      }
      if (error.code === 429) {
        return { success: false, error: 'Too many requests. Please try again later.' };
      }
      return { success: false, error: error.message || 'An error occurred during login.' };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred.',
    };
  }

  redirect('/dashboard');
}

/**
 * Server action to log out the current user.
 */
export async function logoutAction(): Promise<void> {
  try {
    const sessionClient = await createSessionClient();
    if (sessionClient) {
      await sessionClient.account.deleteSession({ sessionId: 'current' });
    }

    const cookieStore = await cookies();
    const cookieName = getSessionCookieName(appwriteConfig.projectId);
    cookieStore.delete(cookieName);
  } catch (error) {
    console.error('Logout error:', error);
  }

  redirect('/');
}

/**
 * Server helper to fetch current user data.
 */
export async function getCurrentUser() {
  return await getLoggedInUser();
}
