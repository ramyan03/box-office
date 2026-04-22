import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { formatGross, formatChange, formatDate } from "../lib/format";

export default function Weekly() {
  const [date, setDate] = useState<string>("");

  const { data: chart, isLoading } = useQuery({
    queryKey: ["charts", "weekly", date],
    queryFn: () => date ? api.charts.weekly(date) : api.charts.latest(),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Weekly Results</h1>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-surface border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-gold/50"
        />
      </div>

      {chart && (
        <p className="text-neutral text-sm">
          Weekend of {formatDate(chart.chart_date)} ·{" "}
          <span className="text-white font-medium">{formatGross(chart.total_gross)}</span> total
        </p>
      )}

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-16 bg-surface rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      <div className="space-y-2">
        {chart?.results.map((entry) => (
          <Link
            key={entry.movie_id}
            to={`/movie/${entry.movie_id}`}
            className="flex items-center gap-4 bg-surface hover:bg-elevated transition-colors rounded-xl px-5 py-4 border border-white/[0.06]"
          >
            <span className="text-neutral text-sm font-bold w-6 tabular text-right shrink-0">
              {entry.rank}
            </span>
            {entry.poster_url && (
              <img
                src={entry.poster_url}
                alt={entry.title}
                className="w-9 h-14 object-cover rounded shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold truncate">{entry.title}</p>
              <div className="flex gap-2 mt-0.5 flex-wrap">
                {entry.genres.slice(0, 2).map((g) => (
                  <span key={g} className="text-[10px] text-neutral bg-white/5 px-2 py-0.5 rounded-full">
                    {g}
                  </span>
                ))}
                <span className="text-xs text-neutral">
                  {entry.weeks_in_release === 1 ? "Opening weekend" : `Week ${entry.weeks_in_release}`}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0 space-y-0.5">
              <p className="text-white font-bold tabular text-base">
                {formatGross(entry.weekend_gross)}
              </p>
              {entry.gross_change_pct != null && (
                <p
                  className={`text-xs tabular font-medium ${
                    entry.gross_change_pct >= 0 ? "text-positive" : "text-negative"
                  }`}
                >
                  {formatChange(entry.gross_change_pct)}
                </p>
              )}
              <p className="text-neutral text-xs tabular">
                {formatGross(entry.cumulative_domestic ?? 0)} total
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
