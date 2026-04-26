const BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p";

function key(): string {
  const k = process.env.TMDB_API_KEY;
  if (!k) throw new Error("TMDB_API_KEY not set");
  return k;
}

async function tmdbGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set("api_key", key());
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB ${res.status} — ${path}`);
  return (await res.json()) as T;
}

export function posterUrl(path: string | null, size = "w300"): string | null {
  if (!path) return null;
  return `${IMG_BASE}/${size}${path}`;
}

export async function fetchUpcoming(page = 1) {
  return tmdbGet<{ results: TmdbMovie[] }>("/movie/upcoming", { page: String(page) });
}

export async function fetchMovieDetail(tmdbId: number) {
  return tmdbGet<TmdbMovieDetail>(`/movie/${tmdbId}`, { append_to_response: "credits" });
}

export interface TmdbMovie {
  id: number;
  title: string;
  release_date: string;
  genre_ids: number[];
  poster_path: string | null;
  budget?: number;
}

export interface TmdbMovieDetail extends TmdbMovie {
  runtime: number;
  budget: number;
  status: string;
  production_companies: { name: string }[];
  genres: { id: number; name: string }[];
  credits?: {
    cast: { name: string; order: number }[];
    crew: { name: string; job: string }[];
  };
}
