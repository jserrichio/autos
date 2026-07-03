import { CHART_BASELINE, CHART_GRID, CHART_MUTED, CHART_TEXT } from "./chartColors";
import { roundedRightRectPath, roundedTopRectPath } from "./svgPaths";
import "./charts.css";

interface BarChartProps {
  data: { label: string; value: number }[];
  orientation?: "vertical" | "horizontal";
  color?: string;
  valueFormatter?: (value: number) => string;
}

const defaultFormatter = (v: number) => v.toLocaleString("es-AR");

export default function BarChart({
  data,
  orientation = "vertical",
  color = "var(--chart-series-1)",
  valueFormatter = defaultFormatter,
}: BarChartProps) {
  if (data.length === 0) return null;
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  if (orientation === "horizontal") {
    const rowHeight = 36;
    const labelColWidth = 200;
    const valueColWidth = 70;
    const width = 600;
    const plotWidth = width - labelColWidth - valueColWidth;
    const height = data.length * rowHeight + 8;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label="Gráfico de barras horizontales">
        <line
          x1={labelColWidth}
          y1={4}
          x2={labelColWidth}
          y2={height - 4}
          stroke={CHART_BASELINE}
          strokeWidth={1}
        />
        {data.map((d, i) => {
          const y = i * rowHeight + 4;
          const barHeight = rowHeight * 0.55;
          const barY = y + (rowHeight - barHeight) / 2;
          const barWidth = (d.value / maxValue) * plotWidth;
          return (
            <g key={d.label}>
              <text
                x={labelColWidth - 10}
                y={y + rowHeight / 2}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={11}
                fill={CHART_TEXT}
              >
                {d.label}
              </text>
              <path
                className="chart-bar"
                d={roundedRightRectPath(labelColWidth, barY, barWidth, barHeight, 4)}
                fill={color}
              >
                <title>
                  {d.label}: {valueFormatter(d.value)}
                </title>
              </path>
              <text
                x={labelColWidth + barWidth + 8}
                y={y + rowHeight / 2}
                dominantBaseline="middle"
                fontSize={11}
                fill={CHART_TEXT}
              >
                {valueFormatter(d.value)}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  // vertical
  const width = 600;
  const height = 260;
  const marginTop = 24;
  const marginBottom = 28;
  const marginX = 8;
  const plotWidth = width - marginX * 2;
  const plotHeight = height - marginTop - marginBottom;
  const baselineY = height - marginBottom;
  const slotWidth = plotWidth / data.length;
  const barWidth = slotWidth * 0.55;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label="Gráfico de barras">
      {[0.25, 0.5, 0.75, 1].map((frac) => (
        <line
          key={frac}
          x1={marginX}
          x2={width - marginX}
          y1={baselineY - plotHeight * frac}
          y2={baselineY - plotHeight * frac}
          stroke={CHART_GRID}
          strokeWidth={1}
        />
      ))}
      <line x1={marginX} x2={width - marginX} y1={baselineY} y2={baselineY} stroke={CHART_BASELINE} strokeWidth={1} />
      {data.map((d, i) => {
        const barHeight = (d.value / maxValue) * plotHeight;
        const x = marginX + i * slotWidth + (slotWidth - barWidth) / 2;
        const y = baselineY - barHeight;
        return (
          <g key={d.label}>
            <path className="chart-bar" d={roundedTopRectPath(x, y, barWidth, barHeight, 4)} fill={color}>
              <title>
                {d.label}: {valueFormatter(d.value)}
              </title>
            </path>
            <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize={11} fill={CHART_TEXT}>
              {valueFormatter(d.value)}
            </text>
            <text x={x + barWidth / 2} y={baselineY + 16} textAnchor="middle" fontSize={11} fill={CHART_MUTED}>
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
