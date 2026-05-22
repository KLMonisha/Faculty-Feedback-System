import { useState } from "react";

interface Props {
  value: number;
  onChange: (v: number) => void;
}

export default function StarRating({ value, onChange }: Props) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= (hover || value);
          return (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              onClick={() => onChange(star)}
              className={`rounded-lg p-2 text-3xl transition-all duration-200
                ${filled
                  ? "scale-110 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]"
                  : "text-slate-600 hover:text-slate-400"
                }`}
              aria-label={`${star} star${star > 1 ? "s" : ""}`}
            >
              ★
            </button>
          );
        })}
      </div>
      <span className="text-sm text-slate-500">
        {value === 0
          ? "Select a rating"
          : ["", "Poor", "Fair", "Good", "Very Good", "Excellent"][value]}
      </span>
    </div>
  );
}
