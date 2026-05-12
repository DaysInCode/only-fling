Feature: Commerce and payment controls
  Credits purchases, invoices, age restrictions, and admin plugin controls should stay isolated and auditable.

  Scenario: Adult purchase flow respects account settings and admin payment controls
    Given I sign in on the "stable" ring as "admin@example.com" using device "BDD Admin Payments" and store it as "admin"
    And I sign in on the "stable" ring as "zoe@example.com" using device "BDD Buyer Mobile" and store it as "buyer"

    When I send a "GET" request to "/plugins/active" on the "stable" ring as "buyer"
    Then the response status should be 200
    And the response JSON array at "plugins" should contain an object with:
      | path     | value            |
      | id       | stripe           |
      | enabled  | true             |
      | category | payment          |

    When I send a "POST" request to "/media/items/purchase" on the "stable" ring as "buyer" with JSON:
      """
      {
        "mediaItemId": "media-anna-adult-1",
        "paymentMethod": "credits"
      }
      """
    Then the response status should be 403
    And the response JSON at "error" should equal "adult-content-age-verification-required"

    When I send a "POST" request to "/admin/plugins/config" on the "stable" ring as "buyer" with JSON:
      """
      {
        "pluginId": "stripe",
        "purchaseBehavior": {
          "defaultPurchaseMethod": "stripeCheckout",
          "allowedPurchaseMethods": ["stripeCheckout"],
          "requireAgeVerificationForAdultContent": true,
          "allowEntertainmentLabeling": true,
          "minimumPurchaseMinor": 100,
          "maximumPurchaseMinor": 250000
        }
      }
      """
    Then the response status should be 403

    When I send a "POST" request to "/account/settings" on the "stable" ring as "buyer" with JSON:
      """
      {
        "notifications": {
          "email": true,
          "push": true,
          "product": true,
          "payouts": true,
          "security": true
        },
        "deviceSync": {
          "enabled": true
        },
        "payoutPreferences": {
          "settlementCurrency": "GBP",
          "schedule": "manual",
          "methodStatus": "not-configured"
        },
        "purchasePreferences": {
          "ageVerifiedAdult": true,
          "labelAsEntertainment": true,
          "entertainmentLabelValue": "Leisure content value"
        }
      }
      """
    Then the response status should be 200
    And the response JSON at "settings.purchasePreferences.ageVerifiedAdult" should equal "true"

    When I send a "POST" request to "/admin/plugins/config" on the "stable" ring as "admin" with JSON:
      """
      {
        "pluginId": "stripe",
        "purchaseBehavior": {
          "defaultPurchaseMethod": "stripeCheckout",
          "allowedPurchaseMethods": ["stripeCheckout"],
          "requireAgeVerificationForAdultContent": true,
          "allowEntertainmentLabeling": true,
          "minimumPurchaseMinor": 100,
          "maximumPurchaseMinor": 250000
        }
      }
      """
    Then the response status should be 200

    When I send a "POST" request to "/media/items/purchase" on the "stable" ring as "buyer" with JSON:
      """
      {
        "mediaItemId": "media-anna-adult-1",
        "paymentMethod": "credits"
      }
      """
    Then the response status should be 409
    And the response JSON at "error" should equal "payment-method-not-allowed"

    When I send a "POST" request to "/admin/plugins/config" on the "stable" ring as "admin" with JSON:
      """
      {
        "pluginId": "stripe",
        "purchaseBehavior": {
          "defaultPurchaseMethod": "credits",
          "allowedPurchaseMethods": ["credits", "stripeCheckout"],
          "requireAgeVerificationForAdultContent": true,
          "allowEntertainmentLabeling": true,
          "minimumPurchaseMinor": 100,
          "maximumPurchaseMinor": 250000
        }
      }
      """
    Then the response status should be 200

    When I send a "GET" request to "/account/wallet" on the "stable" ring as "buyer"
    Then the response status should be 200
    And the response JSON at "wallet.creditsMinor" should equal "6500"

    When I send a "POST" request to "/media/items/purchase" on the "stable" ring as "buyer" with JSON:
      """
      {
        "mediaItemId": "media-anna-adult-1",
        "paymentMethod": "credits"
      }
      """
    Then the response status should be 201
    And the response JSON at "purchase.status" should equal "completed"
    And the response JSON at "invoice.status" should equal "paid"
    And the response JSON at "invoice.label" should equal "Leisure content value"
    And the response JSON at "wallet.creditsMinor" should equal "4300"

    When I send a "GET" request to "/account/invoices" on the "stable" ring as "buyer"
    Then the response status should be 200
    And the response JSON array at "invoices" should contain an object with:
      | path    | value                 |
      | label   | Leisure content value |
      | status  | paid                  |
      | totalMinor | 2200               |
