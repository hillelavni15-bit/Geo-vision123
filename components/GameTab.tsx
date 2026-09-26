"use client";

import { useState } from "react";
import Map from "./Map";
import PhotoPicker from "./PhotoPicker";
import { readPhotoMetadata } from "@/lib/exif";
import { formatDistance, type LatLon } from "@/lib/geo";
import {
  buildLandmarkGame,
  evaluateGuess,
  MAX_ROUND_SCORE,
  pickRandom,
  ROUNDS_PER_GAME,
  type GameRound,
  type RoundResult,
} from "@/lib/game";

type Phase = "menu" | "loading" | "guessing" | "revealed" | "finished";

export default function GameTab() {
  const [phase, setPhase] = useState<Phase>("menu");
  const [rounds, setRounds] = useState<GameRound[]>([]);
  const [index, setIndex] = useState(0);
  const [guess, setGuess] = useState<LatLon | null>(null);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const start = (gameRounds: GameRound[]) => {
    rounds.forEach((r) => r.imageUrl.startsWith("blob:") && URL.revokeObjectURL(r.imageUrl));
    if (gameRounds.length === 0) {
      setError("לא הצלחנו להכין סבב משחק. נסו שוב.");
      setPhase("menu");
      return;
    }
    setRounds(gameRounds);
    setIndex(0);
    setGuess(null);
    setResults([]);
    setError(null);
    setPhase("guessing");
  };

  const startLandmarks = async () => {
    setPhase("loading");
    setError(null);
    start(await buildLandmarkGame().catch(() => []));
  };

  const startOwnPhotos = async (files: File[]) => {
    setPhase("loading");
    setError(null);
    const withGps: GameRound[] = [];
    for (const f of files) {
      const meta = await readPhotoMetadata(f);
      if (meta.location) withGps.push({ imageUrl: URL.createObjectURL(f), answer: meta.location, title: f.name });
    }
    if (withGps.length === 0) {
      setError("לאף אחת מהתמונות אין נתוני GPS.");
      setPhase("menu");
      return;
    }
    start(pickRandom(withGps, ROUNDS_PER_GAME));
  };

  // A round whose photo can't be loaded is dropped rather than played blind.
  const skipBrokenRound = () => {
    const remaining = rounds.filter((_, i) => i !== index);
    setRounds(remaining);
    setGuess(null);
    if (index >= remaining.length) setPhase(remaining.length && results.length ? "finished" : "menu");
    if (remaining.length === 0) setError("לא הצלחנו לטעון את התמונות. נסו שוב.");
  };

  const submit = () => {
    if (!guess) return;
    setResults((r) => [...r, evaluateGuess(rounds[index], guess)]);
    setPhase("revealed");
  };

  const next = () => {
    if (index + 1 >= rounds.length) {
      setPhase("finished");
      return;
    }
    setIndex((i) => i + 1);
    setGuess(null);
    setPhase("guessing");
  };

  const total = results.reduce((s, r) => s + r.score, 0);
  const round = rounds[index];
  const last = results[results.length - 1];

  if (phase === "menu" || phase === "loading") {
    return (
      <section className="tab">
        <p className="lead">
          רואים תמונה — מנחשים איפה בעולם היא צולמה בלחיצה על המפה. ככל שתהיו קרובים יותר, תקבלו יותר נקודות
          (עד {MAX_ROUND_SCORE.toLocaleString("he-IL")} לסיבוב).
        </p>
        {error && <div className="error">{error}</div>}
        {phase === "loading" ? (
          <div className="status">מכין סבב…</div>
        ) : (
          <div className="game-menu">
            <button className="big" onClick={startLandmarks}>
              🌍 אתרים מפורסמים בעולם
            </button>
            <div className="or">או</div>
            <PhotoPicker multiple onFiles={startOwnPhotos} label="משחק עם התמונות שלכם (תמונות עם GPS)" />
          </div>
        )}
      </section>
    );
  }

  if (phase === "finished") {
    const max = rounds.length * MAX_ROUND_SCORE;
    return (
      <section className="tab">
        <div className="card final">
          <h2>סיימתם!</h2>
          <div className="total">
            {total.toLocaleString("he-IL")} / {max.toLocaleString("he-IL")}
          </div>
          <ol>
            {results.map((r, i) => (
              <li key={i}>
                {r.round.title.replaceAll("_", " ")}: {formatDistance(r.distanceKm)} ·{" "}
                {r.score.toLocaleString("he-IL")} נק׳
              </li>
            ))}
          </ol>
          <button className="big" onClick={() => setPhase("menu")}>
            משחק חדש
          </button>
        </div>
        <Map
          fitKey="final"
          markers={results.flatMap((r) => [
            { position: r.round.answer, label: r.round.title, color: "#30a46c" },
            { position: r.guess, label: "הניחוש שלך", color: "#e5484d" },
          ])}
        />
      </section>
    );
  }

  return (
    <section className="tab">
      <div className="game-bar">
        <span>
          סיבוב {index + 1} / {rounds.length}
        </span>
        <span>ניקוד: {total.toLocaleString("he-IL")}</span>
      </div>
      <div className="split">
        <div className="side">
          <img className="photo game-photo" src={round.imageUrl} alt="איפה זה?" referrerPolicy="no-referrer" onError={skipBrokenRound} />
          {phase === "guessing" ? (
            <button className="big" disabled={!guess} onClick={submit}>
              {guess ? "נחשו!" : "לחצו על המפה כדי לנחש"}
            </button>
          ) : (
            last && (
              <div className="card">
                <h3>{round.title.replaceAll("_", " ")}</h3>
                {round.description && <p>{round.description}</p>}
                <p>
                  הייתם רחוקים <strong>{formatDistance(last.distanceKm)}</strong> ·{" "}
                  <strong>{last.score.toLocaleString("he-IL")}</strong> נקודות
                </p>
                <div className="scorebar">
                  <div style={{ width: `${(last.score / MAX_ROUND_SCORE) * 100}%` }} />
                </div>
                {round.pageUrl && (
                  <a href={round.pageUrl} target="_blank" rel="noreferrer">
                    קראו עוד בוויקיפדיה ↗
                  </a>
                )}
                <button className="big" onClick={next}>
                  {index + 1 >= rounds.length ? "לתוצאות" : "לסיבוב הבא"}
                </button>
              </div>
            )
          )}
        </div>
        <div className="main">
          <Map
            fitKey={phase === "revealed" ? `reveal-${index}` : `round-${index}`}
            onClick={phase === "guessing" ? setGuess : undefined}
            line={phase === "revealed" && last ? [last.guess, round.answer] : undefined}
            markers={[
              ...(guess ? [{ position: guess, label: "הניחוש שלך", color: "#e5484d" }] : []),
              ...(phase === "revealed" ? [{ position: round.answer, label: round.title, color: "#30a46c" }] : []),
            ]}
          />
        </div>
      </div>
    </section>
  );
}
