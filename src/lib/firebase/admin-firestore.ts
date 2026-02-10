import { getAdminDb } from './admin';
import { FieldValue } from 'firebase-admin/firestore';

// ─── Server-side Firestore helpers (Admin SDK) ───

export async function adminGetDoc<T>(
    collectionName: string,
    docId: string
): Promise<T | null> {
    const snap = await getAdminDb().collection(collectionName).doc(docId).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() } as T;
}

export async function adminSetDoc(
    collectionName: string,
    docId: string,
    data: Record<string, unknown>
): Promise<void> {
    await getAdminDb().collection(collectionName).doc(docId).set(data);
}

export async function adminUpdateDoc(
    collectionName: string,
    docId: string,
    data: Record<string, unknown>
): Promise<void> {
    await getAdminDb().collection(collectionName).doc(docId).update(data);
}

export async function adminDeleteDoc(
    collectionName: string,
    docId: string
): Promise<void> {
    await getAdminDb().collection(collectionName).doc(docId).delete();
}

export async function adminCreateDoc(
    collectionName: string,
    data: Record<string, unknown>
): Promise<string> {
    const ref = await getAdminDb().collection(collectionName).add(data);
    return ref.id;
}

export async function adminQuery<T>(
    collectionName: string,
    buildQuery?: (
        ref: FirebaseFirestore.CollectionReference
    ) => FirebaseFirestore.Query
): Promise<T[]> {
    const ref = getAdminDb().collection(collectionName);
    const q = buildQuery ? buildQuery(ref) : ref;
    const snap = await q.get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
}

export function serverTimestamp() {
    return FieldValue.serverTimestamp();
}

export async function adminIncrement(
    collectionName: string,
    docId: string,
    field: string,
    amount: number
): Promise<void> {
    await getAdminDb()
        .collection(collectionName)
        .doc(docId)
        .set({ [field]: FieldValue.increment(amount) }, { merge: true });
}
