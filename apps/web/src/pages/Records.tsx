import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { formatGross, formatDate } from "../lib/format";

const CATEGORY_LABELS: Record<string, string> = {
  opening_weekend: "Opening Weekend",
  domestic_total: "Domestic Gross",
  best_single_weekend: "Best Single Weekend",
  best_second_weekend: "Best 2nd Weekend",
  best_non_opening: "Best Non-Opening",
  best_legs: "Best Legs",
  most_weeks_no1: "Most Weeks at #1",
};

export default function Records() {
  const [category, setCategory] = useState<string>("opening_weekend");

  const { data: categories } = useQuery({
    queryKey: ["records", "categories"],
    queryFn: api.records.categories,
    staleTime: 24 * 60 * 60_000,
  });

  const { data: records, isLoading } = useQuery({
    queryKey: ["records", category],
    queryFn: () => api.records.all(category || undefined),
  });

  const formatValue = (record: { category: string; value: number }) => {
    if (record.category === "most_weeks_no1") return `${record.value} wks`;
    return formatGross(record.value);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Records & Milestones</h1>

      <div className="flex gap-2 flex-wrap">
        {categories?.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              category === cat
                ? "bg-gold text-black"
                : "bg-surface text-neutral hover:text-white border border-white/10"
            }`}
          >
            {CATEGORY_LABELS[cat] ?? cat.replace(/_/g, " ")}
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
              </div>
              <div className="text-right shrink-0">
                <p className="text-gold font-bold text-lg tabular">
                  {formatValue(record)}
                </p>
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
