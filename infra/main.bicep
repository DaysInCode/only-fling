targetScope = 'resourceGroup'

@description('Short lowercase application name.')
param appName string = 'onlyfling'

@description('Environment name such as dev, preview, pr123 or prod.')
param environmentName string

@description('Azure region for regional resources.')
param location string = resourceGroup().location

@description('Creates primary/canary production rings and Front Door when true.')
param enableCanary bool = false

param tags object = {
  application: appName
  environment: environmentName
  managedBy: 'github-actions'
}

var uniqueToken = take(uniqueString(subscription().subscriptionId, resourceGroup().id, environmentName), 6)
var compactApp = toLower(replace(appName, '-', ''))
var compactEnv = toLower(replace(environmentName, '-', ''))

var dataStorageName = take('st${compactApp}${compactEnv}d${uniqueToken}', 24)
var webPrimaryStorageName = take('st${compactApp}${compactEnv}p${uniqueToken}', 24)
var webCanaryStorageName = take('st${compactApp}${compactEnv}c${uniqueToken}', 24)
var keyVaultName = take('kv-${compactApp}-${compactEnv}-${uniqueToken}', 24)
var appInsightsName = 'appi-${compactApp}-${compactEnv}'
var logAnalyticsName = 'log-${compactApp}-${compactEnv}'
var functionPlanName = 'plan-${compactApp}-${compactEnv}'
var functionPrimaryName = 'func-${compactApp}-${compactEnv}-primary'
var functionCanaryName = 'func-${compactApp}-${compactEnv}-canary'
var frontDoorProfileName = 'afd-${compactApp}-${compactEnv}'
var frontDoorEndpointName = 'app'

resource dataStorage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: dataStorageName
  location: location
  tags: tags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: true
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    publicNetworkAccess: 'Enabled'
  }
}

resource dataBlobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: dataStorage
  name: 'default'
  properties: {
    changeFeed: {
      enabled: true
    }
    containerDeleteRetentionPolicy: {
      enabled: true
      days: 7
    }
    cors: {
      corsRules: []
    }
    deleteRetentionPolicy: {
      enabled: true
      days: 7
    }
    isVersioningEnabled: true
  }
}

resource uploadsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: dataBlobService
  name: 'uploads'
  properties: {
    publicAccess: 'None'
  }
}

resource imagesContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: dataBlobService
  name: 'images'
  properties: {
    publicAccess: 'None'
  }
}

resource artifactsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: dataBlobService
  name: 'artifacts'
  properties: {
    publicAccess: 'None'
  }
}

resource queueService 'Microsoft.Storage/storageAccounts/queueServices@2023-05-01' = {
  parent: dataStorage
  name: 'default'
}

resource mediaJobsQueue 'Microsoft.Storage/storageAccounts/queueServices/queues@2023-05-01' = {
  parent: queueService
  name: 'media-jobs'
}

resource mediaPoisonQueue 'Microsoft.Storage/storageAccounts/queueServices/queues@2023-05-01' = {
  parent: queueService
  name: 'media-jobs-poison'
}

resource tableService 'Microsoft.Storage/storageAccounts/tableServices@2023-05-01' = {
  parent: dataStorage
  name: 'default'
}

resource profilesTable 'Microsoft.Storage/storageAccounts/tableServices/tables@2023-05-01' = {
  parent: tableService
  name: 'profiles'
}

resource deploymentsTable 'Microsoft.Storage/storageAccounts/tableServices/tables@2023-05-01' = {
  parent: tableService
  name: 'deployments'
}

resource webPrimaryStorage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: webPrimaryStorageName
  location: location
  tags: union(tags, {
    ring: 'primary'
  })
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    publicNetworkAccess: 'Enabled'
  }
}

resource webPrimaryBlobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: webPrimaryStorage
  name: 'default'
  properties: {
    cors: {
      corsRules: []
    }
    staticWebsite: {
      enabled: true
      indexDocument: 'index.html'
      error404Document: '404.html'
    }
  }
}

resource webCanaryStorage 'Microsoft.Storage/storageAccounts@2023-05-01' = if (enableCanary) {
  name: webCanaryStorageName
  location: location
  tags: union(tags, {
    ring: 'canary'
  })
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    publicNetworkAccess: 'Enabled'
  }
}

