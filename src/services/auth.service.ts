import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateEmail,
  updatePassword,
  type User,
} from 'firebase/auth';
import {
  auth,
  createSecondaryAuthApp,
  destroySecondaryApp,
} from '../config/firebase.config';
import type { HelperRecord, UserRole } from '../types/varchas';
import { emailForId, randomId, randomPassword, randomToken } from '../utils/format';
import { multiUpdate, readOnce, removePath, writePath } from './firebase.service';

export interface ResolvedSession {
  role: UserRole;
  helper: HelperRecord | null;
  adminUid: string;
}

export async function resolveUserRole(user: User): Promise<ResolvedSession> {
  const snap = await readOnce('pcr/system/adminUid');
  if (!snap.exists() || !snap.val()) {
    throw new Error('Admin account not configured. Follow README.md first-time setup.');
  }
  const adminUid = String(snap.val());
  if (user.uid === adminUid) {
    return { role: 'admin', helper: null, adminUid };
  }
  const helperSnap = await readOnce(`pcr/helpers/${user.uid}`);
  const helper = helperSnap.val() as HelperRecord | null;
  if (!helper || helper.revoked || Number(helper.expiresAt) <= Date.now()) {
    throw new Error('This temporary ID has expired or was revoked.');
  }
  return { role: 'helper', helper, adminUid };
}

export async function signInOperator(idOrEmail: string, password: string): Promise<void> {
  const trimmed = idOrEmail.trim();
  if (!trimmed || !password) {
    throw new Error('Enter your ID and password.');
  }
  await signInWithEmailAndPassword(auth, emailForId(trimmed), password);
}

export async function signOutOperator(): Promise<void> {
  await signOut(auth);
}

export function subscribeAuthState(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb);
}

export async function changeAdminEmailAddress(
  user: User,
  old1: string,
  old2: string,
  new1: string,
  new2: string,
  password: string,
): Promise<void> {
  if (old1 !== old2 || old1 !== user.email || new1 !== new2 || !new1) {
    throw new Error('Check the old ID twice and confirm both new ID entries match.');
  }
  if (!user.email) throw new Error('Current admin email is unavailable.');
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
  await updateEmail(user, new1);
}

export async function changeAdminPasswordValue(
  user: User,
  old1: string,
  old2: string,
  new1: string,
  new2: string,
): Promise<void> {
  if (old1 !== old2 || !new1 || new1 !== new2 || new1.length < 6) {
    throw new Error('Enter the old password twice and matching new passwords (6+ characters).');
  }
  if (!user.email) throw new Error('Current admin email is unavailable.');
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, old1));
  await updatePassword(user, new1);
}

export interface CreatedHelperResult {
  uid: string;
  id: string;
  password: string;
  maxMatches: number;
  expiresAt: number;
}

export async function createTemporaryHelper(
  days: number,
  hours: number,
  maxMatches: number,
): Promise<CreatedHelperResult> {
  const duration = (days * 24 + hours) * 3600000;
  if (!duration) {
    throw new Error('Choose at least one hour.');
  }
  const id = randomId();
  const password = randomPassword();
  const token = randomToken();
  const expiresAt = Date.now() + duration;

  const { secondaryApp, secondaryAuth } = createSecondaryAuthApp();
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, emailForId(id), password);
    const uid = cred.user.uid;
    const record: HelperRecord = {
      id,
      expiresAt,
      revoked: false,
      matchUsed: false,
      matchId: null,
      matchesCreated: 0,
      maxMatches,
      overlayToken: token,
      createdAt: Date.now(),
    };
    await writePath(`pcr/helpers/${uid}`, record);
    await signOut(secondaryAuth);
    return { uid, id, password, maxMatches, expiresAt };
  } finally {
    await destroySecondaryApp(secondaryApp);
  }
}

export async function revokeHelperAccount(uid: string): Promise<void> {
  await multiUpdate({
    [`pcr/helpers/${uid}/revoked`]: true,
    [`pcr/helpers/${uid}/expiresAt`]: 0,
  });
}

export async function revokeAllHelperAccounts(helpers: Record<string, HelperRecord>): Promise<number> {
  const updates: Record<string, unknown> = {};
  Object.keys(helpers || {}).forEach((uid) => {
    updates[`pcr/helpers/${uid}/revoked`] = true;
    updates[`pcr/helpers/${uid}/expiresAt`] = 0;
  });
  const count = Object.keys(helpers || {}).length;
  if (count > 0) {
    await multiUpdate(updates);
  }
  return count;
}

export async function deleteRevokedHelperRecord(uid: string): Promise<void> {
  await removePath(`pcr/helpers/${uid}`);
}

export async function deleteAllRevokedHelperRecords(
  helpers: Record<string, HelperRecord>,
): Promise<number> {
  const revokedIds = Object.keys(helpers || {}).filter((uid) => helpers[uid]?.revoked);
  if (!revokedIds.length) return 0;
  const updates: Record<string, unknown> = {};
  revokedIds.forEach((uid) => {
    updates[`pcr/helpers/${uid}`] = null;
  });
  await multiUpdate(updates);
  return revokedIds.length;
}
