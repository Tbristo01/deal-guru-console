// Rakuten Advertising — Product Search API adapter.
// ---------------------------------------------------
// Gives you feeds from Farfetch, SSENSE, Nordstrom, Net-a-Porter, etc.,
// with your affiliate deep-link already attached.
//
// Setup (once approved as a Rakuten publisher):
//   1. Get an API bearer token from the Rakuten Advertising dashboard.
//   2. Add it as a GitHub repo secret named RAKUTEN_TOKEN
//      (Settings → Secrets and variables → Actions → New repository secret).
// Returns [] until the token exists, so the pipeline stays green meanwhile.
//
// Docs: https://advertising.rakuten.com/  (Product Search / Coupon APIs)

const QUERIES = [
  { cat: "Fashion", q: "designer sneakers men" },
  { cat: "Fragrance", q: "eau de parfum men" },
  { cat: "Gear", q: "gore-tex jacket" },
  { cat: "Accessories", q: "leather wallet men" },
  { cat: "For Her", q: "designer eau de parfum women" },
];

export async function rakuten(env) {
  const token = env.RAKUTEN_TOKEN;
  if (!token) return [];

  const out = [];
  for (const { cat, q } of QUERIES) {
    const url = "https://api.linksynergy.com/productsearch/1.0?keyword=" +
      encodeURIComponent(q) + "&max=20";
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error("Rakuten HTTP " + res.status);
    const data = await res.json();

    // Map Rakuten's product records to the desk's shape.
    // NOTE: field names vary by API version — adjust to your response.
    const products = data?.result?.item || data?.products || [];
    for (const p of products) {
      const retail = Number(p.price?.retail ?? p.retailprice ?? p.price);
      const cost = Number(p.price?.sale ?? p.saleprice ?? p.price);
      if (!retail || !cost) continue;
      out.push({
        brand: p.brand || p.merchantname || "",
        name: p.productname || p.name || "",
        cat,
        retail,
        cost,
        link: p.linkurl || p.url || "",   // already your affiliate deep-link
        img: p.imageurl || p.image || "",
        seller: p.merchantname || "Rakuten",
        aud: cat === "For Her" ? "Womens" : "Mens",
        source: "rakuten",
      });
    }
  }
  return out;
}
rakuten.sourceName = "rakuten";
