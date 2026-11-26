# TODO : Application mobile « Mes Plantes »

**Stack** : Vue 3 + TypeScript + Ionic (Capacitor) + SQLite + Firebase
**Type de projet** : application locale (développée et compilée sur ta machine, livrable = fichier APK)

## Fonctionnalités demandées par le TP

1. Login avec Firebase
2. Liste et fiche
3. Formulaire avec upload d'image
4. Notification et backend sur Firebase

**Livrable** : `app-debug.apk`

---

## Template d'initialisation

La **CLI Ionic** (équivalent de `php spark` / `artisan`) génère un projet prêt à l'emploi (Vue, TypeScript, Vite, router, Capacitor).

```bash
npm install -g @ionic/cli
ionic start plantes-app blank --type=vue
```

On choisit **`blank`**. Aucun template n'intègre Firebase ni SQLite : ce sont des plugins à ajouter. Aucun compte Ionic n'est nécessaire.

---

## Sommaire des règles

| Bloc | Contenu | Niveau |
|---|---|---|
| **Règles de notification** (R1 à R8) | fréquence, heure, relances, « J'ai arrosé », cas particuliers | obligatoire |
| **Règles métier** (M1 à M13) | synchronisation, dates, validation, image, tri, auth, etc. | M1 à M5, M9 à M13 obligatoires ; M6 à M8 recommandées ou bonus |

---

# PARTIE A : Règles de notification

## R1. Deux notions distinctes

| Notion | Exemple | Qui décide |
|---|---|---|
| **Fréquence** (quel jour) | tous les 3 ou 7 jours | propre à chaque plante (`frequenceArrosage`) |
| **Heure du rappel** (quelle heure ce jour-là) | 09:00 | réglage de l'utilisateur (défaut : `09:00`) |

```
prochainArrosage = dernierArrosage + frequenceArrosage jours   (dates calendaires, voir M2)
notification     = prochainArrosage à heureRappel
```

## R2. Constantes (modifiables dans `notification.service.ts`)

```ts
// src/services/notification.service.ts
export const HEURE_DEFAUT = '09:00';
export const NB_RELANCES = 2;         // relances après la principale (J+1, J+2)
export const MAX_RETARD_NOTIF = 7;    // jours ; au-delà, plus de notification
export const SNOOZE_HEURES = 3;       // délai de « Rappeler plus tard »
```

| Constante | Valeur | Rôle |
|---|---|---|
| `HEURE_DEFAUT` | `09:00` | heure du rappel si l'utilisateur n'a rien choisi |
| `NB_RELANCES` | `2` | nombre de relances |
| `MAX_RETARD_NOTIF` | `7` jours | au-delà, seulement le badge |
| `SNOOZE_HEURES` | `3` | délai du bouton « Rappeler plus tard » |

Seule l'heure du rappel est réglable par l'utilisateur (`SettingsPage.vue`). Les autres valeurs se changent dans le code (jamais de valeur écrite en dur ailleurs).

## R3. Cycle normal d'une plante

| Notification | Quand | Message |
|---|---|---|
| Principale | J à `heureRappel` | « Il est temps d'arroser *Ficus* » |
| Relance 1 | J+1 à `heureRappel` | « *Ficus* attend toujours son eau » |
| Relance 2 | J+2 à `heureRappel` | « *Ficus* est en retard d'arrosage » |
| Fin | après J+2 | plus de notification automatique |

Tout est **programmé d'avance** : Android déclenche les notifications locales même si l'appli est fermée. Aucun code d'arrière-plan n'est nécessaire.

## R4. Clic sur « J'ai arrosé » (à l'heure, en avance ou en retard)

On repart toujours de **la date réelle du clic**, pas de la date prévue.

```
dernierArrosage  = date du clic
prochainArrosage = date du clic + frequenceArrosage jours
```

