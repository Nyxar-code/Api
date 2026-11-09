import "reflect-metadata";
import assert from "node:assert/strict";
import { Environment } from "../src/shared/helpers/Environment.js";
import { KyselyPool } from "../src/shared/infrastructure/KyselyPool.js";
import { HymnRepo } from "../src/modules/content/repositories/HymnRepo.js";
import { up } from "./migrations/content/2026-11-09_hymns.js";

Environment.dbConnections.set("content", {
  host: "127.0.0.1", port: 3306, database: "hymn_smoke", user: "hymns", password: "local-ci-only"
});

const churchId = "HYMNCHURCH1";
const otherChurchId = "HYMNCHURCH2";
const verse = "Ìfẹ́ àti ìrètí.\nÀlàáfíà fún gbogbo wa.";
const repo = new HymnRepo();

try {
  const db = KyselyPool.getDb("content");
  await up(db);
  await up(db);
  const draft = await repo.save({
    churchId, number: 12, title: "Ìfẹ́", language: "Yoruba", verses: [{ order: 1, text: verse }], published: true
  });
  assert.ok(draft?.id);
  assert.equal(draft.published, false);
  assert.deepEqual(await repo.loadPublicAll(churchId), []);
  await repo.setPublished(churchId, draft.id, true);
  const published = await repo.loadPublic(churchId, draft.id);
  assert.equal(published?.verses?.[0]?.text, verse);
  assert.equal(published?.published, true);
  assert.equal(published?.archived, false);
  assert.equal((await repo.loadPublicAll(churchId)).length, 1);
  assert.equal(await repo.loadPublic(otherChurchId, draft.id), undefined);
  await repo.save({ ...draft, title: "Ìfẹ́ tuntun" });
  assert.equal((await repo.loadPublic(churchId, draft.id))?.title, "Ìfẹ́ tuntun");
  await repo.delete(otherChurchId, draft.id);
  assert.ok(await repo.loadPublic(churchId, draft.id));
  await repo.setPublished(churchId, draft.id, false);
  assert.equal(await repo.loadPublic(churchId, draft.id), undefined);
  await repo.setPublished(churchId, draft.id, true);
  await repo.delete(churchId, draft.id);
  await repo.save({ ...draft, title: "Stale edit" });
  await repo.setPublished(churchId, draft.id, true);
  assert.equal(await repo.loadPublic(churchId, draft.id), undefined);
  assert.deepEqual(await repo.loadPublicAll(churchId), []);
  assert.equal((await repo.load(churchId, draft.id))?.title, "Ìfẹ́ tuntun");
  console.log("Passed MySQL migration, publication lifecycle, stale edit protection, church isolation and Yoruba round-trip.");
} finally {
  await KyselyPool.destroyAll();
}
