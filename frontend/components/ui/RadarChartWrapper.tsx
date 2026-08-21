"use client";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface RadarChartWrapperProps {
  data: any[];
  d1Name: string;
  d2Name: string;
}

export default function RadarChartWrapper({ data, d1Name, d2Name }: RadarChartWrapperProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
        <PolarGrid stroke="rgba(255,255,255,0.1)" />
        <PolarAngleAxis dataKey="metric" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "bold" }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
        <Tooltip
          contentStyle={{ backgroundColor: "rgba(0,0,0,0.8)", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px" }}
          itemStyle={{ fontWeight: "bold" }}
        />
        <Legend />
        <Radar
          name={d1Name}
          dataKey="p1"
          stroke="#34d399"
          fill="#34d399"
          fillOpacity={0.4}
        />
        <Radar
          name={d2Name}
          dataKey="p2"
          stroke="#fb923c"
          fill="#fb923c"
          fillOpacity={0.4}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
