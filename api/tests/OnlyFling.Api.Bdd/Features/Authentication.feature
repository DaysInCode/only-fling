Feature: Authentication and session authorization
  Passwordless access should issue bearer sessions and honor session revocation.

  Scenario: Passwordless sign-in issues and revokes API sessions
    When I send a "GET" request to "/me" on the "stable" ring
    Then the response status should be 401
    And the response JSON at "error" should equal "unauthorized"

    Given I sign in on the "stable" ring as "bdd-auth@example.com" using device "BDD Browser" and store it as "owner"
    And I sign in on the "stable" ring as "bdd-auth@example.com" using device "BDD Tablet" and store it as "ownerTablet"

    When I send a "GET" request to "/me" on the "stable" ring as "owner"
    Then the response status should be 200
    And the response JSON at "user.email" should equal "bdd-auth@example.com"
    And the response JSON at "user.sessionId" should equal "{{owner.sessionId}}"

    When I send a "GET" request to "/account/sessions" on the "stable" ring as "owner"
    Then the response status should be 200
    And the response JSON array at "sessions" should contain an object with:
      | path    | value                   |
      | id      | {{owner.sessionId}}     |
      | current | true                    |
    And the response JSON array at "sessions" should contain an object with:
      | path        | value                   |
      | id          | {{ownerTablet.sessionId}} |
      | deviceLabel | BDD Tablet              |

    When I send a "POST" request to "/account/sessions/revoke" on the "stable" ring as "owner" with JSON:
      """
      {
        "sessionId": "{{ownerTablet.sessionId}}"
      }
      """
    Then the response status should be 200
    And the response JSON at "session.id" should equal "{{ownerTablet.sessionId}}"

    When I send a "GET" request to "/me" on the "stable" ring as "ownerTablet"
    Then the response status should be 401
    And the response JSON at "error" should equal "unauthorized"
