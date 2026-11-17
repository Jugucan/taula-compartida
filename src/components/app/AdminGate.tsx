// Porta d'entrada de la zona d'organitzadora: només es veu el contingut si s'ha iniciat sessió.
// Els convidats no passen mai per aquí.
import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  browserSessionPersistence,
  createUserWithEmailAndPassword,
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
import { createMyRequest, hasMyRequest, requestsOpen } from "@/lib/access";
import { isSuperAdmin } from "@/lib/access-config";
import { Action, Logo } from "./primitives";

// Identificador de l'organitzadora; el fan servir les pantalles de dins de la zona protegida.
const AdminUidContext = createContext<string>("");
export const useAdminUid = () => useContext(AdminUidContext);

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
  const [signup, setSignup] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => { void requestsOpen().then(setOpen); }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (signup && password.length < 8) { setError("La contrasenya ha de tenir almenys 8 caràcters."); return; }
    setBusy(true);
    try {
      const auth = getClientAuth();
      // La sessió es tanca quan es tanca el navegador (més segur en ordinadors compartits).
      await setPersistence(auth, browserSessionPersistence);
      if (signup) await createUserWithEmailAndPassword(auth, email.trim(), password);
      else await signInWithEmailAndPassword(auth, email.trim(), password);
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
      <h1 className="text-center text-3xl font-semibold">{signup ? "Demana accés com a organitzador" : "Entra com a organitzador"}</h1>
      {signup && <p className="mt-3 text-center text-lg text-muted-foreground">Crea un compte i demana accés. Podràs entrar quan s'aprovi.</p>}
      <form onSubmit={submit} className="mt-8 space-y-5">
        <div>
          <label htmlFor="correu" className="mb-2 block text-lg font-semibold">Correu</label>
          <input id="correu" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label htmlFor="contrasenya" className="mb-2 block text-lg font-semibold">Contrasenya{signup && <span className="font-normal text-muted-foreground"> (mínim 8 caràcters)</span>}</label>
          <input id="contrasenya" type="password" autoComplete={signup ? "new-password" : "current-password"} required value={password} onChange={(e) => setPassword(e.target.value)} className={fieldClass} />
        </div>
        {error && <p role="alert" className="rounded-2xl bg-warning-soft p-4 text-warning">{error}</p>}
        {info && <p role="status" className="rounded-2xl bg-success-soft p-4 text-success">{info}</p>}
        <Action type="submit" block disabled={busy}>{busy ? (signup ? "Creant el compte…" : "Entrant…") : signup ? "Crear el compte" : "Entrar"}</Action>
        {!signup && (
          <button type="button" onClick={resetPassword} className="block w-full py-2 text-center font-semibold text-primary underline">
            He oblidat la contrasenya
          </button>
        )}
        {(open || signup) && (
          <button type="button" onClick={() => { setSignup(!signup); setError(""); setInfo(""); }} className="block w-full py-2 text-center font-semibold underline">
            {signup ? "Ja tinc un compte: vull entrar" : "No tinc compte: vull demanar accés"}
          </button>
        )}
      </form>
    </Screen>
  );
}

/** Un compte amb sessió però sense permís: pot demanar accés (si s'accepten sol·licituds) i esperar l'aprovació. */
function NoAccess({ user }: { user: User }) {
  const [state, setState] = useState<"loading" | "pending" | "open" | "closed" | "sending" | "error">("loading");

  useEffect(() => {
    let alive = true;
    void (async () => {
      if (await hasMyRequest(user.uid)) { if (alive) setState("pending"); return; }
      const open = await requestsOpen();
      if (alive) setState(open ? "open" : "closed");
    })();
    return () => { alive = false; };
  }, [user.uid]);

  async function ask() {
    setState("sending");
    try {
      await createMyRequest(user.uid, user.email ?? "");
      setState("pending");
    } catch {
      setState("error");
    }
  }

  return (
    <Screen>
      {state === "loading" && <p className="text-center text-lg text-muted-foreground">Un moment…</p>}
      {state === "pending" && (
        <p role="status" className="rounded-2xl bg-success-soft p-5 text-lg font-semibold text-success">Sol·licitud enviada. Quan s'aprovi, podràs entrar amb aquest mateix compte. Torna-ho a provar més endavant.</p>
      )}
      {(state === "open" || state === "sending" || state === "error") && (
        <>
          <p className="rounded-2xl bg-warning-soft p-5 text-lg font-semibold text-warning">Aquest compte encara no té accés a la zona d'organitzador.</p>
          {state === "error" && <p role="alert" className="mt-4 rounded-2xl bg-destructive-soft p-4 font-semibold text-destructive">No s'ha pogut enviar la sol·licitud. Torna-ho a provar.</p>}
          <div className="mt-5"><Action block onClick={ask} disabled={state === "sending"}>{state === "sending" ? "Enviant…" : "Demanar accés"}</Action></div>
        </>
      )}
      {state === "closed" && (
        <p role="alert" className="rounded-2xl bg-warning-soft p-5 text-lg font-semibold text-warning">Aquest compte no té permís per entrar a la zona d'organitzador, i ara mateix no s'accepten noves sol·licituds.</p>
      )}
      <div className="mt-6"><Action block variant="outline" onClick={() => signOut(getClientAuth())}>Tanca la sessió</Action></div>
    </Screen>
  );
}

export function AdminGate({ children }: { children: ReactNode }) {
  // undefined = encara no se sap; null = no hi ha sessió.
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [workspaceError, setWorkspaceError] = useState(false);
  const [noAccess, setNoAccess] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => onAuthStateChanged(getClientAuth(), setUser), []);

  useEffect(() => {
    if (!user) {
      setWorkspaceReady(false);
      return;
    }
    setWorkspaceError(false);
    setNoAccess(false);
    ensureWorkspace(user.uid)
      .then(() => setWorkspaceReady(true))
      .catch((e: { code?: string }) => (e?.code === "permission-denied" ? setNoAccess(true) : setWorkspaceError(true)));
  }, [user, attempt]);

  if (user === undefined) {
    return <Screen><p className="text-center text-lg text-muted-foreground">Un moment…</p></Screen>;
  }
  if (user === null) return <LoginForm />;

  if (noAccess) return <NoAccess user={user} />;
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
        <span className="flex shrink-0 items-center gap-4">
          {isSuperAdmin(user.uid) && <Link to="/admin/organitzadors" className="font-semibold underline">Organitzadors</Link>}
          <button onClick={() => signOut(getClientAuth())} className="font-semibold underline">Tanca la sessió</button>
        </span>
      </div>
      <AdminUidContext.Provider value={user.uid}>{children}</AdminUidContext.Provider>
    </>
  );
}
