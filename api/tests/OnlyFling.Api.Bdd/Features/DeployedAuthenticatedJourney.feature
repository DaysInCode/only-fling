@deployed
Feature: Deployed authenticated API and UI journey
  The release pipeline should validate the signed-in creator flow on the deployed app.

  Scenario: A signed-in creator can update profile, create a collection, and stage an upload
    Given I sign in on the "stable" ring as "bdd-journey@example.com" using device "BDD Journey Browser" and store it as "journey"

    When I send a "POST" request to "/account/profile" on the "stable" ring as "journey" with JSON:
      """
      {
        "displayName": "BDD Journey Creator",
        "bio": "Deployed journey coverage.",
        "avatarUrl": "https://example.com/avatar.jpg",
        "preferences": {
          "contentTags": ["journey", "bdd"],
          "collaborationInterests": ["creator-tools"],
          "languages": ["en"]
        },
        "privacy": {
          "profileVisibility": "public",
          "discoverable": true,
          "showActivity": true,
          "allowDirectMessages": false
        },
        "contact": {
          "supportEmail": "bdd-journey@example.com",
          "emailOptIn": true,
          "marketingOptIn": false
        }
      }
      """
    Then the response status should be 200
    And the response JSON at "profile.displayName" should equal "BDD Journey Creator"

    When I send a "POST" request to "/media/collections" on the "stable" ring as "journey" with JSON:
      """
      {
        "folderName": "bdd-journey-folder",
        "title": "BDD Journey Collection",
        "description": "Deployed collection coverage.",
        "visibility": "private",
        "publishState": "draft",
        "priceMinor": 1200,
        "currency": "GBP"
      }
      """
    Then the response status should be 201
    And I save the response JSON at "collection.id" as "journeyCollectionId"

    When I send a "POST" request to "/media/uploads/intake" on the "stable" ring as "journey" with JSON:
      """
      {
        "collectionId": "{{journeyCollectionId}}",
        "title": "BDD Journey Upload",
        "description": "Deployed upload intake coverage.",
        "fileName": "journey-image.jpg",
        "contentType": "image/jpeg",
        "mediaType": "image",
        "ageRating": "general",
        "fileSizeBytes": 2048,
        "priceMinor": 1200,
        "currency": "GBP",
        "publishState": "draft",
        "encodingProfile": {
          "qualityProfile": "balanced",
          "bitrateProfile": "standard"
        },
        "consent": {
          "performerCount": 1,
          "allAdultsConfirmed": true,
          "rightsConfirmed": true,
          "consentCapturedAt": "2026-05-01T10:15:00Z",
          "consentDocumentName": "bdd-journey-consent",
          "recordRetentionYears": 7,
          "notes": "Deployed journey consent coverage."
        },
        "policy": {
          "folderName": "bdd-journey-folder",
          "documentName": "bdd-journey-consent",
          "termsSummary": "Adult-only upload with documented rights.",
          "pricingSummary": "Journey upload stays draft until moderation.",
          "additionalNotes": "Release validation artifact."
        }
      }
      """
    Then the response status should be 201
    And the response JSON at "mediaItem.uploadStatus" should equal "pending"
    And the response JSON at "upload.mode" should equal "memory"
    And the response JSON at "workItems[0].jobType" should equal "metadata-scrub"
