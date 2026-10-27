// Connexió del NAVEGADOR amb Firebase (només per a la zona d'organitzadora).
// Es crea només quan es necessita, i mai durant el renderitzat al servidor.
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { firebaseConfig } from "@/lib/firebase-config";

function getFirebaseApp() {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export const getClientAuth = () => getAuth(getFirebaseApp());
export const getClientDb = () => getFirestore(getFirebaseApp());
