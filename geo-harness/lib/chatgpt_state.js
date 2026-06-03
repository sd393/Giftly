// chatgpt_state.js — detect whether ChatGPT is still streaming a response.
// Returns "STREAMING|<n>" or "DONE|<n>" where n = assistant message count.
// Poll until "DONE|n" (n>=1) is stable across two checks before extracting.
(() => {
  const stop = document.querySelector('[data-testid="stop-button"], button[aria-label*="Stop" i]');
  const m = document.querySelectorAll('[data-message-author-role="assistant"]');
  return (stop ? "STREAMING" : "DONE") + "|" + m.length;
})()
