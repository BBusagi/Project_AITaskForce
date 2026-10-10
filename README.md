# AssetDesk

A Windows workspace for browsing and organizing applications and personal files. The product direction is application grouping, personal spaces and an organizing inbox, with AI proposals supporting these workflows.

Current v0.1.8 provides scans, application/file/project views, manual categories and local persistence. Application library groups, general personal spaces, inbox, favorites and recent-use tracking are planned; Personal Panel currently shows developer assets. AI interactions remain frozen pending redesign.

[中文说明](readme-zh.md) · [Product direction](docs/product-direction.md) · [Specification](docs/product-spec-v0.1.md) · [Roadmap](docs/development-roadmap.md) · [Implementation status](docs/implementation-v0.1.md)

Planned AI redesign: [Local evidence and AI analysis draft](docs/local-analysis-design.md) combines registration/structured metadata, rules and bounded group summaries before sending unresolved objects to a model. A configurable $10 task budget is a target, not guaranteed full coverage. The pipeline and budget accounting are not implemented; AI remains frozen.

## Run

Requires Windows and .NET SDK 10.0.301 or a later .NET 10 feature band with Windows desktop support.

```powershell
.\start.ps1
```

Or:

```powershell
dotnet run --project src/AssetDesk.Desktop/AssetDesk.Desktop.csproj
```

The portable build in `artifacts/release-v0.1.8/AssetDesk.exe` requires the .NET 10 Desktop Runtime. Build it with:

```powershell
dotnet publish src/AssetDesk.Desktop/AssetDesk.Desktop.csproj -c Release -o artifacts/release-v0.1.8 --self-contained false
```

## First workflow

1. Choose Whole PC or a disk in the scan scope dropdown, then Scan (Prefer Cache). The existing directory picker remains available.
2. Browse files, applications and the developer panel. Filter by name, path, category or tags. Applications supports list/icon views and a Show System-related Apps checkbox; preferences survive restart.
3. Open file assets from Overview; edit categories and tags manually. Scan history supports text selection and copying.
4. Select one application to open/copy its live registered installation location, start a supported registered uninstaller after confirmation, or open Windows Installed Apps. Missing locations/commands are explained; launching an uninstaller does not prove completion.
5. AI Analysis retains its interface and history but is temporarily frozen pending redesign. The underlying AI/cache implementation remains available for future reactivation.

## AI settings

In Settings, choose Ollama, OpenAI, DeepSeek, Anthropic / Claude or a custom OpenAI-compatible service. Enter an API key in the masked field and click Apply Settings. Official endpoints and initial models are filled automatically; Advanced Settings exposes the model and custom Base URL. Connection checking lists models without applying the draft settings or proving generation access.

Keys are encrypted with Windows current-user DPAPI and saved separately per provider. A blank field retains the saved key; Advanced Settings can remove it. Keys are excluded from metadata previews and error bodies. Applying settings does not send assets; each analysis requires explicit preview confirmation.

