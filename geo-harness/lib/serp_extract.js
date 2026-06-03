// serp_extract.js — extract GEO-relevant structure from a Google SERP.
// Used by bin/geo-serp.sh via `browse --headed eval`. Returns JSON.
(() => {
  const out = {};
  out.title = document.title;
  const body = document.body.innerText || "";
  // AI Overview block (verbatim, if present)
  out.aiOverview = /AI Overview|AI-powered overview|Generative AI is experimental/i.test(body);
  const aiEl = Array.from(document.querySelectorAll("div"))
    .find(d => /AI Overview/i.test(d.textContent || "") && d.textContent.length > 80 && d.textContent.length < 2500);
  out.aiOverviewText = aiEl ? aiEl.innerText.slice(0, 900) : "";
  // Knowledge / merchant panel: title + whether it carries ENTITY facts vs only commerce
  const kpTitle = document.querySelector('.qrShPb, [data-attrid="title"], .SPZz6b h2, .I6TXqe');
  out.panelTitle = kpTitle ? kpTitle.textContent.trim().slice(0, 120) : "";
  out.panelHasEntityFacts = /Founded|Founder|Headquarters|CEO|Parent company|Founders/i.test(body);
  out.panelHasMerchantCard = /Free delivery|Free returns|Payment options|From the business/i.test(body);
  // People Also Ask
  out.paa = [...new Set(
    Array.from(document.querySelectorAll("[jsname]"))
      .map(e => e.textContent.trim())
      .filter(t => /\?$/.test(t) && t.length < 120)
  )].slice(0, 6);
  // Organic results
  const results = [];
  document.querySelectorAll("a h3").forEach((h3, i) => {
    const a = h3.closest("a");
    results.push({
      pos: i + 1,
      title: h3.textContent.trim().slice(0, 90),
      host: a ? (a.href.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]) : ""
    });
  });
  out.results = results.slice(0, 12);
  return JSON.stringify(out, null, 1);
})()
