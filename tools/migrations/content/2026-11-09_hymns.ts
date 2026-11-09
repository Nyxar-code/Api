import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS hymns (
      id CHAR(11) NOT NULL PRIMARY KEY,
      churchId CHAR(11) NOT NULL,
      \`number\` INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      language VARCHAR(50) NOT NULL,
      versesJSON MEDIUMTEXT NOT NULL,
      chorus TEXT,
      author VARCHAR(255),
      composer VARCHAR(255),
      translator VARCHAR(255),
      tune VARCHAR(255),
      category VARCHAR(100),
      source VARCHAR(500),
      copyright VARCHAR(500),
      license VARCHAR(255),
      attribution VARCHAR(1000),
      published BIT(1) NOT NULL DEFAULT 0,
      archived BIT(1) NOT NULL DEFAULT 0,
      KEY idx_hymns_churchId_number (churchId, \`number\`),
      KEY idx_hymns_churchId_title (churchId, title),
      KEY idx_hymns_churchId_published_archived (churchId, published, archived)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("hymns").ifExists().execute();
}
