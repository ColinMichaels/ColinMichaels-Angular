export const SOCIAL_CONNECTION_PROVIDERS = ['facebook', 'instagram', 'threads'] as const;

export type SocialConnectionProvider = typeof SOCIAL_CONNECTION_PROVIDERS[number];

export type SocialConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'expired'
  | 'needs-selection';

export interface SocialConnectionAccountOption {
  id: string;
  label: string;
  note?: string;
}

export interface SocialConnection {
  provider: SocialConnectionProvider;
  status: SocialConnectionStatus;
  scopes: readonly string[];
  updatedAt: string;
  accountId?: string;
  accountLabel?: string;
  availableAccounts?: readonly SocialConnectionAccountOption[];
  connectedAt?: string;
  expiresAt?: string;
  lastValidatedAt?: string;
  username?: string;
}

export interface SocialConnectionsResponse {
  connections: readonly SocialConnection[];
  deliveryEnabled: false;
  fetchedAt: string;
}

export interface BeginSocialConnectionResponse {
  authorizationUrl: string;
  expiresAt: string;
  provider: SocialConnectionProvider;
}
