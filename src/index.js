#!/usr/bin/env node
// CLI: gh-triage <owner>/<repo> "<task>"
// Requires ANTHROPIC_API_KEY and (optionally) GITHUB_TOKEN env vars.

import { run } from "./agent.js";

function usage() {
  console.log(`usage: gh-triage <owner>/<repo> "<task>"

examples:
  gh-triage anthropics/anthropic-sdk-python "List the 5 highest-priority open issues"
  gh-triage facebook/react "Draft release notes for PRs merged in the last 30 days"
  gh-triage rails/rails "Find stale issues older than 90 days"

env vars:
  ANTHROPIC_API_KEY  required
  GITHUB_TOKEN       optional (raises rate limit from 60 to 5000/hr)
`);
}

async function main() {
  const [repoArg, task] = process.argv.slice(2);
  if (!repoArg || !task) {
    usage();
    process.exit(2);
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ERROR: ANTHROPIC_API_KEY not set");
    process.exit(2);
  }
  const [owner, repo] = repoArg.split("/");
  if (!owner || !repo) {
    console.error("ERROR: repo must be in 'owner/repo' format");
    process.exit(2);
  }

  const result = await run(task, {
    owner,
    repo,
    githubToken: process.env.GITHUB_TOKEN,
  });
  console.log(result);
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
