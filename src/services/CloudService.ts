import type { GameModeId } from '../data/GameModeConfig'
import { LEVEL_COUNT } from '../data/LevelConfig'
import type { ModeLevelProgress } from './SaveService'

export interface CloudUser {
  uid: string
  displayName: string
  photoURL: string | null
  isAnonymous: boolean
}

export interface CloudLeaderboardEntry {
  id: string
  uid: string
  name: string
  score: number
  maxCombo: number
  modeId: GameModeId
  level: number
  date: string
}

export type CloudModeLevels = Partial<Record<GameModeId, ModeLevelProgress>>

type AuthMod = typeof import('firebase/auth')
type FsMod = typeof import('firebase/firestore')

function readConfig() {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined
  const appId = import.meta.env.VITE_FIREBASE_APP_ID as string | undefined
  if (!apiKey || !authDomain || !projectId || !appId) return null
  return {
    apiKey,
    authDomain,
    projectId,
    appId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  }
}

/**
 * Optional cloud layer (Firebase Auth + Firestore), loaded on demand.
 * Without VITE_FIREBASE_* env vars the game stays fully local.
 */
export class CloudService {
  private auth: import('firebase/auth').Auth | null = null
  private db: import('firebase/firestore').Firestore | null = null
  private authMod: AuthMod | null = null
  private fsMod: FsMod | null = null
  private user: CloudUser | null = null
  private initPromise: Promise<boolean> | null = null
  private readonly listeners = new Set<(u: CloudUser | null) => void>()
  private readonly configured = !!readConfig()

  isConfigured(): boolean {
    return this.configured
  }

  getUser(): CloudUser | null {
    return this.user
  }

  onAuthChanged(cb: (u: CloudUser | null) => void): () => void {
    this.listeners.add(cb)
    cb(this.user)
    if (this.configured) void this.ensureInit()
    return () => this.listeners.delete(cb)
  }

  private async ensureInit(): Promise<boolean> {
    if (!this.configured) return false
    if (this.auth && this.db) return true
    if (this.initPromise) return this.initPromise
    this.initPromise = (async () => {
      const cfg = readConfig()
      if (!cfg) return false
      try {
        const { initializeApp } = await import('firebase/app')
        const authMod = await import('firebase/auth')
        const fsMod = await import('firebase/firestore')
        this.authMod = authMod
        this.fsMod = fsMod
        const app = initializeApp(cfg)
        this.auth = authMod.getAuth(app)
        this.db = fsMod.getFirestore(app)
        authMod.onAuthStateChanged(this.auth, (u) => {
          this.user = u
            ? {
                uid: u.uid,
                displayName: u.displayName || (u.isAnonymous ? 'Guest' : 'Player'),
                photoURL: u.photoURL,
                isAnonymous: u.isAnonymous,
              }
            : null
          for (const fn of this.listeners) fn(this.user)
        })
        return true
      } catch {
        this.auth = null
        this.db = null
        return false
      }
    })()
    return this.initPromise
  }

  async signInGoogle(): Promise<CloudUser> {
    if (!(await this.ensureInit()) || !this.auth || !this.authMod) {
      throw new Error('cloud_not_configured')
    }
    const cred = await this.authMod.signInWithPopup(
      this.auth,
      new this.authMod.GoogleAuthProvider(),
    )
    const u = cred.user
    return {
      uid: u.uid,
      displayName: u.displayName || 'Player',
      photoURL: u.photoURL,
      isAnonymous: u.isAnonymous,
    }
  }

  async signInGuest(): Promise<CloudUser> {
    if (!(await this.ensureInit()) || !this.auth || !this.authMod) {
      throw new Error('cloud_not_configured')
    }
    const cred = await this.authMod.signInAnonymously(this.auth)
    const u = cred.user
    return {
      uid: u.uid,
      displayName: 'Guest',
      photoURL: null,
      isAnonymous: true,
    }
  }

  async signOut(): Promise<void> {
    if (!this.auth || !this.authMod) return
    await this.authMod.signOut(this.auth)
  }

  async saveProgress(modeLevels: CloudModeLevels): Promise<void> {
    if (!(await this.ensureInit()) || !this.db || !this.fsMod || !this.user) return
    await this.fsMod.setDoc(
      this.fsMod.doc(this.db, 'users', this.user.uid),
      {
        displayName: this.user.displayName,
        modeLevels,
        updatedAt: Date.now(),
      },
      { merge: true },
    )
  }

