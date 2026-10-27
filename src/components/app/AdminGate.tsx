// Porta d'entrada de la zona d'organitzadora: només es veu el contingut si s'ha iniciat sessió.
// Els convidats no passen mai per aquí.
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  browserSessionPersistence,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getClientAuth, getClientDb } from "@/lib/firebase-client";
import { authErrorMessage } from "@/lib/auth-errors";
import { Action, Logo } from "./primitives";

const fieldClass = "min-h-14 w-full rounded-2xl border-2 border-input bg-card px-4 text-lg outline-none focus:border-primary";

// Crea l'espai de treball de l'organitzadora la primera vegada que entra (1 lectura per sessió).
async function ensureWorkspace(uid: string) {
  const ref = doc(getClientDb(), "workspaces", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { ownerUid: uid, plan: "free", createdAt: serverTimestamp() });
  }
}

function Screen({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 flex justify-center"><Logo /></div>
      {children}
    </main>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const auth = getClientAuth();
      // La sessió es tanca quan es tanca el navegador (més segur en ordinadors compartits).
      await setPersistence(auth, browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setError(authErrorMessage((err as { code?: string }).code));
      setBusy(false);
    }
  }

  async function resetPassword() {
    setError("");
    setInfo("");
    if (!email.trim()) {
      setError("Escriu primer el teu correu a dalt i torna a prémer aquest botó.");
      return;
    }
    try {
      await sendPasswordResetEmail(getClientAuth(), email.trim());
    } catch {
      // No diem si el correu existeix o no.
    }
    setInfo("Si aquest correu té un compte, t'hem enviat un missatge per canviar la contrasenya.");
  }

  return (
    <Screen>
      <h1 className="text-center text-3xl font-semibold">Entra com a organitzadora</h1>
      <form onSubmit={submit} className="mt-8 space-y-5">
        <div>
          <label htmlFor="correu" className="mb-2 block text-lg font-semibold">Correu</label>
          <input id="correu" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="contrasenya" className="mb-2 block text-lg font-semibold">Contrasenya</label>
          <input id="contrasenya" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={fieldClass} />
        </div>
        {error && <p role="alert" className="rounded-2xl bg-warning-soft p-4 text-warning">{error}</p>}
        {info && <p role="status" className="rounded-2xl bg-success-soft p-4 text-success">{info}</p>}
        <Action type="submit" block disabled={busy}>{busy ? "Entrant…" : "Entrar"}</Action>
        <button type="button" onClick={resetPassword} className="block w-full py-2 text-center font-semibold text-primary underline">
          He oblidat la contrasenya
        </button>
      </form>
    </Screen>
  );
}

export function AdminGate({ children }: { children: ReactNode }) {
  // undefined = encara no se sap; null = no hi ha sessió.
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [workspaceError, setWorkspaceError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => onAuthStateChanged(getClientAuth(), setUser), []);

  useEffect(() => {
    if (!user) {
      setWorkspaceReady(false);
      return;
    }
    setWorkspaceError(false);
    ensureWorkspace(user.uid)
      .then(() => setWorkspaceReady(true))
      .catch(() => setWorkspaceError(true));
  }, [user, attempt]);

  if (user === undefined) {
    return <Screen><p className="text-center text-lg text-muted-foreground">Un moment…</p></Screen>;
  }
  if (user === null) return <LoginForm />;

  if (workspaceError) {
    return (
      <Screen>
        <p role="alert" className="rounded-2xl bg-warning-soft p-4 text-warning">No s'ha pogut preparar el teu espai. Comprova la connexió i torna-ho a provar.</p>
        <div className="mt-5 space-y-3">
          <Action block onClick={() => setAttempt((n) => n + 1)}>Tornar-ho a provar</Action>
          <Action block variant="outline" onClick={() => signOut(getClientAuth())}>Tanca la sessió</Action>
        </div>
      </Screen>
    );
  }
  if (!workspaceReady) {
    return <Screen><p className="text-center text-lg text-muted-foreground">Preparant el teu espai…</p></Screen>;
  }

  return (
    <>
      <div className="no-print flex items-center justify-between gap-3 bg-secondary px-5 py-2 text-sm">
        <span className="truncate">Sessió iniciada: {user.email}</span>
        <button onClick={() => signOut(getClientAuth())} className="shrink-0 font-semibold underline">Tanca la sessió</button>
      </div>
      {children}
    </>
  );
}
