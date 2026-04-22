import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { formatDate } from "../lib/format";

export default function Upcoming() {
  const { data: films, isLoading } = useQuery({
    queryKey: ["upcoming"],
    queryFn: () => api.upcoming.list(8),
    staleTime: 3 * 60 * 60_000,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Upcoming Releases</h1>
      <p className="text-neutral text-sm">Next 8 weeks of wide releases.</p>

      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-72 bg-surface rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {films?.map((film) => (
          <div key={film.tmdb_id} className="bg-surface rounded-xl border border-white/[0.06] overflow-hidden">
            {film.poster_url ? (
              <img src={film.poster_url} alt={film.title} className="w-full aspect-[2/3] object-cover" />
            ) : (
              <div className="w-full aspect-[2/3] bg-elevated" />
            )}
            <div className="p-3 space-y-1">
              <p className="text-white font-semibold text-sm leading-tight">{film.title}</p>
              <p className="text-neutral text-xs">{formatDate(film.release_date)}</p>
              {film.studio && <p className="text-neutral text-xs">{film.studio}</p>}
              <div className="flex gap-1 flex-wrap pt-1">
                {film.genres.slice(0, 2).map((g) => (
                  <span key={g} className="text-[10px] bg-white/5 text-neutral px-1.5 py-0.5 rounded-full">{g}</span>
                ))}
                {film.mpaa_rating && (
                  <span className="text-[10px] bg-white/5 text-neutral px-1.5 py-0.5 rounded-full">{film.mpaa_rating}</span>
                )}
              </div>
              {film.open_for_prediction && (
                <Link
                  to="/predict"
                  className="block text-center mt-2 py-1.5 bg-gold text-black text-xs font-bold rounded-lg hover:bg-gold/90 transition-colors"
                >
                  Predict Opening
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
