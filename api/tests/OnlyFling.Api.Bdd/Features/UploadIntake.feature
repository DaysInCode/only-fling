Feature: Upload intake with consent and policy capture
  Upload intake should preserve consent and policy artifacts before media transfer begins.

  Scenario: Upload intake captures consent metadata and policy artifacts
    Given I sign in on the "stable" ring as "bdd-uploader@example.com" using device "BDD Upload Browser" and store it as "uploader"

    When I send a "POST" request to "/media/collections" on the "stable" ring as "uploader" with JSON:
      """
      {
        "folderName": "bdd-intake-folder",
        "title": "BDD Intake Folder",
        "description": "Contract coverage for upload intake.",
        "visibility": "private",
        "publishState": "draft",
        "priceMinor": 0,
        "currency": "GBP"
      }
      """
    Then the response status should be 201
    And I save the response JSON at "collection.id" as "uploadCollectionId"

    When I send a "POST" request to "/media/uploads/intake" on the "stable" ring as "uploader" with JSON:
      """
      {
        "collectionId": "{{uploadCollectionId}}",
        "title": "BDD Consent Image",
        "description": "Upload intake should keep policy and consent data together.",
        "fileName": "consent-image.jpg",
        "contentType": "image/jpeg",
        "mediaType": "image",
        "ageRating": "general",
        "fileSizeBytes": 4096,
        "priceMinor": 1500,
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
          "consentDocumentName": "bdd-consent-record",
          "recordRetentionYears": 7,
          "notes": "BDD captured consent proof."
        },
        "policy": {
          "folderName": "bdd-intake-folder",
          "documentName": "bdd-policy",
          "termsSummary": "Uploads require explicit adult confirmation, rights ownership, and moderation review before transfer completes.",
          "pricingSummary": "Draft image will remain private until moderation and publish checks are complete.",
          "additionalNotes": "BDD policy artifact coverage."
        }
      }
      """
    Then the response status should be 201
    And the response JSON at "mediaItem.mediaType" should equal "image"
    And the response JSON at "mediaItem.uploadStatus" should equal "pending"
    And the response JSON at "mediaItem.consent.consentDocumentName" should equal "bdd-consent-record"
    And the response JSON at "mediaItem.storage.publicMetadata.identitySafe" should equal "true"
    And the response JSON at "upload.mode" should equal "memory"
    And the response JSON at "upload.requiredHeaders.x-ms-blob-type" should equal "BlockBlob"
    And I save the response JSON at "mediaItem.id" as "uploadMediaItemId"
    And I save the response JSON at "mediaItem.policyArtifact.uri" as "policyArtifactUri"
    And the response body should not contain "consent-image.jpg"

    And the file at "{{policyArtifactUri}}" should contain "BDD captured consent proof."
    And the file at "{{policyArtifactUri}}" should contain "All adults confirmed: yes"
    And the file at "{{policyArtifactUri}}" should contain "BDD policy artifact coverage."

    When I send a "GET" request to "/media/uploads/events?limit=10" on the "stable" ring as "uploader"
    Then the response status should be 200
    And the response JSON array at "events" should contain an object with:
      | path        | value               |
      | mediaItemId | {{uploadMediaItemId}} |
      | status      | pending             |

    When I send a "GET" request to "/media/uploads/queue" on the "stable" ring as "uploader"
    Then the response status should be 200
    And the response JSON array at "workItems" should contain an object with:
      | path        | value               |
      | mediaItemId | {{uploadMediaItemId}} |
      | jobType     | metadata-scrub      |
