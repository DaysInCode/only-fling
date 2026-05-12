"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { CollectionCard } from "@/components/media/collection-card";
import { MediaCard } from "@/components/media/media-card";
import { UploadQueue, type UploadQueueEntry } from "@/components/media/upload-queue";
import { FormField } from "@/components/ui/form-field";
import { StatusPill } from "@/components/ui/status-pill";
import { useLocale } from "@/components/providers/locale-provider";
import { useSession } from "@/components/providers/session-provider";
import type {
  MediaCollection,
  MediaCollectionItemsResponse,
  MediaCollectionsResponse,
  MediaItem,
  MediaUploadIntakeResponse,
  UploadEventsResponse,
} from "@/lib/contracts";
import { apiGet, apiPost, uploadFileToUrl } from "@/lib/api";

type CollectionFormState = {
  folderName: string;
  title: string;
  description: string;
  visibility: MediaCollection["visibility"];
  publishState: MediaCollection["publishState"];
  priceMinor: number;
  currency: string;
};

type UploadFormState = {
  title: string;
  description: string;
  publishState: MediaItem["publishState"];
  priceMinor: number;
  currency: string;
  performerCount: number;
  consentDocumentName: string;
  recordRetentionYears: number;
  consentNotes: string;
  termsSummary: string;
  pricingSummary: string;
  additionalNotes: string;
};

const defaultCollectionForm: CollectionFormState = {
  folderName: "creator-drop",
  title: "New collection",
  description: "",
  visibility: "private",
  publishState: "draft",
  priceMinor: 0,
  currency: "GBP",
};

const defaultUploadForm: UploadFormState = {
  title: "New upload",
  description: "",
  publishState: "draft",
  priceMinor: 0,
  currency: "GBP",
  performerCount: 1,
  consentDocumentName: "content-consent",
  recordRetentionYears: 7,
  consentNotes: "",
  termsSummary: "All performers are confirmed adults and publication rights are documented.",
  pricingSummary: "Draft price can change before publishing.",
  additionalNotes: "",
};

