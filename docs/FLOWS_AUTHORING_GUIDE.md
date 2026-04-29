# Enterprise Chat Flow Builder — Authoring Guide

> Audience: Workspace owners and admins who build chatbot flows.
>
> Last updated: 2026-04-28

This guide explains how to build, test, publish, and operate an enterprise
chat flow on IndicBot. It covers the runtime contract, every node type, the
variable / secret system, the SSRF allow-list policy for outbound API calls,
and the publish lifecycle.

---

## 1. Mental model

A flow is a **directed graph of nodes** that runs as a **state machine** for
the duration of one visitor conversation. Each turn:

1. The runtime starts (or resumes) at a node.
2. It executes nodes in a tight loop, accumulating output **chunks**
   (text, ai, buttons, cards, link, typing, handoff, error).
3. It pauses when it hits a node that needs visitor input (`question`,
   `capture`, `cards` with `awaitClick: true`) or a non-rendering action that
   completes the turn (e.g. `action_handoff`).
4. The chunks stream to the widget over the same SSE channel used for AI
   replies. The widget renders each chunk as it arrives.

State per conversation (in `Conversation.flowState`):

| Field | What it holds |
|-------|--------------|
| `flowId` | The flow currently in control of this conversation. Preserved even after the flow ends so analytics can attribute the run. |
| `nodeId` | The current node, or `null` if the flow has finished. |
| `variables` | Map of values captured / set during the run (`{{vars.x}}`). |
| `retries` | Per-node retry counter for capture validation. |
| `history` | Array of node IDs visited so far (powers analytics + drop-off). |
| `pendingCaptureVar` | The variable name a `capture` node is waiting on. |

> **Per-bot Behavior Mode:** each bot has `behaviorMode = 'default' | 'flow'`.
> In `default` mode the visitor talks to the AI grounded on the KB. In `flow`
> mode the bot serves `bot.activeFlowId` to every visitor on every message.
> Flip this from the Flows page (the Behavior banner) or via `PATCH
> /api/users/bots/:id/behavior`.

---

## 2. Variable system — `{{namespace.path}}`

Every user-authored string in a flow is run through the interpolator before
it leaves the server. That includes message text, capture prompts, branch
comparison values, API URL/headers/body, card titles, and handoff messages.

| Namespace | Source | Example |
|-----------|--------|---------|
| `vars.<name>` | Flow variables collected so far (from `capture` / `set_variable` / `action_api` `responseMap`). | `{{vars.email}}`, `{{vars.order.total}}` |
| `secret.<name>` | Decrypted secret from the per-client vault (see §4). **Async only**, never logged. | `{{secret.shopify_token}}` |
| `user.<field>` | Lead info on the conversation (`email`, `phone`, `name`). | `{{user.email}}` |
| `system.<field>` | Runtime metadata: `now` (ISO), `today` (YYYY-MM-DD), `visitorId`, `botId`, `botName`, `conversationId`. | `{{system.today}}` |
| `api.<field>` | The previous `action_api` outcome: `statusCode`, `ok`, `error`, `data.<jsonPath>`. | `{{api.data.orders[0].id}}`, `{{api.statusCode}}` |
| `visitor.text` | The most recent visitor message in this turn. | `{{visitor.text}}` |

**Path syntax** supports dotted keys and array indexing:

```
{{api.data.results[0].profile.email}}
```

Unknown placeholders resolve to an empty string — we never leak `{{...}}` to
end-users.

> **Pickers:** the config modal has `VariablePicker`, `SecretPicker`, and
> `NodeRefPicker` components that insert these placeholders for you. Use
> them — typos in `{{vars.emial}}` silently render `""` at runtime.

---

## 3. Node reference

There are 13 node types. Every node has `id`, `type`, an optional `next`
(default outgoing edge), and per-type config.

### 3.1 Rendering nodes (produce chunks, may pause)

| Node | Purpose | Pauses? | Outputs |
|------|---------|---------|---------|
| `message` | Send static or interpolated text. | No | `text` chunk |
| `ai` | Call the LLM grounded on the KB; optionally bound by a `systemPrompt` and `maxTokens`. | No | `ai` token stream |
| `question` | Legacy — text + button choices. Pauses for click. | Yes | `text` + `buttons` |
| `capture` | Ask for typed input, validate it, store to `variables.<varName>`. Validators: `email`, `phone`, `number`, `date`, `url`, `regex`. Increments `retries.<nodeId>` and re-prompts on failure up to `maxRetries`. | Yes | `text` |
| `cards` | Render an array of cards with image / title / subtitle / button list. Buttons can be `url`, `postback` (sends a label back as a synthetic visitor message), or `call_api` (fires an API node by ID). | Optional (`awaitClick: true`) | `cards` |

