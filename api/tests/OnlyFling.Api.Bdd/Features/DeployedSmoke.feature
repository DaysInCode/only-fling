@deployed
Feature: Deployed public API smoke
  Deployed public API routes should stay healthy after release.

  Scenario: Public routes stay healthy on the deployed app
    When I send a "GET" request to "/health" on the "stable" ring
    Then the response status should be 200
    And the response JSON at "status" should equal "ok"
    And the response JSON at "deploymentRing" should equal "primary"

    When I send a "GET" request to "/connectors" on the "stable" ring
    Then the response status should be 200

    When I send a "GET" request to "/connectors/modules" on the "stable" ring
    Then the response status should be 200
    And the response JSON array at "modules" should contain an object with:
      | path | value          |
      | id   | studio-preview |

    When I send a "GET" request to "/plugins/active" on the "stable" ring
    Then the response status should be 200

    When I send a "GET" request to "/items" on the "stable" ring
    Then the response status should be 200
    And the response JSON at "commission.platformFeePercent" should equal "5"
