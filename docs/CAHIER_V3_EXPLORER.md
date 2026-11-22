# CAHIER DES CHARGES V3 — Explorer (fil de produits) et visibilité

 Ce document s'ajoute au cahier des charges
d'origine. Il remplace la ligne « Marketplace générale » de la section 8, qui était
hors périmètre du MVP et entre maintenant dans le périmètre.

## 1. Objectif

Aujourd'hui, un client doit connaître le lien de chaque boutique. La V3 ajoute un
**fil de produits (Explorer)** qui affiche les produits de toutes les boutiques au
même endroit. Le client voit un produit qui lui plaît, clique, et arrive sur la
boutique. Les commerçants gagnent en visibilité, et les forfaits payants se
différencient clairement.

## 2. Décisions retenues (à confirmer)

1. **Explorer est public** : n'importe qui peut le parcourir sans compte (utile pour
   Google). Le **compte client** sert à suivre des boutiques et à avoir un fil
   personnalisé.
2. **Commander reste possible sans compte**, comme dans le cahier d'origine.
3. **Forfaits** :
   - Gratuit : visibilité normale.
   - Business : visibilité renforcée, sans badge.
   - Premium : badge de certification bleu + visibilité maximale.
4. **Le badge bleu signifie « boutique vérifiée »** : il apparaît quand l'administrateur
   a validé l'abonnement Premium (c'est déjà lui qui valide les abonnements) et, si
   possible, l'identité du commerçant. Un badge simplement payé, sans vérification,
   trompe les clients.
5. **Bouton communauté WhatsApp** : placé dans le menu latéral du tableau de bord,
   **au-dessus** du bouton Déconnexion. Sur mobile : dans le menu « Plus » ou le menu
   principal, selon ce qui est le plus simple.

## 3. Fonctionnalités

### A. Compte client
- Inscription et connexion par e-mail et mot de passe, mot de passe oublié.
- Case de consentement à l'inscription pour l'analyse de l'activité (voir section 6).
- Un commerçant connecté peut aussi parcourir Explorer et suivre des boutiques.
- Pages : inscription/connexion client, « Mes boutiques suivies », paramètres du
  compte (changer le mot de passe, désactiver la personnalisation, effacer son
  historique, supprimer son compte).

### B. Explorer (fil de produits)
- Page publique `/explorer` : grille de produits de **toutes** les boutiques actives,
  chargement progressif (défilement infini), images légères, rapide sur mobile.
- Chaque carte : photo, nom, prix en FCFA, nom de la boutique (avec badge si
  certifiée). Un clic ouvre la fiche produit dans la boutique du commerçant.
- Recherche par mot et filtres par catégorie.
- Onglets : « Pour vous » (si connecté) / « Tendances » / « Boutiques suivies ».
- Un produit apparaît seulement si : boutique active, produit disponible, photo
  présente. Les produits en rupture passent en fin de liste.
- Le commerçant peut désactiver l'apparition de ses produits dans Explorer
  (option dans ses paramètres, activée par défaut).

### C. Suivre une boutique
- Bouton « Suivre » sur la boutique et sur chaque carte produit.
- Compteur d'abonnés visible sur la boutique (ex. « 128 abonnés »).
- Les nouveaux produits et les promotions d'une boutique suivie apparaissent dans le
  fil du client. Pas de notification externe en V3, seulement le fil.
- Le commerçant voit son nombre d'abonnés dans son tableau de bord.
- Pour garder le lien d'une boutique, le client peut aussi la suivre : pas besoin de
  retenir 5 liens.

### D. Classement (l'« algorithme »)
Commencer simple, avec un score calculé à partir de règles claires, pas d'IA.
Chaque produit reçoit un score :

- **Pertinence pour le client** (le plus important) : catégories qu'il consulte, clique
  ou commande, boutiques qu'il suit, mots qu'il cherche.
- **Fraîcheur** : les produits récents montent.
- **Popularité** : vues, clics, commandes sur les derniers jours.
- **Coefficient de forfait** : Gratuit ×1, Business ×1,5, Premium ×2,5. Ces valeurs
  sont modifiables depuis l'admin, sans toucher au code.