Exemple (Ficus, tous les 7 jours) : prévu le lundi 1er, arrosé le jeudi 4 (3 jours de retard) → prochain arrosage le **jeudi 11** (pas le lundi 8).

Ordre obligatoire :
1. annuler **toutes** les notifications de cette plante (principale + relances + rattrapage + snooze) ;
2. mettre à jour `dernierArrosage` (SQLite d'abord, puis Firestore, voir M1) ;
3. replanifier le nouveau cycle (R3).

## R5. Tableau des cas

| # | Situation | Comportement |
|---|---|---|
| 1 | Notification reçue, clic sur « J'ai arrosé » le jour J | R4 |
| 2 | Notification ignorée | relances J+1 et J+2, puis arrêt ; badge « en retard » dans la liste |
| 3 | Arrosage cliqué avec 1 à 3 jours de retard | R4 : on repart de la date du clic ; les relances restantes sont annulées |
| 4 | Arrosage cliqué **en avance** | R4 : même règle |
| 5 | Jamais arrosé, retard ≤ 7 jours, l'appli est rouverte | `replanifierTout()` programme un **rattrapage** le lendemain à `heureRappel` |
| 6 | Jamais arrosé, retard > 7 jours | plus aucune notification, seulement le badge rouge avec le nombre de jours |
| 7 | L'heure du rappel du jour est déjà passée à la création ou la modification | on ne programme **jamais dans le passé** : on saute ce créneau et on prend le suivant |
| 8 | L'utilisateur change `heureRappel` dans les réglages | `replanifierTout()` |
| 9 | L'utilisateur modifie la fréquence ou `dernierArrosage` dans le formulaire | annuler puis replanifier cette plante |
| 10 | Suppression d'une plante | annuler ses notifications |
| 11 | Déconnexion | annuler **toutes** les notifications ; à la connexion suivante, `replanifierTout()` |
| 12 | Permission notifications refusée | aucune notification ; bandeau d'information dans la liste ; badges toujours actifs |
| 13 | Téléphone sans internet | les notifications locales marchent ; la replanification lit SQLite |
| 14 | Redémarrage du téléphone | Android conserve en général les notifications planifiées ; `replanifierTout()` à l'ouverture sert de filet de sécurité |
| 15 | Bouton « Rappeler plus tard » dans la notification | une notification unique dans `SNOOZE_HEURES` heures (le cycle normal continue) |
| 16 | Clic sur le corps de la notification | ouvre la fiche de la plante |

## R6. Statut d'une plante (liste et badge)

```
joursDeRetard = max(0, aujourd'hui - prochainArrosage)   (en jours calendaires entiers, voir M2)
```

| Statut | Condition | Affichage |
|---|---|---|
| À jour | `prochainArrosage` > aujourd'hui | « Dans X jours » |
| À arroser | `prochainArrosage` = aujourd'hui | badge orange |
| En retard | `prochainArrosage` < aujourd'hui | badge rouge « X jours de retard » |

## R7. Identifiants de notification

Les ID des notifications locales doivent être des **entiers 32 bits**. Chaque plante reçoit un `notifBaseId` entier unique (ex. aléatoire < 200 000 000), enregistré avec la plante.

| Notification | ID |
|---|---|
| Principale | `notifBaseId * 10 + 0` |
| Relance 1 | `notifBaseId * 10 + 1` |
| Relance 2 | `notifBaseId * 10 + 2` |
| Rattrapage | `notifBaseId * 10 + 3` |
| Rappeler plus tard | `notifBaseId * 10 + 9` |

`annulerRappels(plant)` annule les ID de 0 à 3 et 9.

## R8. Limites connues (à mentionner dans le rapport)

| Limite | Détail |
|---|---|
| Permission | Android 13+ demande l'autorisation explicitement |
| Alarmes exactes | Android 12+ peut décaler l'heure de quelques minutes |
| Économie de batterie | Xiaomi, Huawei, etc. peuvent bloquer les notifications (à tester sur ton téléphone) |
| Local à l'appareil | les notifications locales ne suivent pas le compte sur un autre téléphone (voir M8) |
| Push FCM | l'envoi automatique demande des Cloud Functions (plan Blaze) ; un envoi manuel depuis la console suffit pour la démo |

---

# PARTIE B : Règles métier

## M1. Synchronisation SQLite / Firestore (obligatoire)

**Principe** : Firestore est la source de vérité. SQLite sert de cache local **et** de file d'attente quand il n'y a pas de réseau. Les notifications se calculent toujours à partir de SQLite.

| Action | Règle |
|---|---|
| **Écriture** (ajout, modification, « J'ai arrosé ») | 1) écrire dans SQLite avec `sync_pending = 1` et `updatedAt = maintenant` ; 2) si le réseau est disponible, envoyer à Firestore ; 3) en cas de succès, `sync_pending = 0` |
| **Lecture** | afficher immédiatement SQLite, puis, si en ligne, rafraîchir depuis Firestore et mettre à jour SQLite |
| **Retour du réseau** | à chaque `networkStatusChange` (plugin `@capacitor/network`) et au démarrage : envoyer toutes les lignes `sync_pending = 1` |
| **Conflit** (même plante modifiée sur 2 appareils) | la **dernière modification gagne** (plus grand `updatedAt`) |
| **Suppression hors ligne** | marquer `deleted = 1` en local ; supprimer dans Firestore au retour du réseau, puis effacer la ligne locale |
| **Photo hors ligne** | l'ajout de photo est désactivé avec le message « Photo indisponible hors ligne » ; la plante est enregistrée sans photo, la photo pourra être ajoutée plus tard |
| **Première connexion sans cache et sans réseau** | liste vide avec message d'erreur réseau (M11) |

Colonnes SQLite en plus de celles de `Plant` : `sync_pending` (0/1) et `deleted` (0/1).

## M2. Définition d'un « jour » (obligatoire)

On raisonne en **dates calendaires locales**, jamais en durées de 24 h.

- `dernierArrosage` est stocké au format `YYYY-MM-DD` (date locale du téléphone), pas en timestamp.
- `prochainArrosage` = `dernierArrosage` + `frequenceArrosage` jours (calcul sur la date).
- `joursDeRetard` = nombre de jours calendaires entre aujourd'hui et `prochainArrosage`.
- La notification part à `heureRappel` (heure locale) de la date d'échéance.

Exemple : arrosage le jeudi à 22h avec une fréquence de 7 jours → prochain arrosage le jeudi suivant, notification à 09:00 ce jour-là (et non le jeudi à 22h).

## M3. Validation du formulaire (obligatoire)

| Champ | Règle | Message |
|---|---|---|
| Nom | obligatoire, 2 à 50 caractères (espaces retirés) | « Le nom doit contenir 2 à 50 caractères » |
| Espèce | obligatoire, 2 à 50 caractères | « Indiquez l'espèce » |
| Exposition | une des 3 valeurs | « Choisissez une exposition » |
| Fréquence | entier de 1 à 365 | « Entrez un nombre de jours entre 1 et 365 » |
| Dernier arrosage | date valide, **pas dans le futur** | « La date ne peut pas être dans le futur » |
| Notes | facultatif, 500 caractères max | « 500 caractères maximum » |
| Photo | facultative | aucun |

Le bouton « Enregistrer » reste désactivé tant que le formulaire est invalide. Les règles sont écrites dans `utils/validators.ts`.

## M4. Règles de l'image (obligatoire)

| Sujet | Règle |
|---|---|
| Compression | à la capture : `quality: 70`, `width: 1024` (cible < 500 Ko), format JPEG |
| Chemin Storage | `plants/{userId}/{plantId}.jpg` |
| Changement de photo | on **écrase** le même chemin : l'ancienne image disparaît sans suppression séparée |
| Échec de l'upload | message d'erreur + choix « Réessayer » ou « Enregistrer sans photo » ; aucune plante à moitié créée |
| Sans photo | image par défaut (fichier dans `src/assets/`) |
| Suppression d'une plante | supprimer aussi son fichier dans Storage |
| Permission caméra refusée | message explicatif et proposition d'utiliser la galerie |
| Alternative Blaze | si Storage n'est pas disponible : base64 dans Firestore (la compression à < 500 Ko respecte la limite de 1 Mo par document) |

## M5. Tri et recherche de la liste (obligatoire)

**Ordre d'affichage par défaut** :
1. plantes **en retard** (la plus en retard en premier) ;
2. plantes **à arroser aujourd'hui** ;
3. plantes **à jour**, par date de prochain arrosage croissante ;
4. à égalité, ordre alphabétique du nom.

**Recherche** : sur le nom et l'espèce, insensible à la casse et aux accents (`utils/search.ts` avec `normalize('NFD')` et suppression des diacritiques).

## M6. Plusieurs plantes le même jour (recommandé)

Une notification par plante, regroupées sous un même `group` Android avec un résumé (`groupSummary`, « 3 plantes à arroser »). Si le regroupement pose problème, garder une notification par plante.

## M7. Annulation d'un « J'ai arrosé » (recommandé)

- Le bouton est désactivé pendant le traitement (évite le double clic).
- Après le clic, un toast « Arrosage enregistré · **Annuler** » reste visible 5 secondes.
- « Annuler » restaure l'ancien `dernierArrosage`, puis replanifie les notifications.

## M8. Même compte sur plusieurs téléphones (bonus)

Écouter Firestore avec `onSnapshot` : à chaque changement reçu d'un autre appareil, mettre à jour SQLite puis appeler `replanifierTout()`. Sans cette écoute, `replanifierTout()` à l'ouverture de l'appli corrige les notifications d'un appareil devenu obsolète.

## M9. Authentification (obligatoire, sauf mot de passe oublié)

| Sujet | Règle |
|---|---|
| E-mail et mot de passe | e-mail valide ; mot de passe de 6 caractères minimum (limite Firebase) ; confirmation du mot de passe à l'inscription |
| Messages d'erreur | table de correspondance dans `utils/auth-errors.ts` (voir ci-dessous) |
| Session | l'utilisateur reste connecté après fermeture de l'appli (comportement par défaut) |
| Mot de passe oublié | `sendPasswordResetEmail` (**bonus**) |
| Déconnexion | annule les notifications, supprime le token FCM de l'appareil (M12), efface le cache SQLite de l'utilisateur |

| Code Firebase | Message affiché |
|---|---|
| `auth/invalid-credential` | « E-mail ou mot de passe incorrect » |
| `auth/invalid-email` | « Adresse e-mail invalide » |
| `auth/email-already-in-use` | « Un compte existe déjà avec cet e-mail » |
| `auth/weak-password` | « Mot de passe trop court (6 caractères minimum) » |
| `auth/too-many-requests` | « Trop de tentatives, réessayez plus tard » |
| `auth/network-request-failed` | « Pas de connexion internet » |
| autre | « Une erreur est survenue, réessayez » |

## M10. Suppression d'une plante (obligatoire)

1. Boîte de confirmation (« Supprimer *Ficus* ? Cette action est définitive »).
2. Annuler ses notifications (R5, cas 10).
3. Supprimer sa photo dans Storage.
4. Supprimer dans SQLite et Firestore (hors ligne : `deleted = 1`, voir M1).
5. Retour à la liste avec un toast de confirmation.

## M11. États de l'interface (obligatoire)

| Situation | Affichage |
|---|---|
| Chargement | indicateur (`ion-spinner` ou squelette) |
| Aucune plante | message « Aucune plante pour le moment » + bouton « Ajouter ma première plante » |
| Aucun résultat de recherche | « Aucune plante ne correspond » |
| Erreur réseau ou Firestore injoignable | message + bouton « Réessayer » ; les données SQLite restent affichées si elles existent |

## M12. Token FCM (obligatoire pour le push)

- Stocké dans Firestore : `users/{uid}/devices/{token}` avec la date d'enregistrement.
- Enregistré après connexion et permission accordée.
- Supprimé à la déconnexion.

## M13. Décisions générales (obligatoire)

| Sujet | Décision |
|---|---|
| Langue | français uniquement |
| Unité de fréquence | uniquement en jours |
| Fuseau horaire | heure locale du téléphone (pas de gestion du changement de fuseau) |

---

# PARTIE C : Étapes de réalisation

## Étape 0 : Prérequis

- [ ] Installer Node.js (version **LTS**, idéalement Node 24 : `nvm install 24`)
- [ ] Installer Android Studio (SDK Android + JDK)
- [ ] Installer la CLI Ionic : `npm install -g @ionic/cli`
- [ ] Créer un compte Firebase (console.firebase.google.com)
- [ ] Activer le mode développeur + débogage USB sur le téléphone de test

## Étape 1 : Initialisation du projet

- [ ] `ionic start plantes-app blank --type=vue` (choisir **Capacitor**)
- [ ] `cd plantes-app` (toutes les commandes suivantes se lancent **dans ce dossier**)
- [ ] `ionic serve` pour vérifier que ça tourne (serveur local, rechargement automatique)
- [ ] Installer les dépendances :

```bash
npm install firebase pinia
npm install @capacitor-community/sqlite jeep-sqlite
npm install @capacitor/camera @capacitor/local-notifications @capacitor/push-notifications
npm install @capacitor/preferences @capacitor/network
```

- [ ] Vérifier que les versions Capacitor sont alignées : `npm ls @capacitor/core @capacitor/android @capacitor/cli`
- [ ] Changer `appId` dans `capacitor.config.ts` (ex. `com.tonnom.plantes`) **avant** d'ajouter Android
- [ ] Ajouter la plateforme Android :

```bash
ionic build
npm install @capacitor/android #si pas encore installé
npx cap add android
```

- [ ] Si `@capacitor/cli` manque aussi :

```bash
npm install -D @capacitor/cli
```

## Étape 2 : Configuration Firebase

**Obligatoire pour commencer**
- [ ] Créer le projet Firebase (Google Analytics désactivé)
- [ ] Activer **Authentication** > méthode E-mail/Mot de passe
- [ ] Créer **Firestore** (mode test, région `europe-west1`)
- [ ] Ajouter une app **Web** (icône `</>`, ou Paramètres du projet > Vos applications) et copier `firebaseConfig` dans `src/firebase/config.ts`

**Plus tard**
- [ ] Activer **Storage** à l'étape 6 (si Blaze est exigé : base64 dans Firestore ou Cloudinary, voir M4)
- [ ] Ajouter l'app **Android** et placer `google-services.json` dans `android/app/` (utile seulement pour le push FCM)
- [ ] Avant le rendu : remplacer le mode test de Firestore par des règles de sécurité

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /plants/{plantId} {
      allow read, update, delete: if request.auth != null
                                  && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null
                    && request.auth.uid == request.resource.data.userId;
    }
    match /users/{uid}/devices/{deviceId} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

## Étape 3 : Structure des fichiers à créer

```
plantes-app/
├── android/                          (généré par Capacitor)
│   └── app/google-services.json      (à ajouter, pour le push)
├── capacitor.config.ts               (appId, appName)
├── src/
│   ├── main.ts                       (init Ionic, Pinia, SQLite)
│   ├── App.vue                       (replanifierTout() + synchronisation au démarrage)
│   ├── assets/
│   │   └── plant-default.png         (image par défaut, M4)
│   ├── router/
│   │   └── index.ts                  (routes + garde d'authentification)
│   ├── firebase/
│   │   └── config.ts                 (initializeApp, auth, db, storage)
│   ├── models/
│   │   └── plant.model.ts            (interface Plant)
│   ├── utils/
│   │   ├── plant-dates.ts            (prochainArrosage, joursDeRetard, statut : R6, M2)
│   │   ├── validators.ts             (validation du formulaire : M3)
│   │   ├── search.ts                 (recherche sans accents + tri : M5)
│   │   └── auth-errors.ts            (codes Firebase vers messages : M9)
│   ├── services/
│   │   ├── auth.service.ts           (login, register, logout, reset)
│   │   ├── plant.service.ts          (CRUD Firestore)
│   │   ├── storage.service.ts        (upload / suppression d'image : M4)
│   │   ├── camera.service.ts         (prise photo / galerie, compression)
│   │   ├── sqlite.service.ts         (cache local + sync_pending / deleted)
│   │   ├── sync.service.ts           (synchronisation : M1)
│   │   ├── settings.service.ts       (heureRappel via @capacitor/preferences)
│   │   └── notification.service.ts   (règles R1 à R7)
│   ├── stores/
│   │   └── auth.store.ts             (état de l'utilisateur connecté)
│   ├── components/
│   │   └── PlantCard.vue             (carte + badge de statut)
│   └── views/
│       ├── LoginPage.vue
│       ├── RegisterPage.vue
│       ├── PlantListPage.vue
│       ├── PlantDetailPage.vue
│       ├── PlantFormPage.vue         (ajout et modification)
│       └── SettingsPage.vue          (choix de l'heure du rappel)
```

### Modèle de données (`plant.model.ts`)

```ts
export interface Plant {
  id?: string;
  userId: string;
  nom: string;
  espece: string;
  exposition: 'soleil' | 'mi-ombre' | 'ombre';
  frequenceArrosage: number;   // en jours (1 à 365)
  dernierArrosage: string;     // date locale "YYYY-MM-DD" (M2)
  notifBaseId: number;         // entier unique pour les ID de notification (R7)
  photoUrl?: string;
  notes?: string;
  updatedAt: number;           // timestamp en ms, pour les conflits (M1)
}
```

## Étape 4 : Fonctionnalité 1, Login Firebase

- [ ] `src/firebase/config.ts` : initialiser Firebase (app, auth, db, storage)
- [ ] `auth-errors.ts` : table des messages (M9)
- [ ] `auth.service.ts` : `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `signOut`, `sendPasswordResetEmail` (bonus)
- [ ] `auth.store.ts` : stocker l'utilisateur avec `onAuthStateChanged`
- [ ] `LoginPage.vue` et `RegisterPage.vue` : formulaires, validation e-mail / mot de passe, confirmation du mot de passe, messages d'erreur
- [ ] `router/index.ts` : garde `beforeEach` qui redirige vers `/login` si non connecté
- [ ] Déconnexion : `annulerTout()`, suppression du token FCM, nettoyage du cache SQLite (M9)

## Étape 5 : Fonctionnalité 2, Liste et fiche

- [ ] `plant-dates.ts` : `prochainArrosage(plant)`, `joursDeRetard(plant)`, `statut(plant)` (R6, M2)
- [ ] `search.ts` : tri et recherche (M5)
- [ ] `sqlite.service.ts` : table `plants` avec `sync_pending` et `deleted`
- [ ] `sync.service.ts` : écriture SQLite d'abord, envoi vers Firestore, rejeu au retour du réseau (M1)
- [ ] `plant.service.ts` : `getPlants(userId)`, `getPlantById(id)`, `deletePlant(id)`
- [ ] `PlantCard.vue` : image (ou image par défaut), nom, prochain arrosage, **badge** de statut
- [ ] `PlantListPage.vue` : `ion-list` triée (M5), barre de recherche, bouton flottant « + », pull-to-refresh, états de chargement / vide / erreur (M11), bandeau si permission notifications refusée
- [ ] `PlantDetailPage.vue` : toutes les infos, boutons Modifier / Supprimer / **J'ai arrosé**
- [ ] Suppression : confirmation, suppression de la photo, annulation des notifications (M10)

## Étape 6 : Fonctionnalité 3, Formulaire avec upload d'image

- [ ] `validators.ts` : règles M3
- [ ] `camera.service.ts` : `Camera.getPhoto({ quality: 70, width: 1024 })`, caméra ou galerie, gestion du refus de permission (M4)
- [ ] `storage.service.ts` : `uploadBytes` + `getDownloadURL` sur `plants/{userId}/{plantId}.jpg`, suppression du fichier
- [ ] `PlantFormPage.vue` : champs, aperçu de l'image, messages de validation, bouton désactivé si invalide
- [ ] Échec d'upload : « Réessayer » ou « Enregistrer sans photo » (M4)
- [ ] Hors ligne : désactiver l'ajout de photo avec message (M1)
- [ ] À la création : générer `notifBaseId`, enregistrer, puis `planifierRappels(plant)`
- [ ] À la modification de la fréquence ou de `dernierArrosage` : annuler puis replanifier (R5, cas 9)
- [ ] Permissions caméra dans `AndroidManifest.xml` si nécessaire

## Étape 7 : Fonctionnalité 4, Notifications et backend Firebase

### 7.1 Réglages
- [ ] `settings.service.ts` : `getHeureRappel()` / `setHeureRappel()` (défaut `09:00`)
- [ ] `SettingsPage.vue` : `ion-datetime` (heure uniquement) ; à l'enregistrement, `replanifierTout()` (R5, cas 8)
- [ ] Ajouter la route `/settings` et un lien depuis la liste

### 7.2 Service de notifications (`notification.service.ts`)
- [ ] Constantes de R2 en haut du fichier
- [ ] `demanderPermission()` : permission Android 13+ ; si refus, mémoriser pour afficher le bandeau (R5, cas 12)
- [ ] `planifierRappels(plant)` : créneaux J, J+1, J+2 à `heureRappel` (R3), **ignore ceux dans le passé** (R5, cas 7), `schedule: { at, allowWhileIdle: true }`, ID de R7
- [ ] `annulerRappels(plant)` : annule les ID `base*10 + 0, 1, 2, 3, 9`
- [ ] `annulerTout()` : annule tout (déconnexion)
- [ ] `replanifierTout()` : pour chaque plante (lue dans SQLite), annuler puis planifier ; si le cycle est entièrement passé et `joursDeRetard ≤ MAX_RETARD_NOTIF`, programmer un **rattrapage** le lendemain (cas 5) ; sinon rien (cas 6)
- [ ] Appeler `replanifierTout()` : au démarrage de l'appli, après connexion, après changement d'heure, après réception de données Firestore (M8, bonus)
- [ ] (Recommandé) regroupement des notifications du même jour (M6)

### 7.3 Bouton « J'ai arrosé » (R4, M7)
- [ ] `annulerRappels` → mise à jour de `dernierArrosage` (date locale du clic, `updatedAt`) dans SQLite puis Firestore → `planifierRappels`
- [ ] Bouton désactivé pendant le traitement
- [ ] (Recommandé) toast « Annuler » pendant 5 secondes (M7)

```ts
async function marquerArrosee(plant: Plant) {
  const ancienneDate = plant.dernierArrosage;
  await annulerRappels(plant);
  plant.dernierArrosage = dateLocaleISO(new Date());   // "YYYY-MM-DD"
  plant.updatedAt = Date.now();
  await savePlant(plant);          // SQLite d'abord, puis Firestore (M1)
  await planifierRappels(plant);
  return ancienneDate;             // pour l'annulation (M7)
}
```

### 7.4 Interactions avec la notification (optionnel mais recommandé)
- [ ] Clic sur la notification : ouvrir `/plants/:id` via `localNotificationActionPerformed` (R5, cas 16)
- [ ] `registerActionTypes` : boutons « J'ai arrosé » et « Rappeler plus tard » (cas 15). Si le bouton « J'ai arrosé » pose problème sur Android, garder seulement le clic qui ouvre la fiche

### 7.5 Push FCM et backend
- [ ] `PushNotifications.register()`, récupérer le token, le stocker dans `users/{uid}/devices/{token}` (M12)
- [ ] Envoyer un message de test depuis la console Firebase (Cloud Messaging)
- [ ] Le backend Firebase = Auth + Firestore + Storage + FCM

## Étape 8 : Génération de l'APK (en local)

- [ ] `ionic build`
- [ ] `npx cap sync android`
- [ ] `npx cap open android`
- [ ] Android Studio : **Build > Build Bundle(s) / APK(s) > Build APK(s)**
- [ ] Récupérer `android/app/build/outputs/apk/debug/app-debug.apk`
- [ ] Tester sur un vrai téléphone avant de rendre

## Étape 9 : Tests de recette (sur le téléphone)

Pour tester vite, mets temporairement `frequenceArrosage = 1` et `heureRappel` à 2 minutes dans le futur.

**Notifications**
- [ ] Cas 1 : notification reçue, clic sur « J'ai arrosé »
- [ ] Cas 2 : ignorer la notification, vérifier les relances et le badge rouge
- [ ] Cas 3 et 4 : arroser en retard puis en avance, vérifier `prochainArrosage`
- [ ] Cas 5 et 6 : plante très en retard, rouvrir l'appli
- [ ] Cas 8 : changer l'heure dans les réglages
- [ ] Cas 10 et 11 : supprimer une plante, se déconnecter, vérifier qu'aucune notification n'arrive
- [ ] Cas 12 : refuser la permission, vérifier le bandeau
- [ ] Cas 13 : mode avion

**Règles métier**
- [ ] M1 : en mode avion, ajouter et arroser une plante, réactiver le réseau, vérifier la synchronisation dans Firestore
- [ ] M2 : arroser un soir tard, vérifier que le prochain arrosage tombe bien sur la bonne date
- [ ] M3 : tester chaque règle de validation (nom vide, fréquence 0 ou 400, date future, notes trop longues)
- [ ] M4 : photo trop lourde (vérifier la compression), échec d'upload, remplacement de photo, suppression de plante
- [ ] M5 : vérifier l'ordre de la liste et la recherche avec accents (« epine » doit trouver « épine »)
- [ ] M7 : clic sur « Annuler » après « J'ai arrosé »
- [ ] M9 : mauvais mot de passe, e-mail déjà utilisé, mot de passe trop court
- [ ] M11 : liste vide, erreur réseau

Remettre les valeurs normales avant le rendu.

---

## Points d'attention

1. **Firebase Storage** : peut exiger le plan **Blaze**. Alternatives : base64 dans Firestore (limite 1 Mo) ou Cloudinary.
2. **SQLite dans le navigateur** : demande `jeep-sqlite`. Si tu perds du temps, teste directement sur Android.
3. **Ordre conseillé** : Login, Liste/Fiche, Formulaire, Notifications, APK. Génère un APK de test dès que le login fonctionne.
4. **Appli locale** : tout se développe et se compile sur ta machine. Seul Firebase est distant.
5. **Sécurité** : ne publie pas tes clés Firebase dans un dépôt public ; un `.gitignore` est présent dans `plantes-app/` (ajouter `android/app/build`, `android/.gradle`, `android/local.properties`).
6. **Priorités si le temps manque** : M1 à M5, M9 à M13 d'abord ; M6, M7 ensuite ; M8 et le mot de passe oublié en dernier.