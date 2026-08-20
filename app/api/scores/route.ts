import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { scores } from "../../../db/schema";

const difficulties = ["easy", "normal", "hard"] as const;
type Difficulty = (typeof difficulties)[number];

function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === "string" && difficulties.includes(value as Difficulty);
}

export async function GET(request: Request) {
  const difficulty = new URL(request.url).searchParams.get("difficulty");
  if (!isDifficulty(difficulty)) {
    return Response.json({ error: "Invalid difficulty" }, { status: 400 });
  }

  try {
    const db = getDb();
    const leaderboard = await db
      .select({
        id: scores.id,
        name: scores.name,
        score: scores.score,
        createdAt: scores.createdAt,
      })
      .from(scores)
      .where(eq(scores.difficulty, difficulty))
      .orderBy(desc(scores.score), asc(scores.createdAt))
      .limit(10);
    return Response.json({ leaderboard });
  } catch {
    return Response.json({ error: "ランキングを読み込めませんでした" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      name?: unknown;
      score?: unknown;
      difficulty?: unknown;
    };
    const name =
      typeof payload.name === "string"
        ? payload.name.replace(/[\u0000-\u001f\u007f]/g, "").trim()
        : "";
    const score = payload.score;

    if (!name || name.length > 12) {
      return Response.json({ error: "名前は1〜12文字で入力してください" }, { status: 400 });
    }
    if (
      !Number.isInteger(score) ||
      typeof score !== "number" ||
      score < 0 ||
      score > 1_000_000
    ) {
      return Response.json({ error: "スコアが正しくありません" }, { status: 400 });
    }
    if (!isDifficulty(payload.difficulty)) {
      return Response.json({ error: "難易度が正しくありません" }, { status: 400 });
    }

    const db = getDb();
    const [entry] = await db
      .insert(scores)
      .values({ name, score, difficulty: payload.difficulty })
      .returning({ id: scores.id });

    const leaderboard = await db
      .select({ id: scores.id })
      .from(scores)
      .where(eq(scores.difficulty, payload.difficulty))
      .orderBy(desc(scores.score), asc(scores.createdAt))
      .limit(10);

    const rank = leaderboard.findIndex((item) => item.id === entry.id) + 1;
    return Response.json({ success: true, rank: rank || null }, { status: 201 });
  } catch {
    return Response.json({ error: "ランキングに登録できませんでした" }, { status: 500 });
  }
}
