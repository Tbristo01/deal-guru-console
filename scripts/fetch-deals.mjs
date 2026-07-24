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

  // --- Hot-deal email alert ---
  // Deals clearing ALERT_MARGIN (default 40%) get emailed as a "post these now" digest.
  const alertMargin = Number(process.env.ALERT_MARGIN ?? 40);
  const hot = deals.filter(d => margin(d) >= alertMargin);
  await writeFile(new URL("../alert-count.txt", import.meta.url), String(hot.length));
  if (hot.length) {
    const subject = `🔥 ${hot.length} hot deal${hot.length > 1 ? "s" : ""} ≥ ${alertMargin}% off — Deal Guru`;
    await writeFile(new URL("../alert-subject.txt", import.meta.url), subject);
    await writeFile(new URL("../alert.html", import.meta.url), emailHtml(hot, alertMargin));
  }
  console.log(`Hot deals ≥ ${alertMargin}%: ${hot.length}`);
}

const money = n => "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });

function emailHtml(hot, alertMargin) {
  const SITE = "https://tbristo01.github.io/deal-guru-console/";
  const rows = hot.map(d => {
    const m = Math.round(margin(d));
    const spread = money(d.retail - d.cost);
    return `
    <tr>
      <td style="padding:14px 16px;border-bottom:1px solid #eee;">
        <div style="font:600 11px/1 Arial,sans-serif;letter-spacing:1.5px;text-transform:uppercase;color:#9a7a1f;">${esc(d.brand)}</div>
        <div style="font:600 16px/1.3 Georgia,serif;color:#111;margin:4px 0;">${esc(d.name)}</div>
        <div style="font:12px/1.4 Arial,sans-serif;color:#666;">${esc(d.cat)}${d.size ? " &middot; " + esc(d.size) : ""}${d.seller ? " &middot; via " + esc(d.seller) : ""}</div>
      </td>
      <td style="padding:14px 16px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;">
        <div style="font:700 20px/1 'Courier New',monospace;color:#111;">${money(d.cost)}</div>
        <div style="font:12px/1 'Courier New',monospace;color:#999;text-decoration:line-through;margin-top:3px;">${money(d.retail)}</div>
        <div style="display:inline-block;margin-top:7px;font:700 12px/1 Arial,sans-serif;color:#0a7d43;background:#e7f6ee;border-radius:5px;padding:4px 8px;">&minus;${m}% &middot; save ${spread}</div>
      </td>
      <td style="padding:14px 16px;border-bottom:1px solid #eee;text-align:right;">
        <a href="${esc(d.link)}" style="font:600 13px/1 Arial,sans-serif;color:#fff;background:#111;border-radius:7px;padding:9px 14px;text-decoration:none;">Open&nbsp;&rsaquo;</a>
      </td>
    </tr>`;
  }).join("");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f4f2ec;padding:24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e6e2d8;">
    <tr><td style="background:#0b0b0c;padding:22px 24px;">
      <div style="font:700 12px/1 Arial,sans-serif;letter-spacing:3px;text-transform:uppercase;color:#c9a24b;">Deal Guru &middot; Hot Deal Alert</div>
      <div style="font:700 24px/1.2 Georgia,serif;color:#fff;margin-top:8px;">${hot.length} deal${hot.length > 1 ? "s" : ""} just cleared ${alertMargin}% off retail</div>
      <div style="font:14px/1.4 Arial,sans-serif;color:#b4aea1;margin-top:6px;">Ranked by margin. Post the top ones while they're live.</div>
    </td></tr>
    <tr><td>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    </td></tr>
    <tr><td style="padding:20px 24px;text-align:center;background:#faf8f2;">
      <a href="${SITE}" style="font:600 14px/1 Arial,sans-serif;color:#111;background:#c9a24b;border-radius:8px;padding:12px 22px;text-decoration:none;display:inline-block;">Open the full desk &rsaquo;</a>
      <div style="font:11px/1.5 Arial,sans-serif;color:#999;margin-top:14px;">Automated by your Deal Guru feed. Adjust the threshold with the ALERT_MARGIN setting.</div>
    </td></tr>
  </table></body></html>`;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

main().catch(e => { console.error(e); process.exit(1); });
