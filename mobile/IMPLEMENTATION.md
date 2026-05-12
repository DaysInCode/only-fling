# Mobile Implementation Notes

## Overview
This mobile implementation adds:
1. **Localization support** for English (en), German (de), and Simplified Chinese (zh)
2. **API-backed plugin rendering** from GET /plugins/active
3. **Age-gated content validation** based on plugin configuration

## Files Added/Modified

### New Files
- `mobile/i18n.ts` - Simple localization with support for 3 languages
- `mobile/types.ts` - TypeScript types mirroring backend API contracts
- `mobile/api.ts` - Lightweight API client for fetching plugins

### Modified Files
- `mobile/App.tsx` - Replaced hard-coded cards with API-backed plugin display

## API Configuration

The mobile app uses the same API base URL pattern as the web app:
- Default: `http://127.0.0.1:7071/api`
- Can be configured via `setApiBaseUrl()` in `api.ts`

## Localization Usage

```typescript
import { setLocale, t } from "./i18n";

// Switch language
setLocale("de"); // or "en", "zh"

// Use translation
const title = t("title");
```

## Plugin Display Logic

The app categorizes plugins into:
- **Active Plugins**: `enabled: true` and `status: "active"`
- **Inactive Plugins**: `enabled: false` or `status !== "active"`

### Age-Gated Detection
A plugin is marked as age-restricted if:
- `purchaseBehavior.requireAgeVerificationForAdultContent === true`
- AND has relevant configuration hints (accountAgeDays, identityStatus)

## Type Safety

All API types are derived from the backend C# models:
- `PluginRuntimeState` maps to `OnlyFling.Api.Core.PluginRuntimeState`
- `PurchaseBehaviorConfig` maps to `OnlyFling.Api.Core.PurchaseBehaviorConfig`
- `ActivePluginsResponse` maps to the `/plugins/active` endpoint response

## Testing

Run typecheck:
```bash
npm --prefix mobile run typecheck
```

Run the app:
```bash
npm --prefix mobile start
```
