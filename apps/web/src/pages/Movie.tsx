import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "../lib/api";
import { formatGross, formatDate, formatROI } from "../lib/format";

export default function Movie() {
  const { id } = useParams();
  const movieId = parseInt(id!);

  const { data: movie, isLoading } = useQuery({
    queryKey: ["movie", movieId],
    queryFn: () => api.movies.detail(movieId),
    enabled: !!movieId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-64 bg-surface rounded-xl animate-pulse" />
        <div className="h-40 bg-surface rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!movie) return <p className="text-neutral">Movie not found.</p>;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="flex gap-6 items-start">
        {movie.poster_url && (
          <img
            src={movie.poster_url}
            alt={movie.title}
            className="w-32 md:w-48 rounded-xl shrink-0 shadow-xl"
          />
        )}
        <div className="space-y-3">
          <div>
            <h1 className="text-3xl font-bold text-white">{movie.title}</h1>
            <p className="text-neutral mt-1">
              {formatDate(movie.release_date)} · {movie.runtime ? `${movie.runtime} min` : ""} · {movie.mpaa_rating ?? ""}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {movie.genres.map((g) => (
              <span key={g} className="text-xs bg-white/10 text-white px-2.5 py-1 rounded-full">{g}</span>
            ))}
          </div>
          {movie.studio && <p className="text-neutral text-sm">{movie.studio}</p>}
          {movie.metadata && (
            <div className="flex gap-4 text-sm flex-wrap">
              {movie.metadata.rt_score != null && (
                <span className={movie.metadata.rt_score >= 60 ? "text-positive" : "text-negative"}>
                  🍅 {movie.metadata.rt_score}%
                </span>
              )}
              {movie.metadata.metacritic_score != null && (
                <span className="text-neutral">MC {movie.metadata.metacritic_score}</span>
              )}
              {movie.metadata.imdb_rating != null && (
                <span className="text-gold">★ {movie.metadata.imdb_rating}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Gross cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Opening Weekend", value: movie.grosses.opening_weekend },
          { label: "Domestic Total", value: movie.grosses.domestic_total },
          { label: "Worldwide", value: movie.grosses.worldwide_total },
          { label: "Budget", value: movie.budget },
        ].map((item) => (
          <div key={item.label} className="bg-surface rounded-xl p-4 border border-white/[0.06]">
            <p className="text-neutral text-xs font-medium mb-1">{item.label.toUpperCase()}</p>
            <p className="text-white font-bold text-xl tabular">{formatGross(item.value)}</p>
          </div>
        ))}
      </div>

      {/* ROI */}
      {movie.grosses.roi != null && (
        <p className="text-sm text-neutral">
          Return on investment:{" "}
          <span className={`font-bold ${movie.grosses.roi >= 1 ? "text-positive" : "text-negative"}`}>
            {formatROI(movie.grosses.roi)}
          </span>
        </p>
      )}

      {/* Week-by-week chart */}
      {movie.weekly.length > 0 && (
        <div className="bg-surface rounded-xl p-5 border border-white/[0.06]">
          <h2 className="text-white font-semibold mb-4">Week-by-Week Performance</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={movie.weekly}>
              <defs>
                <linearGradient id="grossGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e8b84b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#e8b84b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="week" tick={{ fill: "#94a3b8", fontSize: 11 }} label={{ value: "Week", position: "insideBottom", fill: "#94a3b8", dy: 10 }} />
              <YAxis tickFormatter={(v) => `$${(v / 1_000_000).toFixed(0)}M`} tick={{ fill: "#94a3b8", fontSize: 11 }} width={55} />
              <Tooltip
                formatter={(value: number) => [formatGross(value), "Weekend Gross"]}
                contentStyle={{ background: "#1c1c26", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                labelStyle={{ color: "#94a3b8" }}
                itemStyle={{ color: "#e8b84b" }}
              />
              <Area type="monotone" dataKey="gross" stroke="#e8b84b" strokeWidth={2} fill="url(#grossGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Records */}
      {movie.records.length > 0 && (
        <div>
          <h2 className="text-white font-semibold mb-3">Records</h2>
          <div className="space-y-2">
            {movie.records.map((r) => (
              <div key={r.id} className="bg-surface rounded-lg px-4 py-3 border border-white/[0.06]">
                <p className="text-gold font-semibold">{formatGross(r.value)}</p>
                <p className="text-white text-sm">{r.description}</p>
                {r.context && <p className="text-neutral text-xs mt-0.5">{r.context}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
