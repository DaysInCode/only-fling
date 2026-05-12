using System.Security.Cryptography;
using Azure.Storage;
using Azure.Storage.Blobs;
using Azure.Storage.Sas;

namespace OnlyFling.Api.Core;

public sealed partial class UploadService(AppConfiguration configuration)
{
    private const string DevelopmentAccountName = "devstoreaccount1";
    private const string DevelopmentAccountKey = "Eby8vdM02xNOcqFeqCnrW8g==";

    public async Task<UploadTarget> CreateUploadUrlAsync(string fileName, string contentType)
    {
        var blobName = CreateAnonymizedBlobName(fileName, contentType);
        var connection = ParseConnectionString(configuration.StorageConnectionString);

        if (string.IsNullOrWhiteSpace(configuration.StorageConnectionString) || connection is null)
        {
            return new UploadTarget
            {
                Mode = "memory",
                UploadUrl = $"http://127.0.0.1:7071/api/dev-uploads/{blobName}",
                BlobUrl = $"memory://{blobName}",
                ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(10).ToString("O"),
                RequiredHeaders = new Dictionary<string, string>
                {
                    ["x-ms-blob-type"] = "BlockBlob",
                    ["content-type"] = contentType,
                },
            };
        }

        var blobService = new BlobServiceClient(configuration.StorageConnectionString);
        var container = blobService.GetBlobContainerClient(configuration.UploadContainerName);
        await container.CreateIfNotExistsAsync();

        var credential = new StorageSharedKeyCredential(connection.AccountName, connection.AccountKey);
        var expiresOn = DateTimeOffset.UtcNow.AddMinutes(10);
        var sasBuilder = new BlobSasBuilder
        {
            BlobContainerName = configuration.UploadContainerName,
            BlobName = blobName,
            Resource = "b",
            ExpiresOn = expiresOn,
            ContentType = contentType,
        };
        sasBuilder.SetPermissions(BlobSasPermissions.Create | BlobSasPermissions.Write);
        var sas = sasBuilder.ToSasQueryParameters(credential).ToString();
        var blobUrl = $"{connection.BlobEndpoint}/{configuration.UploadContainerName}/{blobName}";

        return new UploadTarget
        {
            Mode = "azure",
            UploadUrl = $"{blobUrl}?{sas}",
            BlobUrl = blobUrl,
            ExpiresAt = expiresOn.ToString("O"),
            RequiredHeaders = new Dictionary<string, string>
            {
                ["x-ms-blob-type"] = "BlockBlob",
                ["content-type"] = contentType,
            },
        };
    }

    public async Task<(string FileName, string Uri)> PersistPolicyArtifactAsync(string folderName, string documentName, string markdown)
    {
        var safeFolderName = SanitizeArtifactPart(folderName);
        var safeDocumentName = SanitizeArtifactPart(documentName);
        var fileName = $"{safeFolderName}-{safeDocumentName}.md";
        var blobName = $"policies/{fileName}";
        var connection = ParseConnectionString(configuration.StorageConnectionString);

        if (!string.IsNullOrWhiteSpace(configuration.StorageConnectionString) && connection is not null)
        {
            var blobService = new BlobServiceClient(configuration.StorageConnectionString);
            var container = blobService.GetBlobContainerClient(configuration.ArtifactContainerName);
            await container.CreateIfNotExistsAsync();
            var blob = container.GetBlobClient(blobName);
            using var stream = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(markdown));
            await blob.UploadAsync(stream, overwrite: true);
            return (fileName, $"{connection.BlobEndpoint}/{configuration.ArtifactContainerName}/{blobName}");
        }

        var directory = Path.Combine(Environment.CurrentDirectory, "policy-artifacts");
        Directory.CreateDirectory(directory);
        var fullPath = Path.Combine(directory, fileName);
        await File.WriteAllTextAsync(fullPath, markdown);
        return (fileName, fullPath);
    }

    public async Task SaveDevelopmentUploadAsync(string blobPath, Stream stream)
    {
        var safePath = blobPath.Replace('/', Path.DirectorySeparatorChar);
        var fullPath = Path.Combine(Environment.CurrentDirectory, "dev-uploads", safePath);
        var directory = Path.GetDirectoryName(fullPath) ?? Path.Combine(Environment.CurrentDirectory, "dev-uploads");
        Directory.CreateDirectory(directory);
        using var fileStream = File.Create(fullPath);
        await stream.CopyToAsync(fileStream);
    }

    private static string CreateId()
    {
        Span<byte> buffer = stackalloc byte[10];
        RandomNumberGenerator.Fill(buffer);
        return Convert.ToHexString(buffer).ToLowerInvariant();
    }

    public string CreateAnonymizedBlobName(string fileName, string contentType)
    {
        var extension = ResolveExtension(fileName, contentType);
        return $"{DateTime.UtcNow:yyyy-MM-dd}/{CreateId()}{extension}";
    }

    public string CreateDownloadName(string mediaType, string contentType)
    {
        var extension = ResolveExtension($"{mediaType}.bin", contentType);
        return $"{mediaType}-{CreateId()}{extension}";
    }

    private static string SanitizeFileName(string value)
        => string.Concat(value.Select(ch => char.IsLetterOrDigit(ch) || ch is '.' or '_' or '-' ? ch : '-'));

    private static string SanitizeArtifactPart(string value)
        => string.Concat(value.Trim().Select(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_' or ' ' ? ch : '-')).Replace(' ', '-')[..Math.Min(string.Concat(value.Trim().Select(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_' or ' ' ? ch : '-')).Replace(' ', '-').Length, 80)];

    private static StorageConnection? ParseConnectionString(string connectionString)
    {
        if (string.IsNullOrWhiteSpace(connectionString)) return null;
        if (string.Equals(connectionString, "UseDevelopmentStorage=true", StringComparison.OrdinalIgnoreCase))
        {
            return new StorageConnection(DevelopmentAccountName, DevelopmentAccountKey, $"http://127.0.0.1:10000/{DevelopmentAccountName}");
        }

        var parts = connectionString.Split(';', StringSplitOptions.RemoveEmptyEntries)
            .Select(part => part.Split('=', 2))
            .Where(parts => parts.Length == 2)
            .ToDictionary(parts => parts[0], parts => parts[1], StringComparer.OrdinalIgnoreCase);

        if (!parts.TryGetValue("AccountName", out var accountName) || !parts.TryGetValue("AccountKey", out var accountKey))
        {
            return null;
        }

        var blobEndpoint = parts.TryGetValue("BlobEndpoint", out var endpoint)
            ? endpoint.TrimEnd('/')
            : $"https://{accountName}.blob.core.windows.net";
        return new StorageConnection(accountName, accountKey, blobEndpoint);
    }

    private sealed record StorageConnection(string AccountName, string AccountKey, string BlobEndpoint);

    private static string ResolveExtension(string fileName, string contentType)
    {
        var extension = Path.GetExtension(fileName);
        if (!string.IsNullOrWhiteSpace(extension) && extension.Length <= 10)
        {
            return SanitizeFileName(extension);
        }

        return contentType.ToLowerInvariant() switch
        {
            "image/jpeg" => ".jpg",
            "image/png" => ".png",
            "image/webp" => ".webp",
            "video/mp4" => ".mp4",
            "video/quicktime" => ".mov",
            "video/webm" => ".webm",
            _ => ".bin",
        };
    }
}
