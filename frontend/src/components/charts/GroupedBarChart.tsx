import { CHART_BASELINE, CHART_GRID, CHART_MUTED, CHART_SERIES_1, CHART_SERIES_2 } from "./chartColors";
import { roundedTopRectPath } from "./svgPaths";
import "./charts.css";

interface GroupedBarChartProps {
  data: { label: string; series1: number; series2: number }[];
  series1Label: string;
  series2Label: string;
  valueFormatter?: (value: number) => string;
}

const defaultFormatter = (v: number) => v.toLocaleString("es-AR");

export default function GroupedBarChart({
  data,
  series1Label,
  series2Label,
  valueFormatter = defaultFormatter,
}: GroupedBarChartProps) {
  if (data.length === 0) return null;
  const maxValue = Math.max(...data.map((d) => Math.max(d.series1, d.series2)), 1);

  const width = 600;
  const height = 260;
  const marginTop = 24;
  const marginBottom = 28;
  const marginX = 8;
  const plotWidth = width - marginX * 2;
  const plotHeight = height - marginTop - marginBottom;
  const baselineY = height - marginBottom;
  const slotWidth = plotWidth / data.length;
  const groupWidth = slotWidth * 0.6;
  const barWidth = (groupWidth - 4) / 2;

  return (
    <div>
      <div className="chart-legend">
        <span className="chart-legend-item">
          <span className="chart-legend-swatch" style={{ background: CHART_SERIES_1 }} />
          {series1Label}
        </span>
        <span className="chart-legend-item">
          <span className="chart-legend-swatch" style={{ background: CHART_SERIES_2 }} />
          {series2Label}
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label="Gráfico de barras agrupadas">
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
        <line
          x1={marginX}
          x2={width - marginX}
          y1={baselineY}
          y2={baselineY}
          stroke={CHART_BASELINE}
          strokeWidth={1}
        />
        {data.map((d, i) => {
          const groupX = marginX + i * slotWidth + (slotWidth - groupWidth) / 2;
          const h1 = (d.series1 / maxValue) * plotHeight;
          const h2 = (d.series2 / maxValue) * plotHeight;
          return (
            <g key={d.label}>
              <path
                className="chart-bar"
                d={roundedTopRectPath(groupX, baselineY - h1, barWidth, h1, 3)}
                fill={CHART_SERIES_1}
              >
                <title>
                  {d.label} · {series1Label}: {valueFormatter(d.series1)}
                </title>
              </path>
              <path
                className="chart-bar"
                d={roundedTopRectPath(groupX + barWidth + 4, baselineY - h2, barWidth, h2, 3)}
                fill={CHART_SERIES_2}
              >
                <title>
                  {d.label} · {series2Label}: {valueFormatter(d.series2)}
                </title>
              </path>
              <text x={groupX + groupWidth / 2} y={baselineY + 16} textAnchor="middle" fontSize={11} fill={CHART_MUTED}>
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
