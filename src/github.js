// Thin wrapper over the GitHub REST API. The fetch impl is injectable so unit
// tests can supply a mock without monkey-patching globalThis.fetch.

const BASE = "https://api.github.com";

export function makeClient({ owner, repo, token, fetchImpl = globalThis.fetch }) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  async function call(path, init = {}) {
    const res = await fetchImpl(`${BASE}${path}`, { ...init, headers });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GitHub ${res.status} ${path}: ${body.slice(0, 200)}`);
    }
    return res.json();
  }

  return {
    listOpenIssues: async (label) => {
      const q = label ? `&labels=${encodeURIComponent(label)}` : "";
      return call(`/repos/${owner}/${repo}/issues?state=open&per_page=50${q}`);
    },
    listStaleIssues: async (sinceDays = 60) => {
      const cutoff = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();
      const issues = await call(`/repos/${owner}/${repo}/issues?state=open&per_page=100`);
      return issues.filter((i) => !i.pull_request && i.updated_at < cutoff);
    },
    listMergedPrs: async (since) => {
      const issues = await call(
        `/repos/${owner}/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=50`,
      );
      return issues.filter((p) => p.merged_at && (!since || p.merged_at > since));
    },
  };
}
