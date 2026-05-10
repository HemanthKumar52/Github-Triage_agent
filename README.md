# GitHub Triage Agent

An **agentic CLI** that points at any GitHub repo and autonomously: triages open issues, finds stale ones, and drafts release notes from merged PRs. Built on **`claude-opus-4-7`** with adaptive thinking + tool use against the GitHub REST API.

```
$ gh-triage anthropics/anthropic-sdk-python "Draft release notes for PRs merged this month"

## Release Notes — November 2026

### Features
- Add adaptive thinking config to streaming helper (#312, @alice)
- Support cache_control on tool definitions (#318, @bob)

### Fixes
- Handle 429 retry-after header in batches (#321, @carol)

### Chores
- Bump dependency versions (#324, @dave)
```

## Stack

- **`claude-opus-4-7`** via `@anthropic-ai/sdk` ^0.65
- **Adaptive thinking** — `thinking: { type: "adaptive" }`
- **Prompt caching** — tool definitions cached with `cache_control: ephemeral`
- **GitHub REST API** — direct `fetch` calls; injectable for testing
- **Node 18+ ESM**, no transpilation, native `node --test`

## Quickstart

```bash
git clone https://github.com/HemanthKumar52/GitHub-Triage-Agent.git
cd GitHub-Triage-Agent
npm install

export ANTHROPIC_API_KEY="sk-ant-..."
export GITHUB_TOKEN="ghp_..."   # optional but recommended (60 → 5000 req/hr)

node src/index.js anthropics/anthropic-sdk-python "List the 5 highest-priority open issues"
```

## Tools

The agent has three tools at its disposal — it picks which to call:

| Tool | What it does |
|---|---|
| `list_open_issues(label?)` | Open issues, optionally filtered by label |
| `list_stale_issues(since_days?)` | Open issues with no update in N days (default 60) |
| `list_merged_prs(since?)` | Recently merged PRs, with title + author |

## Tests

```bash
npm test
# 6 tests pass: 5 tool-dispatcher tests + 1 end-to-end agent loop with a mock SDK client
```

The agent loop test scripts a 3-turn conversation against a `FakeAnthropicClient` — verifies the loop dispatches tools correctly, accumulates messages, and exits on `end_turn`. Asserts `model` and `thinking` config on every call.

## Layout

```
GitHub-Triage-Agent/
├── src/
│   ├── index.js        # CLI entry
│   ├── agent.js        # claude-opus-4-7 + adaptive thinking + tool loop
│   ├── tools.js        # tool schemas + dispatcher
│   └── github.js       # GitHub REST wrapper (injectable fetch)
├── test/
│   ├── tools.test.js
│   └── agent.test.js
└── README.md
```

## License

MIT — see [LICENSE](LICENSE).