resource webCanaryBlobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = if (enableCanary) {
  parent: webCanaryStorage
  name: 'default'
  properties: {
    cors: {
      corsRules: []
    }
    staticWebsite: {
      enabled: true
      indexDocument: 'index.html'
      error404Document: '404.html'
    }
  }
}

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  tags: tags
  properties: {
    retentionInDays: 30
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
    sku: {
      name: 'PerGB2018'
    }
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    Flow_Type: 'Bluefield'
    WorkspaceResourceId: logAnalytics.id
  }
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-02-01' = {
  name: keyVaultName
  location: location
  tags: tags
  properties: {
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enablePurgeProtection: true
    enabledForDeployment: false
    enabledForDiskEncryption: false
    enabledForTemplateDeployment: true
    publicNetworkAccess: 'Enabled'
    sku: {
      family: 'A'
      name: 'standard'
    }
    softDeleteRetentionInDays: 90
  }
}

var dataStorageConnectionString = 'DefaultEndpointsProtocol=https;AccountName=${dataStorage.name};AccountKey=${listKeys(dataStorage.id, dataStorage.apiVersion).keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
var appInsightsConnectionString = appInsights.properties.ConnectionString

resource functionPlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: functionPlanName
  location: location
  tags: tags
  kind: 'functionapp'
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
  properties: {
    reserved: true
  }
}

resource functionPrimary 'Microsoft.Web/sites@2023-12-01' = {
  name: functionPrimaryName
  location: location
  tags: union(tags, {
    ring: 'primary'
  })
  kind: 'functionapp,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: functionPlan.id
    httpsOnly: true
    siteConfig: {
      ftpsState: 'Disabled'
      healthCheckPath: '/api/health'
      http20Enabled: true
      linuxFxVersion: 'Node|20'
      minTlsVersion: '1.2'
      appSettings: [
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsightsConnectionString
        }
        {
          name: 'AzureWebJobsStorage'
          value: dataStorageConnectionString
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'KEY_VAULT_URI'
          value: keyVault.properties.vaultUri
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'false'
        }
      ]
    }
  }
}

resource functionCanary 'Microsoft.Web/sites@2023-12-01' = if (enableCanary) {
  name: functionCanaryName
  location: location
  tags: union(tags, {
    ring: 'canary'
  })
  kind: 'functionapp,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: functionPlan.id
    httpsOnly: true
    siteConfig: {
      ftpsState: 'Disabled'
      healthCheckPath: '/api/health'
      http20Enabled: true
      linuxFxVersion: 'Node|20'
      minTlsVersion: '1.2'
      appSettings: [
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsightsConnectionString
        }
        {
          name: 'AzureWebJobsStorage'
          value: dataStorageConnectionString
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'KEY_VAULT_URI'
          value: keyVault.properties.vaultUri
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'false'
        }
      ]
    }
  }
}

var webPrimaryHost = replace(replace(webPrimaryStorage.properties.primaryEndpoints.web, 'https://', ''), '/', '')
var webCanaryHost = enableCanary ? replace(replace(webCanaryStorage.properties.primaryEndpoints.web, 'https://', ''), '/', '') : ''
var functionPrimaryHost = '${functionPrimary.name}.azurewebsites.net'
var functionCanaryHost = enableCanary ? '${functionCanary.name}.azurewebsites.net' : ''

resource frontDoorProfile 'Microsoft.Cdn/profiles@2024-02-01' = if (enableCanary) {
  name: frontDoorProfileName
  location: 'global'
  sku: {
    name: 'Standard_AzureFrontDoor'
  }
  tags: tags
}

resource frontDoorEndpoint 'Microsoft.Cdn/profiles/afdEndpoints@2024-02-01' = if (enableCanary) {
  parent: frontDoorProfile
  name: frontDoorEndpointName
  location: 'global'
  properties: {
    enabledState: 'Enabled'
  }
}

resource webOriginGroup 'Microsoft.Cdn/profiles/originGroups@2024-02-01' = if (enableCanary) {
  parent: frontDoorProfile
  name: 'web-origins'
  properties: {
    healthProbeSettings: {
      probeIntervalInSeconds: 120
      probePath: '/index.html'
      probeProtocol: 'Https'
      probeRequestType: 'GET'
    }
    loadBalancingSettings: {
      additionalLatencyInMilliseconds: 0
      sampleSize: 4
      successfulSamplesRequired: 3
    }
    sessionAffinityState: 'Disabled'
  }
}

