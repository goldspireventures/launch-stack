# Blueprint · Vertical AI Agent

Reference app: [`apps/ai-agent-web`](../../apps/ai-agent-web). Tenant: `lumen`.

## When to use it

You're building an AI co-pilot for a specific industry or workflow — sales, support, ops,
legal, dev tooling. The blueprint gives you sessions, persistent message history, async
agent tasks, and tool calling — without locking you to OpenAI.

## Data model

- `assistant_session` — one session = one conversation. Has `system_prompt`, `tool_policy`,
  `model`, optional `archived_at`.
- `assistant_message` — `role` ∈ {user, assistant, system, tool}. `parts` jsonb for tool
  results / attachments.
- `agent_task` — async work the agent does for the user. `tool_plan` (jsonb array of tool
  names), `progress` (jsonb), `result` (jsonb), `error` text.
- `tool_invocation` — append-only log of every tool call (input/output/duration/error).

## API

| Procedure              | Who         | Notes                                              |
|------------------------|-------------|----------------------------------------------------|
| `aiAgent.sessions`     | signed-in   | User's sessions for a product                      |
| `aiAgent.startSession` | signed-in   | Configures `systemPrompt` + `toolPolicy`           |
| `aiAgent.messages`     | signed-in   | Full message history for one session               |
| `aiAgent.sendMessage`  | signed-in   | Persists user msg, calls `AIProvider.generateText`, persists assistant reply |
| `aiAgent.tasks`        | signed-in   | User's async tasks                                 |
| `aiAgent.createTask`   | signed-in   | Enqueue a task (Inngest pickup in prod)            |

## Screens

- `/` — landing
- `/chat` — sidebar of sessions + main chat pane
- `/tasks` — task list with statuses

## AI provider

Configured via `AI_PROVIDER` env: `mock` (default), `openai`, `anthropic`.

Mock provider is **always** available — no API key required. It echoes deterministic
responses for testing.

## Tools

Tools live in `packages/ai/src/tools.ts`. To add one:

```ts
defineTool({
  name: 'search_docs',
  description: 'Search internal documentation by keyword.',
  schema: z.object({ query: z.string() }),
  execute: async ({ query }) => {
    // call your search backend
    return { results: [...] };
  },
});
```

Then register it in `builtInTools` (or pass a custom registry per session).

## Upgrade path

- v1.1 — Streaming responses via Vercel AI SDK + tRPC subscriptions.
- v1.2 — Inngest worker that picks up `agent_task` and runs tools.
- v1.3 — Voice (Whisper transcription + TTS reply).
- v2.0 — Multi-agent orchestration (the agent can spawn sub-agents).
