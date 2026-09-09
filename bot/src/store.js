import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

/**
 * Dead-simple JSON file store. Zero infrastructure, zero cost.
 * Swap this module for Postgres/Redis later — the rest of the bot only calls
 * getUser / setUser / allUsers.
 */

const FILE = resolve(process.env.DATA_FILE ?? './data/users.json')
let cache = null
let writing = null

async function load() {
  if (cache) return cache
  try {
    cache = JSON.parse(await readFile(FILE, 'utf8'))
  } catch {
    cache = {}
  }
  return cache
}

async function flush() {
  // Serialise writes so concurrent updates can't interleave.
  writing = (writing ?? Promise.resolve()).then(async () => {
    await mkdir(dirname(FILE), { recursive: true })
    await writeFile(FILE, JSON.stringify(cache, null, 2))
  })
  return writing
}

export async function getUser(id) {
  const db = await load()
  return db[id] ?? null
}

export async function setUser(id, patch) {
  const db = await load()
  db[id] = { ...(db[id] ?? { id, joinedAt: Date.now(), daily: true, streak: 0, lastDay: null, answered: 0, correct: 0 }), ...patch }
  await flush()
  return db[id]
}

export async function allUsers() {
  const db = await load()
  return Object.values(db)
}
