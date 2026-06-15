type LiveMiniVectorMapPreviewProps = {
  eta?: string;
  distance?: string;
  className?: string;
};

export default function LiveMiniVectorMapPreview({
  eta = '04 MIN',
  distance = '1.8 KM',
  className = '',
}: LiveMiniVectorMapPreviewProps) {
  return (
    <section
      aria-label="Live mini vector map preview"
      className={`relative flex h-[320px] min-h-[320px] w-full flex-col overflow-hidden rounded-[18px] border border-white/10 bg-[#12131a] text-white select-none ${className}`.trim()}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          backgroundPosition: '-1px -1px',
        }}
      />

      <div className="relative z-10 grid grid-cols-[1fr_auto] items-start gap-4 px-5 pb-3 pt-4 font-mono text-[11px] uppercase tracking-[0.18em]">
        <span className="text-white/45">Live Mapping</span>
        <div className="flex items-center gap-2 whitespace-nowrap text-[#f26a3d]">
          <span className="h-2.5 w-2.5 rounded-full bg-current" />
          <span>Routing</span>
        </div>
      </div>

      <div className="relative z-10 flex-1 px-4 py-2">
        <div className="grid h-full w-full grid-rows-[1fr_auto] overflow-hidden rounded-[14px] border border-white/8 bg-black/10">
          <div className="relative min-h-0 overflow-hidden">
            <svg
              viewBox="0 0 360 220"
              className="h-full w-full"
              role="img"
              aria-label="Responder route from origin to SOS location"
              preserveAspectRatio="xMidYMid meet"
            >
              <g opacity="0.18" stroke="#f3f4f6" strokeWidth="1">
                <path d="M0 44H360" />
                <path d="M0 88H360" />
                <path d="M0 132H360" />
                <path d="M0 176H360" />
                <path d="M72 0V220" />
                <path d="M144 0V220" />
                <path d="M216 0V220" />
                <path d="M288 0V220" />
              </g>

              <path
                d="M56 166C91 151 112 121 145 112C173 105 191 127 220 116C254 103 276 69 308 57"
                fill="none"
                stroke="#f26a3d"
                strokeWidth="3"
                strokeLinecap="square"
                strokeDasharray="9 8"
              />

              <circle cx="56" cy="166" r="8" fill="#f26a3d" />
              <circle cx="56" cy="166" r="18" fill="none" stroke="#f26a3d" strokeWidth="1.5" opacity="0.28" />

              <g transform="translate(308 57)">
                <rect x="-12" y="-12" width="24" height="24" fill="none" stroke="#f3f4f6" strokeWidth="2" />
                <rect x="-5" y="-5" width="10" height="10" fill="#f3f4f6" />
              </g>
            </svg>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-white/8 px-5 py-4">
            <div className="grid content-end gap-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">ETA</span>
              <span className="text-2xl font-bold leading-none text-white">{eta}</span>
            </div>
            <div className="grid content-end justify-items-end gap-1 text-right">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">Distance</span>
              <span className="text-2xl font-bold leading-none text-white">{distance}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
