// Tool schemas + dispatcher for the agent.

export const TOOL_SCHEMAS = [
  {
    name: "list_open_issues",
    description: "List open issues in the repository. Optionally filter by label (e.g. 'bug', 'good first issue').",
    input_schema: {
      type: "object",
      properties: {
        label: { type: "string", description: "Optional label filter" },
      },
    },
  },
  {
    name: "list_stale_issues",
    description: "List open issues that haven't been updated in the last N days. Use to identify candidates for closing or pinging.",
    input_schema: {
      type: "object",
      properties: {
        since_days: { type: "integer", description: "Issues with no update in the last N days. Default 60." },
      },
    },
  },
  {
    name: "list_merged_prs",
    description: "List recently merged pull requests. Use to draft release notes — group by type (feat / fix / chore) based on PR titles.",
    input_schema: {
      type: "object",
      properties: {
        since: { type: "string", description: "ISO timestamp; only PRs merged after this. Optional." },
      },
    },
  },
];

export function makeDispatcher(githubClient) {
  return async function dispatch(toolName, toolInput) {
    try {
      switch (toolName) {
        case "list_open_issues": {
          const issues = await githubClient.listOpenIssues(toolInput.label);
          return JSON.stringify(
            issues
              .filter((i) => !i.pull_request)
              .map((i) => ({
                number: i.number,
                title: i.title,
                labels: i.labels.map((l) => l.name),
                created_at: i.created_at,
                updated_at: i.updated_at,
                comments: i.comments,
              })),
            null,
            2,
          );
        }
        case "list_stale_issues": {
          const issues = await githubClient.listStaleIssues(toolInput.since_days || 60);
          return JSON.stringify(
            issues.map((i) => ({
              number: i.number,
              title: i.title,
              updated_at: i.updated_at,
            })),
            null,
            2,
          );
        }
        case "list_merged_prs": {
          const prs = await githubClient.listMergedPrs(toolInput.since);
          return JSON.stringify(
            prs.map((p) => ({
              number: p.number,
              title: p.title,
              merged_at: p.merged_at,
              author: p.user?.login,
            })),
            null,
            2,
          );
        }
        default:
          return `ERROR: unknown tool ${toolName}`;
      }
    } catch (err) {
      return `ERROR: ${err.message}`;
    }
  };
}
