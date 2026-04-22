import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { formatGross, formatChange } from "../lib/format";

export default function Home() {
  const { data: chart, isLoading } = useQuery({
    queryKey: ["charts", "latest"],
    queryFn: () => api.charts.latest(10),
  });

  return (
    <div className="space-y-8">
      {/* Banner */}
      {chart && (
        <div className="bg-surface rounded-xl p-6 border border-white/[0.06]">
          <p className="text-neutral text-sm font-medium mb-1">WEEKEND GROSS</p>
          <p className="text-gold text-4xl font-bold tabular">
            {formatGross(chart.total_gross)}
          </p>
          <p className="text-neutral text-sm mt-1">
            {new Date(chart.chart_date).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      )}

      {/* Weekly top 10 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold text-lg">This Weekend</h2>
          <Link to="/weekly" className="text-gold text-sm hover:underline">
            View all →
          </Link>
        </div>

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-surface rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        <div className="space-y-2">
          {chart?.results.map((entry) => (
            <Link
              key={entry.movie_id}
              to={`/movie/${entry.movie_id}`}
              className="flex items-center gap-4 bg-surface hover:bg-elevated transition-colors rounded-lg px-4 py-3 border border-white/[0.06]"
            >
              <span className="text-neutral text-sm font-bold w-5 tabular text-right">
                {entry.rank}
              </span>
              {entry.poster_url && (
                <img
                  src={entry.poster_url}
                  alt={entry.title}
                  className="w-8 h-12 object-cover rounded"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{entry.title}</p>
                <p className="text-neutral text-xs">
                  {entry.weeks_in_release === 1 ? "Opening" : `Week ${entry.weeks_in_release}`}
                  {" · "}
                  {entry.theaters.toLocaleString()} theaters
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-white font-bold tabular">
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
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
