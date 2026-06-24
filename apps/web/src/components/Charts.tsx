import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Attribution, City, ForecastPoint } from '../lib/types';

const tooltipStyle = { background: '#101820', border: '1px solid #2a3946', borderRadius: 6, color: '#e7f1f5', fontFamily: 'JetBrains Mono', fontSize: 12 };

export function ForecastChart({ data }: { data: ForecastPoint[] }) {
  const chartData = data.map((item) => ({ horizon: item.horizonHours === 0 ? 'NOW' : `+${item.horizonHours}H`, aqi: item.predictedAqi, low: item.lowerBound, high: item.upperBound }));
  return <div className="chart" aria-label="AQI forecast chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}><defs><linearGradient id="aqiFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#54d8ff" stopOpacity={0.38} /><stop offset="1" stopColor="#54d8ff" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#20303c" strokeDasharray="2 4" vertical={false} /><XAxis dataKey="horizon" stroke="#6e8492" tickLine={false} axisLine={false} fontSize={10} /><YAxis stroke="#6e8492" tickLine={false} axisLine={false} fontSize={10} /><Tooltip contentStyle={tooltipStyle} /><Area type="monotone" dataKey="aqi" stroke="#54d8ff" strokeWidth={2} fill="url(#aqiFill)" activeDot={{ r: 5, fill: '#0a0f14', stroke: '#54d8ff', strokeWidth: 2 }} /></AreaChart></ResponsiveContainer></div>;
}

export function ConfidenceChart({ data }: { data: ForecastPoint[] }) {
  const chartData = data.map((item) => ({ horizon: `${item.horizonHours}H`, confidence: Math.round(item.confidence * 100) }));
  return <div className="chart chart-short"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid stroke="#20303c" strokeDasharray="2 4" vertical={false} /><XAxis dataKey="horizon" stroke="#6e8492" axisLine={false} tickLine={false} fontSize={10} /><YAxis domain={[0, 100]} hide /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="confidence" radius={[3, 3, 0, 0]} fill="#47e6a5" /></BarChart></ResponsiveContainer></div>;
}

export function AttributionBars({ attribution }: { attribution: Attribution }) {
  const colors = ['#ff6d6d', '#ffb84d', '#54d8ff', '#778b98'];
  return <div className="attribution-bars">{attribution.sources.map((source, index) => <div className="source-row" key={source.source}><div className="source-meta"><span><i style={{ background: colors[index] }} />{source.source}</span><strong>{source.contribution}%</strong></div><div className="source-track"><span style={{ width: `${source.contribution}%`, background: colors[index] }} /></div><small>{source.direction}</small></div>)}</div>;
}

export function CityTrendChart({ cities }: { cities: City[] }) {
  const chartData = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day, dayIndex) => ({ day, ...Object.fromEntries(cities.slice(0, 4).map((city, cityIndex) => [city.name, Math.max(35, city.aqi + Math.sin(dayIndex * 0.9 + cityIndex) * (22 + cityIndex * 5))])) }));
  const colors = ['#ff6d6d', '#ffb84d', '#54d8ff', '#47e6a5'];
  return <div className="chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -18 }}><CartesianGrid stroke="#20303c" strokeDasharray="2 4" vertical={false} /><XAxis dataKey="day" stroke="#6e8492" axisLine={false} tickLine={false} fontSize={10} /><YAxis stroke="#6e8492" axisLine={false} tickLine={false} fontSize={10} /><Tooltip contentStyle={tooltipStyle} />{cities.slice(0, 4).map((city, index) => <Line key={city.id} dataKey={city.name} type="monotone" stroke={colors[index]} dot={false} strokeWidth={2} />)}</LineChart></ResponsiveContainer></div>;
}

export function ContributionComparison({ cities }: { cities: City[] }) {
  const data = cities.slice(0, 5).map((city, index) => ({ name: city.name, traffic: 35 + index * 4, dust: 32 - index * 2, industry: 18 + (index % 2) * 8, other: 15 - index * 2 }));
  return <div className="chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout="vertical" margin={{ left: 22, right: 10 }}><CartesianGrid stroke="#20303c" strokeDasharray="2 4" horizontal={false} /><XAxis type="number" hide /><YAxis dataKey="name" type="category" stroke="#8ca0ad" axisLine={false} tickLine={false} fontSize={10} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="traffic" stackId="a" fill="#ff6d6d" /><Bar dataKey="dust" stackId="a" fill="#ffb84d" /><Bar dataKey="industry" stackId="a" fill="#54d8ff" /><Bar dataKey="other" stackId="a" fill="#778b98" /></BarChart></ResponsiveContainer></div>;
}
