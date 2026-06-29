import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api';
import { relativeTime } from '../lib/aqi';
import type { CityComparison } from '../lib/types';
import { ErrorState, LoadingState, PageHeader, Panel } from '../components/Ui';

export default function ComparePage() {
  const cities = useQuery({ queryKey: ['cities'], queryFn: api.cities });
  const [selected, setSelected] = useState(['delhi', 'mumbai', 'bengaluru']);
  const query = useQuery({ queryKey: ['city-compare', selected], queryFn: () => api.compareCities(selected, 7), enabled: selected.length >= 2 });
  const chartRows = useMemo(() => {
    const byDate = new Map<string, Record<string, string | number>>();
    for (const item of query.data ?? []) {
      for (const reading of item.readings) {
        const key = new Date(reading.observedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        byDate.set(key, { ...(byDate.get(key) ?? { day: key }), [item.city.name]: reading.aqi });
      }
    }
    return [...byDate.values()].slice(-28);
  }, [query.data]);
  const colors = ['#54d8ff', '#ffb84d', '#47e6a5'];
  const toggleCity = (cityId: string) => {
    setSelected((current) => current.includes(cityId) ? current.filter((id) => id !== cityId) : [...current, cityId].slice(-3));
  };

  return <div className="page">
    <PageHeader eyebrow="CITY COMPARISON" title="Compare Cities" description="Benchmark AQI movement and current pollution context across two or three monitored cities." />
    <Panel title="Select cities" subtitle="Choose up to three cities for a seven-day AQI comparison">
      <div className="compare-picker">{cities.data?.map((city) => <label key={city.id}><input type="checkbox" checked={selected.includes(city.id)} onChange={() => toggleCity(city.id)} />{city.name}</label>)}</div>
    </Panel>
    <Panel title="7-day AQI trend" subtitle="One line per selected city">
      {query.isLoading ? <LoadingState /> : query.error ? <ErrorState message={query.error.message} /> : <div className="chart"><CityCompareChart data={chartRows} series={(query.data ?? []).map((item) => item.city.name)} colors={colors} /></div>}
    </Panel>
    <Panel title="Current comparison" subtitle="Latest city status and dominant pollutant">
      <div className="table-wrap compare-table"><table><thead><tr><th>City</th><th>Current AQI</th><th>Dominant pollutant</th><th>Trend</th><th>Last reading</th></tr></thead><tbody>{(query.data ?? []).map((item: CityComparison) => <tr key={item.city.id}><td><strong>{item.city.name}</strong></td><td>{item.city.aqi}</td><td>{item.dominantPollutant}</td><td>{item.trend === 'up' ? 'Up' : item.trend === 'down' ? 'Down' : 'Stable'}</td><td>{item.lastReadingTime ? relativeTime(item.lastReadingTime) : 'No reading'}</td></tr>)}</tbody></table></div>
    </Panel>
  </div>;
}

function CityCompareChart({ data, series, colors }: { data: Array<Record<string, string | number>>; series: string[]; colors: string[] }) {
  return <ResponsiveContainer width="100%" height="100%" minHeight={220}>
    <LineChart data={data} margin={{ top: 12, right: 18, bottom: 0, left: -16 }}>
      <CartesianGrid stroke="#20303c" strokeDasharray="2 4" vertical={false} />
      <XAxis dataKey="day" stroke="#6e8492" axisLine={false} tickLine={false} fontSize={10} />
      <YAxis stroke="#6e8492" axisLine={false} tickLine={false} fontSize={10} />
      <Tooltip contentStyle={{ background: '#101820', border: '1px solid #2a3946', borderRadius: 6, color: '#e7f1f5' }} />
      {series.map((name, index) => <Line key={name} type="monotone" dataKey={name} stroke={colors[index]} strokeWidth={2} dot={false} />)}
    </LineChart>
  </ResponsiveContainer>;
}
