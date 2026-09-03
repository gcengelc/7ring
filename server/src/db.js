/**
 * Veri katmanı — Node'un yerleşik SQLite'ı (node:sqlite, Node 22+).
 * Harici bağımlılık yok; dosya tek bir .db olarak diskte durur.
 */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const FILE = process.env.DB_PATH ?? './data/ring.db';

mkdirSync(dirname(FILE), { recursive: true });

export const db = new DatabaseSync(FILE);

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS codes (
    email       TEXT PRIMARY KEY,
    code_hash   TEXT NOT NULL,
    expires_at  INTEGER NOT NULL,
    attempts    INTEGER NOT NULL DEFAULT 0,
    sent_at     INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token       TEXT PRIMARY KEY,
    email       TEXT NOT NULL,
    created_at  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sightings (
    id          TEXT PRIMARY KEY,
    stop_id     TEXT NOT NULL,
    email       TEXT NOT NULL,
    at          INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sightings_at ON sightings (at DESC);

  CREATE TABLE IF NOT EXISTS push_tokens (
    push_token  TEXT PRIMARY KEY,
    email       TEXT NOT NULL,
    nearby_only INTEGER NOT NULL DEFAULT 0,
    sound       INTEGER NOT NULL DEFAULT 0,
    updated_at  INTEGER NOT NULL
  );
`);

/** Bir günden eski kayıtlar tutulmaz — uygulama yalnızca "bugünü" gösterir. */
export function pruneOldRows(now = Date.now()) {
  const dayAgo = now - 24 * 60 * 60 * 1000;
  db.prepare('DELETE FROM sightings WHERE at < ?').run(dayAgo);
  db.prepare('DELETE FROM codes WHERE expires_at < ?').run(now);
}