- **Garde-fous** : le coefficient de forfait ne peut jamais placer un produit sans
  rapport avec la recherche devant un produit pertinent ; pas plus de 2 produits de
  la même boutique à la suite ; les nouvelles boutiques reçoivent un petit coup de
  pouce les premiers jours.
- **Visiteur sans compte** : tendances et fraîcheur uniquement.
- Le score est calculé côté serveur, jamais dans le navigateur.

### E. Forfaits et badge
- Ajouter aux paramètres de chaque forfait (modifiables depuis l'admin) :
  coefficient de visibilité, et droit au badge de certification.
- Badge : coche bleue à côté du nom de la boutique (en-tête de la boutique, cartes
  produit, fil). Il disparaît à l'expiration du forfait.
- Page Tarifs et page Abonnement : afficher ces nouveaux avantages.

### F. Bouton communauté WhatsApp
- Lien d'invitation modifiable depuis l'admin (réglage de la plateforme). Si le lien
  est vide, le bouton n'apparaît pas.
- Visible pour tous les commerçants, quel que soit le forfait, et aussi dans
  l'espace client.

## 4. Sécurité et modération (indispensable)

Un fil public attire les abus. Prévoir :
- Bouton « Signaler » sur chaque produit et boutique.
- Admin : file des signalements, masquer un produit, suspendre une boutique. Un
  produit masqué ou une boutique suspendue disparaît d'Explorer immédiatement.
- Mettre à jour les CGU : liste des produits interdits, règles de modération.
- Règles d'accès en base : un client ne lit que son propre historique et ses propres
  abonnements ; l'activité des clients n'est jamais visible par les commerçants
  (seulement le nombre d'abonnés, pas la liste).

## 5. Données à prévoir (l'agent propose le schéma exact)

Abonnements client-boutique, activité (vues, clics, recherches, commandes) liée au
compte client, signalements, paramètres de forfait (coefficient, badge), lien de la
communauté, option « apparaître dans Explorer » par boutique.

## 6. Vie privée

- L'activité n'est enregistrée que pour les clients connectés qui ont donné leur
  consentement. Aucune donnée personnelle dans les journaux d'erreurs.
- Le client peut désactiver la personnalisation et effacer son historique.
- Mettre à jour la politique de confidentialité.

## 7. Plan de construction (une version à la fois)

- **V3-A** : compte client, page Explorer simple (tendances + recherche + filtres),
  option « apparaître dans Explorer », bouton « Signaler » et modération admin.
- **V3-B** : suivre une boutique, compteur d'abonnés, onglet « Boutiques suivies »,
  affichage des nouveautés des boutiques suivies.
- **V3-C** : coefficients par forfait, badge de certification, nouveaux avantages sur
  les pages Tarifs et Abonnement, bouton communauté WhatsApp.
- **V3-D** : personnalisation (« Pour vous ») avec suivi de l'activité, consentement,
  effacement de l'historique.

Critère de validation : un client crée un compte, parcourt Explorer, suit deux
boutiques, voit leurs nouveautés dans son fil, et ouvre un produit en un clic. Un
commerçant Premium voit son badge et ses produits remontés ; un commerçant Gratuit
reste visible.

## 8. Hors périmètre V3

Notifications push ou WhatsApp automatiques aux abonnés, historique « Mes commandes »
du client, avis et notes, messagerie client-commerçant, publicité payante à la
carte, apprentissage automatique (IA), application mobile native.

## 9. Règles pour l'agent

- Une version à la fois. Propose le schéma et attends ma validation avant de coder.
- Aucune donnée existante perdue. Les boutiques existantes restent en place.
- Tests : isolation des données clients, forfait et badge vérifiés côté serveur,
  produits masqués absents d'Explorer, classement identique pour deux visiteurs
  identiques.
- Réponse courte à la fin : fait / à tester sur téléphone / décisions à valider.