  async loadProgress(): Promise<CloudModeLevels | null> {
    if (!(await this.ensureInit()) || !this.db || !this.fsMod || !this.user) return null
    const snap = await this.fsMod.getDoc(this.fsMod.doc(this.db, 'users', this.user.uid))
    if (!snap.exists()) return null
    const data = snap.data() as { modeLevels?: CloudModeLevels }
    return data.modeLevels ?? null
  }

  /**
   * Upsert one standing per user. Ranked by totalScore (sum of level bests).
   * Doc id = uid so each player appears once.
   */
  async submitStanding(entry: {
    totalScore: number
    level: number
    maxCombo: number
  }): Promise<void> {
    if (!(await this.ensureInit()) || !this.db || !this.fsMod || !this.user) return
    if (entry.totalScore <= 0) return
    const ref = this.fsMod.doc(this.db, 'leaderboard', this.user.uid)
    const prev = await this.fsMod.getDoc(ref)
    const prevScore = prev.exists() ? Number(prev.data()?.score ?? 0) : 0
    // Keep best total; still refresh name / level if tied or higher
    if (entry.totalScore < prevScore) return
    await this.fsMod.setDoc(
      ref,
      {
        uid: this.user.uid,
        name: this.user.displayName,
        score: entry.totalScore,
        maxCombo: entry.maxCombo,
        modeId: 'classic',
        level: entry.level,
        date: new Date().toISOString().slice(0, 10),
        updatedAt: Date.now(),
      },
      { merge: true },
    )
  }

  /** @deprecated use submitStanding */
  async submitScore(entry: {
    score: number
    maxCombo: number
    modeId: GameModeId
    level: number
  }): Promise<void> {
    await this.submitStanding({
      totalScore: entry.score,
      level: entry.level,
      maxCombo: entry.maxCombo,
    })
  }

  async fetchLeaderboard(max = 20): Promise<CloudLeaderboardEntry[]> {
    if (!(await this.ensureInit()) || !this.db || !this.fsMod) return []
    const q = this.fsMod.query(
      this.fsMod.collection(this.db, 'leaderboard'),
      this.fsMod.orderBy('score', 'desc'),
      this.fsMod.limit(max),
    )
    const snap = await this.fsMod.getDocs(q)
    // One row per uid (prefer highest score if legacy duplicates exist)
    const byUid = new Map<string, CloudLeaderboardEntry>()
    for (const d of snap.docs) {
      const v = d.data()
      const uid = String(v.uid ?? d.id)
      const row: CloudLeaderboardEntry = {
        id: d.id,
        uid,
        name: String(v.name ?? 'Player'),
        score: Number(v.score ?? 0),
        maxCombo: Number(v.maxCombo ?? 0),
        modeId: (v.modeId as GameModeId) || ('classic' as GameModeId),
        level: Number(v.level ?? 1),
        date: String(v.date ?? ''),
      }
      const prev = byUid.get(uid)
      if (!prev || row.score > prev.score) byUid.set(uid, row)
    }
    return [...byUid.values()]
      .sort((a, b) => b.score - a.score || b.level - a.level)
      .slice(0, max)
  }
}

/** Merge cloud + local level progress (keep best of both). */
export function mergeModeLevels(
  local: CloudModeLevels,
  cloud: CloudModeLevels | null,
): CloudModeLevels {
  if (!cloud) return local
  const modes = new Set([...Object.keys(local), ...Object.keys(cloud)])
  const out: CloudModeLevels = {}
  for (const modeId of modes) {
    const id = modeId as GameModeId
    const a = local[id]
    const b = cloud[id]
    if (!a && !b) continue
    if (!a) {
      out[id] = b!
      continue
    }
    if (!b) {
      out[id] = a
      continue
    }
    const cleared = [...new Set([...(a.cleared ?? []), ...(b.cleared ?? [])])].sort(
      (x, y) => x - y,
    )
    const unlocked = Math.max(a.unlocked || 1, b.unlocked || 1, ...cleared.map((c) => c + 1), 1)
    const bests: Record<number, number> = { ...a.bests }
    for (const [k, v] of Object.entries(b.bests ?? {})) {
      const n = Number(k)
      bests[n] = Math.max(bests[n] ?? 0, v)
    }
    out[id] = {
      unlocked: Math.min(LEVEL_COUNT, unlocked),
      cleared,
      bests,
    }
  }
  return out
}
