// Identificador (User UID de Firebase Authentication) de la superadministradora de l'app.
// No és cap secret: les regles de Firebase són les que realment decideixen qui hi pot entrar.
export const SUPERADMIN_UID: string = "";

export const isSuperAdmin = (uid: string | undefined | null) => !!uid && uid === SUPERADMIN_UID;
