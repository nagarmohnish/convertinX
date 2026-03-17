# ConvertinX — Architecture Documentation

> Universal Content Localization & Distribution Platform
> Version 2.0.0

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Tech Stack](#tech-stack)
4. [Backend](#backend)
5. [Frontend](#frontend)
6. [AI/ML Models](#aiml-models)
7. [Database Schema](#database-schema)
8. [API Reference](#api-reference)
9. [Pipeline System](#pipeline-system)
10. [Authentication & Authorization](#authentication--authorization)
11. [Distribution System](#distribution-system)
12. [Data Flow Examples](#data-flow-examples)
13. [Configuration](#configuration)
14. [Directory Structure](#directory-structure)

---

## Overview

ConvertinX is a fully local, AI-powered content localization platform that translates, dubs, and subtitles any content into 22 languages. It runs entirely on your machine with zero cloud dependency or API keys.

**Key capabilities:**
- 9 AI-powered tools (translation, TTS, STT, OCR, audio separation, etc.)
- 22 supported languages
- 6+ input formats (video, audio, text, PDF, DOCX, PPTX, images)
- Real-time progress via WebSocket
- User accounts, API keys, and job history
- Distribution to YouTube, podcasts, and webhooks

---

## System Architecture

```
                    +------------------+
                    |    React SPA     |
                    |  localhost:5173  |
                    +--------+---------+
                             |
                    HTTP / WebSocket
                             |
                    +--------+---------+
                    |   FastAPI Server  |
                    |  localhost:8000  |
                    +--------+---------+
                             |
          +------------------+------------------+
          |                  |                  |
   +------+------+   +------+------+   +-------+------+
   |   Routers   |   |  Pipelines  |   |   Services   |
   | (9 routers) |   | (9 pipelines)|  | (12 services)|
   +------+------+   +------+------+   +-------+------+
          |                  |                  |
          +------------------+------------------+
                             |
                    +--------+---------+
                    |  Model Manager   |
                    |  (Singleton)     |
                    +--------+---------+
                             |
          +------------------+------------------+
          |          |           |               |
       Whisper    NLLB-200    Opus-MT        Demucs
       (STT)    (Translation) (Translation)  (Separation)
                   mBART-50    Edge-TTS      EasyOCR
                  (Fallback)    (TTS)         (OCR)
```

---

## Tech Stack

### Backend

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Framework | FastAPI | 0.115.6 | Async web framework |
| Server | Uvicorn | 0.34.0 | ASGI server |
| Database | SQLite + SQLAlchemy | 2.0.36 | Async ORM with aiosqlite |
| Auth | python-jose + passlib | 3.3.0 / 1.7.4 | JWT tokens + bcrypt hashing |
| ML Runtime | PyTorch | 2.5.1 | Model inference |
| NLP | Transformers (HuggingFace) | 4.47.1 | Translation model loading |
| Speech-to-Text | OpenAI Whisper | 20240930 | Audio transcription |
| Text-to-Speech | Edge TTS | 7.2.7 | Neural TTS via Microsoft Edge |
| Audio Separation | Demucs | 4.0.1 | Source separation (vocals/drums/bass/other) |
| Audio Processing | pydub + FFmpeg | 0.25.1 | Audio manipulation |
| OCR | EasyOCR | 1.7.2 | Image text extraction |
| Image Processing | Pillow | 11.1.0 | Image manipulation |
| PDF Processing | PyMuPDF (fitz) | 1.25.3 | PDF text extraction and rebuild |
| DOCX Processing | python-docx | 1.1.2 | Word document handling |
| PPTX Processing | python-pptx | 1.0.2 | PowerPoint handling |
| HTTP Client | httpx | 0.28.1 | Distribution API calls |
| Tokenization | sentencepiece | 0.2.0 | Subword tokenization for translation |
| Language Detection | langdetect | 1.0.9 | Text language identification |
| WebSocket | websockets | 14.1 | Real-time progress updates |

### Frontend

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Framework | React | 19.2.0 | UI library |
| Routing | React Router DOM | 7.13.1 | Client-side routing |
| Build | Vite | 7.3.1 | Dev server + bundler |
| Styling | Tailwind CSS | 4.2.1 | Utility-first CSS |
| Animation | Framer Motion | 12.34.3 | Spring animations |
| Icons | Lucide React | 0.575.0 | Icon library |
| Language | TypeScript | 5.9.3 | Type safety |

---

## Backend

### Entry Point

**File:** `backend/app/main.py`

FastAPI app with lifespan management. On startup:
1. Creates upload/output directories
2. Initializes database tables (SQLAlchemy async)
3. Instantiates `ModelManager` (singleton ML model cache)
4. Instantiates `ProgressBroadcaster` (WebSocket manager)
5. Instantiates `JobOrchestrator` (async job lifecycle)
6. Resolves FFmpeg path (PATH / WinGet / Chocolatey)
7. Configures pydub and Whisper FFmpeg integration

### Model Manager

**File:** `backend/app/models/model_manager.py`

Singleton that lazily loads and caches all ML models with thread-safe locking.

| Method | Model | Size | Purpose |
|--------|-------|------|---------|
| `get_whisper()` | OpenAI Whisper (medium) | ~1.5 GB | Speech-to-text transcription |
| `get_nllb()` | facebook/nllb-200-distilled-600M | ~1.3 GB | 200+ language translation |
| `get_translation_model(src, tgt)` | Helsinki-NLP/opus-mt-{src}-{tgt} | ~300 MB/pair | High-quality pair translation |
| `get_translation_model(src, tgt)` | facebook/mbart-large-50 | ~2.6 GB | Fallback multilingual translation |
| `get_demucs()` | htdemucs | ~300 MB | Audio source separation |

**Translation model priority:** Opus-MT (direct pair) > NLLB-200 > mBART-50

**Thread safety:**
- Each model has its own `threading.Lock` for loading
- Whisper has an additional `_whisper_use_lock` to prevent concurrent transcription (kv_cache is not thread-safe)

### Services

**File:** `backend/app/services/`

| Service | File | Key Functions |
|---------|------|---------------|
| Transcription | `transcription.py` | `transcribe_audio(file_path, src_lang, model_manager)` — Whisper with word-level timestamps |
| Translation | `translation.py` | `translate_text(text, src, tgt, model_manager)` — Multi-engine with 512-token chunking |
| TTS | `tts.py` | `generate_tts_for_segments(segments, lang, gender)` — Edge TTS with rate adjustment |
| Audio | `audio.py` | `merge_audio_segments(job_id, lang, segments, duration)` — Combine TTS into one track |
| Audio Mixer | `audio_mixer.py` | `mix_vocals_over_instrumental(...)` — Overlay TTS on instrumentals |
| Video | `video.py` | `extract_audio()`, `burn_subtitles_and_replace_audio()` — FFmpeg operations |
| Document | `document.py` | `extract_text_from_pdf/docx/pptx()`, `rebuild_pdf/docx/pptx()` |
| OCR | `ocr.py` | `extract_text_regions()`, `overlay_translated_text()` — EasyOCR + Pillow |
| Subtitle | `subtitle.py` | `generate_srt_subtitles()`, `generate_ass_subtitles()` |
| Vocal Separator | `vocal_separator.py` | `separate_vocals()`, `separate_all_stems()` — Demucs 4-stem |
| Language Detect | `language_detect.py` | `detect_language(text)` — langdetect wrapper |

### Translation Service Detail

**File:** `backend/app/services/translation.py`

```
translate_text(text, src, tgt, model_manager)
  |
  +-- get_pivot_chain(src, tgt)       # Determine if pivot through English needed
  |     - Direct Opus-MT pair? -> [(src, tgt)]
  |     - NLLB supported? -> [(src, tgt)]
  |     - Otherwise -> [(src, "en"), ("en", tgt)]
  |
  +-- _translate_single(text, src, tgt, model_manager)
        |
        +-- model_manager.get_translation_model(src, tgt)
        |     Returns: (model, tokenizer, engine: "opus"|"nllb"|"mbart")
        |
        +-- _split_text_into_chunks(text, tokenizer, max_tokens=512)
        |     Splits at sentence boundaries (.!?) respecting token limit
        |
        +-- Engine dispatch:
              - "opus"  -> _translate_opus()   # MarianMT direct translation
              - "nllb"  -> _translate_nllb()   # NLLB-200 with forced_bos_token_id
              - "mbart"  -> _translate_mbart()  # mBART-50 with lang_code_to_id
```

### Document Service Detail

**File:** `backend/app/services/document.py`

**PDF extraction** uses `page.get_text("dict")` for span-level metadata:
```python
# Each block contains:
{
    "page": int,
    "block_bbox": (x0, y0, x1, y1),
    "text": str,               # concatenated for translation
    "spans": [                  # per-span formatting
        {
            "text": str,
            "bbox": (x0, y0, x1, y1),
            "font": str,       # original font name
            "size": float,     # font size in points
            "color": int,      # RGB as integer
            "flags": int,      # 2=italic, 16=bold
        }
    ]
}
```

**PDF rebuild** preserves original formatting:
1. Redact all original text spans (white fill)
2. Distribute translated text proportionally across original span positions
3. Each span reinserted with original font size, color, bold/italic
4. Font matching: tries original family (arial/times/segoe/calibri) with bold/italic variants
5. Falls back to script-based font selection (CJK, Arabic, Cyrillic, Indic, etc.)

---

## Frontend

### Route Structure

```
/                        -> LandingPage (public marketing page)
/login                   -> LoginPage
/register                -> RegisterPage
/app                     -> ToolHubPage (tool discovery grid)
/app/translate           -> TranslatePage (audio/video/text translation)
/app/tts                 -> TTSPage (text to speech)
/app/stt                 -> STTPage (speech to text)
/app/audio-separate      -> AudioSeparatePage (stem separation)
/app/doc-translate       -> DocTranslatePage (PDF/DOCX/PPTX)
/app/image-ocr           -> ImageOCRPage (image OCR + translate)
/app/dashboard           -> DashboardPage (auth required)
```

### State Management

| Context/Hook | Purpose |
|-------------|---------|
| `AuthContext` | Global auth state (user, login, logout, register) |
| `useAuth()` | Access auth context |
| `useWebSocket(jobId)` | Real-time progress updates via WebSocket |
| `useUpload()` | File upload with XHR progress tracking |

**Token storage:** `localStorage` keys `cvx_access_token` and `cvx_refresh_token`

### Design System

Dark theme with custom CSS variables:

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#09090B` | Page background |
| `--surface` | `#111113` | Card backgrounds |
| `--accent` | `#8B5CF6` | Primary purple |
| `--accent-2` | `#A78BFA` | Secondary purple |
| `--cyan` | `#06B6D4` | Document tool accent |
| `--green` | `#34D399` | Success / TTS accent |
| `--red` | `#F87171` | Error / STT accent |
| `--amber` | `#F59E0B` | Warning / OCR accent |

**Fonts:** Inter (body), Space Grotesk (headings), JetBrains Mono (code)

---

## AI/ML Models

### Whisper (Speech-to-Text)

- **Model:** `openai-whisper` (medium)
- **Size:** ~1.5 GB
- **Purpose:** Transcribe audio with word-level timestamps
- **Features:** Auto language detection, 99-language support
- **Constraint:** Not thread-safe (kv_cache); serialized with exclusive lock

### NLLB-200 (Translation — Primary)

- **Model:** `facebook/nllb-200-distilled-600M`
- **Size:** ~1.3 GB
- **Purpose:** Direct translation between any pair of 200+ languages
- **Tokenizer:** `AutoTokenizer` with BCP-47 language codes (e.g., `eng_Latn`, `spa_Latn`)
- **Usage:** `forced_bos_token_id` for target language selection

### Opus-MT (Translation — Best Quality)

- **Model:** `Helsinki-NLP/opus-mt-{src}-{tgt}` (per-pair)
- **Size:** ~300 MB per pair
- **Purpose:** Highest quality for known direct language pairs
- **Pairs:** 48 verified direct pairs across 22 languages
- **Tokenizer:** `MarianTokenizer`

### mBART-50 (Translation — Fallback)

- **Model:** `facebook/mbart-large-50-many-to-many-mmt`
- **Size:** ~2.6 GB
- **Purpose:** Last-resort fallback for unsupported pairs
- **Languages:** 50 languages
- **Tokenizer:** `MBart50TokenizerFast` with `lang_code_to_id`

### Edge TTS (Text-to-Speech)

- **Engine:** Microsoft Edge neural TTS (via `edge-tts`)
- **Voices:** Male + female per language (44 voices total)
- **Features:** SSML rate adjustment, natural prosody
- **Output:** MP3

### Demucs (Audio Separation)

- **Model:** `htdemucs`
- **Size:** ~300 MB
- **Purpose:** Separate audio into 4 stems: vocals, drums, bass, other
- **Device:** CUDA if available, else CPU

### EasyOCR (Image Text Extraction)

- **Engine:** EasyOCR with language-specific readers
- **Languages:** 22 language codes mapped to EasyOCR codes
- **Features:** Bounding box detection, confidence scoring
- **GPU:** Disabled (CPU mode for broader compatibility)

---

## Database Schema

**Engine:** SQLite via SQLAlchemy async + aiosqlite
**File:** `backend/app/db/models.py`

### Tables

#### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | String (UUID) | Primary key |
| email | String | Unique, indexed |
| display_name | String | |
| password_hash | String | bcrypt |
| is_active | Boolean | Default: True |
| is_admin | Boolean | Default: False |
| created_at | DateTime | |
| updated_at | DateTime | |

#### `api_keys`
| Column | Type | Notes |
|--------|------|-------|
| id | String (UUID) | Primary key |
| user_id | FK -> users | |
| key_hash | String | SHA-256 hash, unique |
| key_prefix | String | e.g. "cvx_abc1..." |
| name | String | User label |
| scopes | Text (JSON) | Default: '["tools"]' |
| is_active | Boolean | |
| last_used_at | DateTime | Nullable |
| created_at | DateTime | |

#### `projects`
| Column | Type | Notes |
|--------|------|-------|
| id | String (UUID) | Primary key |
| user_id | FK -> users | |
| name | String | |
| description | Text | Nullable |
| created_at | DateTime | |
| updated_at | DateTime | |

#### `jobs`
| Column | Type | Notes |
|--------|------|-------|
| id | String (UUID) | Primary key |
| user_id | FK -> users | Nullable (anonymous) |
| project_id | FK -> projects | Nullable |
| tool | String | ToolType enum value |
| status | String | queued/processing/completed/failed |
| progress | Float | 0.0 - 1.0 |
| current_step | String | |
| input_meta | Text (JSON) | Tool-specific input params |
| output_meta | Text (JSON) | Tool-specific results |
| error_message | Text | Nullable |
| input_file_path | String | Nullable |
| output_dir | String | Nullable |
| source | String | "web" or "api" |
| api_key_id | FK -> api_keys | Nullable |
| created_at | DateTime | Indexed |
| started_at | DateTime | Nullable |
| completed_at | DateTime | Nullable |

#### `distribution_targets`
| Column | Type | Notes |
|--------|------|-------|
| id | String (UUID) | Primary key |
| user_id | FK -> users | |
| platform | String | youtube/podcast/webhook |
| name | String | User label |
| credentials | Text | Encrypted JSON |
| config | Text (JSON) | Platform-specific config |
| is_active | Boolean | |
| created_at | DateTime | |

#### `distribution_jobs`
| Column | Type | Notes |
|--------|------|-------|
| id | String (UUID) | Primary key |
| job_id | FK -> jobs | |
| target_id | FK -> distribution_targets | |
| language | String | |
| status | String | pending/publishing/published/failed |
| platform_url | String | Nullable |
| error_message | Text | Nullable |
| created_at | DateTime | |
| published_at | DateTime | Nullable |

#### `usage_stats`
| Column | Type | Notes |
|--------|------|-------|
| id | String (UUID) | Primary key |
| user_id | FK -> users | |
| period | String | "YYYY-MM" |
| tool | String | |
| job_count | Integer | |
| total_duration_seconds | Float | |
| total_file_bytes | Integer | |

---

## API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | None | Register new user |
| POST | `/api/auth/login` | None | Login, returns tokens |
| POST | `/api/auth/refresh` | Refresh token | Get new access token |
| GET | `/api/auth/me` | Bearer | Get current user profile |

### Tools

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/upload` | Optional | Submit translation job (audio/video/text) |
| POST | `/api/tools/tts` | Optional | Text-to-Speech |
| POST | `/api/tools/stt` | Optional | Speech-to-Text |
| POST | `/api/tools/separate` | Optional | Audio stem separation |
| POST | `/api/tools/doc-translate` | Optional | Document translation (PDF/DOCX/PPTX) |
| POST | `/api/tools/image-ocr` | Optional | Image OCR + translation |

### Jobs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/jobs/{job_id}` | Optional | Get job status and results |
| GET | `/api/jobs/{job_id}/download/{lang}/{file_type}` | None | Download output file |

### Dashboard (Auth Required)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/dashboard/jobs` | Bearer | Paginated job history |
| GET | `/api/dashboard/stats` | Bearer | Usage statistics |

### API Keys (Auth Required)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/api-keys` | Bearer | Create API key |
| GET | `/api/api-keys` | Bearer | List API keys |
| DELETE | `/api/api-keys/{key_id}` | Bearer | Revoke API key |

### Distribution (Auth Required)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/distribution/platforms` | Bearer | List available platforms |
| POST | `/api/distribution/targets` | Bearer | Connect distribution target |
| GET | `/api/distribution/targets` | Bearer | List connected targets |
| DELETE | `/api/distribution/targets/{id}` | Bearer | Disconnect target |
| POST | `/api/distribution/publish` | Bearer | Publish to platform |
| GET | `/api/distribution/jobs` | Bearer | List distribution jobs |

### Other

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/languages` | None | List supported languages |
| GET | `/api/health` | None | Health check |
| WS | `/ws/progress/{job_id}` | None | Real-time job progress |

---

## Pipeline System

### Orchestrator

**File:** `backend/app/pipeline/orchestrator.py`

The `JobOrchestrator` manages the full job lifecycle:
1. **Submit** — Creates job in memory + DB, launches background asyncio task
2. **Execute** — Acquires semaphore (max 3 concurrent), dispatches to tool pipeline
3. **Progress** — Pipeline broadcasts updates via WebSocket
4. **Complete/Fail** — Updates in-memory state + DB, broadcasts final status

### Pipeline Registry

| Tool Type | Pipeline | Input | Output |
|-----------|----------|-------|--------|
| `translate_text` | `text_pipeline.py` | Text file | Translated TXT per language |
| `translate_audio` | `audio_pipeline.py` | Audio file | Dubbed MP3 per language |
| `translate_video` | `video_pipeline.py` | Video file | Dubbed MP4 + SRT per language |
| `translate_singing` | `singing_pipeline.py` | Audio file | Translated song per language |
| `tts` | `tts_pipeline.py` | Text + language | MP3 audio |
| `stt` | `stt_pipeline.py` | Audio file | TXT + SRT transcript |
| `doc_translate` | `doc_translate_pipeline.py` | PDF/DOCX/PPTX | Translated document |
| `image_ocr` | `image_ocr_pipeline.py` | Image file | Translated image + text |
| `audio_separate` | `audio_separate_pipeline.py` | Audio file | 4 WAV stems |

---

## Authentication & Authorization

### JWT Token Flow

```
Register/Login -> {access_token (15min), refresh_token (7 days)}
                          |
                   Bearer header
                          |
                   get_current_user_optional()
                          |
              +-----------|----------+
              |                      |
         User found             User = None
       (authenticated)        (anonymous access)
              |
       require_auth()  <-- Only for dashboard/API keys/distribution
```

### API Key Authentication

API keys can be used as an alternative to JWT:
- Header: `X-Api-Key: cvx_xxxxxxxxxxxx`
- Created via `/api/api-keys` endpoint
- Scoped: default scope is `["tools"]`
- Key hash stored (SHA-256), raw key shown only once on creation

### Auth is Optional

Most tool endpoints work without authentication. Auth is required only for:
- Dashboard (`/api/dashboard/*`)
- API key management (`/api/api-keys`)
- Distribution (`/api/distribution/*`)

---

## Distribution System

**File:** `backend/app/distribution/`

### Connector Pattern

```python
class DistributionConnector(ABC):
    async def publish(file_path, title, description, language, config) -> PublishResult
    async def validate_credentials(credentials) -> bool
```

### Platforms

| Platform | Connector | Method |
|----------|-----------|--------|
| YouTube | `youtube.py` | Google Data API v3 (OAuth2), uploads as unlisted |
| Podcast | `podcast.py` | Generates iTunes-compatible RSS 2.0 feed |
| Webhook | `webhook.py` | POSTs JSON payload to custom URL |

---

## Data Flow Examples

### Video Translation

```
User uploads MP4
  |
  v
extract_audio() -----> WAV (16kHz mono)
  |
  v
transcribe_audio() --> {language, segments with words}
  |
  v  (for each target language)
translate_text() ----> translated segments
  |
  v
generate_tts() ------> per-segment MP3 with timing adjustment
  |
  v
merge_audio() -------> single dubbed audio track
  |
  v
generate_subtitles() -> ASS (styled) + SRT
  |
  v
burn_subtitles_and_replace_audio() --> final MP4
```

### Document Translation (PDF)

```
User uploads PDF
  |
  v
extract_text_from_pdf() --> blocks with span-level metadata
  |                         (font, size, color, bold/italic, bbox)
  v
translate_text() per block --> translated blocks
  |
  v
rebuild_pdf()
  |-- Redact original spans (white fill)
  |-- Distribute translated text across original positions
  |-- Preserve font size, color, bold/italic per span
  |-- Progressive font reduction on overflow
  v
Output: translated PDF with preserved formatting
```

---

## Configuration

**File:** `backend/app/config.py`

| Setting | Default | Description |
|---------|---------|-------------|
| `upload_dir` | `./data/uploads` | Uploaded file storage |
| `output_dir` | `./data/outputs` | Generated output storage |
| `models_cache_dir` | `./data/models` | HuggingFace model cache |
| `database_url` | `sqlite+aiosqlite:///./data/convertinx.db` | Database connection |
| `jwt_secret_key` | `convertinx-dev-secret-...` | JWT signing key |
| `jwt_access_expiry_minutes` | `15` | Access token lifetime |
| `jwt_refresh_expiry_days` | `7` | Refresh token lifetime |
| `whisper_model_size` | `medium` | Whisper model variant |
| `max_file_size_mb` | `500` | Max upload size |
| `max_video_duration_seconds` | `3600` | Max video duration (1 hour) |
| `max_concurrent_jobs` | `3` | Concurrent job limit |
| `api_rate_limit_per_minute` | `60` | API rate limit |
| `ffmpeg_path` | `ffmpeg` | FFmpeg binary (auto-resolved) |

All settings can be overridden via `.env` file or environment variables.

---

## Directory Structure

```
convertinX/
|-- index.html                          # Shareable landing page
|-- .gitignore
|
|-- backend/
|   |-- requirements.txt                # Python dependencies
|   |-- app/
|   |   |-- __init__.py
|   |   |-- main.py                     # FastAPI app entry point
|   |   |-- config.py                   # Settings (Pydantic)
|   |   |-- dependencies.py             # Global dependency injection
|   |   |
|   |   |-- auth/                       # Authentication module
|   |   |   |-- jwt.py                  # Token creation/validation
|   |   |   |-- password.py             # bcrypt hashing
|   |   |   |-- dependencies.py         # Auth middleware
|   |   |
|   |   |-- db/                         # Database module
|   |   |   |-- engine.py               # Async SQLAlchemy engine
|   |   |   |-- models.py               # ORM table definitions
|   |   |   |-- session.py              # Session factory
|   |   |
|   |   |-- models/                     # Data models
|   |   |   |-- schemas.py              # Pydantic schemas + enums
|   |   |   |-- model_manager.py        # ML model singleton cache
|   |   |
|   |   |-- pipeline/                   # Processing pipelines
|   |   |   |-- orchestrator.py         # Job lifecycle manager
|   |   |   |-- progress.py             # WebSocket broadcaster
|   |   |   |-- text_pipeline.py
|   |   |   |-- audio_pipeline.py
|   |   |   |-- video_pipeline.py
|   |   |   |-- singing_pipeline.py
|   |   |   |-- tts_pipeline.py
|   |   |   |-- stt_pipeline.py
|   |   |   |-- audio_separate_pipeline.py
|   |   |   |-- doc_translate_pipeline.py
|   |   |   |-- image_ocr_pipeline.py
|   |   |
|   |   |-- routers/                    # API endpoints
|   |   |   |-- auth.py                 # /api/auth/*
|   |   |   |-- upload.py               # /api/upload
|   |   |   |-- tools.py                # /api/tools/*
|   |   |   |-- jobs.py                 # /api/jobs/*
|   |   |   |-- languages.py            # /api/languages
|   |   |   |-- dashboard.py            # /api/dashboard/*
|   |   |   |-- api_keys.py             # /api/api-keys
|   |   |   |-- distribution.py         # /api/distribution/*
|   |   |   |-- ws.py                   # /ws/progress/*
|   |   |
|   |   |-- services/                   # Business logic
|   |   |   |-- transcription.py        # Whisper transcription
|   |   |   |-- translation.py          # Multi-engine translation
|   |   |   |-- tts.py                  # Edge TTS generation
|   |   |   |-- audio.py                # Audio segment merging
|   |   |   |-- audio_mixer.py          # Vocal + instrumental mixing
|   |   |   |-- video.py                # FFmpeg video operations
|   |   |   |-- document.py             # PDF/DOCX/PPTX handling
|   |   |   |-- ocr.py                  # EasyOCR text extraction
|   |   |   |-- subtitle.py             # SRT/ASS generation
|   |   |   |-- vocal_separator.py      # Demucs separation
|   |   |   |-- language_detect.py       # langdetect wrapper
|   |   |
|   |   |-- distribution/              # Platform connectors
|   |   |   |-- base.py                 # Abstract connector
|   |   |   |-- youtube.py              # YouTube Data API
|   |   |   |-- podcast.py              # RSS feed generation
|   |   |   |-- webhook.py              # Custom webhook POST
|   |   |
|   |   |-- utils/                      # Utilities
|   |       |-- file_utils.py           # File type detection, upload saving
|   |       |-- language_map.py         # 22 languages with model codes
|   |       |-- time_utils.py           # Time formatting helpers
|
|-- frontend/
|   |-- package.json
|   |-- vite.config.ts
|   |-- tsconfig.json
|   |-- index.html
|   |
|   |-- src/
|       |-- main.tsx                    # React entry point
|       |-- App.tsx                     # Router + AuthProvider
|       |-- index.css                   # Global styles + design tokens
|       |
|       |-- types/
|       |   |-- index.ts               # TypeScript interfaces
|       |
|       |-- context/
|       |   |-- AuthContext.tsx         # Auth state management
|       |
|       |-- hooks/
|       |   |-- useUpload.ts           # File upload with progress
|       |   |-- useWebSocket.ts        # Real-time job updates
|       |
|       |-- utils/
|       |   |-- api.ts                 # Fetch wrapper + token management
|       |   |-- languages.ts           # Language list + helpers
|       |
|       |-- pages/
|       |   |-- ToolHubPage.tsx        # Tool discovery grid
|       |   |-- TranslatePage.tsx      # Audio/video/text translation
|       |   |-- TTSPage.tsx            # Text-to-Speech
|       |   |-- STTPage.tsx            # Speech-to-Text
|       |   |-- AudioSeparatePage.tsx  # Stem separation
|       |   |-- DocTranslatePage.tsx   # Document translation
|       |   |-- ImageOCRPage.tsx       # Image OCR + translation
|       |   |-- DashboardPage.tsx      # User dashboard
|       |   |-- LoginPage.tsx
|       |   |-- RegisterPage.tsx
|       |
|       |-- components/
|           |-- AppView.tsx            # Main translation tool UI
|           |-- Layout.tsx             # Page layout wrapper
|           |-- UploadZone.tsx         # Drag-and-drop file upload
|           |-- LanguageSelector.tsx   # Language picker
|           |-- ProgressTracker.tsx    # Real-time progress bar
|           |-- ResultsPanel.tsx       # Job results + downloads
|           |
|           |-- dashboard/
|           |   |-- JobHistory.tsx
|           |   |-- UsageStats.tsx
|           |   |-- ApiKeyManager.tsx
|           |   |-- DistributePanel.tsx
|           |
|           |-- landing/
|           |   |-- LandingPage.tsx
|           |   |-- Navbar.tsx
|           |   |-- Hero.tsx
|           |   |-- Features.tsx
|           |   |-- FormatMatrix.tsx
|           |   |-- LanguageGrid.tsx
|           |   |-- Pipeline.tsx
|           |   |-- TechStack.tsx
|           |   |-- ValueStrip.tsx
|           |   |-- FinalCTA.tsx
|           |   |-- Footer.tsx
|           |
|           |-- ui/
|               |-- ScrollReveal.tsx
```

---

## Supported Languages (22)

| Code | Language | Whisper | Opus-MT | NLLB-200 | mBART-50 | Edge TTS |
|------|----------|---------|---------|----------|----------|----------|
| en | English | en | en | eng_Latn | en_XX | en-US |
| es | Spanish | es | es | spa_Latn | es_XX | es-ES |
| fr | French | fr | fr | fra_Latn | fr_XX | fr-FR |
| de | German | de | de | deu_Latn | de_DE | de-DE |
| it | Italian | it | it | ita_Latn | it_IT | it-IT |
| pt | Portuguese | pt | pt | por_Latn | pt_XX | pt-BR |
| ru | Russian | ru | ru | rus_Cyrl | ru_RU | ru-RU |
| ja | Japanese | ja | jap | jpn_Jpan | ja_XX | ja-JP |
| zh | Chinese | zh | zh | zho_Hans | zh_CN | zh-CN |
| ko | Korean | ko | ko | kor_Hang | ko_KR | ko-KR |
| hi | Hindi | hi | hi | hin_Deva | hi_IN | hi-IN |
| ar | Arabic | ar | ar | arb_Arab | ar_AR | ar-SA |
| tr | Turkish | tr | tr | tur_Latn | tr_TR | tr-TR |
| nl | Dutch | nl | nl | nld_Latn | nl_XX | nl-NL |
| pl | Polish | pl | pl | pol_Latn | pl_PL | pl-PL |
| sv | Swedish | sv | sv | swe_Latn | sv_SE | sv-SE |
| vi | Vietnamese | vi | vi | vie_Latn | vi_VN | vi-VN |
| th | Thai | th | th | tha_Thai | th_TH | th-TH |
| id | Indonesian | id | id | ind_Latn | id_ID | id-ID |
| uk | Ukrainian | uk | uk | ukr_Cyrl | uk_UA | uk-UA |
| el | Greek | el | el | ell_Grek | el_GR | el-GR |
| cs | Czech | cs | cs | ces_Latn | cs_CZ | cs-CZ |
