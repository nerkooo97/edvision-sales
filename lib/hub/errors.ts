export type HubErrorCode = 'unauthenticated' | 'forbidden' | 'not_found' | 'validation' | 'conflict' | 'unknown';

/** Expected failure with a message that is safe to show to the user (Bosnian). */
export class HubError extends Error {
  constructor(
    public readonly code: HubErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'HubError';
  }
}

export const hubErrors = {
  unauthenticated: () => new HubError('unauthenticated', 'Morate se prijaviti.'),
  noHubAccess: () => new HubError('forbidden', 'Nemate pristup modulu za projekte.'),
  forbidden: (what = 'ovu akciju') => new HubError('forbidden', `Nemate dozvolu za ${what}.`),
  notFound: (what: string) => new HubError('not_found', `${what} nije pronađen.`),
  validation: (message: string) => new HubError('validation', message),
};
