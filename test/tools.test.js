import { test } from "node:test";
import assert from "node:assert/strict";

import { makeDispatcher } from "../src/tools.js";

const fakeGithub = {
  listOpenIssues: async (label) => [
    { number: 1, title: "Login broken", labels: [{ name: label || "bug" }], pull_request: null,
      created_at: "2026-04-01", updated_at: "2026-05-01", comments: 5 },
    { number: 2, title: "Some PR", labels: [], pull_request: {}, comments: 0 },  // should be filtered
  ],
  listStaleIssues: async (days) => [
    { number: 7, title: "Old request", updated_at: `t-minus-${days}d` },
  ],
  listMergedPrs: async () => [
    { number: 100, title: "feat: add cache", merged_at: "2026-05-01", user: { login: "alice" } },
  ],
};

test("list_open_issues filters out PRs and returns trimmed JSON", async () => {
  const dispatch = makeDispatcher(fakeGithub);
  const out = await dispatch("list_open_issues", { label: "bug" });
  const parsed = JSON.parse(out);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].number, 1);
  assert.equal(parsed[0].labels[0], "bug");
});

test("list_stale_issues passes through since_days", async () => {
  const dispatch = makeDispatcher(fakeGithub);
  const out = await dispatch("list_stale_issues", { since_days: 90 });
  assert.match(out, /t-minus-90d/);
});

test("list_merged_prs returns author + title", async () => {
  const dispatch = makeDispatcher(fakeGithub);
  const out = await dispatch("list_merged_prs", {});
  assert.match(out, /add cache/);
  assert.match(out, /alice/);
});

test("unknown tool returns ERROR string (not throw)", async () => {
  const dispatch = makeDispatcher(fakeGithub);
  const out = await dispatch("nope", {});
  assert.match(out, /ERROR/);
});

test("tool catches GitHub errors and returns ERROR", async () => {
  const dispatch = makeDispatcher({
    listOpenIssues: async () => { throw new Error("rate limit"); },
  });
  const out = await dispatch("list_open_issues", {});
  assert.match(out, /ERROR.*rate limit/);
});
