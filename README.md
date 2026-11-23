# Taula Compartida

Aplicació web per organitzar trobades al voltant d'un restaurant: l'organitzador carrega la carta (des d'un enllaç, un PDF, un Excel
o text), comparteix un enllaç amb els convidats, cada convidat tria els seus plats **sense crear cap compte**, i l'organitzador obté el
resum per enviar al restaurant (impressió/PDF o CSV). L'app **no envia comandes al restaurant ni fa cap cobrament**.

## Com està fet

| Peça | Tecnologia |
|---|---|
| Aplicació | React 19 + TypeScript, [TanStack Start](https://tanstack.com/start) (rutes per fitxer), Tailwind 4 |
| Base de dades i comptes | Firebase: Cloud Firestore + Authentication (correu i contrasenya) |
| Servidor | Funcions de servidor de TanStack Start, que Netlify executa com a funcions (`nitro: { preset: "netlify" }`) |
| Publicació | Netlify, connectat a aquest repositori de GitHub (cada *commit* a `main` publica l'app) |
| Gestor de paquets | `bun` |

### Carpetes importants (`src/`)

- `routes/` — les pantalles. `admin.*` són de l'organitzador; `t.$code.*` són dels convidats (l'enllaç és `/t/<codi>`).
- `components/app/` — peces visuals pròpies (`AdminGate` = porta d'entrada de l'organitzador, `RestaurantForm`, `EventForm`…).
- `lib/` — la lògica: preus en cèntims (`money.ts`, `order-pricing.ts`), estat i termini de les trobades (`event-time.ts`, `events.ts`),
  resum i CSV (`order-summary.ts`), lectura de cartes (`menu-import.ts`, `menu-file.ts`, `menu-pdf.ts`), gestió d'accés (`access*.ts`).
- `server/` — codi que **només** s'executa al servidor (accés de Firebase amb credencials d'administrador, descàrrega segura de pàgines,
  comandes dels convidats). Mai s'importa des del navegador.
- `test/` — proves automàtiques.
- `firestore.rules` — **les regles de seguretat de la base de dades** (veure més avall).

## Com funciona (resum)

**Organitzador.** Entra a `/admin` amb correu i contrasenya. Crea restaurants (carta amb preus), crea trobades (que guarden una
**còpia de la carta i dels preus** del moment), obre i tanca les comandes, i consulta *Comandes* i *Resum*. Una trobada oberta es
**tanca sola** quan acaba el dia límit (hora de Catalunya); es pot tornar a obrir en qualsevol moment i es pot copiar per repetir-la.

**Convidat.** Obre l'enllaç, tria plats i quantitats, a «Revisar» escriu opcionalment una nota per plat (salsa, punt de cocció…),
posa el seu nom i envia. Pot tornar a editar la comanda amb el seu **enllaç personal** mentre estigui oberta.

**Preus.** Sempre en **cèntims enters**. El navegador només diu «quin plat i quantes unitats»; els preus i els totals els calcula
**el servidor** a partir de la carta guardada. Una comanda confirmada conserva els preus que tenia, encara que la carta canviï.

**Comandes sense duplicats.** Cada comanda té un identificador i un codi secret generats pel navegador; repetir l'enviament
(doble clic, error de xarxa, refrescar) actualitza la mateixa comanda i no en crea una de nova. Només es guarda un resum (hash) del
codi secret.

## Seguretat

- **Les regles de Firestore** (`firestore.rules`) decideixen qui pot llegir i escriure. Els convidats **no** accedeixen mai a Firestore:
  tot passa per funcions de servidor que validen les dades.
- **Superadministradora:** el seu *User UID* és a `firestore.rules` i a `src/lib/access-config.ts`. Només ella aprova, rebutja o suspèn
  organitzadors (pàgina **Organitzadors**) i obre o tanca les sol·licituds.
- **Organitzadors:** cadascun només pot treballar al **seu** espai (`workspaces/<seu uid>`), i només si està aprovat i actiu.
- **Lectura de cartes des d'un enllaç:** només per a comptes admesos; el servidor bloqueja adreces locals, privades i de metadades
  del núvol (també en cada redirecció), i limita temps, mida i redireccions.
