import {
  BlobSASPermissions,
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
} from "@azure/storage-blob";
import { createId } from "@paralleldrive/cuid2";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "./config";

const developmentAccountName = "devstoreaccount1";
const developmentAccountKey =
  "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==";

function parseConnectionString(connectionString: string) {
  if (connectionString === "UseDevelopmentStorage=true") {
    return {
      accountName: developmentAccountName,
      accountKey: developmentAccountKey,
      blobEndpoint: `http://127.0.0.1:10000/${developmentAccountName}`,
    };
  }

  const parts = Object.fromEntries(
    connectionString
      .split(";")
      .map((entry) => entry.split("="))
      .filter((entry) => entry.length === 2),
  );

  if (!parts.AccountName || !parts.AccountKey) {
    return null;
  }

  return {
    accountName: parts.AccountName,
    accountKey: parts.AccountKey,
    blobEndpoint: parts.BlobEndpoint ?? `https://${parts.AccountName}.blob.core.windows.net`,
  };
}

export async function createUploadUrl(fileName: string, contentType: string) {
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
  const blobName = `${new Date().toISOString().slice(0, 10)}/${createId()}-${safeFileName}`;
  const connection = parseConnectionString(config.storageConnectionString);

  if (!config.storageConnectionString || !connection) {
    return {
      mode: "memory" as const,
      uploadUrl: `http://127.0.0.1:7071/dev-uploads/${blobName}`,
      blobUrl: `memory://${blobName}`,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      requiredHeaders: {
        "x-ms-blob-type": "BlockBlob",
        "content-type": contentType,
      },
    };
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(config.storageConnectionString);
  const containerClient = blobServiceClient.getContainerClient(config.uploadContainerName);
  await containerClient.createIfNotExists();

  const expiresOn = new Date(Date.now() + 10 * 60 * 1000);
  const sharedKeyCredential = new StorageSharedKeyCredential(connection.accountName, connection.accountKey);
  const sas = generateBlobSASQueryParameters(
    {
      containerName: config.uploadContainerName,
      blobName,
      permissions: BlobSASPermissions.parse("cw"),
      expiresOn,
      contentType,
    },
    sharedKeyCredential,
  ).toString();

  const blobUrl = `${connection.blobEndpoint}/${config.uploadContainerName}/${blobName}`;
  return {
    mode: "azure" as const,
    uploadUrl: `${blobUrl}?${sas}`,
    blobUrl,
    expiresAt: expiresOn.toISOString(),
    requiredHeaders: {
      "x-ms-blob-type": "BlockBlob",
      "content-type": contentType,
    },
  };
}

function sanitizeArtifactPart(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9-_ ]/g, "-").replace(/\s+/g, "-").slice(0, 80);
}

export async function persistPolicyArtifact(folderName: string, documentName: string, markdown: string) {
  const safeFolderName = sanitizeArtifactPart(folderName);
  const safeDocumentName = sanitizeArtifactPart(documentName);
  const fileName = `${safeFolderName}-${safeDocumentName}.md`;
  const blobName = `policies/${fileName}`;
  const connection = parseConnectionString(config.storageConnectionString);

  if (config.storageConnectionString && connection) {
    const blobServiceClient = BlobServiceClient.fromConnectionString(config.storageConnectionString);
    const containerClient = blobServiceClient.getContainerClient(config.uploadContainerName);
    await containerClient.createIfNotExists();
    const blobClient = containerClient.getBlockBlobClient(blobName);
    await blobClient.uploadData(Buffer.from(markdown, "utf8"), {
      blobHTTPHeaders: {
        blobContentType: "text/markdown; charset=utf-8",
      },
    });
    return {
      fileName,
      uri: `${connection.blobEndpoint}/${config.uploadContainerName}/${blobName}`,
    };
  }

  const directory = path.resolve(process.cwd(), "policy-artifacts");
  await mkdir(directory, { recursive: true });
  const fullPath = path.join(directory, fileName);
  await writeFile(fullPath, markdown, "utf8");
  return {
    fileName,
    uri: fullPath,
  };
}
