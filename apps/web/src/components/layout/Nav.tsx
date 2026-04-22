import { NavLink } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const LINKS = [
  { to: "/weekly",    label: "Weekly"      },
  { to: "/yearly",    label: "Yearly"      },
  { to: "/records",   label: "Records"     },
  { to: "/trivia",    label: "Trivia"      },
  { to: "/predict",   label: "Predictions" },
  { to: "/upcoming",  label: "Upcoming"    },
];

export default function Nav() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setQuery("");
    }
  }

  return (
    <header className="border-b border-white/[0.06] bg-surface sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-6">
          {/* Logo */}
          <NavLink to="/" className="text-gold font-bold text-lg tracking-tight shrink-0">
            Box Office
          </NavLink>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-neutral hover:text-white hover:bg-white/5"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xs">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search films..."
              className="w-full bg-elevated border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-neutral focus:outline-none focus:border-gold/50 transition-colors"
            />
          </form>
        </div>
      </div>
    </header>
  );
}
