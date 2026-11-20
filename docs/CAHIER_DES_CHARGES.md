# CAHIER DES CHARGES — WHATSORDER
## Plateforme indépendante de gestion des commandes et boutiques en ligne

### 1. Présentation

WhatsOrder est une application SaaS destinée aux commerçants qui vendent leurs produits sur WhatsApp, Instagram et les réseaux sociaux.

Elle permet à chaque commerçant de créer sa propre boutique en ligne, de publier ses produits, de recevoir des commandes et de gérer ses ventes depuis un tableau de bord personnel.

Chaque commerçant possède un espace indépendant et une boutique publique accessible par un lien partageable.

### 2. Objectifs

- Simplifier la vente en ligne.
- Éviter la perte de commandes dans les conversations.
- Centraliser les commandes.
- Faciliter la présentation des produits.
- Suivre les paiements et les livraisons.
- Permettre aux commerçants de mieux organiser leur activité.

### 3. Utilisateurs

**Administrateur général**
- Gérer les utilisateurs et les boutiques.
- Gérer les abonnements.
- Consulter les statistiques.
- Suspendre ou réactiver des comptes.

**Commerçant**
- Gérer sa boutique.
- Gérer ses produits.
- Recevoir et traiter les commandes.
- Gérer ses clients.
- Suivre ses paiements et livraisons.

**Client**
- Consulter les boutiques.
- Parcourir les produits.
- Ajouter des produits au panier.
- Commander sans inscription obligatoire.

### 4. Fonctionnalités

**A. Authentification**
- Inscription et connexion.
- Récupération du mot de passe.
- Modification du profil.
- Gestion du compte.

**B. Gestion de boutique**
- Nom commercial.
- Logo et bannière.
- Description.
- Numéro WhatsApp.
- Adresse et zone de livraison.
- Horaires.
- Personnalisation visuelle.
- Lien public personnalisé.

**C. Gestion des produits**
- Ajout, modification et suppression.
- Photos.
- Nom et description.
- Prix en FCFA.
- Catégories.
- Variantes : taille, couleur, modèle.
- Quantité disponible.
- Disponibilité du produit.

**D. Boutique publique**
- Catalogue de produits.
- Recherche.
- Filtres par catégorie.
- Fiches détaillées.
- Panier.
- Calcul automatique du total.
- Navigation adaptée aux téléphones.

**E. Commandes**
- Formulaire de commande sans inscription.
- Coordonnées du client.
- Produits et quantités.
- Variantes.
- Adresse de livraison.
- Choix livraison ou retrait.
- Récapitulatif avant validation.
- Identifiant unique de commande.

**F. Suivi des commandes**

Statuts :
- Nouvelle.
- Confirmée.
- En préparation.
- Prête.
- En livraison.
- Livrée.
- Annulée.

Le commerçant peut modifier les statuts et consulter l'historique.

**G. Paiements**
- Espèces.
- Paiement à la livraison.
- Mobile Money enregistré manuellement.
- Paiement partiel.
- Paiement intégral.
- Historique des transactions.

**H. Livraisons**
- Définition des zones.
- Frais de livraison.
- Retrait en boutique.
- Adresse du client.
- Statut de livraison.

**I. Clients**
- Enregistrement automatique.
- Coordonnées.
- Historique des commandes.
- Montant des achats.
- Notes internes.

**J. Statistiques**
- Commandes du jour.
- Commandes du mois.
- Chiffre d'affaires.
- Commandes en attente.
- Commandes terminées.
- Produits les plus vendus.

**K. Partage WhatsApp**
- Partage de la boutique.
- Partage individuel des produits.
- Message prérempli.
- Récapitulatif partageable d'une commande.

### 5. Pages nécessaires

- Accueil public.
- Tarifs.
- Inscription.
- Connexion.
- Boutique publique.
- Panier.
- Validation de commande.
- Confirmation de commande.
- Tableau de bord commerçant.
- Produits.
- Catégories.
- Commandes.
- Clients.
- Paiements.
- Livraisons.
- Statistiques.
- Paramètres.
- Abonnement.
- Administration générale.

### 6. Modèle économique

- Gratuit : limites sur les produits et les commandes.
- Business : davantage de produits et de commandes.
- Premium : statistiques avancées et fonctionnalités supplémentaires.

Tarifs à tester : 3 000 à 12 000 FCFA par mois.

### 7. Exigences techniques

- Application responsive.
- Architecture multi-boutiques.
- Séparation stricte des données.
- Gestion sécurisée des utilisateurs.
- Stockage optimisé des images.
- Protection des formulaires.
- Sauvegardes.
- Performance sur connexion mobile limitée.

### 8. Fonctionnalités exclues du MVP

- API WhatsApp Business automatisée.
- Application mobile native.
- Marketplace générale.
- Gestion avancée des livreurs.
- Programme de fidélité.
- Intelligence artificielle.

### 9. Validation du MVP

Un commerçant doit pouvoir créer sa boutique, ajouter des produits, partager son lien, recevoir une commande, la traiter, enregistrer son paiement et suivre sa livraison.

**Le produit est indépendant : il ne doit pas dépendre des trois autres SaaS.**