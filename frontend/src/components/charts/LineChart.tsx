import { CHART_BASELINE, CHART_GRID, CHART_MUTED, CHART_TEXT } from "./chartColors";
import "./charts.css";

interface LineChartProps {
  data: { label: string; value: number }[];
  color?: string;
  valueFormatter?: (value: number) => string;
  referenceValue?: number;
  referenceLabel?: string;
  maxXLabels?: number;
}

const defaultFormatter = (v: number) => v.toLocaleString("es-AR");

export default function LineChart({
  data,
  color = "var(--chart-series-1)",
  valueFormatter = defaultFormatter,
  referenceValue,
  referenceLabel,
  maxXLabels = 6,
}: LineChartProps) {
  if (data.length === 0) return null;

  const width = 600;
  const height = 260;
  const marginTop = 20;
  const marginBottom = 28;
  const marginX = 12;
  const plotWidth = width - marginX * 2;
  const plotHeight = height - marginTop - marginBottom;

  const values = data.map((d) => d.value);
  let yMin = Math.min(...values, referenceValue ?? Infinity);
  let yMax = Math.max(...values, referenceValue ?? -Infinity);
  const range = yMax - yMin || Math.abs(yMax) || 1;
  yMin -= range * 0.1;
  yMax += range * 0.1;

  function yFor(value: number): number {
    return marginTop + plotHeight - ((value - yMin) / (yMax - yMin)) * plotHeight;
  }

  const stepX = data.length > 1 ? plotWidth / (data.length - 1) : 0;
  const points = data.map((d, i) => ({
    x: marginX + i * stepX,
    y: yFor(d.value),
    ...d,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const labelStep = Math.max(1, Math.ceil(data.length / maxXLabels));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label="Gráfico de línea">
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
        <line
          key={frac}
          x1={marginX}
          x2={width - marginX}
          y1={marginTop + plotHeight * frac}
          y2={marginTop + plotHeight * frac}
          stroke={CHART_GRID}
          strokeWidth={1}
        />
      ))}

      {referenceValue !== undefined && (
        <>
          <line
            x1={marginX}
            x2={width - marginX}
            y1={yFor(referenceValue)}
            y2={yFor(referenceValue)}
            stroke={CHART_BASELINE}
            strokeWidth={1}
            strokeDasharray="4 3"
          />
          <text x={width - marginX} y={yFor(referenceValue) - 4} textAnchor="end" fontSize={10} fill={CHART_MUTED}>
            {referenceLabel ?? "Promedio"}: {valueFormatter(referenceValue)}
          </text>
        </>
      )}

      <path d={pathD} fill="none" stroke={color} strokeWidth={2} />

      {points.map((p, i) => (
        <g key={i}>
          <circle className="chart-bar" cx={p.x} cy={p.y} r={4} fill={color}>
            <title>
              {p.label}: {valueFormatter(p.value)}
            </title>
          </circle>
          {(i % labelStep === 0 || i === data.length - 1) && (
            <text
              x={p.x}
              y={height - marginBottom + 16}
              textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
              fontSize={10}
              fill={CHART_MUTED}
            >
              {p.label}
            </text>
          )}
        </g>
      ))}
      <text x={marginX} y={marginTop - 6} fontSize={10} fill={CHART_TEXT}>
        {valueFormatter(yMax)}
      </text>
    </svg>
  );
}
