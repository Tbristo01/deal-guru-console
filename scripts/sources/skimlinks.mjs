// Skimlinks — Product/Merchant API adapter.
// ------------------------------------------
// Skimlinks auto-monetizes almost any retailer link — the fastest way to have
// a working affiliate link for a store you're not directly approved with.
//
// Setup: add repo secret SKIMLINKS_ID (your Publisher ID) and, for the
// Product API, SKIMLINKS_API_KEY. Returns [] until present.
//
// Docs: https://developers.skimlinks.com/  → Product API
// Tip: even without the Product API, you can wrap any raw retailer URL as a
// Skimlinks affiliate link at:  https://go.skimresources.com/?id=<ID>&url=<URL>

export async function skimlinks(env) {
  const id = env.SKIMLINKS_ID;
  const apiKey = env.SKIMLINKS_API_KEY;
  if (!id || !apiKey) return [];

  const url = "https://api.skimlinks.com/v4/products?" + new URLSearchParams({
    q: "designer sale men",
    rows: "40",
    key: apiKey,
  });
  const res = await fetch(url);
  if (!res.ok) throw new Error("Skimlinks HTTP " + res.status);
  const data = await res.json();

  return (data.skimlinksProductAPI?.products || []).map(p => {
    const retail = Number(p.price_rrp ?? p.price);
    const cost = Number(p.price);
    return {
      brand: p.brand || "",
      name: p.title || "",
      cat: "Fashion",
      retail, cost,
      // wrap the merchant URL so the click is monetized under your publisher id
      link: "https://go.skimresources.com/?id=" + encodeURIComponent(id) + "&url=" + encodeURIComponent(p.url || ""),
      img: p.image_url || "",
      seller: p.merchant || "Skimlinks",
      source: "skimlinks",
    };
  }).filter(d => d.retail && d.cost);
}
skimlinks.sourceName = "skimlinks";
