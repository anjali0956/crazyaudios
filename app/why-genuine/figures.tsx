// Line illustrations for /why-genuine. Drawn, not photographed: schematic
// views of TO-247 / TO-220 power packages. All decorative (aria-hidden); the
// page text carries the meaning. No real manufacturer logos are drawn.
import type { ReactNode } from "react";

/* ------------------------------------------------------------ hero X-ray */

function XrayPackage({ x, dieW, dieH, wire }: { x: number; dieW: number; dieH: number; wire: number }) {
  const cx = x + 60;
  const dieX = cx - dieW / 2;
  const dieY = 110 - dieH / 2;
  const lines = Math.max(1, Math.round(dieW / 14));
  return (
    <g>
      {/* body + mounting hole */}
      <rect x={x} y={8} width={120} height={150} rx={7} className="fill-white/[0.06] stroke-white/40" strokeWidth={1.5} />
      <circle cx={cx} cy={34} r={11} className="fill-ink stroke-white/40" strokeWidth={1.5} />
      {/* identical marking on both */}
      <text x={cx} y={71} textAnchor="middle" className="fill-white/90 font-mono" fontSize={18} fontWeight={600} letterSpacing={1.5}>
        C5200
      </text>
      {/* cut-away window into the package, down to where the leads enter */}
      <rect x={x + 12} y={82} width={96} height={70} rx={5} className="fill-night stroke-white/50" strokeWidth={1.25} strokeDasharray="4 3" />
      {/* lead frame: die pad joined to the middle lead, and the two outer lead tips */}
      <rect x={x + 22} y={89} width={76} height={42} rx={2} className="fill-white/[0.08] stroke-white/15" strokeWidth={1} />
      <rect x={x + 55} y={131} width={10} height={21} className="fill-white/[0.08]" />
      <rect x={x + 22} y={139} width={12} height={13} rx={1} className="fill-white/30" />
      <rect x={x + 86} y={139} width={12} height={13} rx={1} className="fill-white/30" />
      {/* bond wires from the die to the outer lead tips */}
      <path
        d={`M${dieX + Math.min(6, dieW / 4)} ${dieY + dieH - 2} C ${dieX - 6} ${dieY + dieH + 12}, ${x + 27} ${128}, ${x + 28} ${141}`}
        className="stroke-white/75"
        strokeWidth={wire}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${dieX + dieW - Math.min(6, dieW / 4)} ${dieY + dieH - 2} C ${dieX + dieW + 6} ${dieY + dieH + 12}, ${x + 93} ${128}, ${x + 92} ${141}`}
        className="stroke-white/75"
        strokeWidth={wire}
        fill="none"
        strokeLinecap="round"
      />
      {/* the silicon die */}
      <rect x={dieX} y={dieY} width={dieW} height={dieH} rx={1.5} className="fill-signal" />
      {Array.from({ length: lines }, (_, i) => (
        <line
          key={i}
          x1={dieX + ((i + 1) * dieW) / (lines + 1)}
          x2={dieX + ((i + 1) * dieW) / (lines + 1)}
          y1={dieY + 3}
          y2={dieY + dieH - 3}
          className="stroke-ink/25"
          strokeWidth={1}
        />
      ))}
      {/* leads */}
      {[x + 24, x + 56, x + 88].map((lx) => (
        <g key={lx}>
          <rect x={lx - 2} y={158} width={12} height={12} rx={1} className="fill-white/45" />
          <rect x={lx} y={168} width={8} height={56} rx={1} className="fill-white/45" />
        </g>
      ))}
    </g>
  );
}

/** Two TO-247 transistors with the same marking; a cut-away shows a full-size die vs a much smaller one. */
export function XrayFigure({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 336 228" className={className} aria-hidden="true" focusable="false">
      <XrayPackage x={20} dieW={62} dieH={34} wire={2.25} />
      <XrayPackage x={196} dieW={18} dieH={13} wire={1} />
    </svg>
  );
}

/* --------------------------------------------------- checklist figures */
// viewBox 320 x 160: two drawings centred at x = 80 and x = 240.

function To247({ cx, children }: { cx: number; children?: ReactNode }) {
  return (
    <g>
      <rect x={cx - 40} y={12} width={80} height={96} rx={5} className="fill-ink" />
      <circle cx={cx} cy={31} r={8} className="fill-paper" />
      {[cx - 26, cx - 4, cx + 18].map((lx) => (
        <g key={lx}>
          <rect x={lx - 2} y={108} width={12} height={8} rx={1} className="fill-card stroke-ink-2" strokeWidth={1.25} />
          <rect x={lx} y={116} width={8} height={34} rx={1} className="fill-card stroke-ink-2" strokeWidth={1.25} />
        </g>
      ))}
      {children}
    </g>
  );
}

export function MarkingFigure({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 160" className={className} aria-hidden="true" focusable="false">
      <defs>
        <filter id="wg-smudge" x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur stdDeviation="0.9" />
        </filter>
      </defs>
      <To247 cx={80}>
        <text x={80} y={66} textAnchor="middle" className="fill-line-strong font-mono" fontSize={15} fontWeight={600} letterSpacing={1}>
          C5200
        </text>
        <text x={80} y={84} textAnchor="middle" className="fill-line-strong/80 font-mono" fontSize={10} letterSpacing={2}>
          YYWW
        </text>
      </To247>
      <To247 cx={240}>
        <g filter="url(#wg-smudge)">
          <text x={241.5} y={67} textAnchor="middle" className="fill-line-strong/50 font-mono" fontSize={15} fontWeight={600} letterSpacing={1}>
            C5200
          </text>
          <text x={240} y={66} textAnchor="middle" className="fill-line-strong font-mono" fontSize={15} fontWeight={600} letterSpacing={1}>
            C5<tspan dy={1.5}>2</tspan>
            <tspan dy={-1.5}>00</tspan>
          </text>
          <text x={238} y={85} textAnchor="middle" className="fill-line-strong/70 font-mono" fontSize={10} letterSpacing={2}>
            YYWW
          </text>
        </g>
      </To247>
    </svg>
  );
}

export function CodeFigure({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 160" className={className} aria-hidden="true" focusable="false">
      <To247 cx={80}>
        <text x={80} y={64} textAnchor="middle" className="fill-line-strong font-mono" fontSize={15} fontWeight={600} letterSpacing={1}>
          C5200
        </text>
        <text x={80} y={86} textAnchor="middle" className="fill-line-strong font-mono" fontSize={11} fontWeight={500} letterSpacing={2}>
          YYWW
        </text>
        <rect x={56} y={74} width={48} height={17} rx={3} className="fill-none stroke-signal" strokeWidth={1.5} />
      </To247>
      <To247 cx={240}>
        <text x={240} y={64} textAnchor="middle" className="fill-line-strong font-mono" fontSize={15} fontWeight={600} letterSpacing={1}>
          C5200
        </text>
        <rect x={216} y={74} width={48} height={17} rx={3} className="fill-none stroke-white/45" strokeWidth={1.25} strokeDasharray="3 3" />
        <text x={240} y={87} textAnchor="middle" className="fill-white/60 font-mono" fontSize={11} fontWeight={600}>
          ?
        </text>
      </To247>
    </svg>
  );
}

/** A generic maker emblem (deliberately not any real brand): ring + chevron. */
function Emblem({ cx, cy, distorted = false }: { cx: number; cy: number; distorted?: boolean }) {
  if (!distorted) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={17} className="fill-none stroke-line-strong" strokeWidth={3} />
        <path d={`M${cx - 8} ${cy + 6} L${cx} ${cy - 7} L${cx + 8} ${cy + 6}`} className="fill-none stroke-line-strong" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      </g>
    );
  }
  return (
    <g transform={`rotate(-7 ${cx} ${cy})`}>
      <ellipse cx={cx + 2} cy={cy + 1} rx={19} ry={14} className="fill-none stroke-line-strong/80" strokeWidth={4.5} />
      <path d={`M${cx - 6} ${cy + 7} L${cx + 3} ${cy - 4} L${cx + 11} ${cy + 7}`} className="fill-none stroke-line-strong/80" strokeWidth={2} strokeLinejoin="round" />
    </g>
  );
}

export function LogoFigure({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 160" className={className} aria-hidden="true" focusable="false">
      {[80, 240].map((cx) => (
        <g key={cx}>
          <rect x={cx - 64} y={14} width={128} height={132} rx={10} className="fill-ink" />
          <text x={cx} y={122} textAnchor="middle" className="fill-line-strong/80 font-mono" fontSize={13} fontWeight={600} letterSpacing={1}>
            C5200
          </text>
        </g>
      ))}
      <Emblem cx={80} cy={66} />
      <Emblem cx={243} cy={70} distorted />
      {/* magnifier ring cue */}
      <circle cx={80} cy={66} r={30} className="fill-none stroke-white/15" strokeWidth={1} strokeDasharray="2 3" />
      <circle cx={243} cy={70} r={30} className="fill-none stroke-white/15" strokeWidth={1} strokeDasharray="2 3" />
    </svg>
  );
}

function To220({ cx, worn = false }: { cx: number; worn?: boolean }) {
  return (
    <g>
      {/* metal tab with hole */}
      <rect x={cx - 30} y={10} width={60} height={36} rx={3} className="fill-line-strong stroke-ink-2" strokeWidth={1.25} />
      <circle cx={cx} cy={26} r={7} className="fill-paper stroke-ink-2" strokeWidth={1.25} />
      {/* epoxy body */}
      <rect x={cx - 30} y={42} width={60} height={52} rx={3} className="fill-ink" />
      {worn ? (
        <g>
          {/* sanded, re-coated face: a different texture that stops short of the edges */}
          <rect x={cx - 25} y={47} width={50} height={42} rx={1} className="fill-ink-2" />
          {Array.from({ length: 7 }, (_, i) => (
            <line key={i} x1={cx - 25 + i * 8} y1={89} x2={cx - 15 + i * 8} y2={47} className="stroke-white/20" strokeWidth={1} />
          ))}
          <rect x={cx - 16} y={60} width={32} height={4} rx={1} className="fill-line-strong/70" />
          <rect x={cx - 11} y={70} width={22} height={3} rx={1} className="fill-line-strong/50" />
        </g>
      ) : (
        <g>
          <rect x={cx - 16} y={60} width={32} height={4} rx={1} className="fill-line-strong" />
          <rect x={cx - 11} y={70} width={22} height={3} rx={1} className="fill-line-strong/80" />
        </g>
      )}
      {/* leads */}
      {worn ? (
        <g>
          <path d={`M${cx - 18} 94 L${cx - 18} 118 L${cx - 22} 150`} className="fill-none stroke-ink-2" strokeWidth={5} strokeLinecap="round" />
          <path d={`M${cx - 18} 94 L${cx - 18} 118 L${cx - 22} 150`} className="fill-none stroke-card" strokeWidth={2.5} strokeLinecap="round" />
          <rect x={cx - 3} y={94} width={6} height={56} rx={1} className="fill-card stroke-ink-2" strokeWidth={1.25} />
          <rect x={cx + 15} y={94} width={6} height={56} rx={1} className="fill-card stroke-ink-2" strokeWidth={1.25} />
          {/* old solder blobs and scratches */}
          <ellipse cx={cx} cy={128} rx={5.5} ry={4} className="fill-line-strong stroke-ink-2" strokeWidth={1} />
          <ellipse cx={cx + 18} cy={140} rx={5} ry={3.5} className="fill-line-strong stroke-ink-2" strokeWidth={1} />
          <line x1={cx - 2} y1={104} x2={cx + 2} y2={112} className="stroke-ink-2" strokeWidth={1} />
          <line x1={cx + 16} y1={108} x2={cx + 20} y2={116} className="stroke-ink-2" strokeWidth={1} />
        </g>
      ) : (
        [cx - 21, cx - 3, cx + 15].map((lx) => (
          <rect key={lx} x={lx} y={94} width={6} height={56} rx={1} className="fill-card stroke-ink-2" strokeWidth={1.25} />
        ))
      )}
    </g>
  );
}

export function PinsFigure({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 160" className={className} aria-hidden="true" focusable="false">
      <To220 cx={80} />
      <To220 cx={240} worn />
    </svg>
  );
}

function TinyPart({ x, y, rotate = 0 }: { x: number; y: number; rotate?: number }) {
  return (
    <g transform={`rotate(${rotate} ${x + 9} ${y + 8})`}>
      <rect x={x} y={y} width={18} height={12} rx={1.5} className="fill-ink" />
      {[x + 3, x + 8, x + 13].map((lx) => (
        <rect key={lx} x={lx} y={y + 12} width={2} height={7} className="fill-ink-2" />
      ))}
    </g>
  );
}

export function PackagingFigure({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 160" className={className} aria-hidden="true" focusable="false">
      {/* maker's tube with a printed label */}
      <rect x={12} y={70} width={136} height={34} rx={6} className="fill-card stroke-ink-2" strokeWidth={1.5} />
      <rect x={6} y={74} width={8} height={26} rx={2} className="fill-ink-2" />
      <rect x={146} y={74} width={8} height={26} rx={2} className="fill-ink-2" />
      {[24, 48, 72, 96, 120].map((px) => (
        <TinyPart key={px} x={px} y={76} />
      ))}
      <rect x={36} y={38} width={88} height={40} rx={3} className="fill-card stroke-ink-2" strokeWidth={1.25} />
      <rect x={36} y={38} width={88} height={10} rx={3} className="fill-signal" />
      <rect x={42} y={54} width={44} height={3} rx={1} className="fill-ink-2" />
      <rect x={42} y={61} width={64} height={3} rx={1} className="fill-line-strong" />
      <rect x={42} y={68} width={34} height={3} rx={1} className="fill-line-strong" />
      {/* barcode */}
      {[92, 95, 97, 101, 104, 106, 110, 113, 116].map((bx, i) => (
        <rect key={bx} x={bx} y={53} width={i % 3 === 0 ? 2 : 1} height={13} className="fill-ink" />
      ))}

      {/* plain zip bag with loose parts */}
      <path d="M190 34 H290 V136 a6 6 0 0 1 -6 6 H196 a6 6 0 0 1 -6 -6 Z" className="fill-card stroke-ink-2" strokeWidth={1.5} />
      <line x1={190} y1={48} x2={290} y2={48} className="stroke-ink-2" strokeWidth={1.25} strokeDasharray="5 3" />
      <TinyPart x={204} y={70} rotate={-18} />
      <TinyPart x={238} y={62} rotate={24} />
      <TinyPart x={222} y={100} rotate={8} />
      <TinyPart x={256} y={98} rotate={-30} />
    </svg>
  );
}

export function PriceFigure({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 160" className={className} aria-hidden="true" focusable="false">
      {/* tag */}
      <path d="M110 36 H236 a6 6 0 0 1 6 6 V118 a6 6 0 0 1 -6 6 H110 L84 80 Z" className="fill-card stroke-ink" strokeWidth={1.75} strokeLinejoin="round" />
      <circle cx={104} cy={80} r={6} className="fill-paper stroke-ink" strokeWidth={1.5} />
      {/* string through the hole */}
      <path d="M101 77 C 86 62, 70 48, 74 30 C 76 22, 84 18, 90 20" className="fill-none stroke-ink-2" strokeWidth={1.5} strokeLinecap="round" />
      <text x={170} y={98} textAnchor="middle" className="fill-ink" fontSize={50} fontWeight={800}>
        ₹
      </text>
      {/* down arrow next to the price */}
      <path d="M212 62 V96 M200 84 L212 96 L224 84" className="fill-none stroke-signal-ink" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      {/* question badge */}
      <circle cx={244} cy={40} r={17} className="fill-signal" />
      <text x={244} y={47} textAnchor="middle" className="fill-ink" fontSize={20} fontWeight={800}>
        ?
      </text>
    </svg>
  );
}
