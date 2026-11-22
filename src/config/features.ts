/**
 * src/config/features.ts
 *
 * Registre central des interrupteurs de fonctionnalités (Feature Flags).
 * - vrai (true)  : la fonctionnalité est visible et active dans l'interface front-end.
 * - faux (false) : la fonctionnalité est masquée de l'interface (menus, boutons, textes),
 *                  et ses déclenchements sont neutralisés.
 *
 * Pour réactiver une fonctionnalité, passez simplement son interrupteur sur `true`.
 */

export const FEATURES = {
  /**
   * Fonctionnalité n° 57 : Alertes sonores et visuelles de nouvelle commande
   * (Carillon sonore Web Audio, vibration mobile haptique, badge rouge clignotant onglet/favicon/PWA, popup visuelle temps réel).
   * Valeur : false (masqué)
   */
  ENABLE_ORDER_AUDIO_AND_VISUAL_ALERTS: false,

  /**
   * Fonctionnalité n° 58 : Notifications Web Push sur navigateur et mobile
   * (Demande d'autorisation de notifications système, Web Push / ServiceWorker showNotification).
   * Valeur : false (masqué)
   */
  ENABLE_WEB_PUSH_NOTIFICATIONS: false,
} as const;

export type FeatureKey = keyof typeof FEATURES;

export function isFeatureEnabled(key: FeatureKey): boolean {
  return Boolean(FEATURES[key]);
}
