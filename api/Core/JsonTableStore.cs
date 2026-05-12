using System.Text.Json;
using Azure;
using Azure.Data.Tables;

namespace OnlyFling.Api.Core;

public sealed class JsonTableStore(AppConfiguration configuration, JsonSerializerOptions jsonOptions)
{
    private readonly Dictionary<string, TableClient> _clients = new(StringComparer.OrdinalIgnoreCase);

    public bool Enabled => configuration.StorageEnabled;

    public async Task UpsertAsync(string tableName, string partitionKey, string rowKey, object payload)
    {
        var client = await GetClientAsync(tableName);
        var entity = new TableEntity(partitionKey, rowKey)
        {
            ["payload"] = JsonSerializer.Serialize(payload, jsonOptions),
            ["updatedAt"] = DateTimeOffset.UtcNow.ToString("O"),
        };
        await client.UpsertEntityAsync(entity, TableUpdateMode.Replace);
    }

    public async Task<T?> GetAsync<T>(string tableName, string partitionKey, string rowKey)
    {
        var client = await GetClientAsync(tableName);
        try
        {
            var entity = await client.GetEntityAsync<TableEntity>(partitionKey, rowKey);
            return Deserialize<T>(entity.Value);
        }
        catch (RequestFailedException ex) when (ex.Status == 404)
        {
            return default;
        }
    }

    public async Task<List<T>> ListAsync<T>(string tableName, string? partitionKey = null)
    {
        var client = await GetClientAsync(tableName);
        var items = new List<T>();
        var filter = string.IsNullOrWhiteSpace(partitionKey) ? null : $"PartitionKey eq '{partitionKey.Replace("'", "''")}'";
        await foreach (var entity in client.QueryAsync<TableEntity>(filter: filter))
        {
            var parsed = Deserialize<T>(entity);
            if (parsed is not null)
            {
                items.Add(parsed);
            }
        }

        return items;
    }

    private async Task<TableClient> GetClientAsync(string tableName)
    {
        if (!Enabled)
        {
            throw new InvalidOperationException("Azure Storage is not configured.");
        }

        if (_clients.TryGetValue(tableName, out var existing))
        {
            return existing;
        }

        var client = new TableClient(configuration.StorageConnectionString, tableName);
        await client.CreateIfNotExistsAsync();
        _clients[tableName] = client;
        return client;
    }

    private T? Deserialize<T>(TableEntity entity)
    {
        if (!entity.TryGetValue("payload", out var payload) || payload is not string json)
        {
            return default;
        }

        return JsonSerializer.Deserialize<T>(json, jsonOptions);
    }
}
