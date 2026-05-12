Feature: Media rendering and publish contracts
  Media endpoints should expose stable rendering metadata and publish state transitions.

  Scenario: Media collections expose rendering data and publish updates
    Given I sign in on the "stable" ring as "anna@example.com" using device "BDD Anna Browser" and store it as "anna"

    When I send a "GET" request to "/media/collections" on the "stable" ring as "anna"
    Then the response status should be 200
    And the response JSON array at "collections" should contain an object with:
      | path        | value                    |
      | id          | collection-anna-editorial |
      | publishState| published                |
      | soldCount   | 20                       |
      | earnedMinor | 26100                    |

    When I send a "GET" request to "/media/collections/collection-anna-editorial/items" on the "stable" ring as "anna"
    Then the response status should be 200
    And the response JSON array at "items" should contain an object with:
      | path              | value              |
      | id                | media-anna-ready-1 |
      | mediaType         | image              |
      | contentType       | image/jpeg         |
      | fileName          | image-a1b2c3.jpg   |
      | uploadStatus      | ready              |
      | publishState      | published          |
      | policyArtifact.id | policy-anna-editorial |
    And the response JSON array at "items" should contain an object with:
      | path         | value                    |
      | id           | media-anna-processing-1  |
      | uploadStatus | processing               |
      | preview.status | queued                 |
      | publishState | draft                    |

    When I send a "POST" request to "/media/items/update" on the "stable" ring as "anna" with JSON:
      """
      {
        "mediaItemId": "media-anna-processing-1",
        "title": "Behind The Scenes Reel",
        "description": "Published through BDD contract coverage.",
        "priceMinor": 1200,
        "currency": "GBP",
        "publishState": "published"
      }
      """
    Then the response status should be 200
    And the response JSON at "mediaItem.publishState" should equal "published"

    When I send a "GET" request to "/media/collections/collection-anna-editorial/items" on the "stable" ring as "anna"
    Then the response status should be 200
    And the response JSON array at "items" should contain an object with:
      | path         | value                    |
      | id           | media-anna-processing-1  |
      | publishState | published                |
