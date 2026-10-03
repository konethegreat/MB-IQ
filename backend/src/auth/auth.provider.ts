// Code written by Kone & Claude | The code does the following: " Defines the AuthProvider seam: a
// common interface every authentication strategy implements. LocalAuthProvider implements it today;
// an SsoAuthProvider (organisation SSO / SAML / OIDC) will implement the same interface later so the
// rest of the app never changes when authentication is swapped. "

import type { RoleKey } from '../config/rbac';

// The minimal, safe representation of a signed-in user that flows through the app and into the JWT.
// Note: never includes the password hash.
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: RoleKey;
  team?: string | null;
  avatar?: string | null;
}

// Credentials are intentionally generic (a string map) so the same interface serves local login
// (email + password) today and an SSO assertion/token tomorrow.
export type Credentials = Record<string, string>;

export interface AuthProvider {
  readonly name: string;
  // Returns the authenticated user, or null when authentication fails.
  authenticate(credentials: Credentials): Promise<AuthUser | null>;
}
