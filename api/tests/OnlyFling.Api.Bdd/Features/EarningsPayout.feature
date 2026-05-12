Feature: Sale, earnings, and payout flow
  Earnings totals and payout requests should preserve the payout availability contract.

  Scenario: Account earnings summary and payout requests stay in sync
    Given I sign in on the "stable" ring as "anna@example.com" using device "BDD Anna Earnings" and store it as "anna"

    When I send a "GET" request to "/earnings/summary" on the "stable" ring as "anna"
    Then the response status should be 200
    And the response JSON at "summary.totalGrossMinor" should equal "48200"
    And the response JSON at "summary.totalNetMinor" should equal "42416"
    And the response JSON at "summary.totalFeesMinor" should equal "5784"
    And the response JSON at "summary.availableForPayoutMinor" should equal "23516"

    When I send a "GET" request to "/payouts" on the "stable" ring as "anna"
    Then the response status should be 200
    And the response JSON array at "payouts" should contain an object with:
      | path   | value           |
      | id     | payout-anna-paid |
      | status | paid            |
    And the response JSON array at "payouts" should contain an object with:
      | path   | value                |
      | id     | payout-anna-processing |
      | status | processing           |

    When I send a "POST" request to "/payouts/request" on the "stable" ring as "anna" with JSON:
      """
      {
        "amountMinor": 3500,
        "gateway": "paypalPayout",
        "note": "BDD payout request"
      }
      """
    Then the response status should be 201
    And the response JSON at "payout.status" should equal "pending"
    And the response JSON at "payout.amountMinor" should equal "3500"
    And the response JSON at "payout.gateway" should equal "paypalPayout"
    And I save the response JSON at "payout.id" as "bddPayoutId"

    When I send a "GET" request to "/payouts" on the "stable" ring as "anna"
    Then the response status should be 200
    And the response JSON at "summary.availableForPayoutMinor" should equal "20016"
    And the response JSON array at "payouts" should contain an object with:
      | path        | value          |
      | id          | {{bddPayoutId}} |
      | status      | pending        |
      | amountMinor | 3500           |
