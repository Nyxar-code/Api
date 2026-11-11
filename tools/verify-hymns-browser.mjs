import { chromium, expect } from "@playwright/test";

const browser = await chromium.launch();
const context = await browser.newContext({ serviceWorkers: "block" });
context.setDefaultTimeout(15_000);
const admin = await context.newPage();
const publicPage = await context.newPage();
const mobileContext = await browser.newContext({ serviceWorkers: "block", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
mobileContext.setDefaultTimeout(15_000);
const mobile = await mobileContext.newPage();
const title = "Ìfẹ́ àti Ìrètí — CI";
const verse = "Àlàáfíà fún gbogbo wa.";
const website = "http://grace.localtest.me:3301";
const adminUrl = "http://localhost:3101";
const timeout = 60_000;

try {
  const lookup = await fetch("http://localhost:8084/membership/churches/lookup/?subDomain=grace");
  const church = await lookup.json();
  if (!lookup.ok || church.id !== "CHU00000001") throw new Error("Grace demo church fixture is unavailable");

  // Smoke the ordinary visitor and member entry points in the same isolated church.
  const homeResponse = await publicPage.goto(website + "/", { timeout });
  if (!homeResponse?.ok()) throw new Error("Visitor homepage failed: " + homeResponse?.status());
  await expect(publicPage.getByRole("main")).toBeVisible({ timeout });
  await expect(publicPage.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout });
  console.log("Visitor homepage rendered");

  const sermonsResponse = await publicPage.goto(website + "/sermons", { timeout });
  if (!sermonsResponse?.ok()) throw new Error("Public sermons route failed: " + sermonsResponse?.status());
  await expect(publicPage.getByRole("main")).toBeVisible({ timeout });
  console.log("Public sermons route rendered");

  const portalResponse = await mobile.goto(website + "/mobile", { timeout });
  if (!portalResponse?.ok()) throw new Error("Member portal entry failed: " + portalResponse?.status());
  await expect(mobile.locator(".mobileAppRoot main")).toBeVisible({ timeout });
  console.log("Member portal entry rendered at phone width");

  console.log("Opening B1Admin");
  await admin.goto(adminUrl + "/hymns", { timeout });
  await admin.locator('input[type="email"]').fill("demo@b1.church", { timeout });
  await admin.locator('input[type="password"]').fill("password");
  await admin.locator('button[type="submit"]').click();
  console.log("Submitted demo login");

  const chooser = admin.getByRole("dialog").filter({ hasText: "Select a Church" });
  const chooseGrace = chooser.locator("h3").filter({ hasText: /Grac(e|ious) Community Church/i }).first();
  const hymnsLink = admin.locator('a[href="/hymns"]').first();
  await expect(chooseGrace.or(hymnsLink).first()).toBeVisible({ timeout });
  if (await chooseGrace.isVisible()) await chooseGrace.click();

  await admin.goto(adminUrl + "/hymns", { timeout });
  await admin.getByRole("button", { name: "Add hymn" }).click({ timeout });
  const editor = admin.getByRole("dialog");
  console.log("Hymn editor opened");
  await editor.getByRole("spinbutton", { name: "Hymn number" }).fill("9001");
  await editor.getByRole("textbox", { name: "Title", exact: true }).fill(title);
  console.log("Filled hymn number and title");
  await editor.getByRole("combobox", { name: "Language" }).click();
  await admin.getByRole("option", { name: "Yoruba", exact: true }).click();
  console.log("Selected Yoruba");
  await editor.getByRole("textbox", { name: "Verse text" }).fill(verse);
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  console.log("Submitted hymn draft");
  const row = admin.getByRole("row").filter({ hasText: title });
  await expect(row.getByText("Draft", { exact: true })).toBeVisible({ timeout });
  console.log("B1Admin saved a Yoruba draft");

  await publicPage.goto(website + "/hymns", { timeout });
  await expect(publicPage.getByText("No hymns published yet")).toBeVisible({ timeout });
  await row.getByRole("button", { name: "Publish hymn", exact: true }).click();
  console.log("Clicked Publish hymn");
  await expect(row.getByText("Published", { exact: true })).toBeVisible({ timeout });

  const publishedList = await fetch("http://localhost:8084/content/hymns/public/" + church.id);
  if (!publishedList.ok) throw new Error("Public hymn list request failed");
  const { id } = (await publishedList.json()).find((hymn) => hymn.title === title);
  // Compile dynamic Next.js routes before clicking links so dev-only Fast Refresh cannot interrupt navigation.
  for (const path of ["/mobile/hymns", "/mobile/hymns/" + id]) {
    const warm = await fetch(website + path, { signal: AbortSignal.timeout(90_000) });
    if (!warm.ok) throw new Error("Mobile route warmup failed: " + path + " " + warm.status);
    await warm.arrayBuffer();
  }
  const readers = [[publicPage, "/hymns"], [mobile, "/mobile/hymns"]];
  const detailUrls = [];
  for (const [page, route] of readers) {
    const destination = website + route;
    try {
      await page.goto(destination, { timeout, waitUntil: "domcontentloaded" });
    } catch (error) {
      // Next dev Fast Refresh can navigate to the same URL while a route compiles.
      if (!String(error).includes(`interrupted by another navigation to "${destination}"`) || page.url() !== destination) throw error;
      await page.waitForLoadState("domcontentloaded", { timeout });
    }
    await page.getByRole("link", { name: new RegExp(title) }).click({ timeout });
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible({ timeout });
    await expect(page.getByText(verse, { exact: false })).toBeVisible({ timeout });
    detailUrls.push(page.url());
    console.log("Published Yoruba hymn opened at " + route);
  }

  await row.getByRole("button", { name: "Archive hymn" }).click();
  await expect(row.getByText("Archived", { exact: true })).toBeVisible({ timeout });
  for (const [index, [page, route]] of readers.entries()) {
    await page.goto(website + route, { timeout });
    await expect(page.getByText("No hymns published yet")).toBeVisible({ timeout });
    await page.goto(detailUrls[index], { timeout });
    await expect(page.getByText("Hymn not available")).toBeVisible({ timeout });
  }
  console.log("Hymn archived and removed from both public lists");
} catch (error) {
  for (const [name, page] of [["admin", admin], ["web", publicPage], ["mobile", mobile]]) {
    console.error(name, page.url(), (await page.locator("body").innerText({ timeout: 2000 }).catch(() => "")).slice(0, 950));
  }
  throw error;
} finally {
  await browser.close();
}
