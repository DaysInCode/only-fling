FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build

WORKDIR /src
COPY OnlyFling.Api.csproj ./
RUN dotnet restore ./OnlyFling.Api.csproj
COPY . .
RUN dotnet publish ./OnlyFling.Api.csproj -c Release -o /out

FROM mcr.microsoft.com/azure-functions/dotnet-isolated:4-dotnet-isolated10.0
ENV AzureWebJobsScriptRoot=/home/site/wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true \
    FUNCTIONS_WORKER_RUNTIME=dotnet-isolated
COPY --from=build /out /home/site/wwwroot
