
# TODO : Application mobile « Mes Plantes »

**Stack** : Vue 3 + TypeScript + Ionic (Capacitor) + SQLite + Firebase
**Type de projet** : application locale (développée et compilée sur ta machine, livrable = fichier APK)

## Fonctionnalités demandées

1. Login avec Firebase
2. Liste et fiche
3. Formulaire avec upload d'image
4. Notification et backend sur Firebase

**Livrable** : `app-debug.apk`

---

## Est-ce qu'il existe un template d'initialisation ?

Oui, c'est la **CLI Ionic** (équivalent de `php spark` / `artisan`). Elle génère un projet prêt à l'emploi avec Vue, TypeScript, Vite, router et Capacitor.

```bash
npm install -g @ionic/cli
ionic start plantes-app blank --type=vue
```

Templates disponibles : `blank`, `tabs`, `sidemenu`. On choisit **`blank`** (navigation simple : login → liste → fiche).
Aucun template n'intègre Firebase ni SQLite : ce sont des plugins à ajouter manuellement.

---

## Étape 0 : Prérequis

- [ ] Installer Node.js (version LTS)
- [ ] Installer Android Studio (SDK Android + JDK)
- [ ] Installer la CLI Ionic : `npm install -g @ionic/cli`
- [ ] Créer un compte Firebase (console.firebase.google.com)
- [ ] Activer le mode développeur + débogage USB sur le téléphone de test

## Étape 1 : Initialisation du projet

- [ ] `ionic start plantes-app blank --type=vue` (choisir **Capacitor**)
- [ ] `cd plantes-app` puis `ionic serve` pour vérifier que ça tourne
- [ ] Installer les dépendances :

```bash
npm install firebase pinia
npm install @capacitor-community/sqlite jeep-sqlite
npm install @capacitor/camera @capacitor/local-notifications @capacitor/push-notifications
```

- [ ] Ajouter la plateforme Android :

```bash
ionic build
npm install @capacitor/android #si pas encore installé
npx cap add android
```
- [ ] Si @capacitor/cli manque aussi : :

```bash
npm install -D @capacitor/cli
```

## Étape 2 : Configuration Firebase

