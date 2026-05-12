Feature: Cross-account attack defense
  Account-scoped API operations should not leak or mutate another account's resources.

  Scenario: A different account cannot delete collections or revoke foreign sessions
    Given I sign in on the "stable" ring as "bdd-owner@example.com" using device "BDD Owner Browser" and store it as "owner"
    And I sign in on the "stable" ring as "bdd-owner@example.com" using device "BDD Owner Tablet" and store it as "ownerTablet"
    And I sign in on the "stable" ring as "bdd-attacker@example.com" using device "BDD Attacker Browser" and store it as "attacker"

    When I send a "POST" request to "/media/collections" on the "stable" ring as "owner" with JSON:
      """
      {
        "folderName": "owner-bdd-folder",
        "title": "Owner Collection",
        "description": "Only the owner should control this collection.",
        "visibility": "private",
        "publishState": "draft",
        "priceMinor": 0,
        "currency": "GBP"
      }
      """
    Then the response status should be 201
    And I save the response JSON at "collection.id" as "ownerCollectionId"

    When I send a "POST" request to "/media/collections/delete" on the "stable" ring as "attacker" with JSON:
      """
      {
        "collectionId": "{{ownerCollectionId}}"
      }
      """
    Then the response status should be 404
    And the response JSON at "error" should equal "collection-not-found"

    When I send a "POST" request to "/account/sessions/revoke" on the "stable" ring as "attacker" with JSON:
      """
      {
        "sessionId": "{{ownerTablet.sessionId}}"
      }
      """
    Then the response status should be 404
    And the response JSON at "error" should equal "session-not-found"

    When I send a "GET" request to "/account/audit?limit=50" on the "stable" ring as "attacker"
    Then the response status should be 200
    And the response body should not contain "{{ownerCollectionId}}"
    And the response body should not contain "{{ownerTablet.sessionId}}"
