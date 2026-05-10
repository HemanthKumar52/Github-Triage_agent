// Agentic loop: claude-opus-4-7 with adaptive thinking + GitHub tools.
// The Anthropic client is injectable for testing.

import Anthropic from "@anthropic-ai/sdk";

import { makeClient } from "./github.js";
import { TOOL_SCHEMAS, makeDispatcher } from "./tools.js";

const MODEL = "claude-opus-4-7";

const SYSTEM_PROMPT =
  "You are a repo maintainer. Given a GitHub repository, you triage open issues, identify stale ones, and draft release notes. " +
  "Always start by exploring with list_open_issues or list_stale_issues. For release notes, use list_merged_prs and group by " +
  "feat / fix / chore / docs based on the PR title prefix. End with a structured Markdown report.";

export async function run(task, ctx) {
  const { owner, repo, githubToken, anthropicClient = new Anthropic() } = ctx;
  const githubClient = ctx.githubClient || makeClient({ owner, repo, token: githubToken });
  const dispatch = makeDispatcher(githubClient);

  // Cache the last tool definition — they're stable across runs.
  const tools = TOOL_SCHEMAS.map((t, i) =>
    i === TOOL_SCHEMAS.length - 1
      ? { ...t, cache_control: { type: "ephemeral" } }
      : t,
  );

  const messages = [
    {
      role: "user",
      content: `Repository: ${owner}/${repo}\n\nTask: ${task}`,
    },
  ];

  let finalText = "";

  for (let i = 0; i < 10; i++) {
    const response = await anthropicClient.messages.create({
      model: MODEL,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      for (const block of response.content) {
        if (block.type === "text") finalText = block.text;
      }
      break;
    }

    if (response.stop_reason === "tool_use") {
      const results = [];
      for (const block of response.content) {
        if (block.type === "tool_use") {
          const out = await dispatch(block.name, block.input);
          results.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: out,
          });
        }
      }
      messages.push({ role: "user", content: results });
      continue;
    }

    break;
  }

  return finalText;
}
