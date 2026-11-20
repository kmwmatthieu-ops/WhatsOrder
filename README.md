# WhatsOrder 🛍️

> **Plateforme SaaS indépendante de boutiques en ligne pour commerçants qui vendent via WhatsApp et les réseaux sociaux.**

Construit selon le cahier des charges et la spécification **MVP stricte** de `docs/MVP.md`.

---

## ⚡ Stack Technique

- **Framework :** Next.js 16 (App Router, Server Actions, Server Components)
- **Langage :** TypeScript (mode strict)
- **Styles :** Tailwind CSS v4 (thème responsive mobile-first dès 360px)
- **Base de données & Auth :** Supabase (PostgreSQL 15+, Row Level Security, Storage WebP)
- **Traitement d'images :** Redimensionnement canvas côté client + compression **WebP qualité 80** avec `sharp` côté serveur
- **Devise :** FCFA (entiers uniquement, sans virgule, espace insécable : `12 500 FCFA`)
- **Tests :** Vitest (28 tests unitaires & RLS d'isolation multi-boutiques)

---

## 📁 Structure du Projet

```text
whats-order/
├─ src/
│  ├─ app/
│  │  ├─ page.tsx                     # Accueil public (promesse + 3 bénéfices + CTA)
│  │  ├─ [slug]/                      # Boutique publique du commerçant
│  │  │  ├─ page.tsx                  # Catalogue, filtres, recherche, carrousel photos
│  │  │  └─ commande/                 # Formulaire de commande sans inscription
│  │  │     ├─ page.tsx               # Tunnel de commande (livraison / retrait)
│  │  │     └─ [code]/page.tsx        # Confirmation & bouton WhatsApp préformaté
│  │  ├─ (auth)/                      # Inscription, Connexion, Mot de passe oublié
│  │  ├─ onboarding/                  # Assistant 3 étapes (Nom + Slug en direct, WhatsApp, Logo)
│  │  ├─ tableau-de-bord/             # Espace commerçant mobile-first
│  │  │  ├─ page.tsx                  # 4 KPIs (attente, jour, mois, CA) + dernières commandes
│  │  │  ├─ commandes/                # Suivi statuts, historique, règlement, contact client
│  │  │  ├─ produits/                 # Gestion articles (limite 20) et catégories
│  │  │  ├─ clients/                  # Répertoire clients, panier moyen et historique
│  │  │  └─ parametres/               # Coordonnées, couleur, frais et modes livraison/retrait
│  │  ├─ admin/                       # Supervision et modération (suspendre/réactiver)
│  │  └─ api/upload/route.ts          # Conversion WebP & stockage Supabase
│  ├─ components/                     # Composants réutilisables (UI, Shop, Orders, Products, Cart)
│  ├─ lib/                            # Logique métier (Supabase, Cart, WhatsApp, Validation, Phone)
│  └─ types/database.ts               # Typage TypeScript de la base
├─ supabase/
│  ├─ full_schema.sql                 # Script SQL tout-en-un à coller dans Supabase
│  └─ migrations/                     # Migrations séquentielles (schema, rls, storage, order, admin)
└─ tests/                             # Suites de tests automatisés Vitest
```

---

## 🚀 Démarrage Rapide

### 1. Prérequis
- Node.js 20+
- Un projet Supabase gratuit (https://supabase.com)

### 2. Configuration Supabase en 1 clic
1. Ouvrez votre projet sur Supabase > **SQL Editor**.
2. Copiez et exécutez le script complet : [supabase/full_schema.sql](supabase/full_schema.sql).
3. Rendez-vous dans **Project Settings > API** pour récupérer vos clés.

### 3. Variables d'environnement
Créez un fichier `.env.local` à la racine :
```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Lancement en développement
```bash
# Installation des dépendances
npm install

# Démarrage du serveur local
npm run dev

# Pour tester depuis votre smartphone sur le même Wi-Fi :
npm run dev -- -H 0.0.0.0
```

---

## 🧪 Exécution des Tests

```bash
# Lancer tous les tests unitaires et de sécurité
npm test

# Lancer la vérification TypeScript
npm run typecheck

# Tester le build de production
npm run build
```

---

## 🔒 Sécurité & Règles Clés du MVP

1. **Isolation RLS hermétique** : Un commerçant ne peut lire ou modifier que les données de sa propre boutique.
2. **Confidentialité client** : Les commandes et clients ne sont jamais accessibles en lecture directe par le public.
3. **Intégrité financière** : Les prix des paniers sont **recalculés côté serveur** à partir de la base de données.
4. **Anti-spam intégré** : Protection par champ honeypot invisible et contrôle de débit sans service tiers.
5. **Plafond 20 produits** : Verrouillé par déclencheur PostgreSQL anti-concurrence.
6. **Autonomie absolue** : Zéro dépendance à des services payants ou API tierces.