- [ ] Créer le projet Firebase
- [ ] Activer **Authentication** (méthode Email/Mot de passe)
- [ ] Créer la base **Firestore** (mode test au début)
- [ ] Activer **Storage** pour les images (voir « Points d'attention »)
- [ ] Ajouter une app **Web** et copier la config dans `src/firebase/config.ts`
- [ ] Ajouter une app **Android** (package id = `appId` de `capacitor.config.ts`), télécharger `google-services.json` et le placer dans `android/app/`

## Étape 3 : Structure des fichiers à créer

```
plantes-app/
├── android/                         (généré par Capacitor)
│   └── app/google-services.json     (à ajouter)
├── capacitor.config.ts              (appId, appName)
├── src/
│   ├── main.ts                      (init Ionic, Pinia, SQLite)
│   ├── App.vue
│   ├── router/
│   │   └── index.ts                 (routes + garde d'authentification)
│   ├── firebase/
│   │   └── config.ts                (initializeApp, auth, db, storage)
│   ├── models/
│   │   └── plant.model.ts           (interface Plant)
│   ├── services/
│   │   ├── auth.service.ts          (login, register, logout)
│   │   ├── plant.service.ts         (CRUD Firestore)
│   │   ├── storage.service.ts       (upload image vers Storage)
│   │   ├── camera.service.ts        (prise photo / galerie)
│   │   ├── sqlite.service.ts        (cache local hors ligne)
│   │   └── notification.service.ts  (rappels d'arrosage)
│   ├── stores/
│   │   └── auth.store.ts            (état de l'utilisateur connecté)
│   ├── components/
│   │   └── PlantCard.vue            (carte d'une plante dans la liste)
│   └── views/
│       ├── LoginPage.vue
│       ├── RegisterPage.vue
│       ├── PlantListPage.vue
│       ├── PlantDetailPage.vue
│       └── PlantFormPage.vue        (ajout et modification)
```

### Modèle de données (`src/models/plant.model.ts`)

```ts
export interface Plant {
  id?: string;
  userId: string;
  nom: string;
  espece: string;
  exposition: 'soleil' | 'mi-ombre' | 'ombre';
  frequenceArrosage: number;   // en jours
  dernierArrosage: string;     // date ISO
  photoUrl?: string;
  notes?: string;
}
```

## Étape 4 : Fonctionnalité 1, Login Firebase

- [ ] `src/firebase/config.ts` : initialiser Firebase (app, auth, db, storage)
- [ ] `src/services/auth.service.ts` : `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `signOut`
- [ ] `src/stores/auth.store.ts` : stocker l'utilisateur avec `onAuthStateChanged`
- [ ] `src/views/LoginPage.vue` et `RegisterPage.vue` : formulaires + messages d'erreur
- [ ] `src/router/index.ts` : garde de navigation (`beforeEach`) qui redirige vers `/login` si non connecté

## Étape 5 : Fonctionnalité 2, Liste et fiche

- [ ] `src/services/plant.service.ts` : `getPlants(userId)`, `getPlantById(id)`, `deletePlant(id)`
- [ ] `src/components/PlantCard.vue` : image, nom, prochain arrosage
- [ ] `src/views/PlantListPage.vue` : `ion-list`, barre de recherche, bouton flottant « + », pull-to-refresh
- [ ] `src/views/PlantDetailPage.vue` : toutes les infos, boutons Modifier / Supprimer / « J'ai arrosé »
- [ ] `src/services/sqlite.service.ts` : créer la table `plants`, sauvegarder les plantes en local, les lire si hors ligne

## Étape 6 : Fonctionnalité 3, Formulaire avec upload d'image

- [ ] `src/services/camera.service.ts` : `Camera.getPhoto()` (source : caméra ou galerie)
- [ ] `src/services/storage.service.ts` : envoyer l'image vers Firebase Storage et récupérer l'URL (`uploadBytes` + `getDownloadURL`)
- [ ] `src/views/PlantFormPage.vue` : champs (nom, espèce, exposition, fréquence, notes), aperçu de l'image, validation, enregistrement dans Firestore
- [ ] Ajouter les permissions caméra / stockage dans `android/app/src/main/AndroidManifest.xml` si nécessaire

## Étape 7 : Fonctionnalité 4, Notifications et backend Firebase

- [ ] `src/services/notification.service.ts` : demander la permission, puis programmer une **notification locale** à la date du prochain arrosage (`@capacitor/local-notifications`)
- [ ] Reprogrammer la notification quand on clique sur « J'ai arrosé »
- [ ] **Push FCM** : enregistrer le token (`PushNotifications.register()`), le stocker dans Firestore, puis envoyer un message de test depuis la console Firebase (Cloud Messaging)
- [ ] Le backend Firebase = Auth + Firestore + Storage + FCM

## Étape 8 : Génération de l'APK (en local)

- [ ] `ionic build`
- [ ] `npx cap sync android`
- [ ] `npx cap open android` (ouvre Android Studio)
- [ ] Dans Android Studio : **Build > Build Bundle(s) / APK(s) > Build APK(s)**
- [ ] Récupérer le fichier : `android/app/build/outputs/apk/debug/app-debug.apk`
- [ ] Tester sur un vrai téléphone avant de rendre

---

## Points d'attention

1. **Firebase Storage** : les nouveaux projets peuvent exiger le plan **Blaze** (carte bancaire, mais gratuit dans les quotas). À vérifier dans ta console. Alternatives si bloquant : image compressée en base64 dans Firestore (limite 1 Mo par document) ou Cloudinary.
2. **Notifications** : le plus fiable pour la démo est la **notification locale** (rappel d'arrosage). Le push FCM automatique côté serveur demande des Cloud Functions (plan Blaze). Un envoi manuel depuis la console Firebase suffit pour démontrer le « backend sur Firebase ».
3. **SQLite dans le navigateur** : demande une configuration supplémentaire (`jeep-sqlite`). Si tu perds du temps, teste directement sur Android.
4. **Ordre conseillé** : Login → Liste/Fiche → Formulaire → Notifications → APK. Génère un APK de test dès que le login fonctionne pour détecter tôt les problèmes de configuration Android.
5. **Appli locale** : tout se développe et se compile sur ta machine (`ionic serve` pour le web, APK pour le téléphone). Aucun hébergement n'est nécessaire, seul Firebase est utilisé comme backend distant.
