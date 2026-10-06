/** An open blue box, drawn for the empty Recent meetings list. */
export function EmptyBoxIllustration() {
  return (
    <svg viewBox="0 0 200 150" width="170" height="128" aria-hidden="true">
      <ellipse cx="112" cy="138" rx="72" ry="7" fill="#e6eefc" />
      {/* Back flaps, then the dark inside of the box. */}
      <path d="M30 58 L100 34 L84 14 L16 38 Z" fill="#cfe0ff" />
      <path d="M170 58 L100 34 L116 14 L184 38 Z" fill="#b3d0ff" />
      <path d="M30 58 L100 34 L170 58 L100 82 Z" fill="#0b4fc4" />
      {/* The two front walls. */}
      <path d="M30 58 L100 82 L100 140 L30 116 Z" fill="#1d6ff2" />
      <path d="M100 82 L170 58 L170 116 L100 140 Z" fill="#3f8cff" />
      {/* Front flaps folded outwards. */}
      <path d="M30 58 L100 82 L80 100 L8 74 Z" fill="#e3edff" />
      <path d="M170 58 L100 82 L120 100 L192 74 Z" fill="#9fc4ff" />
    </svg>
  );
}
