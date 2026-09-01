export const appwriteConfig = {
  get endpoint() {
    return (
      process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
      process.env.APPWRITE_ENDPOINT ||
      'https://appwrite.ed-vision.com/v1'
    );
  },
  get projectId() {
    return (
      process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
      process.env.APPWRITE_PROJECT_ID ||
      '6a7dd764002484e4cc47'
    );
  },
  get apiKey() {
    return process.env.APPWRITE_API_KEY || '';
  },
  get databaseId() {
    return (
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ||
      process.env.APPWRITE_DATABASE_ID ||
      '6a7dd77a002b3913d433'
    );
  },
};

export function getSessionCookieName(projectId?: string) {
  const id = projectId || appwriteConfig.projectId || '6a7dd764002484e4cc47';
  return `a_session_${id}`;
}

export function isAppwriteConfigured() {
  return Boolean(appwriteConfig.endpoint && appwriteConfig.projectId);
}
