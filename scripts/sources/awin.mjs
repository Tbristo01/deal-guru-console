// Awin — Product feed adapter (home of Cettire, Italist, MyTheresa, LN-CC…).
// ---------------------------------------------------------------------------
// Awin publishes product feeds you download as CSV/TSV per advertiser, or query
// via their Product Data / Create-a-Feed API. Cross-border boutiques here are
// where most of the duties-included arbitrage lives.
//
// Setup (once approved as an Awin publisher):
//   Add repo secrets:  AWIN_TOKEN  (OAuth token)  and  AWIN_PUBLISHER_ID.
// Returns [] until both exist.
//
// Docs: https://wiki.awin.com/  → "Product Data" / "Create-a-feed"

export async function awin(env) {
  const token = env.AWIN_TOKEN;
  const publisherId = env.AWIN_PUBLISHER_ID;
  if (!token || !publisherId) return [];

  // Example: pull a pre-built feed URL you configured in the Awin dashboard.
  // Replace FEED_URL with your Create-a-feed link (returns CSV of products).
  const FEED_URL = env.AWIN_FEED_URL;
  if (!FEED_URL) return [];

  const res = await fetch(FEED_URL, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Awin HTTP " + res.status);
  const csv = await res.text();

  // Minimal CSV parse — map your feed's columns here.
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const cols = header.split(",").map(c => c.replace(/"/g, "").trim());
  const idx = n => cols.indexOf(n);
  const out = [];
  for (const row of rows) {
    const f = row.match(/("([^"]|"")*"|[^,]*)(,|$)/g)?.map(s => s.replace(/,$/, "").replace(/^"|"$/g, "").trim()) || [];
    const retail = Number(f[idx("rrp_price")] || f[idx("store_price")]);
    const cost = Number(f[idx("search_price")] || f[idx("store_price")]);
    if (!retail || !cost) continue;
    out.push({
      brand: f[idx("brand_name")] || "",
      name: f[idx("product_name")] || "",
      cat: "Fashion",
      retail, cost,
      link: f[idx("aw_deep_link")] || "",  // your affiliate deep-link
      img: f[idx("merchant_image_url")] || "",
      seller: f[idx("merchant_name")] || "Awin",
      source: "awin",
    });
  }
  return out;
}
awin.sourceName = "awin";
