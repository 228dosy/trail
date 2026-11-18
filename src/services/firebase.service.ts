import {
  get,
  onValue,
  push,
  ref,
  remove,
  set,
  update,
  type DataSnapshot,
  type Unsubscribe,
} from 'firebase/database';
import { db } from '../config/firebase.config';

const activeUnsubs: Unsubscribe[] = [];
let activeTimers: number[] = [];

export function watchPath(
  path: string,
  onData: (snapshot: DataSnapshot) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const unsub = onValue(ref(db, path), onData, (err) => {
    console.error(`[Firebase Watch Error] ${path}`, err);
    if (onError) onError(err);
  });
  activeUnsubs.push(unsub);
  return unsub;
}

export function registerTimer(timerId: number): void {
  activeTimers.push(timerId);
}

export function stopAllListeners(): void {
  while (activeUnsubs.length) {
    const unsub = activeUnsubs.pop();
    if (unsub) {
      try {
        unsub();
      } catch {
        // Ignore already-detached listeners
      }
    }
  }
  activeTimers.forEach((id) => window.clearInterval(id));
  activeTimers = [];
}

export async function readOnce(path: string): Promise<DataSnapshot> {
  return get(ref(db, path));
}

export async function writePath(path: string, value: unknown): Promise<void> {
  await set(ref(db, path), value);
}

export async function removePath(path: string): Promise<void> {
  await remove(ref(db, path));
}

export async function multiUpdate(updates: Record<string, unknown>): Promise<void> {
  await update(ref(db), updates);
}

export function pushKey(path: string): string {
  const key = push(ref(db, path)).key;
  if (!key) throw new Error('Could not generate Firebase match key.');
  return key;
}