### 3.2 Logic nodes (silent — never produce chunks)

| Node | Purpose | Config |
|------|---------|--------|
| `set_variable` | Assign `{{vars.x}} = value` (interpolated). | `{ varName, value }` |
| `branch` | Multi-condition router. Evaluates `conditions[]` top-down, picks the first match, falls through to `defaultNext`. Operators: `eq`, `neq`, `gt`, `lt`, `contains`, `exists`, `regex`. | `{ conditions: [{ left, op, right, next }], defaultNext }` |
| `delay` | `await` for `ms` milliseconds (capped at 5000). Useful before a `cards` reveal. | `{ ms }` |
| `jump` | Goto another node ID. Loops are detected by the validator. | `{ targetNodeId }` |
| `end` / `trigger` | Terminal markers. `end` finishes the flow (`nodeId → null`, `flowId` preserved for analytics). `trigger` is a re-entry point used by templates. | — |

### 3.3 Action nodes (effects with side outputs)

| Node | Purpose | Outputs |
|------|---------|---------|
| `action_api` | HTTP call. See §5 for the full security model. | `api.*` namespace populated; optional `text` from `successMessage` / `errorMessage`. |
| `action_handoff` | Flip `Conversation.status = 'escalated'`, emit `conversation:escalated` over Socket.IO so live agents can join, send a `handoff` chunk so the widget shows the takeover banner and joins the agent room. | `text` (`message`) + `handoff` chunk |

### 3.4 Edges

- `next: <nodeId>` is the default outgoing edge.
- `branch.conditions[i].next` overrides for a specific branch arm.
- `cards.buttons[i].next` overrides for a specific card click.
- The graph linter (`POST /api/users/flows/:id/validate`) catches:
  dangling refs, no `start` node, multiple `start` nodes, capture without
  `varName`, cycles without an exit, branch with no `defaultNext`, and
  unreachable nodes.

---

## 4. Secrets vault

Secrets (API tokens, webhook signing keys, etc.) are **per-client** —
account-wide, **never per-flow** — so the same `shopify_token` works across
every bot you own.

- Stored in MongoDB encrypted with **AES-256-GCM**, key from the
  `SECRETS_ENC_KEY` env var (32-byte base64 or hex). Rotating the key is a
  manual re-encrypt step; do not rotate without a migration.
- Resolved lazily inside `interpolateAsync` via
  `secretsVault.service.getSecretValue(userId, name)`.
- LRU-cached for 60 seconds in memory. Rotations propagate within that
  window.
- Plaintext values **never** appear in logs, validation reports, or test
  transcripts — only in the live HTTP request itself.

CRUD endpoints:

```
GET    /api/users/secrets               # list — names only, no values
POST   /api/users/secrets               # body: { name, value, description? }
PATCH  /api/users/secrets/:name         # body: { value?, description? }
DELETE /api/users/secrets/:name
```

Use them via `{{secret.<name>}}` inside any string field of any node. The
recommended pattern for a Bearer token:

```jsonc
// action_api.headers
{ "Authorization": "Bearer {{secret.shopify_token}}" }
```

---

## 5. `action_api` and the SSRF allow-list

The `action_api` executor calls outbound HTTP using URLs **clients author**.
That is a high-risk surface, so every call goes through `ssrfGuard.js`.

### 5.1 Defense layers

1. **Scheme allow-list** — only `http:` and `https:`.
2. **Hostname pre-check** — literal IPs in private ranges and obvious
   internal hostnames (`localhost`, `metadata.google.internal`, `*.local`,
   `*.localhost`) are rejected before DNS.
3. **DNS-resolved IP check** — the host's resolved A/AAAA records are
   matched against this deny-list:

   | Range | Why |
   |-------|-----|
   | `10.0.0.0/8` | RFC1918 private |
   | `100.64.0.0/10` | CGNAT |
   | `127.0.0.0/8` | loopback |
   | `169.254.0.0/16` | link-local + cloud metadata |
   | `172.16.0.0/12` | RFC1918 private |
   | `192.0.0.0/24`, `192.168.0.0/16` | RFC1918 / reserved |
   | `198.18.0.0/15` | benchmarking |
   | `224.0.0.0/4` and above | multicast / reserved |
   | IPv6 `::1`, `fc00::/7`, `fe80::/10`, IPv4-mapped private | loopback / unique-local / link-local |

