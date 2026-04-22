import type {
  WeeklyChart,
  YearlyEntry,
  MovieDetail,
  Movie,
  Record_,
  TriviaQuestion,
  Prediction,
  PredictionSubmission,
  LeaderboardEntry,
  UpcomingRelease,
  PaginatedResponse,
} from "@box-office/shared";

const BASE = "/api/v1";

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}${path}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  charts: {
    latest: (limit = 10) =>
      get<WeeklyChart>("/charts/weekly/latest", { limit: String(limit) }),
    weekly: (date: string, limit = 10) =>
      get<WeeklyChart>("/charts/weekly", { date, limit: String(limit) }),
    yearly: (year: number, sort = "gross", limit = 100, page = 1) =>
      get<PaginatedResponse<YearlyEntry>>(`/charts/yearly/${year}`, {
        sort,
        limit: String(limit),
        page: String(page),
      }),
    years: () => get<number[]>("/charts/years"),
  },

  movies: {
    detail: (id: number) => get<MovieDetail>(`/movies/${id}`),
    search: (params: {
      q?: string;
      genre?: string;
      year?: string;
      studio?: string;
      sort?: string;
      limit?: number;
      page?: number;
    }) =>
      get<PaginatedResponse<Movie>>("/movies/search", {
        ...(params.q && { q: params.q }),
        ...(params.genre && { genre: params.genre }),
        ...(params.year && { year: params.year }),
        ...(params.studio && { studio: params.studio }),
        sort: params.sort ?? "gross",
        limit: String(params.limit ?? 20),
        page: String(params.page ?? 1),
      }),
    weekly: (id: number) => get<{ weekly: WeeklyChart[] }>(`/movies/${id}/weekly`),
  },

  records: {
    all: (category?: string) =>
      get<Record_[]>("/records", category ? { category } : undefined),
    categories: () => get<string[]>("/records/categories"),
    byMovie: (id: number) => get<Record_[]>(`/records/movie/${id}`),
  },

  trivia: {
    daily: () => get<TriviaQuestion>("/trivia/daily"),
    random: (category?: string, difficulty?: string) =>
      get<TriviaQuestion>("/trivia/random", {
        ...(category && { category }),
        ...(difficulty && { difficulty }),
      }),
    categories: () => get<string[]>("/trivia/categories"),
  },

  predictions: {
    open: () => get<UpcomingRelease[]>("/predictions/open"),
    submit: (body: PredictionSubmission) =>
      post<Prediction>("/predictions", body),
    byMovie: (id: number) =>
      get<{ predictions: Prediction[]; actual?: number }>(`/predictions/movie/${id}`),
    leaderboard: (limit = 50) =>
      get<LeaderboardEntry[]>("/predictions/leaderboard", { limit: String(limit) }),
    session: (sessionId: string) =>
      get<Prediction[]>(`/predictions/session/${sessionId}`),
  },

  upcoming: {
    list: (weeks = 8) =>
      get<UpcomingRelease[]>("/upcoming", { weeks: String(weeks) }),
  },
};
