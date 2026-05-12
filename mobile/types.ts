export interface PurchaseBehaviorConfig {
  defaultPurchaseMethod: string;
  allowedPurchaseMethods: string[];
  requireAgeVerificationForAdultContent: boolean;
  allowEntertainmentLabeling: boolean;
  minimumPurchaseMinor: number;
  maximumPurchaseMinor: number;
}

export interface PayoutGatewayConfig {
  defaultGateway: string;
  allowedGateways: string[];
}

export interface PluginUsageSummary {
  usageCount: number;
  lastUsedAt?: string;
}

export interface PluginRuntimeState {
  id: string;
  displayName: string;
  category: string;
  status: string;
  description: string;
  enabled: boolean;
  clientVisible: boolean;
  adminOnly: boolean;
  purchaseBehavior: PurchaseBehaviorConfig;
  payoutGateway: PayoutGatewayConfig;
  usage: PluginUsageSummary;
  configurationHints: Record<string, string>;
}

export interface ActivePluginsResponse {
  plugins: PluginRuntimeState[];
}

export type ApiResult<T> = {
  data?: T;
  error?: string;
};
