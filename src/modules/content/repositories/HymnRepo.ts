import { UniqueIdHelper } from "@churchapps/apihelper";
import { getDb } from "../db/index.js";
import { Hymn } from "../models/index.js";
import type { HymnVerse } from "../models/index.js";
import { injectable } from "inversify";

@injectable()
export class HymnRepo {
  public async save(model: Hymn) {
    return model.id ? this.update(model) : this.create(model);
  }

  private async create(model: Hymn): Promise<Hymn> {
    const draft = { ...model, id: UniqueIdHelper.shortId(), published: false, archived: false };
    await getDb().insertInto("hymns").values({ ...this.toContentRow(draft), id: draft.id, churchId: draft.churchId }).execute();
    return draft;
  }

  private async update(model: Hymn): Promise<Hymn | undefined> {
    if (!model.id || !model.churchId) return undefined;
    await getDb().updateTable("hymns").set(this.toContentRow(model))
      .where("id", "=", model.id)
      .where("churchId", "=", model.churchId)
      .where("archived", "=", false)
      .execute();
    return this.load(model.churchId, model.id);
  }

  public async delete(churchId: string, id: string) {
    await getDb().updateTable("hymns").set({ archived: true, published: false }).where("id", "=", id).where("churchId", "=", churchId).execute();
  }

  public async setPublished(churchId: string, id: string, published: boolean) {
    await getDb().updateTable("hymns").set({ published }).where("id", "=", id).where("churchId", "=", churchId).where("archived", "=", false).execute();
  }

  public async load(churchId: string, id: string): Promise<Hymn | undefined> {
    const row = await getDb().selectFrom("hymns").selectAll().where("id", "=", id).where("churchId", "=", churchId).executeTakeFirst();
    return row ? this.rowToModel(row) : undefined;
  }

  public async loadAll(churchId: string): Promise<Hymn[]> {
    const rows = await getDb().selectFrom("hymns").selectAll().where("churchId", "=", churchId).orderBy("number").execute();
    return rows.map((row) => this.rowToModel(row));
  }

  public async loadPublicAll(churchId: string): Promise<Hymn[]> {
    const rows = await getDb().selectFrom("hymns").selectAll().where("churchId", "=", churchId).where("published", "=", true).where("archived", "=", false).orderBy("number").execute();
    return rows.map((row) => this.rowToModel(row));
  }

  public async loadPublic(churchId: string, id: string): Promise<Hymn | undefined> {
    const row = await getDb().selectFrom("hymns").selectAll().where("id", "=", id).where("churchId", "=", churchId).where("published", "=", true).where("archived", "=", false).executeTakeFirst();
    return row ? this.rowToModel(row) : undefined;
  }

  private toContentRow(model: Hymn) {
    return {
      number: model.number,
      title: model.title,
      language: model.language,
      versesJSON: JSON.stringify(model.verses || []),
      chorus: model.chorus,
      author: model.author,
      composer: model.composer,
      translator: model.translator,
      tune: model.tune,
      category: model.category,
      source: model.source,
      copyright: model.copyright,
      license: model.license,
      attribution: model.attribution
    };
  }

  private rowToModel({ versesJSON, ...row }: Omit<Hymn, "verses"> & { versesJSON: string }): Hymn {
    let verses: HymnVerse[] = [];
    try {
      const parsed: unknown = JSON.parse(versesJSON);
      if (Array.isArray(parsed)) verses = parsed;
    } catch { /* Keep legacy malformed rows readable. */ }
    return { ...row, verses };
  }
}