export default function MediaPage() {
  const { token, user } = useSession();
  const { messages } = useLocale();
  const [collections, setCollections] = useState<MediaCollection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [events, setEvents] = useState<UploadEventsResponse["events"]>([]);
  const [collectionForm, setCollectionForm] = useState<CollectionFormState>(defaultCollectionForm);
  const [uploadForm, setUploadForm] = useState<UploadFormState>(defaultUploadForm);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingCollectionId, setEditingCollectionId] = useState("");
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [status, setStatus] = useState<string>(messages.mediaPage.status);
  const [uploadConsentAdults, setUploadConsentAdults] = useState(false);
  const [uploadConsentRights, setUploadConsentRights] = useState(false);
  const [queueEntries, setQueueEntries] = useState<UploadQueueEntry[]>([]);

  const loadCollections = useCallback(async () => {
    const result = await apiGet<MediaCollectionsResponse>("/media/collections", token);
    if (result.data) {
      setCollections(result.data.collections);
      if (!selectedCollectionId && result.data.collections[0]) {
        setSelectedCollectionId(result.data.collections[0].id);
      }
    }
  }, [selectedCollectionId, token]);

  const loadItems = useCallback(async (collectionId: string) => {
    if (!collectionId) {
      setItems([]);
      return;
    }

    const result = await apiGet<MediaCollectionItemsResponse>(`/media/collections/${collectionId}/items`, token);
    if (result.data) {
      setItems(result.data.items);
    }
  }, [token]);

  const loadEvents = useCallback(async () => {
    const result = await apiGet<UploadEventsResponse>("/media/uploads/events?limit=50", token);
    if (result.data) {
      setEvents(result.data.events);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const handle = window.setTimeout(() => {
      void loadCollections();
      void loadEvents();
    }, 0);

    return () => window.clearTimeout(handle);
  }, [loadCollections, loadEvents, token]);

  useEffect(() => {
    if (selectedCollectionId) {
      const handle = window.setTimeout(() => {
        void loadItems(selectedCollectionId);
      }, 0);

      return () => window.clearTimeout(handle);
    }
  }, [loadItems, selectedCollectionId]);

  useEffect(() => {
    const intervalHandle = window.setInterval(() => {
      if (token) {
        void loadEvents();
      }
    }, 10000);
    return () => window.clearInterval(intervalHandle);
  }, [loadEvents, token]);

  const selectedCollection = useMemo(
    () => collections.find((collection) => collection.id === selectedCollectionId) ?? null,
    [collections, selectedCollectionId],
  );

  const queueWithItems = useMemo(() => {
    const recentItems = items.filter((item) => ["pending", "processing"].includes(item.uploadStatus)).map((mediaItem) => ({ mediaItem }));
    const merged = [...queueEntries];

    recentItems.forEach((entry) => {
      if (!merged.some((candidate) => candidate.mediaItem.id === entry.mediaItem.id)) {
        merged.push(entry);
      }
    });

    return merged;
  }, [items, queueEntries]);

  const publishedVideos = useMemo(
    () => items.filter((item) => item.mediaType === "video" && item.publishState === "published" && item.uploadStatus === "ready"),
    [items],
  );

  function togglePlayback(videoId: string) {
    const element = document.getElementById(videoId) as HTMLVideoElement | null;
    if (!element) {
      return;
    }

    if (element.paused) {
      void element.play();
      return;
    }

    element.pause();
  }

  function openFullscreen(videoId: string) {
    const element = document.getElementById(videoId) as HTMLVideoElement | null;
    if (!element) {
      return;
    }

    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }

    if (element.requestFullscreen) {
      void element.requestFullscreen();
    }
  }

  async function saveCollection() {
    const route = editingCollectionId ? "/media/collections/update" : "/media/collections";
    const payload = editingCollectionId ? { ...collectionForm, collectionId: editingCollectionId } : collectionForm;
    const result = await apiPost<{ collection: MediaCollection }>(route, payload, token);
      setStatus(result.error ?? (editingCollectionId ? messages.mediaPage.collectionUpdated : messages.mediaPage.collectionCreated));
    setEditingCollectionId("");
    await loadCollections();
  }

  async function softDeleteCollection(collectionId: string) {
    const result = await apiPost<{ collection: MediaCollection }>("/media/collections/delete", { collectionId }, token);
    setStatus(result.error ?? messages.mediaPage.collectionDeleted);
    if (!result.error && selectedCollectionId === collectionId) {
      setSelectedCollectionId("");
    }
    await loadCollections();
    if (selectedCollectionId === collectionId) {
      setItems([]);
    }
  }

  async function saveItem() {
    if (!editingItem) {
      return;
    }

    const result = await apiPost<{ mediaItem: MediaItem }>(
      "/media/items/update",
      {
        mediaItemId: editingItem.id,
        title: editingItem.title,
        description: editingItem.description,
        priceMinor: editingItem.priceMinor,
        currency: editingItem.currency,
        publishState: editingItem.publishState,
      },
      token,
    );

    setStatus(result.error ?? messages.mediaPage.itemUpdated);
    setEditingItem(null);
    await loadItems(selectedCollectionId);
  }

  async function deleteItem(mediaItemId: string) {
    const result = await apiPost<{ mediaItem: MediaItem }>("/media/items/delete", { mediaItemId }, token);
    setStatus(result.error ?? messages.mediaPage.itemDeleted);
    await loadItems(selectedCollectionId);
  }

  async function createUpload() {
    if (!selectedCollection || !selectedFile) {
      setStatus(messages.mediaPage.chooseCollection);
      return;
    }

    if (!uploadConsentAdults || !uploadConsentRights) {
      setStatus(messages.mediaPage.confirmConsent);
      return;
    }

    const intakeResult = await apiPost<MediaUploadIntakeResponse>(
      "/media/uploads/intake",
      {
        collectionId: selectedCollection.id,
        title: uploadForm.title,
        description: uploadForm.description,
        fileName: selectedFile.name,
        contentType: selectedFile.type || "application/octet-stream",
        mediaType: selectedFile.type.startsWith("video") ? "video" : "image",
        fileSizeBytes: selectedFile.size,
        priceMinor: uploadForm.priceMinor,
        currency: uploadForm.currency,
        publishState: uploadForm.publishState,
        consent: {
          performerCount: uploadForm.performerCount,
          allAdultsConfirmed: true,
          rightsConfirmed: true,
          consentCapturedAt: new Date().toISOString(),
          consentDocumentName: uploadForm.consentDocumentName,
          recordRetentionYears: uploadForm.recordRetentionYears,
          notes: uploadForm.consentNotes,
        },
        policy: {
          folderName: selectedCollection.folderName,
          documentName: uploadForm.consentDocumentName,
          termsSummary: uploadForm.termsSummary,
          pricingSummary: uploadForm.pricingSummary,
          additionalNotes: uploadForm.additionalNotes,
        },
      },
      token,
    );

    if (!intakeResult.data) {
      setStatus(intakeResult.error ?? "upload-intake-failed");
      return;
    }

    const intake = intakeResult.data;
    const entry: UploadQueueEntry = {
      mediaItem: intake.mediaItem,
      progress: 0,
      clientStatus: "uploading",
      clientMessage: `Folder markdown artifact ${intake.mediaItem.policyArtifact.fileName} created. Upload transfer started.`,
    };
    setQueueEntries((current) => [entry, ...current.filter((candidate) => candidate.mediaItem.id !== entry.mediaItem.id)]);

    try {
      await uploadFileToUrl(selectedFile, intake.upload, (progress) => {
        setQueueEntries((current) =>
          current.map((candidate) =>
            candidate.mediaItem.id === entry.mediaItem.id
              ? {
                  ...candidate,
                  progress,
                  clientStatus: "uploading",
                  clientMessage: `Transfer in progress to ${intake.upload.mode} staging.`,
                }
              : candidate,
          ),
        );
      });

      setQueueEntries((current) =>
        current.map((candidate) =>
          candidate.mediaItem.id === entry.mediaItem.id
            ? {
                ...candidate,
                progress: 100,
                clientStatus: "uploaded",
                clientMessage: `Transferred. Background processing will continue on stream ${entry.mediaItem.backgroundStreamId}.`,
              }
            : candidate,
        ),
      );
      setStatus(messages.mediaPage.uploadReady);
    } catch (error) {
      setQueueEntries((current) =>
        current.map((candidate) =>
          candidate.mediaItem.id === entry.mediaItem.id
            ? {
                ...candidate,
                clientStatus: "failed",
                clientMessage: error instanceof Error ? error.message : "Upload transfer failed.",
              }
            : candidate,
        ),
      );
      setStatus("upload-transfer-failed");
    }

    await loadItems(selectedCollection.id);
    await loadEvents();
  }

  return (
    <AuthGuard>
      <AppShell>
        <section className="pageGrid">
          <div className="heroCard">
            <div className="eyebrow">{messages.mediaPage.eyebrow}</div>
            <h1 className="heroTitle">{messages.mediaPage.title}</h1>
            <p className="heroLead">
              {messages.mediaPage.description}
            </p>
          </div>
          <div className="panel">
            <div className="label">{messages.dashboardPage.signedIn}</div>
            <p className="muted" style={{ marginTop: 8 }}>
              {user?.email ?? messages.dashboardPage.signedOut}
            </p>
            <p className="muted" style={{ marginTop: 8 }}>{status}</p>
          </div>
        </section>

        <section className="section pageGrid mediaLayout">
          <div className="stack">
            <section className="panel">
              <div className="sectionHeader">
                <div>
                  <div className="label">{messages.mediaPage.collectionForm.title}</div>
                  <h2 style={{ marginTop: 8 }}>{messages.mediaPage.collectionForm.title}</h2>
                </div>
              </div>
              <div className="formGrid" style={{ marginTop: 18 }}>
                <FormField label={messages.mediaPage.collectionForm.folderName}>
                  <input
                    className="input"
                    value={collectionForm.folderName}
                    onChange={(event) => setCollectionForm((current) => ({ ...current, folderName: event.target.value }))}
                  />
                </FormField>
                <FormField label={messages.mediaPage.collectionForm.titleLabel}>
                  <input
                    className="input"
                    value={collectionForm.title}
                    onChange={(event) => setCollectionForm((current) => ({ ...current, title: event.target.value }))}
                  />
                </FormField>
                <FormField label={messages.mediaPage.collectionForm.visibility}>
                  <select
                    className="select"
                    value={collectionForm.visibility}
                    onChange={(event) =>
                      setCollectionForm((current) => ({
                        ...current,
                        visibility: event.target.value as CollectionFormState["visibility"],
                      }))
                    }
                  >
                    <option value="private">{messages.mediaPage.visibilityOptions.private}</option>
                    <option value="followers">{messages.mediaPage.visibilityOptions.followers}</option>
                    <option value="public">{messages.mediaPage.visibilityOptions.public}</option>
                  </select>
                </FormField>
                <FormField label={messages.mediaPage.collectionForm.publishState}>
                  <select
                    className="select"
                    value={collectionForm.publishState}
                    onChange={(event) =>
                      setCollectionForm((current) => ({
                        ...current,
                        publishState: event.target.value as CollectionFormState["publishState"],
                      }))
                    }
                  >
                    <option value="draft">{messages.mediaPage.publishOptions.draft}</option>
                    <option value="published">{messages.mediaPage.publishOptions.published}</option>
                  </select>
                </FormField>
                <FormField label={messages.mediaPage.collectionForm.priceMinor}>
                  <input
                    className="input"
                    type="number"
                    value={collectionForm.priceMinor}
                    onChange={(event) =>
                      setCollectionForm((current) => ({ ...current, priceMinor: Number(event.target.value) }))
                    }
                  />
                </FormField>
                <FormField label={messages.mediaPage.collectionForm.currency}>
                  <input
                    className="input"
                    value={collectionForm.currency}
                    onChange={(event) =>
                      setCollectionForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))
                    }
                  />
                </FormField>
              </div>
              <FormField label={messages.mediaPage.collectionForm.description}>
                <textarea
                  className="textarea"
                  rows={3}
                  value={collectionForm.description}
                  onChange={(event) => setCollectionForm((current) => ({ ...current, description: event.target.value }))}
                />
              </FormField>
              <div className="inlineActions" style={{ marginTop: 18 }}>
                <button className="button" type="button" onClick={() => void saveCollection()}>
                  {editingCollectionId ? messages.mediaPage.collectionForm.update : messages.mediaPage.collectionForm.create}
                </button>
                {editingCollectionId ? (
                  <button
                    className="buttonSecondary"
                    type="button"
                    onClick={() => {
                      setEditingCollectionId("");
                      setCollectionForm(defaultCollectionForm);
                    }}
                  >
                      Cancel
                  </button>
                ) : null}
              </div>
            </section>

            <div className="cardGrid">
              {collections.map((collection) => (
                <div key={collection.id} className="stackCompact">
                  <CollectionCard
                    collection={collection}
                    selected={selectedCollectionId === collection.id}
                    onSelect={() => {
                      setSelectedCollectionId(collection.id);
                      setCollectionForm({
                        folderName: collection.folderName,
                        title: collection.title,
                        description: collection.description,
                        visibility: collection.visibility,
                        publishState: collection.publishState,
                        priceMinor: collection.priceMinor,
                        currency: collection.currency,
                      });
                    }}
                  />
                  <div className="inlineActions">
                    <button
                      className="buttonSecondary"
                      type="button"
                      onClick={() => {
                        setEditingCollectionId(collection.id);
                        setCollectionForm({
                          folderName: collection.folderName,
                          title: collection.title,
                          description: collection.description,
                          visibility: collection.visibility,
                          publishState: collection.publishState,
                          priceMinor: collection.priceMinor,
                          currency: collection.currency,
                        });
                      }}
                    >
                      {messages.mediaCard.edit}
                    </button>
                    <button className="buttonSecondary" type="button" onClick={() => void softDeleteCollection(collection.id)}>
                      {messages.mediaCard.softDelete}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="stack">
            <section className="panel">
              <div className="sectionHeader">
                <div>
                  <div className="label">{messages.mediaPage.collectionForm.title}</div>
                  <h2 style={{ marginTop: 8 }}>{selectedCollection?.title ?? messages.mediaPage.chooseCollection}</h2>
                </div>
                {selectedCollection ? <StatusPill value={selectedCollection.publishState} /> : null}
              </div>
              {selectedCollection ? (
                <>
                  <p className="muted" style={{ marginTop: 12 }}>
                    Folder {selectedCollection.folderName} · {selectedCollection.description || messages.common.noDescription}
                  </p>
                  <div className="metricRow" style={{ marginTop: 16 }}>
                    <span>{selectedCollection.soldCount} {messages.common.sold}</span>
                    <span>{selectedCollection.earnedMinor / 100} {messages.common.earned}</span>
                    <span>{selectedCollection.priceMinor / 100} listed</span>
                  </div>
                </>
              ) : (
                <p className="muted" style={{ marginTop: 12 }}>
                  {messages.mediaPage.chooseCollection}
                </p>
              )}
            </section>

            <section className="panel">
              <div className="sectionHeader">
                <div>
                  <div className="label">{messages.mediaPage.uploadForm.title}</div>
                  <h2 style={{ marginTop: 8 }}>{messages.mediaPage.uploadForm.title}</h2>
                </div>
              </div>
              <div className="form" style={{ marginTop: 18 }}>
                <FormField label={messages.mediaPage.uploadForm.file}>
                  <input type="file" className="input" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} />
                </FormField>
                <div className="formGrid">
                  <FormField label={messages.mediaPage.uploadForm.mediaTitle}>
                    <input className="input" value={uploadForm.title} onChange={(event) => setUploadForm((current) => ({ ...current, title: event.target.value }))} />
                  </FormField>
                  <FormField label={messages.mediaPage.collectionForm.priceMinor}>
                    <input
                      className="input"
                      type="number"
                      value={uploadForm.priceMinor}
                      onChange={(event) => setUploadForm((current) => ({ ...current, priceMinor: Number(event.target.value) }))}
                    />
                  </FormField>
                </div>
                <FormField label={messages.mediaPage.uploadForm.description}>
                  <textarea className="textarea" rows={3} value={uploadForm.description} onChange={(event) => setUploadForm((current) => ({ ...current, description: event.target.value }))} />
                </FormField>
                <div className="formGrid">
                  <FormField label={messages.mediaPage.uploadForm.consentDocumentName}>
                    <input className="input" value={uploadForm.consentDocumentName} onChange={(event) => setUploadForm((current) => ({ ...current, consentDocumentName: event.target.value }))} />
                  </FormField>
                  <FormField label={messages.mediaPage.uploadForm.recordRetentionYears}>
                    <input
                      className="input"
                      type="number"
                      value={uploadForm.recordRetentionYears}
                      onChange={(event) =>
                        setUploadForm((current) => ({ ...current, recordRetentionYears: Number(event.target.value) }))
                      }
                    />
                  </FormField>
                </div>
                <FormField label={messages.mediaPage.uploadForm.termsSummary}>
                  <textarea className="textarea" rows={3} value={uploadForm.termsSummary} onChange={(event) => setUploadForm((current) => ({ ...current, termsSummary: event.target.value }))} />
                </FormField>
                <FormField label={messages.mediaPage.uploadForm.pricingSummary}>
                  <textarea className="textarea" rows={3} value={uploadForm.pricingSummary} onChange={(event) => setUploadForm((current) => ({ ...current, pricingSummary: event.target.value }))} />
                </FormField>
                <FormField label={messages.mediaPage.uploadForm.additionalNotes}>
                  <textarea className="textarea" rows={3} value={uploadForm.additionalNotes} onChange={(event) => setUploadForm((current) => ({ ...current, additionalNotes: event.target.value }))} />
                </FormField>
                <label className="checkRow">
                  <input type="checkbox" checked={uploadConsentAdults} onChange={(event) => setUploadConsentAdults(event.target.checked)} />
                  <span>{messages.mediaPage.uploadForm.confirmAdults}</span>
                </label>
                <label className="checkRow">
                  <input type="checkbox" checked={uploadConsentRights} onChange={(event) => setUploadConsentRights(event.target.checked)} />
                  <span>{messages.mediaPage.uploadForm.confirmRights}</span>
                </label>
                <button className="button" type="button" onClick={() => void createUpload()}>
                  {messages.mediaPage.uploadForm.startUpload}
                </button>
              </div>
            </section>
          </div>
        </section>

        <section className="section">
          <div className="sectionHeader" style={{ marginBottom: 18 }}>
            <div>
              <div className="label">{messages.common.media}</div>
              <h2 style={{ marginTop: 8 }}>{messages.mediaPage.title}</h2>
            </div>
          </div>
          <div className="cardGrid">
            {items.map((item) => (
              <div key={item.id} className="stackCompact">
                <MediaCard item={item} onEdit={() => setEditingItem(item)} onDelete={() => void deleteItem(item.id)} />
              </div>
            ))}
          </div>
        </section>

        {editingItem ? (
          <section className="section panel">
            <div className="sectionHeader">
              <div>
                  <div className="label">{messages.mediaCard.edit}</div>
                <h2 style={{ marginTop: 8 }}>{editingItem.title}</h2>
              </div>
            </div>
            <div className="formGrid" style={{ marginTop: 18 }}>
              <FormField label={messages.mediaPage.uploadForm.mediaTitle}>
                <input
                  className="input"
                  value={editingItem.title}
                  onChange={(event) => setEditingItem((current) => (current ? { ...current, title: event.target.value } : current))}
                />
              </FormField>
              <FormField label={messages.mediaPage.collectionForm.priceMinor}>
                <input
                  className="input"
                  type="number"
                  value={editingItem.priceMinor}
                  onChange={(event) =>
                    setEditingItem((current) => (current ? { ...current, priceMinor: Number(event.target.value) } : current))
                  }
                />
              </FormField>
              <FormField label={messages.mediaPage.collectionForm.publishState}>
                <select
                  className="select"
                  value={editingItem.publishState}
                  onChange={(event) =>
                    setEditingItem((current) =>
                      current ? { ...current, publishState: event.target.value as MediaItem["publishState"] } : current,
                    )
                  }
                >
                  <option value="draft">{messages.mediaPage.publishOptions.draft}</option>
                  <option value="published">{messages.mediaPage.publishOptions.published}</option>
                </select>
              </FormField>
            </div>
            <FormField label={messages.mediaPage.uploadForm.description}>
              <textarea
                className="textarea"
                rows={3}
                value={editingItem.description}
                onChange={(event) =>
                  setEditingItem((current) => (current ? { ...current, description: event.target.value } : current))
                }
              />
            </FormField>
            <div className="inlineActions" style={{ marginTop: 18 }}>
              <button className="button" type="button" onClick={() => void saveItem()}>
                {messages.common.save}
              </button>
              <button className="buttonSecondary" type="button" onClick={() => setEditingItem(null)}>
                Cancel
              </button>
            </div>
          </section>
        ) : null}

        <section className="section panel">
          <div className="sectionHeader">
            <div>
              <div className="label">{messages.mediaPage.browse.eyebrow}</div>
              <h2 style={{ marginTop: 8 }}>{messages.mediaPage.browse.title}</h2>
            </div>
          </div>
          <p className="muted" style={{ marginTop: 12 }}>
            {messages.mediaPage.browse.description}
          </p>
          {publishedVideos.length ? (
            <div className="cardGrid" style={{ marginTop: 16 }}>
              {publishedVideos.map((item) => {
                const previewUrl = item.preview.previewBlobUrl || item.preview.snapshotBlobUrl || item.blobUrl;
                const videoElementId = `media-preview-${item.id}`;
                return (
                  <article key={item.id} className="card">
                    <video
                      id={videoElementId}
                      controls
                      muted
                      playsInline
                      preload="metadata"
                      poster={item.preview.snapshotBlobUrl}
                      style={{ width: "100%", borderRadius: 14 }}
                    >
                      <source src={previewUrl} type={item.contentType || "video/mp4"} />
                    </video>
                    <h3 style={{ marginTop: 12 }}>{item.title}</h3>
                    <div className="inlineActions" style={{ marginTop: 12 }}>
                      <button className="buttonSecondary" type="button" onClick={() => togglePlayback(videoElementId)}>
                        {messages.mediaPage.browse.play}
                      </button>
                      <button className="buttonSecondary" type="button" onClick={() => openFullscreen(videoElementId)}>
                        {messages.mediaPage.browse.fullscreen}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="muted" style={{ marginTop: 16 }}>
              {messages.mediaPage.browse.noItems}
            </p>
          )}
        </section>

        <section className="section">
          <UploadQueue entries={queueWithItems} events={events} />
        </section>
      </AppShell>
    </AuthGuard>
  );
}
