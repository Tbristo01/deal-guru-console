// Impact.com — Product catalog adapter.
// --------------------------------------
// Many luxury brands run their partner programs on Impact.
//
// Setup (once approved): add repo secrets IMPACT_ACCOUNT_SID and IMPACT_AUTH_TOKEN.
// Returns [] until both exist.
//
// Docs: https://developer.impact.com/  → Catalogs / Product endpoints

export async function impact(env) {
  const sid = env.IMPACT_ACCOUNT_SID;
  const token = env.IMPACT_AUTH_TOKEN;
  if (!sid || !token) return [];

  const auth = "Basic " + Buffer.from(`${sid}:${token}`).toString("base64");
  const url = `https://api.impact.com/Mediapartners/${sid}/Catalogs/Items?PageSize=50`;
  const res = await fetch(url, { headers: { Authorization: auth, Accept: "application/json" } });
  if (!res.ok) throw new Error("Impact HTTP " + res.status);
  const data = await res.json();

  return (data.Items || []).map(p => {
    const retail = Number(p.OriginalPrice ?? p.CurrentPrice);
    const cost = Number(p.CurrentPrice);
    return {
      brand: p.Manufacturer || p.Brand || "",
      name: p.Name || "",
      cat: "Fashion",
      retail, cost,
      link: p.Url || "",       // affiliate tracking link
      img: p.ImageUrl || "",
      seller: p.CatalogName || "Impact",
      source: "impact",
    };
  }).filter(d => d.retail && d.cost);
}
impact.sourceName = "impact";
