import { Client, Account, Users, TablesDB, Storage } from 'node-appwrite';
import { cookies } from 'next/headers';
import { appwriteConfig, getSessionCookieName } from './config';

/**
 * Creates an admin client with API key authentication.
 * Use for creating sessions, server-side user provisioning, bypass rate limits.
 */
export async function createAdminClient() {
  if (!appwriteConfig.endpoint || !appwriteConfig.projectId) {
    throw new Error('Appwrite endpoint or project ID is missing. Check your environment variables.');
  }

  const client = new Client()
    .setEndpoint(appwriteConfig.endpoint)
    .setProject(appwriteConfig.projectId);

  if (appwriteConfig.apiKey) {
    client.setKey(appwriteConfig.apiKey);
  }

  return {
    get client() {
      return client;
    },
    get account() {
      return new Account(client);
    },
    get users() {
      return new Users(client);
    },
    get tablesDB() {
      return new TablesDB(client);
    },
    get storage() {
      return new Storage(client);
    },
  };
}

/**
 * Creates a session client authenticated on behalf of the current logged-in user.
 * Must be created per request; uses session cookie.
 */
export async function createSessionClient() {
  if (!appwriteConfig.endpoint || !appwriteConfig.projectId) {
    throw new Error('Appwrite endpoint or project ID is missing. Check your environment variables.');
  }

  const client = new Client()
    .setEndpoint(appwriteConfig.endpoint)
    .setProject(appwriteConfig.projectId);

  const cookieStore = await cookies();
  const sessionCookieName = getSessionCookieName(appwriteConfig.projectId);
  const session = cookieStore.get(sessionCookieName);

  if (!session || !session.value) {
    return null;
  }

  client.setSession(session.value);

  return {
    get client() {
      return client;
    },
    get account() {
      return new Account(client);
    },
    get tablesDB() {
      return new TablesDB(client);
    },
    get storage() {
      return new Storage(client);
    },
  };
}

/**
 * Helper to get currently logged in user on the server.
 * Returns null if not authenticated.
 */
export async function getLoggedInUser() {
  try {
    const sessionClient = await createSessionClient();
    if (!sessionClient) {
      return null;
    }

    return await sessionClient.account.get();
  } catch (error: unknown) {
    const err = error as { digest?: string; message?: string };
    if (err?.digest?.startsWith('DYNAMIC_SERVER_USAGE') || err?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    console.error('getLoggedInUser error from Appwrite:', error);
    return null;
  }
}
