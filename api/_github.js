// Shared GitHub API helper for reading/writing JSON files in a GitHub repository
// Not exposed as a route (underscore prefix)

const GITHUB_API = 'https://api.github.com';

function getHeaders() {
  return {
    'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'User-Agent': 'zaid-bwp-stock-manager'
  };
}

function getRepo() {
  return process.env.GITHUB_REPO;
}

function getBranch() {
  return process.env.GITHUB_BRANCH || 'main';
}

/**
 * Read a JSON file from the GitHub repository
 * @param {string} section - e.g. 'items', 'wallet', etc.
 * @returns {{ data: Array, sha: string }}
 */
async function readFile(section) {
  const url = `${GITHUB_API}/repos/${getRepo()}/contents/data/${section}.json`;
  const res = await fetch(url, {
    headers: getHeaders()
  });

  if (res.status === 404) {
    // File doesn't exist yet, return empty array
    return { data: [], sha: null };
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub API read error (${res.status}): ${err}`);
  }

  const json = await res.json();
  const content = Buffer.from(json.content, 'base64').toString('utf-8');
  return {
    data: JSON.parse(content),
    sha: json.sha
  };
}

/**
 * Write (create or update) a JSON file in the GitHub repository
 * @param {string} section - e.g. 'items', 'wallet', etc.
 * @param {Array} data - The data array to save
 * @param {string|null} sha - The SHA of the existing file (null for new files)
 * @returns {string} The new SHA
 */
async function writeFile(section, data, sha) {
  const url = `${GITHUB_API}/repos/${getRepo()}/contents/data/${section}.json`;
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');

  const body = {
    message: `update ${section}: ${new Date().toISOString()}`,
    content: content,
    branch: getBranch()
  };

  if (sha) {
    body.sha = sha;
  }

  const res = await fetch(url, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(body)
  });

  // Handle conflict (stale SHA) - retry once
  if (res.status === 409) {
    const fresh = await readFile(section);
    // Merge: caller should handle retry logic
    throw new Error('CONFLICT');
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub API write error (${res.status}): ${err}`);
  }

  const result = await res.json();
  return result.content.sha;
}

/**
 * Read and then write with automatic SHA handling
 * @param {string} section
 * @param {function} mutator - Function that receives data array and returns modified array
 * @returns {Array} The updated data
 */
async function readAndWrite(section, mutator) {
  let retries = 2;
  while (retries > 0) {
    try {
      const { data, sha } = await readFile(section);
      const updated = mutator(data);
      await writeFile(section, updated, sha);
      return updated;
    } catch (err) {
      if (err.message === 'CONFLICT' && retries > 1) {
        retries--;
        continue;
      }
      throw err;
    }
  }
}

module.exports = { readFile, writeFile, readAndWrite };
