// Connexió del SERVIDOR amb Firebase (Admin SDK). Mai s'importa des del navegador.
// Les credencials venen de variables d'entorn de Netlify; no s'escriuen mai al codi.
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Netlify pot desar els salts de línia de la clau com a "\n" literals: els restaurem.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Falten variables d'entorn de Firebase al servidor.");
  }
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

export function getDb() {
  return getFirestore(getAdminApp());
}
