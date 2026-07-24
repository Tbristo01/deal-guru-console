// Demo source — proves the whole pipeline end-to-end with NO credentials.
// It emits a rotating set of realistic men's + For Her items with fresh
// "prices" each run, so you can watch the dashboard update immediately.
//
// Turn it off once a real adapter has keys: set env DEMO=off (see below),
// or just delete it from the ADAPTERS list in fetch-deals.mjs.

const POOL = [
  { brand: "Tom Ford", name: "Ombré Leather Eau de Parfum 100ml", cat: "Fragrance", retail: 395, aud: "Mens" },
  { brand: "Creed", name: "Aventus Eau de Parfum 100ml", cat: "Fragrance", retail: 445, aud: "Mens" },
  { brand: "Maison Margiela", name: "Leather Replica Sneaker", cat: "Fashion", retail: 790, aud: "Mens" },
  { brand: "Common Projects", name: "Achilles Low Leather Sneaker", cat: "Fashion", retail: 425, aud: "Mens" },
  { brand: "Stone Island", name: "Garment-Dyed Cotton Overshirt", cat: "Fashion", retail: 600, aud: "Mens" },
  { brand: "Arc'teryx", name: "Beta LT Gore-Tex Shell Jacket", cat: "Gear", retail: 500, aud: "Mens" },
  { brand: "Patagonia", name: "Nano Puff Insulated Jacket", cat: "Gear", retail: 239, aud: "Mens" },
  { brand: "Salomon", name: "XT-6 Trail Sneaker", cat: "Gear", retail: 200, aud: "Mens" },
  { brand: "Saint Laurent", name: "Monogram Leather Belt", cat: "Accessories", retail: 450, aud: "Mens" },
  { brand: "Bottega Veneta", name: "Intrecciato Zip Card Case", cat: "Accessories", retail: 450, aud: "Mens" },
  { brand: "Montblanc", name: "Meisterstück Leather Wallet", cat: "Accessories", retail: 320, aud: "Mens" },
  { brand: "Persol", name: "649 Polarized Sunglasses", cat: "Accessories", retail: 300, aud: "Mens" },
  { brand: "YSL Beauty", name: "Libre Eau de Parfum 90ml", cat: "For Her", retail: 165, aud: "Womens" },
  { brand: "Diptyque", name: "Baies Scented Candle 190g", cat: "For Her", retail: 78, aud: "Womens" },
  { brand: "Mejuri", name: "Bold Hoops 14k Gold", cat: "For Her", retail: 240, aud: "Womens" },
  { brand: "Prada", name: "Re-Edition Nylon Mini Bag", cat: "For Her", retail: 1250, aud: "Womens" },
];

const SELLERS = ["Cettire (duties incl.)", "Italist", "ModeSens", "LN-CC", "Gente Roma"];

// Deterministic-ish pseudo-random seeded by the run's minute, so each scheduled
// run yields a different mix of "drops" without needing any external input.
function rng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export async function demo(env) {
  if (env && String(env.DEMO).toLowerCase() === "off") return [];
  const rand = rng(Date.now());
  const n = 6 + Math.floor(rand() * 4); // 6–9 items per run
  const shuffled = [...POOL].sort(() => rand() - 0.5).slice(0, n);
  return shuffled.map(d => {
    const factor = 0.58 + rand() * 0.2;            // cost is 58–78% of retail → 22–42% margin
    return {
      ...d,
      cost: Math.round(d.retail * factor),
      seller: SELLERS[Math.floor(rand() * SELLERS.length)],
      link: "https://modesens.com/s/demo-" + d.brand.toLowerCase().replace(/[^a-z0-9]+/g, "") + "/",
      source: "demo",
    };
  });
}
demo.sourceName = "demo";
