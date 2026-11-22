/**
 * Mock-авторизация для учебного прототипа.
 *
 * Никаких запросов во внешние системы: аккаунты живут в localStorage этого браузера.
 * Пароль не хранится — хранится соль и PBKDF2-SHA-256 хеш (Web Crypto, 120 000 итераций).
 * Это защищает от случайного подглядывания в DevTools, но не является настоящей
 * безопасностью: любой, у кого есть доступ к браузеру, может удалить или подменить данные.
 */

export const USERS_KEY = 'pomodoro.users.v1';
export const AUTH_KEY = 'pomodoro.auth.v1';

const PBKDF2_ITERATIONS = 120_000;
const FAKE_LATENCY_MS = 650;
const MAX_FAILED = 5;
const LOCK_MS = 30_000;

export type StoredUser = {
  id: string;
  name: string;
  email: string;
  salt: string;
  hash: string;
  createdAt: string;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

type UsersFile = { version: 1; users: StoredUser[] };
type AuthFile = { version: 1; userId: string; signedInAt: string };

export class AuthError extends Error {
  readonly field: 'email' | 'password' | 'name' | 'form';
  constructor(message: string, field: AuthError['field'] = 'form') {
    super(message);
    this.field = field;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readUsers(): StoredUser[] {
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !Array.isArray(parsed.users)) return [];
    return parsed.users.filter(
      (u): u is StoredUser =>
        isRecord(u) &&
        typeof u.id === 'string' &&
        typeof u.name === 'string' &&
        typeof u.email === 'string' &&
        typeof u.salt === 'string' &&
        typeof u.hash === 'string' &&
        typeof u.createdAt === 'string',
    );
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]) {
  const file: UsersFile = { version: 1, users };
  try {
    window.localStorage.setItem(USERS_KEY, JSON.stringify(file));
  } catch {
    throw new AuthError('Браузер не даёт сохранить данные (localStorage недоступен).');
  }
}

function toPublic(user: StoredUser): AuthUser {
  return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
}

function toHex(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(view, (b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(hex.length / 2));
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function hashPassword(password: string, saltHex: string): Promise<string> {
  if (!window.crypto?.subtle) {
    throw new AuthError('Нужен безопасный контекст: откройте приложение через localhost.');
  }
  const key = await window.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await window.crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: fromHex(saltHex), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  );
  return toHex(bits);
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

// Простая защита от перебора: 5 ошибок подряд — пауза 30 секунд (в памяти вкладки).
let failed = 0;
let lockedUntil = 0;

export function lockRemainingMs(): number {
  return Math.max(0, lockedUntil - Date.now());
}

export function getCurrentUser(): AuthUser | null {
  try {
    const raw = window.localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || typeof parsed.userId !== 'string') return null;
    const user = readUsers().find((u) => u.id === parsed.userId);
    return user ? toPublic(user) : null;
  } catch {
    return null;
  }
}

function startSession(user: StoredUser) {
  const file: AuthFile = { version: 1, userId: user.id, signedInAt: new Date().toISOString() };
  try {
    window.localStorage.setItem(AUTH_KEY, JSON.stringify(file));
  } catch {
    throw new AuthError('Браузер не даёт сохранить сессию (localStorage недоступен).');
  }
}

export async function register(input: { name: string; email: string; password: string }): Promise<AuthUser> {
  await wait(FAKE_LATENCY_MS);
  const email = normalizeEmail(input.email);
  const users = readUsers();
  if (users.some((u) => u.email === email)) {
    throw new AuthError('Аккаунт с таким email уже есть на этом устройстве. Попробуйте войти.', 'email');
  }
  const salt = toHex(window.crypto.getRandomValues(new Uint8Array(16)));
  const hash = await hashPassword(input.password, salt);
  const user: StoredUser = {
    id: `u_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    name: input.name.trim(),
    email,
    salt,
    hash,
    createdAt: new Date().toISOString(),
  };
  writeUsers([...users, user]);
  startSession(user);
  return toPublic(user);
}

export async function login(input: { email: string; password: string }): Promise<AuthUser> {
  const lock = lockRemainingMs();
  if (lock > 0) {
    throw new AuthError(`Слишком много попыток. Подождите ${Math.ceil(lock / 1000)} с.`);
  }
  await wait(FAKE_LATENCY_MS);
  const email = normalizeEmail(input.email);
  const user = readUsers().find((u) => u.email === email);
  const ok = user ? (await hashPassword(input.password, user.salt)) === user.hash : false;
  if (!user || !ok) {
    failed += 1;
    if (failed >= MAX_FAILED) {
      failed = 0;
      lockedUntil = Date.now() + LOCK_MS;
    }
    throw new AuthError('Неверный email или пароль.');
  }
  failed = 0;
  startSession(user);
  return toPublic(user);
}

export function logout() {
  try {
    window.localStorage.removeItem(AUTH_KEY);
  } catch {
    // ничего страшного: сессия и так пропадёт вместе с вкладкой
  }
}
