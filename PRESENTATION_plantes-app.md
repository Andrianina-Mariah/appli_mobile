
# Présentation de l'application « Mes Plantes »

## 1. Contexte

Projet de TP : créer une application mobile avec **Vue, TypeScript, Ionic et SQLite**, en utilisant **Firebase** comme backend. Le livrable est un fichier **APK**.

## 2. But de l'application

**Mes Plantes** aide une personne à **suivre et entretenir ses plantes d'intérieur ou de jardin**.

Le problème résolu : on oublie facilement quand arroser chaque plante, quelle exposition elle préfère ou quelle espèce c'est. L'application centralise ces informations et **envoie un rappel** quand une plante doit être arrosée, avec des relances si l'utilisateur ignore le message.

### Public visé

- Particuliers qui possèdent plusieurs plantes
- Débutants en jardinage qui ont besoin de rappels
- Toute personne souhaitant garder une trace visuelle (photos) de ses plantes

## 3. Fonctionnalités

### 3.1 Authentification (Firebase Authentication)

- Création de compte avec e-mail et mot de passe (6 caractères minimum, confirmation)
- Connexion et déconnexion, session conservée à la fermeture de l'appli
- Messages d'erreur en français (e-mail déjà utilisé, mot de passe incorrect, pas de connexion...)
- Mot de passe oublié (bonus)
- Pages protégées : impossible d'accéder à la liste sans être connecté
- Chaque utilisateur ne voit que **ses propres plantes**

### 3.2 Liste et fiche des plantes

**Liste**

- Photo (ou image par défaut), nom et prochain arrosage de chaque plante
- Tri automatique : en retard, à arroser aujourd'hui, puis à jour
- Recherche par nom ou espèce, insensible aux accents et à la casse
- **Badge de statut** : à jour, à arroser aujourd'hui, en retard de X jours
- Rafraîchissement par glissement
- Bouton « + » pour ajouter une plante
- États clairs : chargement, liste vide, aucun résultat, erreur réseau
- Bandeau d'information si les notifications sont refusées

**Fiche**

- Photo en grand format
- Nom, espèce, exposition (soleil / mi-ombre / ombre)
- Fréquence d'arrosage et date du dernier arrosage
- Notes personnelles
- Actions : **Modifier**, **Supprimer** (avec confirmation), **J'ai arrosé** (avec possibilité d'annuler pendant 5 secondes)

### 3.3 Formulaire avec upload d'image

- Champs : nom, espèce, exposition, fréquence d'arrosage (1 à 365 jours), date du dernier arrosage, notes
- **Validation** : nom et espèce de 2 à 50 caractères, date non future, notes de 500 caractères maximum
- Photo prise avec la caméra ou choisie dans la galerie, avec aperçu
- **Compression automatique** de l'image (largeur 1024 px, qualité 70, moins de 500 Ko)
- En cas d'échec d'envoi : « Réessayer » ou « Enregistrer sans photo »
- Hors ligne : ajout de photo indisponible, la plante est enregistrée sans photo
- Les rappels sont planifiés à l'enregistrement

### 3.4 Notifications et backend Firebase

- **Heure du rappel réglable** (défaut 09:00) dans une page Réglages
- **Notification locale** le jour d'arrosage, puis **2 relances** (J+1, J+2)
- Après « J'ai arrosé », annulation des relances et nouveau cycle calculé à partir de la **date réelle** de l'arrosage
- Clic sur la notification : ouverture de la fiche de la plante
- Boutons « J'ai arrosé » et « Rappeler plus tard » dans la notification (optionnel)
- Regroupement des notifications quand plusieurs plantes sont à arroser le même jour (recommandé)
- **Push FCM** : enregistrement du token par appareil et message de test depuis la console Firebase
- Backend Firebase : Authentication + Firestore + Storage + Cloud Messaging

### 3.5 Stockage local SQLite (mode hors ligne)

- Copie locale des plantes dans SQLite : la liste et les fiches restent consultables **sans internet**
- On peut ajouter, modifier, arroser et supprimer hors ligne
- Les modifications sont mises en attente puis envoyées à Firestore au retour du réseau
- Les notifications se calculent à partir de SQLite et fonctionnent hors ligne

## 4. Fonctionnement des notifications

### 4.1 Fréquence et heure : deux notions distinctes

| Notion                         | Exemple               | Qui décide                     |
| ------------------------------ | --------------------- | ------------------------------- |
| Fréquence (quel jour)         | tous les 3 ou 7 jours | chaque plante                   |
| Heure du rappel (quelle heure) | 09:00                 | l'utilisateur (réglage global) |

```
prochainArrosage = dernierArrosage + frequenceArrosage jours
notification     = prochainArrosage à heureRappel
```

### 4.2 Cycle normal

