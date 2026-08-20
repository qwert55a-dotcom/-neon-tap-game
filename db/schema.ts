import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const scores = sqliteTable(
  "scores",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    score: integer("score").notNull(),
    difficulty: text("difficulty", { enum: ["easy", "normal", "hard"] }).notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("scores_difficulty_score_idx").on(
      table.difficulty,
      table.score,
      table.createdAt,
    ),
  ],
);
