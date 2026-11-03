interface RadarAxis {
  label: string;
  value: number;
}

// Convert a hex color to an rgba string with the given alpha
function hexToRgba(hex: string, alpha: number): string | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const int = parseInt(m[1], 16);
  return `rgba(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}, ${alpha})`;
}

export default function RadarChart({
  axes,
  size = 280,
  fillColor = 'rgba(20, 184, 166, 0.2)',
  strokeColor = '#0d9488',
  dotColor = '#0f766e',
}: {
  axes: RadarAxis[];
  size?: number;
  fillColor?: string;
  strokeColor?: string;
  dotColor?: string;
}) {
  const center = size / 2;
  const radius = center * 0.62;
  const n = axes.length;
  if (n === 0) return null;

  const angleFor = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const point = (i: number, r: number): [number, number] => {
    const a = angleFor(i);
    return [center + r * Math.cos(a), center + r * Math.sin(a)];
  };

  const dataPoints = axes
    .map((ax, i) => point(i, (radius * Math.min(Math.max(ax.value, 0), 100)) / 100))
    .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ');

  // Format short label for display
  const formatLabel = (lbl: string) => {
    if (lbl.includes('Technical Skills')) return 'Technical';
    if (lbl.includes('Communication')) return 'Komunikasi';
    if (lbl.includes('Problem Solving')) return 'Problem Solving';
    if (lbl.includes('Cultural Fit')) return 'Cultural Fit';
    if (lbl.includes('Overall Impression')) return 'Overall Fit';
    return lbl.length > 16 ? `${lbl.slice(0, 15)}…` : lbl;
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        style={{ width: '100%', height: 'auto', maxWidth: size }}
        role="img"
        aria-label="Grafik radar penilaian kompetensi"
        className="overflow-visible"
      >
        {/* Ambient background circle — solid tint derived from the chart's own brand color (no gradient) */}
        <circle cx={center} cy={center} r={radius} fill={hexToRgba(strokeColor, 0.08) ?? 'rgba(100, 116, 139, 0.06)'} />

        {/* Concentric grid rings */}
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <polygon
              points={axes.map((_, i) => point(i, radius * f).join(',')).join(' ')}
              fill={f === 1 ? 'rgba(248, 250, 252, 0.5)' : 'none'}
              stroke={f === 1 ? '#cbd5e1' : '#e2e8f0'}
              strokeWidth={f === 1 ? '1.5' : '1'}
              strokeDasharray={f < 1 ? '3 3' : undefined}
            />
            {/* Percentage badge along top axis */}
            <text
              x={center}
              y={center - radius * f - 3}
              textAnchor="middle"
              fontSize="8"
              fontWeight={600}
              fill="#94a3b8"
            >
              {Math.round(f * 100)}%
            </text>
          </g>
        ))}

        {/* Radial spokes */}
        {axes.map((_, i) => {
          const [x1, y1] = point(i, 0);
          const [x2, y2] = point(i, radius);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#e2e8f0" strokeWidth="1" />;
        })}

        {/* Data polygon */}
        <polygon
          points={dataPoints}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinejoin="round"
          className="transition-all duration-500"
        />

        {/* Data vertices with pulse */}
        {axes.map((ax, i) => {
          const [x, y] = point(i, (Math.min(Math.max(ax.value, 0), 100) / 100) * radius);
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="5" fill="white" stroke={strokeColor} strokeWidth="2.5" />
              <circle cx={x} cy={y} r="2.5" fill={dotColor} />
            </g>
          );
        })}

        {/* Axis labels & score badges */}
        {axes.map((ax, i) => {
          const [x, y] = point(i, radius + 24);
          const val = Math.round(ax.value);
          return (
            <g key={i}>
              <text
                x={x}
                y={y - 5}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="10"
                fontWeight={700}
                fill="#334155"
              >
                {formatLabel(ax.label)}
              </text>
              <text
                x={x}
                y={y + 8}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="9"
                fontWeight={800}
                fill={val >= 75 ? strokeColor : val >= 60 ? '#f59e0b' : '#ef4444'}
              >
                {val}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