| Notification | Quand      | Message                                  |
| ------------ | ---------- | ---------------------------------------- |
| Principale   | jour J     | « Il est temps d'arroser *Ficus* »   |
| Relance 1    | J+1        | « *Ficus* attend toujours son eau »  |
| Relance 2    | J+2        | « *Ficus* est en retard d'arrosage » |
| Fin          | après J+2 | plus de notification automatique         |

Les notifications sont programmées d'avance dans Android : elles se déclenchent même si l'appli est fermée.

### 4.3 Que se passe-t-il si l'utilisateur ignore la notification ?

1. Les deux relances partent à J+1 et J+2.
2. Ensuite, plus rien automatiquement, mais le **badge rouge** reste dans la liste avec le nombre de jours de retard.
3. Si l'utilisateur rouvre l'appli et que le retard est **de 7 jours ou moins**, une notification de rattrapage est programmée pour le lendemain à l'heure du rappel.
4. Au-delà de 7 jours de retard, plus aucune notification (évite le spam), seulement le badge.

### 4.4 Que se passe-t-il quand l'utilisateur clique « J'ai arrosé » ?

On repart toujours de **la date réelle du clic**.

| Événement                                      | Date                                |
| ------------------------------------------------ | ----------------------------------- |
| Arrosage prévu                                  | lundi 1er                           |
| Notification et relances ignorées               | mardi 2, mercredi 3                 |
| Clic sur « J'ai arrosé » (3 jours de retard)  | jeudi 4                             |
| **Prochain arrosage** (fréquence 7 jours) | **jeudi 11** (et non lundi 8) |

La plante vient d'être arrosée jeudi : lui redonner de l'eau le lundi serait mauvais pour elle. Le même principe s'applique si l'utilisateur arrose **en avance**.

### 4.5 Cas particuliers

| Situation                                              | Comportement                                                              |
| ------------------------------------------------------ | ------------------------------------------------------------------------- |
| Heure du rappel du jour déjà passée à la création | pas de notification dans le passé : on prend le créneau suivant         |
| L'utilisateur change l'heure du rappel                 | toutes les notifications sont replanifiées                               |
| Modification de la fréquence ou de la date            | notifications de la plante replanifiées                                  |
| Suppression d'une plante                               | ses notifications sont annulées                                          |
| Déconnexion                                           | toutes les notifications sont annulées ; replanifiées à la reconnexion |
| Permission refusée                                    | pas de notification ; bandeau dans la liste ; badges toujours actifs      |
| Sans internet                                          | les notifications locales fonctionnent                                    |
| Redémarrage du téléphone                            | replanification de sécurité à l'ouverture de l'appli                   |
| « Rappeler plus tard »                               | une notification unique 3 heures plus tard                                |

### 4.6 Statut d'une plante

| Statut     | Condition                       | Affichage                           |
| ---------- | ------------------------------- | ----------------------------------- |
| À jour    | prochain arrosage dans le futur | « Dans X jours »                  |
| À arroser | prochain arrosage aujourd'hui   | badge orange                        |
| En retard  | prochain arrosage dépassé     | badge rouge « X jours de retard » |

## 5. Règles métier principales

### 5.1 Un « jour » = une date calendaire

Les dates sont stockées au format `YYYY-MM-DD` en heure locale. Arroser le jeudi à 22h avec une fréquence de 7 jours donne comme prochain arrosage le jeudi suivant, notification à l'heure du rappel ce jour-là (et non le jeudi à 22h).

### 5.2 Synchronisation SQLite / Firestore

| Action                 | Règle                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| Écriture              | d'abord dans SQLite (marquée « en attente »), puis envoi à Firestore si le réseau est disponible |
| Lecture                | affichage immédiat depuis SQLite, puis rafraîchissement depuis Firestore                            |
| Retour du réseau      | envoi automatique des modifications en attente                                                        |
| Conflit                | la dernière modification gagne                                                                       |
| Suppression hors ligne | marquée localement, effectuée dans Firestore au retour du réseau                                   |

Firestore est la source de vérité ; SQLite est un cache et une file d'attente.

### 5.3 Image

| Sujet                    | Règle                                                         |
| ------------------------ | -------------------------------------------------------------- |
| Compression              | largeur 1024 px, qualité 70 (moins de 500 Ko)                 |
| Emplacement              | un seul fichier par plante : `plants/{userId}/{plantId}.jpg` |
| Changement de photo      | le fichier est écrasé                                        |
| Suppression d'une plante | son fichier est supprimé                                      |
| Sans photo               | image par défaut                                              |

### 5.4 Suppression d'une plante

Confirmation, annulation des notifications, suppression de la photo, puis suppression dans SQLite et Firestore.

### 5.5 Décisions générales

Français uniquement, fréquence en jours uniquement, heure locale du téléphone.

## 6. Récapitulatif : exigences du TP et réponses

