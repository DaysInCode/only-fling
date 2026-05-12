Feature: Admin seeding and operational visibility
  Admin-only seed imports should support filesystem manifests, remain auditable, and keep operational surfaces independent.

  Scenario: Admin imports seed data from the filesystem and non-admin callers stay blocked
    Given I sign in on the "stable" ring as "admin@example.com" using device "BDD Admin Seeding" and store it as "admin"
    And I create a file at "seed\admin-seed.json" with JSON:
      """
      {
        "users": [
          {
            "email": "seeded@example.com",
            "displayName": "Seeded Creator",
            "role": "creator"
          }
        ],
        "wallets": [
          {
            "email": "seeded@example.com",
            "creditsMinor": 4800,
            "currency": "GBP"
          }
        ],
        "plugins": [
          {
            "pluginId": "stripe",
            "enabled": true,
            "allowedPurchaseMethods": ["credits"]
          }
        ]
      }
      """

    When I send a "POST" request to "/admin/seeding/import" on the "stable" ring as "admin" with JSON:
      """
      {
        "sourcePath": "seed\\admin-seed.json"
      }
      """
    Then the response status should be 201
    And the response JSON at "operation.status" should equal "applied"
    And the response JSON at "operation.appliedCounts.users" should equal "1"

    When I send a "GET" request to "/admin/users" on the "stable" ring as "admin"
    Then the response status should be 200
    And the response JSON array at "users" should contain an object with:
      | path        | value              |
      | email       | seeded@example.com |
      | displayName | Seeded Creator     |

    When I send a "GET" request to "/admin/seeding/history" on the "stable" ring as "admin"
    Then the response status should be 200
    And the response JSON array at "operations" should contain an object with:
      | path   | value   |
      | status | applied |

    When I send a "GET" request to "/admin/monitoring/summary" on the "stable" ring as "admin"
    Then the response status should be 200
    And the response JSON at "summary.seedImports" should equal "2"

    Given I sign in on the "stable" ring as "seeded@example.com" using device "BDD Seeded Browser" and store it as "seeded"

    When I send a "GET" request to "/account/wallet" on the "stable" ring as "seeded"
    Then the response status should be 200
    And the response JSON at "wallet.creditsMinor" should equal "4800"

    When I send a "POST" request to "/admin/seeding/import" on the "stable" ring as "seeded" with JSON:
      """
      {
        "sourcePath": "seed\\admin-seed.json"
      }
      """
    Then the response status should be 403
