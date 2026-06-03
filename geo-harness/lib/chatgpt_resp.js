// chatgpt_resp.js — extract the latest assistant answer + outbound citation links.
// Returns JSON {text, links}. Parse the result with json.loads(raw, strict=False)
// (bodies contain newlines/control chars).
(() => {
  const m = document.querySelectorAll('[data-message-author-role="assistant"]');
  if (!m.length) return JSON.stringify({ text: "", links: [] });
  const last = m[m.length - 1];
  const links = Array.from(last.querySelectorAll("a[href]"))
    .map(a => a.href)
    .filter(h => !/chatgpt\.com|openai\.com\/(policies|auth)/.test(h));
  // also sweep any citation/source rail
  document.querySelectorAll('[data-testid*="search" i] a[href], a[href][target="_blank"]').forEach(a => {
    if (!/chatgpt\.com|openai\.com/.test(a.href)) links.push(a.href);
  });
  return JSON.stringify({ text: last.innerText, links: [...new Set(links)] });
})()
