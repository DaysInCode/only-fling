Feature: Integration and module management safeguards
  Connector and module catalogs should stay guarded and age restricted.

  Scenario: Guarded modules stay template-only and age restrictions are enforced
    Given I sign in on the "stable" ring as "anna@example.com" using device "BDD Anna Modules" and store it as "anna"
    And I sign in on the "stable" ring as "luca@example.com" using device "BDD Luca Modules" and store it as "luca"

    When I send a "GET" request to "/connectors/modules" on the "stable" ring as "anna"
    Then the response status should be 200
    And the response JSON array at "connectors" should contain an object with:
      | path   | value    |
      | id     | onlyfans |
      | status | template |
    And the response JSON array at "modules" should contain an object with:
      | path                           | value                     |
      | id                             | adult-platform-readiness |
      | eligibility.allowed            | true                      |
      | eligibility.requiresCanaryRing | true                      |
      | eligibility.effectiveChannel   | stable                    |
    And the response JSON array at "modules" should contain an object with:
      | path                                | value                  |
      | id                                  | adult-platform-preview |
      | eligibility.allowed                 | false                  |
      | eligibility.requiresPreviewEnrollment | true                 |
      | eligibility.reason                  | preview-enrollment-required |

    When I send a "GET" request to "/connectors/modules" on the "stable" ring as "luca"
    Then the response status should be 200
    And the response JSON array at "modules" should contain an object with:
      | path                | value                     |
      | id                  | adult-platform-readiness |
      | eligibility.allowed | false                     |
      | eligibility.reason  | account-age-restricted   |
    And the response JSON array at "modules" should contain an object with:
      | path                | value               |
      | id                  | creator-analytics   |
      | eligibility.allowed | true                |
      | eligibility.effectiveChannel | stable      |
