import { chromium, expect } from "@playwright/test";

const browser = await chromium.launch();
const context = await browser.newContext({ serviceWorkers: "block" });
const admin = await context.newPage();
const publicPage = await context.newPage();
const mobile = await context.newPage();
const title = "Ìfẹ́ àti Ìrètí — CI";
const verse = "Àlàáfíà fún gbogbo wa.";
const website = "http://grace.localtest.me:3301";
const adminUrl = "http://localhost:3101";
const timeout = 60_000;

try {
  const lookup = await fetch("http://localhost:8084/membership/churches/lookup/?subDomain=grace");
  const church = await lookup.json();
  if (!lookup.ok || church.id !== "CHU00000001") throw new Error("Grace demo church fixture is unavailable");

  await admin.goto(adminUrl + "/hymns", { timeout });
  await admin.locator('input[type="email"]').fill("demo@b1.church", { timeout });
  await admin.locator('input[type="password"]').fill("password");
  await admin.locator('button[type="submit"]').click();

  const chooser = admin.getByRole("dialog").filter({ hasText: "Select a Church" });
  const chooseGrace = chooser.locator("h3").filter({ hasText: /Grac(e|ious) Community Church/i }).first();
  const hymnsLink = admin.locator('a[href="/hymns"]').first();
  await expect(chooseGrace.or(hymnsLink).first()).toBeVisible({ timeout });
  if (await chooseGrace.isVisible()) await chooseGrace.click();

  await admin.goto(adminUrl + "/hymns", { timeout });
  await admin.getByRole("button", { name: "Add hymn" }).click({ timeout });
  const editor = admin.getByRole("dialog");
  await editor.getByRole("spinbutton", { name: "Hymn number" }).fill("9001");
  await editor.getByRole("textbox", { name: "Title", exact: true }).fill(title);
  await editor.getByRole("combobox", { name: "Language" }).click();
  await admin.getByRole("option", { name: "Yoruba", exact: true }).click();
  await editor.getByRole("textbox", { name: "Verse text" }).fill(verse);
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  const row = admin.getByRole("row").filter({ hasText: title });
  await expect(row.getByText("Draft", { exact: true })).toBeVisible({ timeout });
  console.log("B1Admin saved a Yoruba draft");

  await publicPage.goto(website + "/hymns", { timeout });
  await expect(publicPage.getByText("No hymns published yet")).toBeVisible({ timeout });
  await row.getByRole("button", { name: "Publish hymn", exact: true }).click();
  await expect(row.getByText("Published", { exact: true })).toBeVisible({ timeout });

  for (const [page, route] of [[publicPage, "/hymns"], [mobile, "/mobile/hymns"]]) {
    await page.goto(website + route, { timeout });
    await page.getByRole("link", { name: new RegExp(title) }).click({ timeout });
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible({ timeout });
    await expect(page.getByText(verse, { exact: false })).toBeVisible({ timeout });
    console.log("Published Yoruba hymn opened at " + route);
  }

  await row.getByRole("button", { name: "Archive hymn" }).click();
  await expect(row.getByText("Archived", { exact: true })).toBeVisible({ timeout });
  for (const [page, route] of [[publicPage, "/hymns"], [mobile, "/mobile/hymns"]]) {
    await page.goto(website + route, { timeout });
    await expect(page.getByText("No hymns published yet")).toBeVisible({ timeout });
  }
  console.log("Hymn archived and removed from both public lists");
} finally {
  await browser.close();
}
