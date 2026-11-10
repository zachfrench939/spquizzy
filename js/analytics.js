import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";

function cut(value, max) {
  return String(value || "").slice(0, max);
}

function device() {
  const w = innerWidth || 1024;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

export function track(event) {
  try {
    if (navigator.doNotTrack === "1") return;
    const q = new URLSearchParams(location.search);
    let referrer = "";
    try {
      referrer = new URL(document.referrer).hostname;
    } catch {
      /* no referrer */
    }
    fetch(`${SUPABASE_URL}/rest/v1/spiquizzy_pageviews`, {
      method: "POST",
      keepalive: true,
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        path: cut(location.pathname, 200),
        referrer_host: cut(referrer, 200),
        utm_source: cut(q.get("utm_source"), 100),
        utm_medium: cut(q.get("utm_medium"), 100),
        utm_campaign: cut(q.get("utm_campaign"), 100),
        device: device(),
        event,
      }),
    }).catch(() => {});
  } catch {
    /* offline, blocked, or a bad URL */
  }
}

track("view");
