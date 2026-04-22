import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { formatGross, formatDate } from "../lib/format";

export default function Predictions() {
  const [tab, setTab] = useState<"predict" | "leaderboard">("predict");

  const { data: openFilms } = useQuery({
    queryKey: ["predictions", "open"],
    queryFn: api.predictions.open,
  });

  const { data: leaderboard } = useQuery({
    queryKey: ["predictions", "leaderboard"],
    queryFn: () => api.predictions.leaderboard(),
    enabled: tab === "leaderboard",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Predictions</h1>
        <div className="flex bg-surface rounded-lg border border-white/10 p-0.5">
          {(["predict", "leaderboard"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors capitalize ${
                tab === t ? "bg-gold text-black" : "text-neutral hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === "predict" && (
        <div className="space-y-4">
          <p className="text-neutral text-sm">
            Predict opening weekend gross for upcoming films. Submit before release.
          </p>
          {openFilms?.map((film) => (
            <PredictCard key={film.tmdb_id} film={film} />
          ))}
          {openFilms?.length === 0 && (
            <p className="text-neutral text-sm">No films open for prediction right now.</p>
          )}
        </div>
      )}

      {tab === "leaderboard" && (
        <div className="bg-surface rounded-xl border border-white/[0.06] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-neutral text-xs">
                <th className="px-4 py-3 text-left w-10">#</th>
                <th className="px-4 py-3 text-left">Predictor</th>
                <th className="px-4 py-3 text-right">Predictions</th>
                <th className="px-4 py-3 text-right">Avg Accuracy</th>
                <th className="px-4 py-3 text-right">Best</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard?.map((entry) => (
                <tr key={entry.session_id} className="border-b border-white/[0.04]">
                  <td className="px-4 py-3 text-neutral tabular">{entry.rank}</td>
                  <td className="px-4 py-3 text-white font-medium">{entry.username ?? "Anonymous"}</td>
                  <td className="px-4 py-3 text-right text-neutral tabular">{entry.total_predictions}</td>
                  <td className="px-4 py-3 text-right tabular font-semibold">
                    <span className={entry.avg_accuracy_pct >= 80 ? "text-positive" : "text-white"}>
                      {entry.avg_accuracy_pct.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular text-gold">
                    {entry.best_accuracy_pct.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import type { UpcomingRelease } from "@box-office/shared";

function PredictCard({ film }: { film: UpcomingRelease }) {
  const [amount, setAmount] = useState("");
  const [username, setUsername] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = parseFloat(amount.replace(/[^0-9.]/g, "")) * 1_000_000;
    if (!value) return;
    await api.predictions.submit({
      movie_id: film.tmdb_id,
      predicted_opening: value,
      session_id: getSessionId(),
      username: username || undefined,
    });
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="bg-surface rounded-xl p-5 border border-positive/30">
        <p className="text-positive font-semibold">Prediction submitted for {film.title}!</p>
        <p className="text-neutral text-sm mt-1">
          Your pick: ${parseFloat(amount.replace(/[^0-9.]/g, "")).toFixed(1)}M
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl p-5 border border-white/[0.06] flex gap-4">
      {film.poster_url && (
        <img src={film.poster_url} alt={film.title} className="w-16 h-24 object-cover rounded-lg shrink-0" />
      )}
      <form onSubmit={handleSubmit} className="flex-1 space-y-3">
        <div>
          <p className="text-white font-semibold">{film.title}</p>
          <p className="text-neutral text-xs">{formatDate(film.release_date)} · {film.studio ?? ""}</p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Opening ($M)"
            className="flex-1 bg-elevated border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral focus:outline-none focus:border-gold/50"
          />
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Name (optional)"
            className="flex-1 bg-elevated border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral focus:outline-none focus:border-gold/50"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-gold text-black rounded-lg text-sm font-bold hover:bg-gold/90 transition-colors"
        >
          Submit Prediction
        </button>
      </form>
    </div>
  );
}

function getSessionId(): string {
  let id = localStorage.getItem("session_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("session_id", id);
  }
  return id;
}
