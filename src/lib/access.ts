// Gestió de qui pot ser organitzador. Només la superadministradora aprova, rebutja o suspèn (ho garanteixen les regles de Firebase).
// Model: organizers/{uid} = comptes admesos · organizerRequests/{uid} = sol·licituds pendents · config/access = interruptor de sol·licituds.
import { collection, doc, getCountFromServer, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { getClientDb } from "@/lib/firebase-client";

export type OrganizerStatus = "active" | "suspended" | "rejected";
export type OrganizerRequest = { uid: string; email: string; createdAt: Date | null };
export type Organizer = { uid: string; email: string; status: OrganizerStatus; createdAt: Date | null };

const toDate = (v: unknown) => ((v as { toDate?: () => Date } | undefined)?.toDate?.() ?? null);

/** Les sol·licituds estan obertes? (si no es pot llegir, es considera tancat) */
export async function requestsOpen(): Promise<boolean> {
  try {
    const snap = await getDoc(doc(getClientDb(), "config", "access"));
    return snap.exists() && snap.data()["requestsOpen"] === true;
  } catch {
    return false;
  }
}

export async function hasMyRequest(uid: string): Promise<boolean> {
  try {
    return (await getDoc(doc(getClientDb(), "organizerRequests", uid))).exists();
  } catch {
    return false;
  }
}

/** L'estat del meu compte com a organitzador (null si no n'hi ha cap registre). */
export async function getMyOrganizerStatus(uid: string): Promise<OrganizerStatus | null> {
  try {
    const snap = await getDoc(doc(getClientDb(), "organizers", uid));
    if (!snap.exists()) return null;
    const s = snap.data()["status"];
    return s === "suspended" ? "suspended" : s === "rejected" ? "rejected" : "active";
  } catch {
    return null;
  }
}

export async function createMyRequest(uid: string, email: string) {
  await setDoc(doc(getClientDb(), "organizerRequests", uid), { email, createdAt: serverTimestamp() });
}

// ----- Només superadministradora -----

export async function listRequests(): Promise<OrganizerRequest[]> {
  const snap = await getDocs(query(collection(getClientDb(), "organizerRequests"), orderBy("createdAt"), limit(100)));
  return snap.docs.map((d) => ({ uid: d.id, email: String(d.data()["email"] ?? ""), createdAt: toDate(d.data()["createdAt"]) }));
}

export async function listOrganizers(): Promise<Organizer[]> {
  const snap = await getDocs(query(collection(getClientDb(), "organizers"), orderBy("createdAt"), limit(200)));
  return snap.docs.map((d) => ({ uid: d.id, email: String(d.data()["email"] ?? ""), status: d.data()["status"] === "suspended" ? "suspended" : d.data()["status"] === "rejected" ? "rejected" : "active", createdAt: toDate(d.data()["createdAt"]) }));
}

/** Aprova una sol·licitud: crea l'organitzador i esborra la sol·licitud, en una sola operació. */
export async function approveRequest(req: { uid: string; email: string }) {
  const db = getClientDb();
  const batch = writeBatch(db);
  batch.set(doc(db, "organizers", req.uid), { email: req.email, status: "active", plan: "free", createdAt: serverTimestamp() });
  batch.delete(doc(db, "organizerRequests", req.uid));
  await batch.commit();
}

/** Rebutja una sol·licitud: queda anotat perquè la persona no la pugui tornar a enviar sola. Es pot aprovar més endavant. */
export async function rejectRequest(req: { uid: string; email: string }) {
  const db = getClientDb();
  const batch = writeBatch(db);
  batch.set(doc(db, "organizers", req.uid), { email: req.email, status: "rejected", plan: "free", createdAt: serverTimestamp() });
  batch.delete(doc(db, "organizerRequests", req.uid));
  await batch.commit();
}

/** Quantes sol·licituds hi ha pendents (una sola lectura). */
export async function countRequests(): Promise<number> {
  const snap = await getCountFromServer(collection(getClientDb(), "organizerRequests"));
  return snap.data().count;
}

export async function setOrganizerStatus(uid: string, status: "active" | "suspended") {
  await updateDoc(doc(getClientDb(), "organizers", uid), { status });
}

export async function setRequestsOpen(open: boolean) {
  await setDoc(doc(getClientDb(), "config", "access"), { requestsOpen: open });
}
