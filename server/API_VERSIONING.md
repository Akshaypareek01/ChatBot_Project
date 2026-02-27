# API Versioning Policy

## Current version: v1

- **Versioned base path:** `/api/v1/`
- **Legacy (unversioned) path:** `/api/` — same routes, supported for backward compatibility.

## Usage

- New integrations should use **`/api/v1/`** (e.g. `POST /api/v1/chat/stream`, `GET /api/v1/users/profile`).
- Existing clients can keep using **`/api/`**; behavior is identical.

## Policy

1. **Backward compatibility:** Unversioned `/api/` will be maintained for at least **3 months** after any breaking change is introduced in a new version.
2. **Breaking changes:** When we introduce breaking changes, we will:
   - Add a new version (e.g. `/api/v2/`) with the new behavior.
   - Keep `/api/v1/` and `/api/` (if it still points to v1) unchanged for the compatibility period.
3. **Non-breaking changes:** New optional fields, new endpoints, and additive changes may be added to the current version without a new version number.

## Route parity

All routes available under `/api/` are available under `/api/v1/` with the same method, path, and behavior.

Examples:

| Legacy              | Versioned           |
|---------------------|---------------------|
| `POST /api/chat/stream` | `POST /api/v1/chat/stream` |
| `GET /api/users/profile` | `GET /api/v1/users/profile` |
| `POST /api/users/login` | `POST /api/v1/users/login` |
