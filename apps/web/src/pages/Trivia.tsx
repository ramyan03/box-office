import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export default function Trivia() {
  const [selected, setSelected] = useState<string | null>(null);
  const [streak, setStreak] = useState(() => {
    return parseInt(localStorage.getItem("trivia_streak") ?? "0");
  });

  const { data: question, isLoading, refetch } = useQuery({
    queryKey: ["trivia", "daily"],
    queryFn: api.trivia.daily,
    staleTime: 24 * 60 * 60_000,
  });

  if (!question) return null;

  const isRevealed = selected !== null;
  const isCorrect = selected === question.answer;

  function handleSelect(option: string) {
    if (isRevealed) return;
    setSelected(option);
    if (option === question!.answer) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      localStorage.setItem("trivia_streak", String(newStreak));
    } else {
      setStreak(0);
      localStorage.setItem("trivia_streak", "0");
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Daily Trivia</h1>
        {streak > 0 && (
          <div className="bg-gold/10 text-gold px-3 py-1.5 rounded-lg text-sm font-semibold">
            🔥 {streak} day streak
          </div>
        )}
      </div>

      <div className="bg-surface rounded-2xl p-6 border border-white/[0.06] space-y-6">
        <div>
          <span className="text-xs text-neutral font-medium uppercase tracking-wider">
            {question.category} · {question.difficulty}
          </span>
          <p className="text-white text-lg font-semibold mt-2 leading-snug">
            {question.question}
          </p>
        </div>

        <div className="space-y-2">
          {question.options.map((option) => {
            let style = "bg-elevated hover:bg-white/10 text-white border-white/10 cursor-pointer";
            if (isRevealed) {
              if (option === question.answer) {
                style = "bg-positive/10 text-positive border-positive/30 cursor-default";
              } else if (option === selected) {
                style = "bg-negative/10 text-negative border-negative/30 cursor-default";
              } else {
                style = "bg-elevated text-neutral border-white/10 cursor-default opacity-50";
              }
            }
            return (
              <button
                key={option}
                onClick={() => handleSelect(option)}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${style}`}
              >
                {option}
              </button>
            );
          })}
        </div>

        {isRevealed && (
          <div className={`rounded-xl px-4 py-3 text-sm ${isCorrect ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"}`}>
            {isCorrect ? "✓ Correct!" : `✗ The answer was: ${question.answer}`}
          </div>
        )}
      </div>
    </div>
  );
}
