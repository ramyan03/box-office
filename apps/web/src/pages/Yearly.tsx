import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { formatGross, formatROI, formatDate } from "../lib/format";

type SortKey = "gross" | "opening" | "budget" | "roi";

export default function Yearly() {
  const { year: yearParam } = useParams();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(yearParam ? parseInt(yearParam) : currentYear);
  const [sort, setSort] = useState<SortKey>("gross");

  const { data: years } = useQuery({
    queryKey: ["charts", "years"],
    queryFn: api.charts.years,
    staleTime: 24 * 60 * 60_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["charts", "yearly", year, sort],
    queryFn: () => api.charts.yearly(year, sort),
  });

  const SORTS: { key: SortKey; label: string }[] = [
    { key: "gross", label: "Domestic Gross" },
    { key: "opening", label: "Opening Weekend" },
    { key: "budget", label: "Budget" },
    { key: "roi", label: "ROI" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Yearly Leaderboard</h1>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="bg-surface border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-gold/50"
          >
            {(years ?? [currentYear]).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-1">
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                sort === s.key
                  ? "bg-gold text-black"
                  : "bg-surface text-neutral hover:text-white border border-white/10"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-14 bg-surface rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      <div className="bg-surface rounded-xl border border-white/[0.06] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-neutral text-xs">
              <th className="px-4 py-3 text-left w-10">#</th>
              <th className="px-4 py-3 text-left">Film</th>
              <th className="px-4 py-3 text-right hidden md:table-cell">Opening</th>
              <th className="px-4 py-3 text-right">Domestic</th>
              <th className="px-4 py-3 text-right hidden lg:table-cell">Worldwide</th>
              <th className="px-4 py-3 text-right hidden lg:table-cell">ROI</th>
            </tr>
          </thead>
          <tbody>
            {data?.data.map((entry, i) => (
              <tr
                key={entry.movie_id}
                className="border-b border-white/[0.04] hover:bg-elevated transition-colors"
              >
                <td className="px-4 py-3 text-neutral tabular">{i + 1}</td>
                <td className="px-4 py-3">
                  <Link to={`/movie/${entry.movie_id}`} className="hover:text-gold transition-colors">
                    <p className="text-white font-medium">{entry.title}</p>
                    <p className="text-neutral text-xs">{entry.studio ?? ""} · {formatDate(entry.release_date)}</p>
                  </Link>
                </td>
                <td className="px-4 py-3 text-right tabular text-neutral hidden md:table-cell">
                  {formatGross(entry.opening_weekend)}
                </td>
                <td className="px-4 py-3 text-right tabular text-white font-semibold">
                  {formatGross(entry.domestic_total)}
                </td>
                <td className="px-4 py-3 text-right tabular text-neutral hidden lg:table-cell">
                  {formatGross(entry.worldwide_total)}
                </td>
                <td className="px-4 py-3 text-right tabular hidden lg:table-cell">
                  <span className={entry.roi != null && entry.roi >= 1 ? "text-positive" : "text-negative"}>
                    {formatROI(entry.roi)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
