# Registre des Fonctionnalités Masquées

Ce document répertorie les fonctionnalités volontairement masquées sur l'interface front-end de Bon Waz à Dealer, les interrupteurs centraux associés, et la procédure pour les réactiver à tout moment.

---

## 1. Fonctionnalités Masquées

### Fonctionnalité n° 57 : Alertes sonores et visuelles de nouvelle commande
- **Description** : Carillon sonore Web Audio, vibration mobile haptique, badge rouge clignotant sur l'onglet/icône PWA, popup visuelle de commande entrante en temps réel.
- **Interrupteur central** : `ENABLE_ORDER_AUDIO_AND_VISUAL_ALERTS` dans `src/config/features.ts`
- **Statut actuel** : `false` (Masqué)
- **Impact sur l'interface** :
  - La bannière et la modale de commande en temps réel (`RealtimeOrderAlert`) sont neutralisées.
  - Les boutons de test sonore (« Tester le carillon ») et de badge (« Tester le badge ») sont retirés de la page Paramètres.
  - Les déclenchements audio, vibreur et favicon sont désactivés au niveau applicatif.
  - Les textes faisant référence aux alertes sonores sont adaptés pour ne plus les mentionner.

---

### Fonctionnalité n° 58 : Notifications Web Push sur navigateur et mobile
- **Description** : Demande d'autorisation de notifications système du navigateur et affichage d'alertes natives Web Push via Service Worker / Notification API.
- **Interrupteur central** : `ENABLE_WEB_PUSH_NOTIFICATIONS` dans `src/config/features.ts`
- **Statut actuel** : `false` (Masqué)
- **Impact sur l'interface** :
  - Le bloc d'autorisation et le bouton « Activer les notifications système » sont retirés de la page Paramètres.
  - Aucune invite de permission intempestive n'est envoyée au navigateur.
  - Les appels à `sendSystemNotification` sont neutralisés et retournent `false`.

---

## 2. Procédure de Réactivation

Toutes les fonctionnalités, leur logique interne, le code source et la structure de base de données sont restés **100 % intacts**. Aucune suppression destructive n'a été opérée.

Pour réactiver l'une ou l'autre de ces fonctionnalités :

1. Ouvrez le fichier [`src/config/features.ts`](file:///c:/Users/dell/Downloads/whats-order/src/config/features.ts).
2. Passez l'interrupteur désiré de `false` à `true` :
   ```typescript
   export const FEATURES = {
     // Passer à true pour réactiver les alertes sonores et badges visuels :
     ENABLE_ORDER_AUDIO_AND_VISUAL_ALERTS: true,

     // Passer à true pour réactiver les notifications système Web Push :
     ENABLE_WEB_PUSH_NOTIFICATIONS: true,
   } as const;
   ```
3. Sauvegardez le fichier. L'interface réaffiche immédiatement les options correspondantes (boutons de test, permissions, carillon et bannières) sans aucune migration requise.
