// Book Lab demo booking page: one Free Static Web App, nothing else.
// The page is static sample data, so there is no Function App, Key Vault or database.
//
//   az group create -n rg-booklab-demo -l newzealandnorth --tags product=booklab clientId=demo
//   az deployment group create -g rg-booklab-demo -f infra/main.bicep
//
// Then put the deploy token in the GitHub secret AZURE_SWA_TOKEN_DEMO:
//   az staticwebapp secrets list -n booklab-web-demo --query properties.apiKey -o tsv

@description('SWA metadata region (content is served globally; the site holds no patient data).')
param staticWebAppLocation string = 'eastasia'

resource staticSite 'Microsoft.Web/staticSites@2023-12-01' = {
  name: 'booklab-web-demo'
  location: staticWebAppLocation
  tags: { clientId: 'demo', product: 'booklab' }
  sku: { name: 'Free', tier: 'Free' }
  properties: {
    allowConfigFileUpdates: true
  }
}

output staticWebAppName string = staticSite.name
output staticWebAppHostname string = staticSite.properties.defaultHostname
