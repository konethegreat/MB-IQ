// Code written by Kone & Claude | The code does the following: " Requires explicit local
// demo-seeding permission and a caller-supplied password before sample data is created. "
import 'dotenv/config';

if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DEMO_SEED !== 'true') {
  throw new Error('Demo seeding requires ALLOW_DEMO_SEED=true outside production');
}
export const DEMO_PASSWORD = process.env.SEED_PASSWORD || '';
if (DEMO_PASSWORD.length < 12) {
  throw new Error('SEED_PASSWORD must be set to a local demo password of at least 12 characters');
}
