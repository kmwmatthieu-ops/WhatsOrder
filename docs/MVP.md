Tu es un développeur full-stack senior. Je te fournis un cahier des charges 
complet (en pièce jointe) pour un SaaS de boutiques en ligne pour commerçants 
qui vendent via WhatsApp et les réseaux sociaux. 

IMPORTANT : ne construis PAS tout le cahier des charges. Construis uniquement 
le MVP défini ci-dessous. Tout ce qui n'y figure pas est hors périmètre.

NOM DU PRODUIT : [NOM CHOISI] (utilise-le partout dans l'interface)
LANGUE : interface entièrement en français. Devise : FCFA (entiers, 
séparateur d'espace, ex. "12 500 FCFA"). Pas de décimales.

## STACK
- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (PostgreSQL, Auth, Storage) avec Row Level Security activée
- Déploiement Vercel
- Mobile-first : la majorité des utilisateurs sont sur téléphone avec une 
  connexion lente. Compresser et redimensionner les images à l'upload 
  (max 1200 px, WebP), lazy loading, pages légères.

## RÔLES
1. Commerçant (authentifié) : gère uniquement SA boutique.
2. Client (non authentifié) : navigue et commande sans compte.
3. Admin : voit la liste des boutiques, peut les suspendre/réactiver. 
   Une boutique suspendue affiche "Boutique indisponible" au public.

## MODÈLE DE DONNÉES
- shops : id, owner_id, name, slug (unique), logo_url, description, 
  whatsapp_number (format international), primary_color, delivery_fee (int), 
  pickup_enabled, delivery_enabled, address, status (active/suspended), created_at
- categories : id, shop_id, name
- products : id, shop_id, category_id, name, description, price (int), 
  images (array d'URLs, max 3), options_text (champ libre : tailles, couleurs…), 
  stock (int, nullable = illimité), is_available, created_at
- customers : id, shop_id, name, phone, address, created_at 
  (unique par shop_id + phone, créé/mis à jour automatiquement à chaque commande)
- orders : id, shop_id, customer_id, public_code (unique, lisible, 
  ex. CMD-A7K2), status (new, confirmed, ready, delivered, cancelled), 
  fulfillment (delivery/pickup), delivery_address, delivery_fee, subtotal, 
  total, payment_status (unpaid, partial, paid), payment_method 
  (cash, cash_on_delivery, mobile_money), amount_paid (int), customer_note, 
  created_at
- order_items : id, order_id, product_id, product_name (copie), unit_price 
  (copie), quantity, selected_options (texte)
- order_status_history : id, order_id, status, changed_at

Sécurité : RLS stricte. Un commerçant ne lit/écrit que les lignes de son 
shop_id. Le public peut lire uniquement les shops actives, leurs produits 
disponibles et leurs catégories, et peut créer une commande via une fonction 
serveur sécurisée (jamais d'accès direct en lecture aux commandes). Les prix 
sont TOUJOURS recalculés côté serveur à partir de la base, jamais fiés au 
panier du client. Protéger le formulaire de commande contre le spam 
(rate limiting + champ honeypot).

## FONCTIONNALITÉS À CONSTRUIRE

### 1. Authentification et onboarding
- Inscription / connexion email + mot de passe, mot de passe oublié.
- Après inscription : assistant en 3 étapes (nom de boutique + slug, numéro 
  WhatsApp, logo optionnel). Vérifier la disponibilité du slug en direct.

### 2. Tableau de bord commerçant (mobile-first, navigation en bas sur mobile)
- Accueil : commandes du jour, commandes du mois, chiffre d'affaires du mois 
  (hors annulées), commandes en attente (statut new), bouton "Partager ma 
  boutique".
- Produits : liste, ajout, modification, suppression, bascule 
  disponible/indisponible rapide. Catégories gérées depuis cette même page.
  Limite du plan gratuit : 20 produits (message clair + invitation à passer 
  à un plan supérieur, sans paiement implémenté).
- Commandes : liste filtrable par statut, détail d'une commande avec 
  changement de statut (historique enregistré), enregistrement du paiement 
  (statut, mode, montant reçu), bouton "Contacter le client sur WhatsApp" 
  (lien wa.me avec message prérempli), bouton "Partager le récapitulatif".
- Clients : liste (nom, téléphone, nombre de commandes, total dépensé), 
  détail avec historique des commandes.
- Paramètres : infos de la boutique, logo, couleur, frais de livraison, 
  activer/désactiver livraison et retrait.

### 3. Boutique publique : /[slug]
- En-tête (logo, nom, description, bouton WhatsApp), recherche, filtres par 
  catégorie, grille de produits, fiche produit (photos, prix, options en 
  champ libre, quantité), panier persistant (localStorage) avec total 
  automatique.
- Produits indisponibles ou en rupture : visibles mais non commandables.
- SEO de base et aperçu de partage (Open Graph avec logo et nom) pour que le 
  lien s'affiche bien sur WhatsApp.

### 4. Commande client (sans inscription)
- Formulaire : nom, téléphone, livraison ou retrait, adresse si livraison, 
  note optionnelle.
- Récapitulatif (produits, sous-total, frais, total) avant validation.
- À la validation : création de la commande, code unique, page de 
  confirmation, puis bouton qui ouvre WhatsApp vers le commerçant avec un 
  message prérempli (code commande, détail des articles, total, nom, 
  adresse). Ce message est le cœur du produit : soigne son format.
- Le stock est décrémenté à la commande si le stock est défini.

### 5. Admin minimal : /admin
- Liste des boutiques (nom, propriétaire, date, nb de commandes), 
  suspendre/réactiver. Accès réservé au rôle admin.

### 6. Page d'accueil publique
- Une page simple : promesse, 3 bénéfices, bouton "Créer ma boutique 
  gratuitement". Pas de page tarifs.

## HORS PÉRIMÈTRE (ne pas construire)
API WhatsApp Business, appli mobile native, marketplace, gestion des 
livreurs, fidélité, IA, abonnements payants et facturation, zones de 
livraison multiples, variantes structurées, horaires, bannière, notes 
clients, statistiques avancées, historique de transactions détaillé.

## MÉTHODE DE TRAVAIL
Procède en phases et attends ma validation entre chaque :
1. Schéma de base de données + RLS + authentification + onboarding
2. Gestion boutique, catégories et produits (avec upload d'images optimisé)
3. Boutique publique + panier
4. Commande client + message WhatsApp
5. Suivi des commandes, paiements, clients, statistiques
6. Admin minimal, page d'accueil, finitions et tests

Avant de coder, propose-moi l'arborescence du projet et le schéma SQL 
complet pour validation. Écris du code simple, commenté et facile à faire 
évoluer vers la V2. Ajoute des états de chargement et des messages d'erreur 
clairs en français.

## CRITÈRE D'ACCEPTATION
Un commerçant peut : créer sa boutique, ajouter des produits, partager son 
lien, recevoir une commande d'un client sans compte, la traiter jusqu'à 
"Livrée", enregistrer le paiement, le tout fluide sur un smartphone.
Le produit est indépendant et ne doit dépendre d'aucun autre service SaaS 
(hormis l'infrastructure technique : base de données, hébergement).