# Database Schema

Generated documentation for the SQLite schema defined in `apps/api/src/infrastructure/schema.ts`.

Last reviewed: 2026-05-09.

## `projects`

Stores the saved tldraw project snapshot.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text | Primary key. |
| `name` | text | Required project name. |
| `snapshot_json` | text | Required serialized project snapshot. |
| `created_at` | text | Required ISO timestamp. |
| `updated_at` | text | Required ISO timestamp. |

## `assets`

Stores generated and reference asset metadata.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text | Primary key. |
| `file_name` | text | Required stored filename. |
| `relative_path` | text | Required path relative to `DATA_DIR`. |
| `mime_type` | text | Required asset MIME type. |
| `width` | integer | Required image width. |
| `height` | integer | Required image height. |
| `cloud_provider` | text | Optional cloud provider ID. |
| `cloud_bucket` | text | Optional cloud bucket. |
| `cloud_region` | text | Optional cloud region. |
| `cloud_object_key` | text | Optional object key. |
| `cloud_status` | text | Optional cloud upload status. |
| `cloud_error` | text | Optional cloud upload error. |
| `cloud_uploaded_at` | text | Optional upload timestamp. |
| `cloud_etag` | text | Optional cloud ETag. |
| `cloud_request_id` | text | Optional cloud request ID. |
| `cloud_endpoint` | text | Optional S3-compatible endpoint used for fallback reads. |
| `cloud_force_path_style` | integer | Optional S3-compatible path-style flag. |
| `created_at` | text | Required ISO timestamp. |

## `storage_configs`

Stores optional Tencent Cloud COS or S3-compatible backup configuration.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text | Primary key. |
| `provider` | text | Required storage provider. |
| `enabled` | integer | Required boolean flag stored as integer. |
| `secret_id` | text | Optional COS SecretId or S3 access key ID. |
| `secret_key` | text | Optional COS SecretKey or S3 secret access key. |
| `bucket` | text | Optional bucket. |
| `region` | text | Optional region. |
| `key_prefix` | text | Optional object key prefix. |
| `endpoint_mode` | text | Optional S3 endpoint mode (`r2-account` or `custom`). |
| `account_id` | text | Optional Cloudflare R2 Account ID. |
| `endpoint` | text | Optional S3-compatible endpoint URL. |
| `force_path_style` | integer | Optional S3-compatible path-style flag. |
| `created_at` | text | Required ISO timestamp. |
| `updated_at` | text | Required ISO timestamp. |

## `provider_configs`

Stores image provider source order and local OpenAI-compatible settings.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text | Primary key. |
| `source_order_json` | text | Required serialized provider source order. |
| `local_api_key` | text | Optional local API key. |
| `local_base_url` | text | Optional OpenAI-compatible base URL. |
| `local_model` | text | Optional image model. |
| `local_timeout_ms` | integer | Optional image timeout in milliseconds. |
| `created_at` | text | Required ISO timestamp. |
| `updated_at` | text | Required ISO timestamp. |

## `agent_llm_configs`

Stores Agent planning model configuration.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text | Primary key. |
| `api_key` | text | Optional Agent LLM API key. |
| `base_url` | text | Required OpenAI-compatible base URL. |
| `model` | text | Required planning model. |
| `timeout_ms` | integer | Required timeout in milliseconds. |
| `supports_vision` | integer | Required boolean flag stored as integer. |
| `created_at` | text | Required ISO timestamp. |
| `updated_at` | text | Required ISO timestamp. |

## `agent_conversations`

Stores local Agent conversation history and resumable context snapshots.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text | Primary key. |
| `title` | text | Required conversation title shown in history. |
| `messages_json` | text | Required serialized Agent transcript. |
| `context_json` | text | Required serialized resumable Agent context. |
| `created_at` | text | Required ISO timestamp. |
| `updated_at` | text | Required ISO timestamp; indexed for latest-first history. |

## `codex_oauth_tokens`

Stores local Codex OAuth session state.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text | Primary key. |
| `access_token` | text | Optional access token. |
| `refresh_token` | text | Optional refresh token. |
| `id_token` | text | Optional ID token. |
| `email` | text | Optional account email. |
| `account_id` | text | Optional account ID. |
| `expires_at` | text | Optional token expiry timestamp. |
| `refreshed_at` | text | Optional refresh timestamp. |
| `unavailable_at` | text | Optional unavailable timestamp. |
| `unavailable_reason` | text | Optional unavailable reason. |
| `created_at` | text | Required ISO timestamp. |
| `updated_at` | text | Required ISO timestamp. |

## `generation_records`

Stores one generation request and its overall status.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text | Primary key. |
| `mode` | text | Required generation mode. |
| `prompt` | text | Required user prompt. |
| `effective_prompt` | text | Required prompt after preset composition. |
| `preset_id` | text | Required style preset ID. |
| `width` | integer | Required output width. |
| `height` | integer | Required output height. |
| `quality` | text | Required image quality. |
| `output_format` | text | Required output format. |
| `count` | integer | Required requested output count. |
| `status` | text | Required generation status. |
| `error` | text | Optional generation error. |
| `reference_asset_id` | text | Optional legacy reference to `assets.id`. |
| `created_at` | text | Required ISO timestamp. |

## `generation_outputs`

Stores individual output status and asset linkage for a generation.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text | Primary key. |
| `generation_id` | text | Required reference to `generation_records.id`; cascades on delete. |
| `status` | text | Required output status. |
| `asset_id` | text | Optional reference to `assets.id`. |
| `error` | text | Optional output error. |
| `created_at` | text | Required ISO timestamp. |

## `generation_reference_assets`

Stores multiple reference assets used by one generation.

| Column | Type | Notes |
| --- | --- | --- |
| `generation_id` | text | Required reference to `generation_records.id`; cascades on delete. |
| `asset_id` | text | Required reference to `assets.id`. |
| `position` | integer | Required reference ordering. |
| `created_at` | text | Required ISO timestamp. |

## Relations

- `generation_records` has many `generation_outputs`.
- `generation_records` has many `generation_reference_assets`.
- `generation_records.reference_asset_id` optionally references `assets.id`.
- `generation_outputs.generation_id` references `generation_records.id` with cascade delete.
- `generation_outputs.asset_id` optionally references `assets.id`.
- `generation_reference_assets.generation_id` references `generation_records.id` with cascade delete.
- `generation_reference_assets.asset_id` references `assets.id`.

