// ── Movies ────────────────────────────────────────────────────────────────────

export interface Movie {
  id: number;
  tmdb_id: number;
  title: string;
  release_date: string; // ISO date
  budget: number | null;
  runtime: number | null;
  mpaa_rating: string | null;
  genres: string[];
  studio: string | null;
  franchise: string | null;
  poster_url: string | null;
}

export interface MovieMetadata {
  director: string | null;
  cast: string[];
  rt_score: number | null;
  metacritic_score: number | null;
  imdb_rating: number | null;
  awards: string | null;
}

export interface MovieDetail extends Movie {
  metadata: MovieMetadata | null;
  grosses: {
    opening_weekend: number | null;
    domestic_total: number | null;
    worldwide_total: number | null;
    roi: number | null;
  };
  weekly: WeeklyEntry[];
  records: Record_[];
}

// ── Grosses & Charts ──────────────────────────────────────────────────────────

export interface WeeklyEntry {
  week: number;
  rank: number;
  gross: number;
  theaters: number;
  cumulative: number;
  change_pct: number | null;
}

export interface ChartEntry {
  rank: number;
  movie_id: number;
  title: string;
  weekend_gross: number;
  gross_change_pct: number | null;
  cumulative_domestic: number | null;
  weeks_in_release: number;
  theaters: number;
  poster_url: string | null;
  genres: string[];
  is_record: boolean;
}

export interface WeeklyChart {
  chart_date: string;
  total_gross: number;
  results: ChartEntry[];
}

export interface YearlyEntry {
  rank: number;
  movie_id: number;
  title: string;
  studio: string | null;
  release_date: string;
  opening_weekend: number | null;
  domestic_total: number;
  worldwide_total: number | null;
  budget: number | null;
  roi: number | null;
  poster_url: string | null;
}

// ── Records ───────────────────────────────────────────────────────────────────

export interface Record_ {
  id: number;
  category: string;
  movie_id: number;
  title: string;
  value: number;
  description: string;
  achieved_date: string;
  is_all_time: boolean;
  context: string | null;
}

// ── Trivia ────────────────────────────────────────────────────────────────────

export interface TriviaQuestion {
  id: number;
  question: string;
  options: string[]; // 4 options
  answer: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  movie_id: number | null;
  year: number | null;
}

// ── Predictions ───────────────────────────────────────────────────────────────

export interface PredictionSubmission {
  movie_id: number;
  predicted_opening: number;
  session_id: string;
  username?: string;
}

export interface Prediction {
  id: number;
  movie_id: number;
  title: string;
  predicted_opening: number;
  actual_opening: number | null;
  accuracy_pct: number | null;
  submitted_at: string;
  resolved_at: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  session_id: string;
  username: string | null;
  total_predictions: number;
  avg_accuracy_pct: number;
  best_accuracy_pct: number;
}

// ── Upcoming ──────────────────────────────────────────────────────────────────

export interface UpcomingRelease {
  tmdb_id: number;
  title: string;
  release_date: string;
  studio: string | null;
  genres: string[];
  mpaa_rating: string | null;
  poster_url: string | null;
  budget: number | null;
  open_for_prediction: boolean;
}

// ── API response envelope ─────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  message: string;
  status: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
