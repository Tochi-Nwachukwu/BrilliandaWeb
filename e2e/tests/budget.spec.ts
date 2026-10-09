import { expect, test, type Page } from "@playwright/test";

// The plan's speed budget (Phase 5): under 2.5 s to show the main content, and under 170 KB of
// JavaScript (compressed, as it travels) on a first load. Checked on the pages people land on.

const JS_BUDGET_KB = 170;
const LCP_BUDGET_MS = 2500;

async function measure(page: Page, url: string) {
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(1500);
  return page.evaluate(
    () =>
      new Promise<{ jsKb: number; lcp: number }>((resolve) => {
        // Scripts the page needed to load, as they travel (compressed). Prefetches for the next tap
        // start after the load event, so they don't count against a first load.
        const loadEnd = (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming).loadEventEnd;
        const js = (performance.getEntriesByType("resource") as PerformanceResourceTiming[])
          .filter((r) => r.initiatorType === "script" || r.name.endsWith(".js"))
          .filter((r) => r.startTime <= loadEnd)
          .reduce((sum, r) => sum + (r.transferSize || r.encodedBodySize), 0);
        let lcp = 0;
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          lcp = entries[entries.length - 1]?.startTime ?? lcp;
        }).observe({ type: "largest-contentful-paint", buffered: true });
        setTimeout(() => resolve({ jsKb: Math.round(js / 1024), lcp: Math.round(lcp) }), 500);
      }),
  );
}

for (const [name, url] of [
  ["the marketing home", "/"],
  ["signup", "/signup"],
  ["a school's sign-in", "/s/greenfield/login"],
] as const) {
  test(`${name} stays within the speed budget`, async ({ page }, testInfo) => {
    await page.addInitScript(() => localStorage.setItem("brillianda-seen", "1"));
    const { jsKb, lcp } = await measure(page, url);
    testInfo.annotations.push({ type: "budget", description: `${url}: ${jsKb} KB of JavaScript, shown in ${lcp} ms` });
    console.log(`[budget] ${testInfo.project.name} ${url}: ${jsKb} KB JS, LCP ${lcp} ms`);
    expect(jsKb, `JavaScript on ${url}`).toBeLessThanOrEqual(JS_BUDGET_KB);
    // 0 means the browser never counted the main content as shown (say, text faded in from nothing).
    expect(lcp, `Largest contentful paint on ${url}`).toBeGreaterThan(0);
    expect(lcp, `Largest contentful paint on ${url}`).toBeLessThanOrEqual(LCP_BUDGET_MS);
  });
}
