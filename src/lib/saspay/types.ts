/**
 * Types pour l'intégration de l'API SasPay (v1).
 * Source de vérité : Spécification OpenAPI /api-reference/openapi.json
 * Base URL : https://api.saspay.me/api/v1
 */

export type SaspayCurrency = "XOF" | "XAF" | "GNF" | "CDF" | "USD" | "EUR" | string;

export type SaspayTransactionStatus = "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";

export type SaspayFeeChargeMode = "ADD_ON" | "DEDUCTED";

export interface SaspayCustomer {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export interface SaspayCheckoutSessionInput {
  amount: string; // Format décimal : "5000.00", JAMAIS de flottant
  currency: SaspayCurrency;
  customer_email: string;
  customer_name: string;
  customer_phone?: string;
  description?: string;
  country?: string; // Code ISO2 (ex: "BJ", "CI", "SN")
  return_url?: string;
  metadata?: Record<string, unknown>;
  fee_charge_mode?: SaspayFeeChargeMode;
  expires_at?: string; // ISO 8601
}

export interface SaspayCheckoutSession {
  id: string;
  merchant: string;
  created_by_member?: string;
  slug: string;
  checkout_url: string;
  amount: string;
  currency: SaspayCurrency;
  description?: string;
  country?: string;
  customer_email: string;
  customer_name: string;
  customer_phone?: string;
  return_url?: string;
  metadata?: Record<string, unknown>;
  fee_charge_mode?: string;
  status: SaspayTransactionStatus;
  expires_at?: string | null;
  transaction?: string | null;
  payment_link?: string | null;
  paid_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaspayCheckoutSessionStatusResponse {
  id: string;
  status: SaspayTransactionStatus;
  paid_at?: string | null;
  transaction?: {
    id: string;
    reference: string;
    status: SaspayTransactionStatus;
    requested_amount: string;
    debited_amount: string;
    net_amount: string;
    currency: SaspayCurrency;
  } | null;
}

export interface SaspaySoftpayInput {
  amount: string; // Format décimal : "2500.00"
  currency: SaspayCurrency;
  country: string; // Code ISO2 ("BJ", "CI", etc.)
  network: string; // Ex: "mtn_bj", "moov_bj", "orange_ci", "wave_ci"
  customer: SaspayCustomer;
  description?: string;
  fee_charge_mode?: SaspayFeeChargeMode;
  preferred_gateway?: string;
  metadata?: Record<string, unknown>;
  otp?: string;
}

export interface SaspaySoftpayResponse {
  message?: string;
  id: string;
  status: SaspayTransactionStatus;
  checkout_url?: string;
}

export interface SaspayPaymentVerifyResponse {
  message?: string;
  id: string;
  reference: string;
  merchant: string;
  customer: string;
  country: string;
  network?: string;
  transaction_type: string;
  flow_direction: string;
  description?: string;
  requested_amount: string;
  fee_charge_mode?: SaspayFeeChargeMode;
  client_fee?: string;
  gateway_fee?: string;
  platform_fee?: string;
  debited_amount: string;
  net_amount: string;
  currency: SaspayCurrency;
  status: SaspayTransactionStatus;
  current_gateway?: string;
  external_reference?: string;
  created_at: string;
  updated_at: string;
}

export interface SaspayWebhookPayload<T = Record<string, unknown>> {
  event: string;
  data: T;
}

export interface SaspayCountry {
  id: string;
  name: string;
  code: string; // ISO2
  currency: string;
  phone_code: string;
}

export interface SaspayNetwork {
  id: string;
  name: string;
  code: string;
  country: string;
  is_active: boolean;
}

export class SaspayApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "SaspayApiError";
  }
}
