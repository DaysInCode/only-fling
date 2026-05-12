Feature: Publishing governance and storage reporting
  Publishing should require approval, preserve admin boundaries, and expose storage usage reporting.

  Scenario: Creator publishing approvals and storage reports stay controlled
    Given I sign in on the "stable" ring as "admin@example.com" using device "BDD Admin Publish" and store it as "admin"
    And I sign in on the "stable" ring as "anna@example.com" using device "BDD Anna Publish" and store it as "anna"

    When I send a "POST" request to "/media/collections/publish-ready" on the "stable" ring as "anna" with JSON:
      """
      {
        "collectionId": "collection-anna-editorial"
      }
      """
    Then the response status should be 200
    And the response JSON at "collection.publishApprovalStatus" should equal "pending"

    When I send a "POST" request to "/admin/publishing/review" on the "stable" ring as "admin" with JSON:
      """
      {
        "collectionId": "collection-anna-editorial",
        "decision": "approve",
        "note": "BDD approved"
      }
      """
    Then the response status should be 200
    And the response JSON at "collection.publishApprovalStatus" should equal "approved"
    And the response JSON array at "logs" should contain an object with:
      | path     | value      |
      | platform | instagram  |
      | status   | published  |

    When I send a "GET" request to "/media/publishing/logs?collectionId=collection-anna-editorial" on the "stable" ring as "anna"
    Then the response status should be 200
    And the response JSON array at "logs" should contain an object with:
      | path         | value                   |
      | collectionId | collection-anna-editorial |
      | platform     | instagram               |

    When I send a "GET" request to "/account/audit?limit=50" on the "stable" ring as "anna"
    Then the response status should be 200
    And the response body should not contain "admin.collection.publish.reviewed"

    When I send a "GET" request to "/admin/reports/storage" on the "stable" ring as "admin"
    Then the response status should be 200
    And the response JSON at "report.softCapBytes" should equal "107374182400"

    When I send a "POST" request to "/account/platforms/onlyfans/manage" on the "stable" ring as "anna"
    Then the response status should be 409
    And the response JSON at "error" should equal "onlyfans-plugin-disabled"