- **Secrets:** les credencials de servidor són només a Netlify (variables d'entorn). La configuració web de Firebase
  (`src/lib/firebase-config.ts`) **no** és secreta.
- **Capçaleres de seguretat** bàsiques a `netlify.toml`.

### Què s'ha provat i què no

Les proves automàtiques (`bun run test`) cobreixen el càlcul de preus, la validació de comandes, la lògica del servidor dels
convidats (amb una base de dades simulada), la protecció de les adreces de la lectura de cartes, la comprovació del «passi» de sessió
i la lectura de cartes. **Les regles de Firestore no es poden executar automàticament** en aquest entorn; es van validar a mà amb comptes
reals (un compte sense permís no pot entrar ni crear dades; un compte aprovat sí; un compte suspès no). Si canvies les regles, **repeteix
aquesta prova**.

## Posar-ho en marxa des de zero

1. **Firebase** ([console.firebase.google.com](https://console.firebase.google.com)): crea un projecte (pla **Spark**, sense facturació; sense Analytics).
   Activa **Firestore** (mode producció, ubicació d'Europa) i **Authentication → Email/Password**.
2. Registra una **app web** i copia la seva configuració (no secreta) a `src/lib/firebase-config.ts`.
3. Crea el teu usuari a **Authentication → Users** i copia'n el **User UID** a `firestore.rules` (funció `isSuperAdmin`) i a
   `src/lib/access-config.ts` (`SUPERADMIN_UID`).
4. Publica el contingut de `firestore.rules` a **Firestore Database → Rules**.
5. A **Project settings → Service accounts**, genera una clau privada i posa'n tres valors a **Netlify** com a variables d'entorn
   (veure `.env.example`): `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`. **Esborra el fitxer descarregat.**
6. **Netlify**: importa el repositori de GitHub. L'ordre de construcció és a `netlify.toml`.
7. No cal cap índex compost de Firestore: totes les consultes són d'un sol camp.

## Fer canvis

Les modificacions es fan editant fitxers a GitHub. **Cada *commit* a `main` fa un desplegament nou.** Si has de fer molts canvis
seguits, a Netlify pots aturar-ne les construccions (*Build & deploy → Continuous deployment → Build status → Stop builds*) i
tornar-les a activar al final, perquè se'n faci un de sol. Abans de pujar canvis grans, els tests i la compilació
(`bun run test`, `bun run build`) tenen la darrera paraula.

Comandes útils (amb `bun` instal·lat): `bun install`, `bun run dev` (servidor local), `bun run build`, `bun run test`.

## Consum de Firebase (Spark: 50.000 lectures i 20.000 escriptures al dia, 1 GiB)

| Acció | Lectures | Escriptures |
|---|---|---|
| Entrar a l'organitzador (una vegada per sessió) | 1 (+ fins a 10 si es veu l'inici) | 0–1 (només el primer cop) |
| Veure l'inici (les 10 trobades recents; es reaprofita 2 min) | fins a 10 | 0 |
| Llista de restaurants (es reaprofita 5 min) | 1 per restaurant | 0 |
| Obrir una trobada des de la llista | 0 | 0 |
| Crear / copiar una trobada | 0 | 2 (trobada + enllaç) |
| Modificar trobada, canviar-ne l'estat, desar un restaurant | 0 | 1 |
| Convidat: veure la carta (es reaprofita 60 s) | 2 | 0 |
| Convidat: enviar o canviar la comanda | 3 | 2 |
| Convidat: recuperar la seva comanda amb l'enllaç personal | 2 | 0 |
| Comandes / Resum (es reaprofita 30 s; botó «Actualitzar») | 1 per comanda (màx. 300) | 0 |
| Exportar CSV, imprimir | 0 (usa el que ja és carregat) | 0 |
| Llegir una carta des d'enllaç | 1 | 0 |
| Pujar PDF / Excel / enganxar text | 0 (es fa al navegador) | 0 |

Els organitzadors que no són la superadministradora fan **1 lectura addicional** per consulta (comprovació d'aprovació a les regles).
No hi ha connexions en temps real (cap `onSnapshot`): el consum només creix quan algú fa una acció.

## Costos i límits a vigilar

- **Firebase Spark** no pot generar factures: si s'esgota una quota, el servei deixa de respondre fins que es renova. **No passis a
  Blaze** sense decidir-ho expressament.
- **Netlify:** el pla actual compta minuts de compilació (revisa'l a *Usage*). Les funcions del servidor també tenen límit d'ús.
- No s'utilitza cap servei d'IA ni de reconeixement de text: la lectura de cartes és local o amb regles pròpies.

## Limitacions conegudes

- **Sense avisos per correu:** ni a l'organitzadora quan arriba una sol·licitud, ni al nou organitzador quan s'aprova.
- **Sol·licituds obertes:** qualsevol persona pot crear-se un compte (només identitat, sense dades) i enviar una sol·licitud; algú
  mal intencionat podria omplir la llista. Per defecte estan **tancades**. Una verificació anti-robots es pot afegir més endavant.
- **Sense límit per adreça IP** a les peticions dels convidats; només hi ha un límit de **300 comandes per trobada** i límits de mida.
- **Plans i pagaments:** la base està preparada (comptes aprovats, estat, camp `plan`), però no hi ha subscripcions ni límits d'ús per pla.
- **Opcions múltiples per plat:** els convidats escriuen una nota lliure a cada plat; no hi ha desplegables.
- **PDF escanejats (fotos) i Excel antics (.xls)** no es poden llegir. Les cartes a dues columnes poden barrejar línies (el text es pot
  corregir abans de llegir-lo).
- **Càrrega des d'enllaç:** algunes webs no es poden llegir (per exemple, les que carreguen la carta amb JavaScript); aleshores es pot
  enganxar el text.
- Els convidats que perdin el seu enllaç personal no poden recuperar la comanda (només l'organitzadora la veu).
- `@lovable.dev/vite-tanstack-config` (a `vite.config.ts`) és un residu de l'eina amb què es va crear el disseny; encara fa de base de la
  configuració de construcció. Substituir-lo és possible però cal fer-ho amb cura.

## Si alguna cosa falla en producció

1. **Mira el registre de la construcció** a Netlify (*Deploys* → l'últim desplegament). Copia'n les últimes 30 línies.
2. **Els convidats no veuen la carta:** comprova que les variables d'entorn de Netlify són totes tres i completes, i que les
   funcions no fallen. Un cas real: una llibreria que es carregava a l'arrencada i que Netlify (Node 24) no suportava va trencar
   la càrrega; per això la comprovació del «passi» d'inici de sessió fa servir la llibreria `jose` directament
   (`src/server/firebase-token.server.ts`) i no `firebase-admin/auth`.
3. **Un canvi no es veu:** recarrega sense memòria cau (Ctrl+F5). Els convidats poden veure la carta guardada fins a 60 segons.
4. **Has trencat les regles de Firestore i no pots entrar:** enganxa a *Rules* la versió anterior de `firestore.rules` (l'historial de
   GitHub la guarda) i publica.
