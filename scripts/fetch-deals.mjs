// Deal Guru — scheduled feed builder
// ------------------------------------
// Pulls product data from affiliate-feed adapters, computes the arbitrage
// margin vs retail, keeps only deals above a threshold, dedups, ranks, and
// writes ../deals.json for the dashboard to read.
//
// Run locally:      node scripts/fetch-deals.mjs
// Run in CI:        see .github/workflows/update-deals.yml (cron + manual)
//
// Each adapter in ./sources returns [] when its credentials are missing,
// so the pipeline runs end-to-end today via the demo adapter and lights up
// the real sources the moment you add API keys as repo secrets.

import { writeFile } from "node:fs/promises";
import { demo } from "./sources/demo.mjs";
import { rakuten } from "./sources/rakuten.mjs";
import { awin } from "./sources/awin.mjs";
import { impact } from "./sources/impact.mjs";
import { skimlinks } from "./sources/skimlinks.mjs";

const CONFIG = {
  minMargin: Number(process.env.MIN_MARGIN ?? 25),  // % off retail required to keep a deal
  maxItems: Number(process.env.MAX_ITEMS ?? 60),    // cap the feed size
};

// Focus categories — the desk is men's fashion / gear / fragrance / accessories,
// plus a "For Her" gift lane. Adapters tag each item with one of these.
const ADAPTERS = [demo, rakuten, awin, impact, skimlinks];

const margin = d => (d.retail > 0 ? ((d.retail - d.cost) / d.retail) * 100 : 0);
const key = d => (d.brand + "|" + d.name).toLowerCase().replace(/\s+/g, " ").trim();

async function main() {
  const raw = [];
  for (const adapter of ADAPTERS) {
    const name = adapter.sourceName || adapter.name;
    try {
      const items = await adapter(process.env);
      if (items && items.length) {
        console.log(`✓ ${name}: ${items.length} items`);
        raw.push(...items);
      } else {
        console.log(`· ${name}: skipped (no credentials or 0 items)`);
      }
    } catch (e) {
      console.error(`✗ ${name} failed: ${e.message}`);
    }
  }

  const seen = new Set();
  const deals = raw
    .map((d, i) => ({
      id: "feed-" + key(d).replace(/[^a-z0-9]+/g, "-").slice(0, 40) + "-" + i,
      brand: (d.brand || "").trim(),
      name: (d.name || "").trim(),
      cat: d.cat || "Fashion",
      cost: +Number(d.cost).toFixed(2),
      retail: +Number(d.retail).toFixed(2),
      size: d.size || "",
      seller: d.seller || d.source || "",
      aud: d.aud || "Mens",
      link: d.link || "",
      img: d.img || "",
      note: d.note || "",
      source: d.source || d.seller || "",
    }))
    .filter(d => d.brand && d.name && d.retail > 0 && margin(d) >= CONFIG.minMargin)
    .filter(d => { const k = key(d); if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => margin(b) - margin(a))
    .slice(0, CONFIG.maxItems);

  const out = {
    updated: new Date().toISOString(),
    count: deals.length,
    minMargin: CONFIG.minMargin,
    deals,
  };

  await writeFile(new URL("../deals.json", import.meta.url), JSON.stringify(out, null, 2));
  console.log(`\nWrote deals.json — ${deals.length} deals ≥ ${CONFIG.minMargin}% margin`);
}

main().catch(e => { console.error(e); process.exit(1); });
