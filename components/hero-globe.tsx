const PINS = [
  { top: "22%", left: "24%", delay: "0s", size: "size-5" },
  { top: "38%", left: "52%", delay: "0.7s", size: "size-3.5" },
  { top: "58%", left: "35%", delay: "1.3s", size: "size-2.5" },
  { top: "30%", left: "70%", delay: "0.4s", size: "size-3.5" },
  { top: "65%", left: "65%", delay: "1s", size: "size-2.5" },
  { top: "18%", left: "55%", delay: "1.6s", size: "size-2.5" },
  { top: "72%", left: "22%", delay: "0.9s", size: "size-2.5" },
  { top: "48%", left: "80%", delay: "0.2s", size: "size-3.5" },
];

/** Decorative spinning globe with pulsing location pins. */
export function HeroGlobe() {
  return (
    <div className="pointer-events-none relative flex h-full w-full select-none items-center justify-center" aria-hidden>
      <div className="absolute size-72 animate-pulse-slow rounded-full bg-primary/5 md:size-96" />
      <div className="absolute size-64 animate-spin-very-slow rounded-full border border-primary/10 md:size-[22rem]" />
      <div className="absolute size-52 animate-spin-reverse-slow rounded-full border border-primary/15 md:size-72" />

      <div
        className="relative size-44 overflow-hidden rounded-full md:size-60"
        style={{
          background: "radial-gradient(ellipse at 35% 35%, hsl(180 100% 25%), hsl(200 80% 12%) 60%, hsl(220 60% 8%))",
          boxShadow:
            "inset -20px -20px 60px rgba(0,0,0,0.6), inset 8px 8px 30px rgba(0,200,200,0.15), 0 0 60px rgba(0,200,200,0.12)",
        }}
      >
        <svg className="absolute inset-0 h-full w-full text-primary opacity-20" viewBox="0 0 200 200">
          {[30, 55, 80, 105, 130, 155].map((y) => (
            <ellipse key={y} cx="100" cy={y} rx="96" ry="8" fill="none" stroke="currentColor" strokeWidth="0.5" />
          ))}
          {[0, 30, 60, 90, 120, 150].map((deg) => (
            <ellipse
              key={deg}
              cx="100"
              cy="100"
              rx="10"
              ry="96"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              transform={`rotate(${deg} 100 100)`}
            />
          ))}
          <ellipse cx="100" cy="100" rx="96" ry="12" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
        </svg>
        <div
          className="absolute left-0 top-0 h-2/3 w-2/3 rounded-full"
          style={{ background: "radial-gradient(ellipse at 30% 30%, rgba(0,220,220,0.18), transparent 70%)" }}
        />
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: "linear-gradient(135deg, transparent 40%, rgba(0,0,0,0.5) 100%)" }}
        />
      </div>

      {PINS.map((pin, i) => (
        <div key={i} className="absolute animate-float-pin" style={{ top: pin.top, left: pin.left, animationDelay: pin.delay }}>
          <div
            className={`relative flex items-center justify-center rounded-full border-2 border-background bg-primary shadow-lg shadow-primary/40 ${pin.size}`}
          >
            <div className="absolute inset-0 animate-ping rounded-full bg-primary opacity-30" />
          </div>
          <div className="absolute bottom-0 left-1/2 size-1 -translate-x-1/2 translate-y-1.5 rounded-full bg-primary/60" />
        </div>
      ))}

      <div className="absolute size-56 animate-orbit md:size-72">
        <div className="absolute left-1/2 top-0 size-2 -translate-x-1/2 rounded-full bg-primary/70 shadow-sm shadow-primary" />
      </div>
    </div>
  );
}
