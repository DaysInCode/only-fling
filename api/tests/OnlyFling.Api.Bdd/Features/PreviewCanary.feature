Feature: Preview and canary enrollment
  Stable and canary API rings should expose preview modules only for enrolled accounts.

  Scenario: Preview modules require enrollment and canary exposure
    Given I sign in on the "stable" ring as "anna@example.com" using device "BDD Anna Preview" and store it as "anna"

    When I send a "GET" request to "/health" on the "stable" ring
    Then the response status should be 200
    And the response JSON at "deploymentRing" should equal "primary"

    When I send a "GET" request to "/health" on the "canary" ring
    Then the response status should be 200
    And the response JSON at "deploymentRing" should equal "canary"

    When I send a "GET" request to "/connectors/modules" on the "stable" ring as "anna"
    Then the response status should be 200
    And the response JSON array at "modules" should contain an object with:
      | path                         | value          |
      | id                           | studio-preview |
      | eligibility.allowed          | true           |
      | eligibility.effectiveChannel | stable         |
      | eligibility.effectiveRoute   | /studio/sessions |
    And the response JSON array at "modules" should contain an object with:
      | path               | value                  |
      | id                 | adult-platform-preview |
      | eligibility.reason | preview-enrollment-required |

    When I send a "POST" request to "/connectors/preview/enroll" on the "stable" ring as "anna" with JSON:
      """
      {
        "moduleId": "studio-preview"
      }
      """
    Then the response status should be 201

    When I send a "POST" request to "/connectors/preview/enroll" on the "stable" ring as "anna" with JSON:
      """
      {
        "moduleId": "adult-platform-preview"
      }
      """
    Then the response status should be 201

    When I send a "GET" request to "/connectors/modules" on the "stable" ring as "anna"
    Then the response status should be 200
    And the response JSON array at "modules" should contain an object with:
      | path                         | value          |
      | id                           | studio-preview |
      | eligibility.effectiveChannel | stable         |
      | eligibility.effectiveRoute   | /studio/sessions |
    And the response JSON array at "modules" should contain an object with:
      | path                | value                  |
      | id                  | adult-platform-preview |
      | eligibility.allowed | false                  |
      | eligibility.reason  | canary-ring-required   |

    When I send a "GET" request to "/connectors/modules" on the "canary" ring as "anna"
    Then the response status should be 200
    And the response JSON array at "modules" should contain an object with:
      | path                         | value                           |
      | id                           | studio-preview                  |
      | eligibility.allowed          | true                            |
      | eligibility.effectiveChannel | preview                         |
      | eligibility.effectiveRoute   | /studio/sessions?channel=preview |
    And the response JSON array at "modules" should contain an object with:
      | path                         | value                                       |
      | id                           | adult-platform-preview                      |
      | eligibility.allowed          | true                                        |
      | eligibility.effectiveChannel | preview                                     |
      | eligibility.effectiveRoute   | /account/verification-readiness?channel=preview |
