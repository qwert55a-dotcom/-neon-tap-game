"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type GameState = "ready" | "playing" | "finished";
type Difficulty = "easy" | "normal" | "hard";
type LeaderboardEntry = { id: number; name: string; score: number };

const MODES: Record<
  Difficulty,
  { label: string; seconds: number; size: number; description: string }
> = {
  easy: { label: "EASY", seconds: 45, size: 86, description: "大きい的・45秒" },
  normal: { label: "NORMAL", seconds: 30, size: 68, description: "標準・30秒" },
  hard: { label: "HARD", seconds: 20, size: 48, description: "小さい的・20秒" },
};

function nextPosition() {
  return { x: 9 + Math.random() * 82, y: 14 + Math.random() * 72 };
}

export default function Home() {
  const [gameState, setGameState] = useState<GameState>("ready");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(MODES.normal.seconds);
  const [position, setPosition] = useState({ x: 50, y: 48 });
  const [pop, setPop] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [rankingState, setRankingState] = useState<"loading" | "ready" | "error">("loading");
  const [playerName, setPlayerName] = useState("");
  const [submitState, setSubmitState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [rank, setRank] = useState<number | null>(null);
  const endAt = useRef(0);
  const duration = MODES[difficulty].seconds;

  const loadLeaderboard = useCallback(async (mode: Difficulty) => {
    setRankingState("loading");
    try {
      const response = await fetch(`/api/scores?difficulty=${mode}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed");
      const data = (await response.json()) as { leaderboard: LeaderboardEntry[] };
      setLeaderboard(data.leaderboard);
      setRankingState("ready");
    } catch {
      setRankingState("error");
    }
  }, []);

  useEffect(() => {
    const saved = Number(window.localStorage.getItem(`neon-tap-best-${difficulty}`) ?? 0);
    setBest(Number.isFinite(saved) ? saved : 0);
    setTimeLeft(MODES[difficulty].seconds);
    void loadLeaderboard(difficulty);
  }, [difficulty, loadLeaderboard]);

  const finish = useCallback(() => {
    setGameState("finished");
    setCombo(0);
    setTimeLeft(0);
    setSubmitState("idle");
    setRank(null);
    setScore((current) => {
      setBest((previous) => {
        const next = Math.max(previous, current);
        window.localStorage.setItem(`neon-tap-best-${difficulty}`, String(next));
        return next;
      });
      return current;
    });
  }, [difficulty]);

  useEffect(() => {
    if (gameState !== "playing") return;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, (endAt.current - Date.now()) / 1000);
      setTimeLeft(remaining);
      if (remaining <= 0) finish();
    }, 50);
    return () => window.clearInterval(timer);
  }, [finish, gameState]);

  const start = useCallback(() => {
    const seconds = MODES[difficulty].seconds;
    setScore(0);
    setCombo(0);
    setTimeLeft(seconds);
    setPosition(nextPosition());
    setPop((value) => value + 1);
    setSubmitState("idle");
    setRank(null);
    endAt.current = Date.now() + seconds * 1000;
    setGameState("playing");
  }, [difficulty]);

  const hit = useCallback(() => {
    if (gameState !== "playing") return;
    setCombo((currentCombo) => {
      const nextCombo = currentCombo + 1;
      setScore((currentScore) => currentScore + 100 + Math.min(nextCombo, 10) * 10);
      return nextCombo;
    });
    setPosition(nextPosition());
    setPop((value) => value + 1);
  }, [gameState]);

  const miss = () => {
    if (gameState !== "playing") return;
    setCombo(0);
    setScore((current) => Math.max(0, current - 50));
  };

  const changeDifficulty = (mode: Difficulty) => {
    if (gameState === "playing") return;
    setDifficulty(mode);
    setGameState("ready");
  };

  const submitScore = async () => {
    if (!playerName.trim() || submitState === "sending" || submitState === "sent") return;
    setSubmitState("sending");
    try {
      const response = await fetch("/api/scores", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: playerName.trim(), score, difficulty }),
      });
      const data = (await response.json()) as { rank?: number | null };
      if (!response.ok) throw new Error("Failed");
      setRank(data.rank ?? null);
      setSubmitState("sent");
      await loadLeaderboard(difficulty);
    } catch {
      setSubmitState("error");
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat || document.activeElement?.tagName === "INPUT") return;
      event.preventDefault();
      if (gameState === "playing") hit();
      else if (gameState === "ready") start();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [gameState, hit, start]);

  const progress = Math.max(0, Math.min(100, (timeLeft / duration) * 100));

  return (
    <main className="game-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <section className="game-wrap" aria-label="NEON TAP ミニゲーム">
        <header className="game-header">
          <div>
            <p className="eyebrow">REACTION CHALLENGE</p>
            <h1>NEON <span>TAP</span></h1>
          </div>
          <div className="best-chip" aria-label={`ベストスコア ${best}`}>
            <span>{MODES[difficulty].label} BEST</span><strong>{best.toLocaleString()}</strong>
          </div>
        </header>

        <div className="difficulty-picker" aria-label="難易度を選択">
          {(Object.keys(MODES) as Difficulty[]).map((mode) => (
            <button
              key={mode}
              type="button"
              className={mode === difficulty ? "active" : ""}
              onClick={() => changeDifficulty(mode)}
              disabled={gameState === "playing"}
            >
              <strong>{MODES[mode].label}</strong><span>{MODES[mode].description}</span>
            </button>
          ))}
        </div>

        <div className="content-grid">
          <div className="play-column">
            <div className="stats" aria-live="polite">
              <div><span>SCORE</span><strong>{score.toLocaleString()}</strong></div>
              <div><span>COMBO</span><strong className={combo >= 5 ? "hot" : ""}>×{combo}</strong></div>
              <div><span>TIME</span><strong>{timeLeft.toFixed(1)}</strong></div>
            </div>
            <div className="timer-track" aria-hidden="true">
              <div className="timer-fill" style={{ width: `${progress}%` }} />
            </div>

            <div className="arena" onPointerDown={miss}>
              <div className="grid-floor" />
              {gameState === "playing" && (
                <button
                  key={pop}
                  className="target"
                  style={{
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                    width: `min(${MODES[difficulty].size}px, 17vw)`,
                  }}
                  onPointerDown={(event) => { event.stopPropagation(); hit(); }}
                  aria-label="ターゲットをタップ"
                ><span /></button>
              )}
              {gameState !== "playing" && (
                <div className="start-panel">
                  {gameState === "finished" ? (
                    <>
                      <p className="panel-kicker">TIME UP — {MODES[difficulty].label}</p>
                      <h2>{score.toLocaleString()} pts</h2>
                      <p>{score >= best && score > 0 ? "NEW BEST！ランキングに記録しよう。" : "名前を入れてランキングに挑戦。"}</p>
                      <div className="score-submit">
                        <input
                          value={playerName}
                          onChange={(event) => setPlayerName(event.target.value.slice(0, 12))}
                          placeholder="プレイヤー名"
                          maxLength={12}
                          aria-label="ランキング登録名"
                          disabled={submitState === "sent"}
                        />
                        <button onClick={submitScore} disabled={!playerName.trim() || submitState === "sending" || submitState === "sent"}>
                          {submitState === "sending" ? "送信中" : submitState === "sent" ? "登録済み" : "登録"}
                        </button>
                      </div>
                      {submitState === "sent" && <p className="submit-note">{rank ? `現在 ${rank}位！` : "登録しました！"}</p>}
                      {submitState === "error" && <p className="submit-note error">登録に失敗しました。もう一度試してください。</p>}
                    </>
                  ) : (
                    <>
                      <p className="panel-kicker">{MODES[difficulty].label} MODE</p>
                      <h2>光った円をタップ</h2>
                      <p>{MODES[difficulty].description}。連続成功でボーナス、外すと−50点。</p>
                    </>
                  )}
                  <button className="start-button" onClick={start}>
                    {gameState === "finished" ? "もう一度" : "スタート"}<span>→</span>
                  </button>
                  <small>PCならスペースキーでも遊べます</small>
                </div>
              )}
              <div className="corner corner-tl" /><div className="corner corner-tr" />
              <div className="corner corner-bl" /><div className="corner corner-br" />
            </div>
          </div>

          <aside className="leaderboard" aria-label="ランキング">
            <div className="leaderboard-title">
              <div><p>GLOBAL TOP 10</p><h2>ランキング</h2></div>
              <span>{MODES[difficulty].label}</span>
            </div>
            {rankingState === "loading" && <p className="ranking-message">読み込み中...</p>}
            {rankingState === "error" && (
              <button className="retry-button" onClick={() => void loadLeaderboard(difficulty)}>再読み込み</button>
            )}
            {rankingState === "ready" && leaderboard.length === 0 && (
              <p className="ranking-message">まだ記録がありません。<br />最初の1位を狙おう。</p>
            )}
            {rankingState === "ready" && leaderboard.length > 0 && (
              <ol>
                {leaderboard.map((entry, index) => (
                  <li key={entry.id} className={index < 3 ? `rank-${index + 1}` : ""}>
                    <span className="rank-number">{String(index + 1).padStart(2, "0")}</span>
                    <strong>{entry.name}</strong>
                    <b>{entry.score.toLocaleString()}</b>
                  </li>
                ))}
              </ol>
            )}
            <p className="ranking-footnote">難易度ごとに集計・上位10件を表示</p>
          </aside>
        </div>

        <footer>
          <span>MISS: −50</span>
          <span className="status-dot"><i /> GLOBAL RANKING ONLINE</span>
          <span>MAX BONUS: +200</span>
        </footer>
      </section>
    </main>
  );
}