| Exigence du TP                   | Réponse dans l'application                              |
| -------------------------------- | -------------------------------------------------------- |
| Login avec Firebase              | Inscription et connexion par e-mail / mot de passe       |
| Liste et fiche                   | Liste triée avec badges + fiche détaillée             |
| Formulaire avec upload d'image   | Ajout / modification d'une plante avec photo compressée |
| Notification et backend Firebase | Rappels et relances + FCM + Auth, Firestore, Storage     |
| SQLite (outil imposé)           | Cache local, mode hors ligne et file de synchronisation  |
| Livrable APK                     | Génération via Android Studio                          |

## 7. Parcours utilisateur

1. L'utilisateur **se connecte** (ou crée un compte).
2. Il arrive sur la **liste de ses plantes** (vide au début, avec un bouton pour ajouter la première).
3. Il clique sur « + », remplit le **formulaire** et ajoute une **photo**.
4. Il règle (une fois) l'**heure du rappel** dans les Réglages.
5. Au jour prévu, il reçoit une **notification** ; s'il l'ignore, des **relances** suivent.
6. Il ouvre la fiche et clique sur **« J'ai arrosé »** : un nouveau cycle commence à partir de ce jour.

## 8. Écrans

| Écran      | Fichier                 | Rôle                                  |
| ----------- | ----------------------- | -------------------------------------- |
| Connexion   | `LoginPage.vue`       | Se connecter                           |
| Inscription | `RegisterPage.vue`    | Créer un compte                       |
| Liste       | `PlantListPage.vue`   | Voir, rechercher, repérer les retards |
| Fiche       | `PlantDetailPage.vue` | Détails et actions                    |
| Formulaire  | `PlantFormPage.vue`   | Ajouter / modifier une plante          |
| Réglages   | `SettingsPage.vue`    | Choisir l'heure du rappel              |

## 9. Modèle de données

```ts
export interface Plant {
  id?: string;
  userId: string;
  nom: string;
  espece: string;
  exposition: 'soleil' | 'mi-ombre' | 'ombre';
  frequenceArrosage: number;   // en jours (1 à 365)
  dernierArrosage: string;     // date locale "YYYY-MM-DD"
  notifBaseId: number;         // entier unique pour les ID de notification
  photoUrl?: string;
  notes?: string;
  updatedAt: number;           // timestamp en ms, pour les conflits
}
```

Réglage global (stocké en local avec `@capacitor/preferences`) : `heureRappel`, par défaut `09:00`.
Colonnes SQLite supplémentaires : `sync_pending` et `deleted`.
Token FCM : `users/{uid}/devices/{token}` dans Firestore.

## 10. Technologies utilisées

| Technologie                   | Rôle                                         |
| ----------------------------- | --------------------------------------------- |
| Vue 3 + TypeScript            | Interface et logique                          |
| Ionic                         | Composants mobiles                            |
| Capacitor                     | Fonctions natives et génération Android     |
| Firebase Authentication       | Connexion                                     |
| Firestore                     | Base de données distante                     |
| Firebase Storage              | Photos                                        |
| Firebase Cloud Messaging      | Notifications push                            |
| Capacitor Local Notifications | Rappels d'arrosage                            |
| Capacitor Preferences         | Réglage de l'heure                           |
| Capacitor Network             | Détection du réseau pour la synchronisation |
| SQLite                        | Base locale (hors ligne)                      |
| Pinia                         | État de l'utilisateur connecté              |

## 11. Limites connues

| Limite                | Détail                                                                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Permission            | Android 13+ demande l'autorisation de notifier                                                                                           |
| Précision de l'heure | Android 12+ peut décaler de quelques minutes                                                                                            |
| Économie de batterie | certaines marques (Xiaomi, Huawei...) peuvent bloquer les notifications                                                                  |
| Notifications locales | liées à l'appareil ; sur plusieurs téléphones, elles se corrigent à l'ouverture de l'appli ou grâce à l'écoute Firestore (bonus) |
| Push automatique      | demande des Cloud Functions (plan Blaze) ; envoi manuel pour la démo                                                                    |
| Rythme                | le cycle repart de la date de l'arrosage : pas de jour fixe (ex. « tous les lundis »)                                                  |
| Conflits              | « dernière modification gagnante » : une modification hors ligne peut en écraser une autre                                           |

## 12. Améliorations possibles (hors périmètre)

- Catégories ou pièces (salon, balcon, jardin)
- Historique des arrosages
- Conseils d'entretien par espèce
- Mode sombre
- Envoi automatique de push via Cloud Functions
- Rythme à jour fixe (arrosage chaque lundi)
- Gestion du changement de fuseau horaire

## 13. Priorités de réalisation

| Priorité     | Fonctionnalité                                                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Indispensable | Login, liste triée, fiche, formulaire validé avec image compressée, notification locale + relances, « J'ai arrosé », synchronisation SQLite / Firestore, APK |
| Important     | Réglage de l'heure, états de l'interface, suppression complète, push FCM de test                                                                                |
| Recommandé   | Regroupement des notifications, annulation d'un « J'ai arrosé »                                                                                                 |
| Bonus         | Mot de passe oublié, écoute Firestore multi-appareils, boutons dans la notification                                                                              |
