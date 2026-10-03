// Code written by Kone & Claude | The code does the following: " Creates the empty local
// SQLite file before schema setup, including on Windows where a missing file failed. "
import 'dotenv/config';
import { closeSync, mkdirSync, openSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';
if (databaseUrl.startsWith('file:')) {
  const schemaDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../prisma');
  const file = resolve(schemaDirectory, decodeURIComponent(databaseUrl.slice(5).split('?')[0]));
  mkdirSync(dirname(file), { recursive: true });
  try {
    closeSync(openSync(file, 'ax'));
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}