4. **Per-call timeout** — `cfg.timeoutMs` clamped to `[500ms, 30000ms]`,
   default 8000ms.
5. **Body / response cap** — response body is read but not exposed in raw
   form; you must extract values via `responseMap` (JSONPath).

> **TOCTOU note:** the pre-check resolves DNS once; the actual axios
> request resolves DNS again. A malicious DNS record could change between
> calls. Production hardening would be to pin the resolved IP and pass the
> hostname via the `Host` header. We accept the residual risk today; the
> common attack vectors are still blocked.

### 5.2 Authoring an `action_api` node

```jsonc
{
  "id": "fetch_order",
  "type": "action_api",
  "method": "GET",
  "url": "https://api.shopify.com/admin/api/2024-04/orders/{{vars.order_id}}.json",
  "headers": {
    "Authorization": "Bearer {{secret.shopify_token}}",
    "Accept": "application/json"
  },
  "responseMap": {
    "order.id": "$.order.id",
    "order.total": "$.order.total_price",
    "order.status": "$.order.financial_status"
  },
  "successNext": "show_status",
  "errorNext": "fallback_handoff",
  "successMessage": "Order #{{vars.order.id}} — {{vars.order.status}}",
  "errorMessage": "We couldn't reach our order system. Connecting you to a human."
}
```

After this node runs you can read `{{vars.order.id}}` anywhere downstream,
or fall back to `{{api.data.<path>}}` for one-shot values you don't want to
persist. `{{api.statusCode}}` and `{{api.error}}` are always available
inside `successMessage` / `errorMessage`.

---

## 6. Validating + testing before publish

| Endpoint | Purpose |
|----------|---------|
| `POST /api/users/flows/:id/validate` | Graph linter. Returns `{ ok, errors[], warnings[] }`. Click a row in the **Validation** side panel to jump to the offending node on the canvas. |
| `POST /api/users/flows/:id/test` | Dry-run engine. Body: `{ messages: ['hi', 'order #123', '...'] }`. Returns the full transcript + a per-step variable snapshot. Powers the **Test sandbox** side panel. |
| `POST /api/users/flows/:id/publish` | Snapshot the current `draft` into `published`, set `status = 'published'`, set `publishedAt`, bump `publishedVersion`. |
| `POST /api/users/flows/:id/unpublish` | Demote back to draft-only. Activated bots fall back to Default AI. |

The **Variables** panel statically scans the flow and shows which nodes
write each variable and which nodes read it — useful for catching typos
across `{{vars.emial}}` vs `{{vars.email}}`.

The **Analytics** panel reads from `Conversation.flowState.history` and
shows total runs, completion rate, average nodes visited, and per-node
visits + drop-off rate over a 7d / 30d / 90d window.

---

## 7. Publish lifecycle

```
draft  ──[publish]──▶  published
              ▲              │
              │              │
              └────[edit]────┘  (creates a new draft, published copy stays live)
```

- Editing a published flow creates an **unsaved draft** on top — the live
  flow keeps serving until you click **Publish** again.
- The header shows an **Unsaved** pill and a **Discard draft** button while
  changes are pending; **Discard** restores the last published version.
- Activating / deactivating a flow on a bot uses the published copy only —
  drafts never reach visitors.
- A flow can be active on multiple bots; deactivating one bot does not
  affect others.

---

## 8. Operational tips

- Always end every branch in either `end`, a `jump` to a known node, or an
  `action_handoff` — never leave a leaf without `next`.
- Keep `cards.awaitClick = true` only when you really want the conversation
  to pause. Otherwise the LLM may resume and step on the cards.
- Prefer `branch` over deeply nested `question` chains. The validator
  flags long `question` chains as a smell.
- Use `delay` (≤ 5s) sparingly — it blocks the SSE response and feels slow.
- Test escalation paths with the **Test sandbox** by injecting the keyword
  `agent` (configurable) and asserting the run ends on `action_handoff`.

---

## 9. Environment variables this guide refers to

| Variable | Purpose |
|----------|---------|
| `SECRETS_ENC_KEY` | 32-byte AES-256-GCM key (base64 or hex). **Required** if any flow uses `{{secret.x}}`. |
| `FLOW_API_TIMEOUT_MS` | Optional global cap for `action_api` timeouts (default 8000, hard-clamped 500–30000). |
| `FLOW_SSRF_EXTRA_DENY` | Optional comma-separated extra hostnames to deny in addition to the built-in list. |

> **Never** put secrets in `.env` files committed to git. Use the
> per-client vault (`POST /api/users/secrets`) for anything tenant-specific.
