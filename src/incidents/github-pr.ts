const MAX_DIFF_BYTES = 200_000;

export class PullRequestImportError extends Error {
  constructor(public code: string, message: string, public status: number) { super(message); }
}

export function parseGitHubPullRequestUrl(input: string) {
  let url: URL;
  try { url = new URL(input.trim()); } catch { throw new PullRequestImportError("INVALID_PULL_REQUEST_URL", "Paste a complete public GitHub pull request URL.", 400); }
  if (url.protocol !== "https:" || url.hostname !== "github.com" || url.username || url.password || url.search || url.hash) throw new PullRequestImportError("INVALID_PULL_REQUEST_URL", "Only public https://github.com pull request URLs are supported.", 400);
  const parts = url.pathname.replace(/\/$/, "").split("/").filter(Boolean);
  if (parts.length !== 4 || parts[2] !== "pull" || !/^\d+$/.test(parts[3])) throw new PullRequestImportError("INVALID_PULL_REQUEST_URL", "Use the pull request page URL, for example https://github.com/owner/repository/pull/123.", 400);
  const [owner, repository, , number] = parts;
  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repository)) throw new PullRequestImportError("INVALID_PULL_REQUEST_URL", "The GitHub owner or repository name is invalid.", 400);
  const canonicalUrl = `https://github.com/${owner}/${repository}/pull/${number}`;
  return { owner, repository, number: Number(number), canonicalUrl, diffUrl: `${canonicalUrl}.diff` };
}

async function limitedText(response: Response) {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > MAX_DIFF_BYTES) throw new PullRequestImportError("PULL_REQUEST_TOO_LARGE", "That pull request is too large to turn into one focused incident. Use a smaller PR or paste a single-file diff.", 413);
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > MAX_DIFF_BYTES) { await reader.cancel(); throw new PullRequestImportError("PULL_REQUEST_TOO_LARGE", "That pull request is too large to turn into one focused incident. Use a smaller PR or paste a single-file diff.", 413); } chunks.push(value); }
  const combined = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(combined);
}

export async function fetchPublicPullRequestDiff(input: string, fetcher: typeof fetch = fetch) {
  const parsed = parseGitHubPullRequestUrl(input);
  const response = await fetcher(parsed.diffUrl, { headers: { accept: "application/vnd.github.v3.diff", "user-agent": "RepoRehearsal/1.0" }, redirect: "error" });
  if (response.status === 404) throw new PullRequestImportError("PULL_REQUEST_NOT_FOUND", "That public pull request could not be found.", 404);
  if (!response.ok) throw new PullRequestImportError("PULL_REQUEST_UNAVAILABLE", "GitHub could not provide that pull request diff. Try again or paste the diff directly.", 502);
  const diff = await limitedText(response);
  if (!diff.trim()) throw new PullRequestImportError("PULL_REQUEST_EMPTY", "That pull request does not contain a readable source diff.", 422);
  return { ...parsed, diff };
}
