import { render, screen } from "@testing-library/react";
import { UploadQueue } from "./upload-queue";

describe("UploadQueue", () => {
  it("shows policy artifact and progress", () => {
    render(
      <UploadQueue
        entries={[
          {
            progress: 52,
            clientStatus: "uploading",
            mediaItem: {
              id: "media-1",
              ownerId: "owner-1",
              collectionId: "collection-1",
              folderName: "folder",
              title: "Editorial Cover",
              description: "desc",
              fileName: "cover.jpg",
              contentType: "image/jpeg",
              mediaType: "image",
              uploadStatus: "pending",
              publishState: "draft",
              priceMinor: 1000,
              currency: "GBP",
              soldCount: 0,
              earnedMinor: 0,
              blobUrl: "memory://cover.jpg",
              uploadMode: "memory",
              backgroundStreamId: "stream-1",
              backgroundUpdatedAt: new Date().toISOString(),
              consent: {
                performerCount: 1,
                allAdultsConfirmed: true,
                rightsConfirmed: true,
                consentCapturedAt: new Date().toISOString(),
                consentDocumentName: "consent",
                recordRetentionYears: 7,
                notes: "",
              },
              policyArtifact: {
                id: "policy-1",
                ownerId: "owner-1",
                folderName: "folder",
                documentName: "policy",
                fileName: "folder-policy.md",
                uri: "memory://folder-policy.md",
                createdAt: new Date().toISOString(),
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
        ]}
        events={[]}
      />,
    );

    expect(screen.getByText("folder-policy.md")).toBeInTheDocument();
    expect(screen.getByText("52% transferred")).toBeInTheDocument();
  });
});
