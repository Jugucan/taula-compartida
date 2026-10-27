// Missatges d'error d'inici de sessió, en català planer.
export function authErrorMessage(code: unknown): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "El correu o la contrasenya no són correctes. Torna-ho a provar.";
    case "auth/invalid-email":
      return "Aquest correu no sembla correcte. Revisa'l.";
    case "auth/too-many-requests":
      return "Has fet massa intents. Espera uns minuts i torna-ho a provar.";
    case "auth/network-request-failed":
      return "No hi ha connexió a Internet. Comprova-ho i torna-ho a provar.";
    case "auth/missing-password":
      return "Escriu la contrasenya.";
    default:
      return "No s'ha pogut entrar. Torna-ho a provar d'aquí una estona.";
  }
}