resource webPrimaryOrigin 'Microsoft.Cdn/profiles/originGroups/origins@2024-02-01' = if (enableCanary) {
  parent: webOriginGroup
  name: 'web-primary'
  properties: {
    enabledState: 'Enabled'
    hostName: webPrimaryHost
    httpPort: 80
    httpsPort: 443
    originHostHeader: webPrimaryHost
    priority: 1
    weight: 1000
    enforceCertificateNameCheck: true
  }
}

resource webCanaryOrigin 'Microsoft.Cdn/profiles/originGroups/origins@2024-02-01' = if (enableCanary) {
  parent: webOriginGroup
  name: 'web-canary'
  properties: {
    enabledState: 'Enabled'
    hostName: webCanaryHost
    httpPort: 80
    httpsPort: 443
    originHostHeader: webCanaryHost
    priority: 1
    weight: 1
    enforceCertificateNameCheck: true
  }
}

resource apiOriginGroup 'Microsoft.Cdn/profiles/originGroups@2024-02-01' = if (enableCanary) {
  parent: frontDoorProfile
  name: 'api-origins'
  properties: {
    healthProbeSettings: {
      probeIntervalInSeconds: 60
      probePath: '/api/health'
      probeProtocol: 'Https'
      probeRequestType: 'GET'
    }
    loadBalancingSettings: {
      additionalLatencyInMilliseconds: 0
      sampleSize: 4
      successfulSamplesRequired: 3
    }
    sessionAffinityState: 'Disabled'
  }
}

resource apiPrimaryOrigin 'Microsoft.Cdn/profiles/originGroups/origins@2024-02-01' = if (enableCanary) {
  parent: apiOriginGroup
  name: 'api-primary'
  properties: {
    enabledState: 'Enabled'
    hostName: functionPrimaryHost
    httpPort: 80
    httpsPort: 443
    originHostHeader: functionPrimaryHost
    priority: 1
    weight: 1000
    enforceCertificateNameCheck: true
  }
}

resource apiCanaryOrigin 'Microsoft.Cdn/profiles/originGroups/origins@2024-02-01' = if (enableCanary) {
  parent: apiOriginGroup
  name: 'api-canary'
  properties: {
    enabledState: 'Enabled'
    hostName: functionCanaryHost
    httpPort: 80
    httpsPort: 443
    originHostHeader: functionCanaryHost
    priority: 1
    weight: 1
    enforceCertificateNameCheck: true
  }
}

resource apiRoute 'Microsoft.Cdn/profiles/afdEndpoints/routes@2024-02-01' = if (enableCanary) {
  parent: frontDoorEndpoint
  name: 'api'
  properties: {
    enabledState: 'Enabled'
    forwardingProtocol: 'HttpsOnly'
    httpsRedirect: 'Enabled'
    linkToDefaultDomain: 'Enabled'
    originGroup: {
      id: apiOriginGroup.id
    }
    patternsToMatch: [
      '/api/*'
    ]
    supportedProtocols: [
      'Http'
      'Https'
    ]
  }
}

resource webRoute 'Microsoft.Cdn/profiles/afdEndpoints/routes@2024-02-01' = if (enableCanary) {
  parent: frontDoorEndpoint
  name: 'web'
  properties: {
    enabledState: 'Enabled'
    forwardingProtocol: 'HttpsOnly'
    httpsRedirect: 'Enabled'
    linkToDefaultDomain: 'Enabled'
    originGroup: {
      id: webOriginGroup.id
    }
    patternsToMatch: [
      '/*'
    ]
    supportedProtocols: [
      'Http'
      'Https'
    ]
  }
}

output dataStorageName string = dataStorage.name
output webPrimaryStorageName string = webPrimaryStorage.name
output webCanaryStorageName string = enableCanary ? webCanaryStorage.name : ''
output webPrimaryUrl string = webPrimaryStorage.properties.primaryEndpoints.web
output webCanaryUrl string = enableCanary ? webCanaryStorage.properties.primaryEndpoints.web : ''
output functionPrimaryName string = functionPrimary.name
output functionCanaryName string = enableCanary ? functionCanary.name : ''
output functionPrimaryUrl string = 'https://${functionPrimaryHost}'
output functionCanaryUrl string = enableCanary ? 'https://${functionCanaryHost}' : ''
output keyVaultName string = keyVault.name
output frontDoorProfileName string = enableCanary ? frontDoorProfile.name : ''
output frontDoorEndpointHost string = enableCanary ? frontDoorEndpoint.properties.hostName : ''
