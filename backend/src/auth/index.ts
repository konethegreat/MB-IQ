// Code written by Kone & Claude | The code does the following: " The auth provider factory — returns
// the active AuthProvider based on configuration. Today it returns LocalAuthProvider; when the
// organisation SSO is ready, add and return SsoAuthProvider here. Nothing else in the app changes. "

import { env } from '../config/env';
import type { AuthProvider } from './auth.provider';
import { LocalAuthProvider } from './local.provider';

let provider: AuthProvider | null = null;

export function getAuthProvider(): AuthProvider {
  if (provider) return provider;

  switch (env.authProvider) {
    case 'sso':
      // Placeholder for the organisation identity provider. Implement SsoAuthProvider against the
      // same AuthProvider interface and return it here. Until then we fail loudly.
      throw new Error('SSO auth provider is not implemented yet. Set AUTH_PROVIDER=local for now.');
    case 'local':
    default:
      provider = new LocalAuthProvider();
      return provider;
  }
}
