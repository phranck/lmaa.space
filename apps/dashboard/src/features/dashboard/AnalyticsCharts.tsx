import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ChartThemeProps {
  gridColor: string;
  tickColor: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipColor: string;
}

interface RealtimeBarsChartProps {
  data: { time: string; visitors: number; pageviews: number }[];
  maxValue: number;
  ticks: number[];
  theme: ChartThemeProps;
  cursorColor: string;
  visitorsLabel: string;
  pageviewsLabel: string;
  formatNumber: (value: number) => string;
}

export function RealtimeBarsChart({
  data,
  maxValue,
  ticks,
  theme,
  cursorColor,
  visitorsLabel,
  pageviewsLabel,
  formatNumber,
}: RealtimeBarsChartProps) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barSize={5}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.gridColor} vertical={true} />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 10, fill: theme.tickColor }}
          axisLine={false}
          tickLine={false}
          interval={1}
        />
        <YAxis
          tick={{ fontSize: 10, fill: theme.tickColor }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          domain={[0, maxValue]}
          ticks={ticks}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: `1px solid ${theme.tooltipBorder}`,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            background: theme.tooltipBg,
            color: theme.tooltipColor,
          }}
          formatter={(value, name) => [
            formatNumber(Number(value)),
            name === "visitors" ? visitorsLabel : pageviewsLabel,
          ]}
          cursor={{ fill: cursorColor }}
        />
        <Bar dataKey="visitors" fill="#f59e0b" radius={[2, 2, 0, 0]} />
        <Bar dataKey="pageviews" fill="#a8a29e" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface TrafficAreaChartProps {
  data: { label: string; visitors: number; pageviews: number }[];
  maxValue: number;
  ticks: number[];
  theme: ChartThemeProps;
  visitorsLabel: string;
  pageviewsLabel: string;
  formatNumber: (value: number) => string;
}

export function TrafficAreaChart({
  data,
  maxValue,
  ticks,
  theme,
  visitorsLabel,
  pageviewsLabel,
  formatNumber,
}: TrafficAreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="gradPageviews" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#a8a29e" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#a8a29e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradVisitors" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.gridColor} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: theme.tickColor }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: theme.tickColor }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          domain={[0, maxValue]}
          ticks={ticks}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: `1px solid ${theme.tooltipBorder}`,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            background: theme.tooltipBg,
            color: theme.tooltipColor,
          }}
          formatter={(value, name) => [
            formatNumber(Number(value)),
            name === "visitors" ? visitorsLabel : pageviewsLabel,
          ]}
        />
        <Area
          type="monotone"
          dataKey="pageviews"
          stroke="#a8a29e"
          strokeWidth={2}
          fill="url(#gradPageviews)"
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="visitors"
          stroke="#f59e0b"
          strokeWidth={2}
          fill="url(#gradVisitors)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