Ollama needs no key, a running local service and an installed model; the default is `http://127.0.0.1:11434` / `qwen3:8b`. The app does not install or download models. See [Ollama setup](https://docs.ollama.com/quickstart).

Requests use Ollama chat, OpenAI-compatible chat completions or Claude Messages, without streaming and with strict local response validation. Unknown asset IDs, duplicate IDs, unexpected fields and invalid tag lengths reject the whole response. Ollama is restricted to loopback HTTP; remote APIs require HTTPS. Proxies and redirects are disabled. No file bodies or full asset paths are sent. Asset names, tags and user-written goals may still contain private information; inspect the preview and selected destination before sending.

## Data and boundaries

Scan scope defaults to cache reuse: matching current-policy completed/error snapshots bypass directory enumeration, display their time and retain coverage warnings. Check Force Scan Refresh to discover current changes. Mounted-volume identity and scanner rules participate in matching; unknown volume identities bypass reuse. Refresh Applications and Environments always refreshes that discovery scope. Failed/cancelled scans are not installed as new reusable snapshots.

Validated AI results are cached by the entire ordered batch, goal, provider/endpoint/model, prompt/contract version and known asset metadata including modification time and labels. Hits make no model request, work across restart and preserve accepted/rejected decisions without duplicate proposals. API keys are excluded from cache matching. Accepting a proposal retains reuse for that approved request; manual changes or changed source metadata invalidate it. Reanalyze explicitly bypasses cache and may incur API charges. Settings can clear just caches while retaining the index and review history.

This is snapshot reuse, not automatic incremental monitoring. Disk changes become known only after a forced scan. AI grouping depends on the selected batch, so one changed item currently invalidates that whole batch; unchanged items are not yet recomputed independently. The latest 200 validated analysis batches are retained; cache hits do not measure or promise a cumulative monetary saving.

- C# / WPF UI; scanning and AI operations run asynchronously.
- Local SQLite at `%LOCALAPPDATA%\AssetDesk\workspace.db`, using Windows `winsqlite3` without NuGet packages. Schema v3 adds scan/analysis cache tables to assets, suggestions, reports and settings. Existing v1/v2 data migrates additively; old applications cannot open the upgraded index.
- Whole PC scans mounted local fixed/removable disks sequentially and discovers registered applications/PATH tools. Disk mode scans one selected disk. Network, optical and unmounted volumes are excluded; unavailable disks, access errors, cancelled scopes and per-disk limits are reported. No scan begins automatically.
- Read-only metadata scan: pause, cancel, exclusions, error reports, no fixed asset-count cap. Counts appear during enumeration; assets are merged and saved after each scope completes or is cancelled.
- Application discovery currently uses uninstall registry entries. Development tool discovery uses PATH and file version metadata without executing programs.
- App icons come from local registered icon resources when available, otherwise placeholders. System-related flags use SystemComponent, update ReleaseType or a Windows installation directory, independently of user labels and protection. Ordinary Microsoft applications and Program Files are not automatically classified as OS components. Old records need application rediscovery to populate these fields. Hiding changes only the view.
- Project discovery uses Git and common manifest markers. It does not yet validate repository branches, parse dependencies or execute scripts.
- Re-scans preserve manual classifications. Old entries remain historical discoveries; absence is not interpreted as deletion. Clearing the index does not delete original files.
- No automatic uninstall, file deletion/movement, file-body analysis or default telemetry. Manual uninstall launches the registered local EXE or normalized MSI product removal after confirmation; unsupported, quiet, system-related or NoRemove commands fall back to Windows Installed Apps. AssetDesk does not elevate itself; an installer may request Windows UAC.
- Demonstration data/loading are removed. Opening an old index transactionally removes marked demo assets, their proposals and related caches; real assets and decisions are preserved. InstallLocation is an additive JSON field under schema v3, defaulting to empty for old records; actions re-read live registration, so existing indexes need no full-disk rescan.

This is a functional v0.1 prototype, not the entire planned specification. Store/MSIX discovery, crash checkpoint recovery, file identity tracking, live incremental monitoring, deep environment analysis and performance targets are not implemented or verified yet.

## Verification

```powershell
dotnet run --project tests/AssetDesk.Tests/AssetDesk.Tests.csproj -c Release
dotnet build src/AssetDesk.Desktop/AssetDesk.Desktop.csproj -c Release
dotnet src/AssetDesk.Desktop/bin/Release/net10.0-windows/AssetDesk.dll --smoke artifacts/overview.png
```

40 checks cover scanning, review, API/cache adapters, incremental persistence, transactional legacy-demo cleanup, local location resolution and uninstall-plan validation. Offscreen checks use an empty index to verify navigation, application view modes, selectable history, AI freezing and disabled management controls without a selection. No real uninstaller was launched, user directories scanned or model calls made by this validation.

## Future development

Planned work is tracked in [Development roadmap](docs/development-roadmap.md): scanning/search follows benchmarks → incremental persistence and indexed queries → incremental updates → optional NTFS MFT/USN. AI follows redesign (keeping the UI frozen) → bounded analysis and user review → changed-scope analysis and budget controls. S0/S1 are partially implemented; later stages remain planned; the fixed scan cap has been removed at user request, while scale validation remains pending.
