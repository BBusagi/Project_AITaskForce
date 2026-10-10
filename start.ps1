$ErrorActionPreference = 'Stop'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
Set-Location -LiteralPath $PSScriptRoot
dotnet run --project 'src/AssetDesk.Desktop/AssetDesk.Desktop.csproj'
