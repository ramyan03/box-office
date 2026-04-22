import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { formatGross, formatDate } from "../lib/format";

export default function Records() {
  const [category, setCategory] = useState<string>("");

  const { data: categories } = useQuery({
    queryKey: ["records", "categories"],
    queryFn: api.records.categories,
    staleTime: 24 * 60 * 60_000,
  });

  const { data: records, isLoading } = useQuery({
    queryKey: ["records", category],
    queryFn: () => api.records.all(category || undefined),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Records & Milestones</h1>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setCategory("")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            !category ? "bg-gold text-black" : "bg-surface text-neutral hover:text-white border border-white/10"
          }`}
        >
          All
        </button>
        {categories?.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${
              category === cat
                ? "bg-gold text-black"
                : "bg-surface text-neutral hover:text-white border border-white/10"
            }`}
          >
            {cat.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 bg-surface rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      <div className="space-y-3">
        {records?.map((record) => (
          <Link
            key={record.id}
            to={`/movie/${record.movie_id}`}
            className="block bg-surface hover:bg-elevated transition-colors rounded-xl px-5 py-4 border border-white/[0.06]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-white font-semibold">{record.title}</p>
                <p className="text-neutral text-sm mt-0.5">{record.description}</p>
                {record.context && (
                  <p className="text-neutral text-xs mt-1 italic">{record.context}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-gold font-bold text-lg tabular">{formatGross(record.value)}</p>
                <p className="text-neutral text-xs">{formatDate(record.achieved_date)}</p>
                {record.is_all_time && (
                  <span className="text-[10px] bg-gold/10 text-gold px-2 py-0.5 rounded-full font-semibold">
                    ALL TIME
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
