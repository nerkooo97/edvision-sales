import { Client, Account, TablesDB, Storage } from 'appwrite';
import { appwriteConfig } from './config';

/**
 * Creates and returns a client-side Appwrite SDK instance.
 */
export function createBrowserClient() {
  const client = new Client();

  if (appwriteConfig.endpoint) {
    client.setEndpoint(appwriteConfig.endpoint);
  }

  if (appwriteConfig.projectId) {
    client.setProject(appwriteConfig.projectId);
  }

  return {
    client,
    account: new Account(client),
    tablesDB: new TablesDB(client),
    storage: new Storage(client),
  };
}

// Convenient pre-instantiated browser client
export const browserClient = createBrowserClient();
export const browserAccount = browserClient.account;
export const browserTablesDB = browserClient.tablesDB;
export const browserStorage = browserClient.storage;
