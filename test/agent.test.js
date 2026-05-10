import { test } from "node:test";
import assert from "node:assert/strict";

import { run } from "../src/agent.js";

class FakeAnthropicClient {
  constructor(scripted) {
    this.scripted = scripted;
    this.calls = [];
    this.messages = {
      create: async (kwargs) => {
        this.calls.push(kwargs);
        return this.scripted.shift();
      },
    };
  }
}

test("agent loop: tool_use -> tool_use -> end_turn returns final text", async () => {
  const scripted = [
    {
      content: [{ type: "tool_use", id: "t1", name: "list_open_issues", input: {} }],
      stop_reason: "tool_use",
    },
    {
      content: [{ type: "tool_use", id: "t2", name: "list_stale_issues", input: { since_days: 60 } }],
      stop_reason: "tool_use",
    },
    {
      content: [{ type: "text", text: "## Triage Report\n\n5 open issues, 2 stale." }],
      stop_reason: "end_turn",
    },
  ];

  const fakeGithub = {
    listOpenIssues: async () => [],
    listStaleIssues: async () => [],
    listMergedPrs: async () => [],
  };

  const client = new FakeAnthropicClient(scripted);
  const result = await run("Triage open issues", {
    owner: "test",
    repo: "test",
    anthropicClient: client,
    githubClient: fakeGithub,
  });

  assert.match(result, /Triage Report/);
  assert.equal(client.calls.length, 3);
  // Verify model + adaptive thinking on every call
  for (const call of client.calls) {
    assert.equal(call.model, "claude-opus-4-7");
    assert.deepEqual(call.thinking, { type: "adaptive" });
  }
});
