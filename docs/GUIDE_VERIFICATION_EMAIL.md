# Guide de configuration des E-mails de Vérification

Ce guide vous explique comment configurer l'envoi des e-mails de confirmation avec le nom de support client personnalisé et le modèle HTML officiel avec code OTP à 6 chiffres.

---

## 1. Comment fonctionne le nom d'affichage de l'email ?

Dans le protocole e-mail standard (RFC 5322), vous pouvez utiliser votre adresse e-mail personnelle tout en affichant un nom de marque professionnel :

- **Nom d'affichage (Display Name)** : `Support Client — Bon Waz à Dealer`
- **Adresse e-mail technique** : `votre-email@gmail.com` (ou autre fournisseur)

### Ce que voit l'utilisateur :
Dans sa boîte de réception (sur Gmail, iPhone Mail, Outlook, etc.), l'utilisateur voit uniquement en grand :
> **Support Client — Bon Waz à Dealer**

### Lorsqu'il répond à l'e-mail :
Lorsqu'il clique sur « Répondre », le message est envoyé directement à votre adresse e-mail personnelle. Vous pouvez donc lui répondre directement depuis votre boîte de messagerie habituelle.

---

## 2. Configuration dans votre tableau de bord Supabase

Rendez-vous dans la console Supabase de votre projet (**hzexwajoxzhistuqleek**) :

### Étape A : Configurer l'expéditeur (Sender Name & Email)
1. Allez dans **Project Settings** (icône d'engrenage en bas à gauche) > **Authentication** > onglet **SMTP Settings** (ou **Email Settings**).
2. Dans le champ **Sender Name** (Nom de l'expéditeur), renseignez :
   ```
   Support Client — Bon Waz à Dealer
   ```
3. Dans le champ **Sender Email** (ou votre serveur SMTP personnalisé), renseignez votre adresse e-mail qui recevra les réponses du support.

---

### Étape B : Coller le Template HTML avec le Code OTP
1. Allez dans le menu **Authentication** (colonne de gauche) > **Email Templates**.
2. Cliquez sur le modèle **Confirm signup** (Confirmation d'inscription).
3. Dans le champ **Subject** (Objet de l'e-mail), renseignez par exemple :
   ```
   Votre code de confirmation Bon Waz à Dealer : {{ .Token }}
   ```
4. Dans l'éditeur **Body (HTML)**, remplacez tout le contenu par le code contenu dans le fichier :
   [`docs/EMAIL_CONFIRMATION_TEMPLATE.html`](./EMAIL_CONFIRMATION_TEMPLATE.html)
5. Cliquez sur **Save** (Enregistrer).

---

## 3. Variables utilisées dans le template

- `{{ .Token }}` : Génère automatiquement le code à 6 chiffres sécurisé.
- `{{ .ConfirmationURL }}` : Génère le lien cliquable alternatif en 1-clic.
- `{{ .SiteURL }}` : L'adresse URL du site de la plateforme.
