/** Format a dollar amount as $142.3M, $54.2M, $800K etc. */
export function formatGross(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

/** Format a date string as "Apr 18, 2026" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Format a percentage change as "+12.4%" or "-38.2%" */
export function formatChange(pct: number | null | undefined): string {
  if (pct == null) return "—";
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

/** Format ROI as "2.29x" */
export function formatROI(roi: number | null | undefined): string {
  if (roi == null) return "—";
  return `${roi.toFixed(2)}x`;
}

/** TMDB poster URL */
export function posterUrl(path: string | null | undefined, size = "w300"): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
