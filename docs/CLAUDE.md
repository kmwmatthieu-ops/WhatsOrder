# CLAUDE.md — Bon Waz à Dealer

SaaS où chaque commerçant crée sa boutique en ligne, publie ses produits et reçoit
des commandes (partage par lien, commande finalisée via WhatsApp).
Site : https://bonwazadealer.vercel.app

## Contexte
- Marché de départ : Gabon (mobile, connexion lente). Ambition : international.
  Aucun élément de l'interface ne doit être lié à un seul pays (pas de drapeau).
- Interface en français. Devise : FCFA, entiers, séparateur d'espace ("12 500 FCFA").
- Stack (vérifie dans le code et signale toute différence) : Next.js App Router,
  TypeScript, Tailwind, Supabase (PostgreSQL, Auth, Storage, RLS), Vercel.
- Identité : vert-bleu #0f766e, accent jaune doré #FBBF24, police Poppins.
  Logo : sac de courses + bulle de discussion + "W".

## État du projet
Terminé : MVP, V2-A (audit sécurité), V2-B (zones de livraison, statuts, horaires,
notes clients), V2-C (variantes), V2-D (paiements, statistiques, export CSV),
V2-E (abonnements, tarifs, paiement), dashboard admin.
En cours : audit de conformité au cahier des charges, puis lancement.

## Règles de travail
1. Une tâche à la fois. Ne construis que ce que je demande. Propose les idées
   utiles en fin de réponse, sans les construire.
2. Si le schéma de données change : propose-le d'abord, avec la migration
   (aucune donnée existante perdue), et attends ma validation.
3. Ne change pas la stack ni ne refactorise du code qui marche sans accord.
4. En cas de doute sur une règle métier, pose une question courte avec ta
   recommandation.

## Règles techniques à toujours respecter
- RLS stricte : un commerçant ne lit et n'écrit que les données de sa boutique.
  Le public ne lit jamais commandes ni clients. /admin vérifié côté serveur.
- Prix, totaux, droits et limites de plan toujours recalculés côté serveur.
- Nom et prix des articles copiés sur la commande au moment de l'achat.
- Formulaires publics : limitation de débit et champ anti-robot.
- Aucun secret dans le code. Images compressées (WebP) et chargées en différé.
- Mobile-first. Textes et erreurs en français. États de chargement et états vides.
- Teste en priorité : isolation entre boutiques, calculs d'argent, paiement,
  parcours commande.

## Fin de tâche (réponse courte)
Fait / Pas fait / À tester manuellement sur téléphone / Risques. Puis arrête-toi.
