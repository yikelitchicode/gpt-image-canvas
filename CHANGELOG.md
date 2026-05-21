# Changelog

## v0.4.0 - 2026-05-21

Prompt Pool release.

### Added

- Prompt Pool route for browsing bundled prompt JSON with masonry cards, media/model filters, search, readiness sorting, and detail previews.
- Prompt Pool API and shared contracts for loading bundled data from `prompt-pool-data` or an override `PROMPT_POOL_DIR`.
- Prompt favorites with local groups, bookmark actions, copy/use flows, usage metadata, and a floating quick-access panel on the canvas.
- Docker support for bundling Prompt Pool JSON data into the runtime image.

### Changed

- Canvas navigation now includes Prompt Pool alongside Canvas and Gallery, with prompt reuse filling generation settings from the selected pool item.
- Prompt Pool browsing now auto-loads more cards near the scroll end and keeps long favorite prompts readable in a viewport-aware tooltip.
- Bundled Prompt Pool data was refreshed to 2,968 prompts and 5,365 referenced assets.

## v0.3.0 - 2026-05-05

Agent canvas generation release.

### Added

- Agent tab for turning natural-language image requests into strict, reviewable `GenerationPlan` objects.
- Separate OpenAI-compatible Agent LLM configuration with local masked API-key storage, Base URL, model, timeout, and `supportsVision`.
- WebSocket Agent run protocol for streaming assistant output, reasoning/thinking deltas, plan creation, plan updates, job progress, asset previews, cancellation, and completion.
- Agent plan node shape on the canvas with job lists, dependencies, output counts, status, thumbnails, detailed job inspection, and plan actions.
- DAG-based Agent executor for parallel independent jobs, generated-output dependencies, selected canvas references, cancel-on-disconnect behavior, and retrying failed or blocked jobs while preserving successful upstream outputs.
- Agent smoke checks for planner validation, configuration/WebSocket flow, and executor orchestration.

### Changed

- Reference-image generation now supports up to three references per request and records multiple reference asset IDs.
- Provider configuration now supports saved local OpenAI-compatible credentials and reorderable provider priority across environment OpenAI, local OpenAI, and Codex sources.
- Canvas, Gallery, provider configuration, and Agent UI now share the bilingual i18n layer.
- Agent planner streaming and transcript layout were refined so plans, direct assistant output, and inspectable reasoning are easier to follow during a live run.

## v0.2.0 - 2026-05-01

Credential-aware homepage and Codex login release.

### Added

- Homepage for first-run and missing-provider states, with entry points for Codex login and API setup.
- Codex device-login flow, auth status API, logout API, and local OAuth token persistence.
- Codex image provider fallback through the Responses image flow when `OPENAI_API_KEY` is not configured.
- Provider status controls in the canvas shell for viewing OpenAI/Codex availability and starting or ending a Codex session.

### Changed

- `/` now routes by credential state: valid OpenAI API key or Codex session opens the canvas, otherwise the homepage is shown.
- Image generation provider selection now prioritizes `OPENAI_API_KEY` and falls back to Codex only when no API key is configured.
- Documentation and `.env.example` now cover Codex login, provider priority, and token storage expectations.

## v0.1.1 - 2026-04-30

Gallery and interface refresh release.

### Added

- Gallery page for browsing, searching, opening, reusing, downloading, and removing generated images.
- API routes and shared contracts for Gallery image listing and output removal.

### Changed

- Refreshed the canvas shell, navigation, AI panel, controls, prompt starters, reference preview, and generated-image preview behavior.
- Updated the app preview asset to match the new interface.

## v0.1.0 - 2026-04-29

First usable release focused on durable image storage, provider compatibility, and smoother canvas workflows.

### Added

- Tencent Cloud COS backup for AI-generated images.
- In-app cloud storage settings for COS `SecretId`, `SecretKey`, bucket, region, and key prefix.
- Local + COS dual-write flow for new generated images when COS is enabled.
- COS test upload/delete validation before saving cloud storage settings.
- Cloud metadata on generated assets, including upload status, object key, upload time, and last error.
- Local-first asset reads with COS fallback and local backfill when the local file is missing.
- Compatibility for PackyCode / `gpt-image` style image response formats.

### Changed

- Generated images remain saved locally even when cloud upload fails.
- Cloud upload failures are shown in the UI without failing the generation result.
- Project loading now falls back to a blank canvas if an old or damaged project row cannot be read.
- Project snapshot save limit increased to reduce autosave failures for larger canvases.
- Docker defaults keep SQLite in `DELETE` journal mode with `EXCLUSIVE` locking for bind-mounted data.
- Cloud storage secrets are masked in GET responses and are not echoed back in full.

### Upgrade Notes

- Back up `data/` before upgrading from earlier builds.
- Rebuild the Docker image after upgrading so the web app and API routes stay in sync.
- Do not run Docker and `pnpm dev` against the same `data/` directory at the same time.
- COS settings are stored locally in SQLite. If the database is reset, re-enter the COS SecretKey in the cloud storage dialog.
