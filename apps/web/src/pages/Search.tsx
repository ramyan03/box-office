import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { formatGross, formatDate } from "../lib/format";

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [genre, setGenre] = useState("");
  const [sort, setSort] = useState("gross");

  useEffect(() => {
    const urlQ = searchParams.get("q") ?? "";
    setQ(urlQ);
  }, [searchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ["search", q, genre, sort],
    queryFn: () => api.movies.search({ q, genre, sort }),
    enabled: q.length >= 2,
  });

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setSearchParams(e.target.value ? { q: e.target.value } : {});
          }}
          placeholder="Search films..."
          className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-white placeholder-neutral focus:outline-none focus:border-gold/50 text-base"
          autoFocus
        />
        <div className="flex gap-2 flex-wrap">
          {["gross", "opening", "release_date", "budget"].map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                sort === s
                  ? "bg-gold text-black"
                  : "bg-surface text-neutral hover:text-white border border-white/10"
              }`}
            >
              {s === "release_date" ? "Date" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {q.length < 2 && (
        <p className="text-neutral text-sm">Type at least 2 characters to search.</p>
      )}

      {isLoading && q.length >= 2 && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-surface rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {data && (
        <>
          <p className="text-neutral text-sm">{data.total} results</p>
          <div className="space-y-2">
            {data.data.map((movie) => (
              <Link
                key={movie.id}
                to={`/movie/${movie.id}`}
                className="flex items-center gap-4 bg-surface hover:bg-elevated transition-colors rounded-xl px-4 py-3 border border-white/[0.06]"
              >
                {movie.poster_url && (
                  <img src={movie.poster_url} alt={movie.title} className="w-8 h-12 object-cover rounded shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">{movie.title}</p>
                  <p className="text-neutral text-xs">{formatDate(movie.release_date)} · {movie.studio ?? ""}</p>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
