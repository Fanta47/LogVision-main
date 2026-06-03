"use client";
<<<<<<< HEAD
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, LineChart, Line } from "recharts";
=======
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, LineChart, Line, Legend } from "recharts";
>>>>>>> 494bacd (Save workspace snapshot)
const trend = [
  { t: "00:00", anomalies: 4, logs: 1200 }, { t: "04:00", anomalies: 7, logs: 1550 }, { t: "08:00", anomalies: 18, logs: 3200 }, { t: "12:00", anomalies: 12, logs: 2800 }, { t: "16:00", anomalies: 31, logs: 4100 }, { t: "20:00", anomalies: 14, logs: 2600 },
];
const health = [
  { t: "Mon", score: 96 }, { t: "Tue", score: 94 }, { t: "Wed", score: 91 }, { t: "Thu", score: 95 }, { t: "Fri", score: 88 }, { t: "Sat", score: 93 }, { t: "Sun", score: 94 },
];
<<<<<<< HEAD
export function AnomalyTrendChart() { return <div className="glass-card rounded-lg p-5"><h2 className="mb-4 text-sm font-semibold">Anomalies over time</h2><div className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend}><CartesianGrid strokeDasharray="3 3" opacity={0.15}/><XAxis dataKey="t" tick={{ fill: "#94a3b8", fontSize: 11 }}/><YAxis tick={{ fill: "#94a3b8", fontSize: 11 }}/><Tooltip contentStyle={{ background: "#151923", border: "1px solid rgba(255,255,255,.08)", color: "white" }}/><Area type="monotone" dataKey="anomalies" stroke="currentColor" fill="currentColor" fillOpacity={0.15}/></AreaChart></ResponsiveContainer></div></div>; }
export function SystemHealthChart() { return <div className="glass-card rounded-lg p-5"><h2 className="mb-4 text-sm font-semibold">System health</h2><div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={health}><CartesianGrid strokeDasharray="3 3" opacity={0.15}/><XAxis dataKey="t" tick={{ fill: "#94a3b8", fontSize: 11 }}/><YAxis domain={[80,100]} tick={{ fill: "#94a3b8", fontSize: 11 }}/><Tooltip contentStyle={{ background: "#151923", border: "1px solid rgba(255,255,255,.08)", color: "white" }}/><Line type="monotone" dataKey="score" stroke="currentColor" strokeWidth={2}/></LineChart></ResponsiveContainer></div></div>; }
=======
const perfCorrelation = [
  { t: "01/05", errors: 12, cpu: 45, ram: 60 },
  { t: "02/05", errors: 18, cpu: 48, ram: 62 },
  { t: "03/05", errors: 45, cpu: 82, ram: 75 },
  { t: "04/05", errors: 30, cpu: 60, ram: 68 },
  { t: "05/05", errors: 20, cpu: 55, ram: 65 },
  { t: "06/05", errors: 25, cpu: 58, ram: 66 },
  { t: "07/05", errors: 85, cpu: 91, ram: 88 },
  { t: "08/05", errors: 50, cpu: 75, ram: 80 },
  { t: "09/05", errors: 30, cpu: 48, ram: 70 },
  { t: "10/05", errors: 22, cpu: 44, ram: 65 },
  { t: "11/05", errors: 15, cpu: 42, ram: 62 },
  { t: "12/05", errors: 12, cpu: 40, ram: 60 },
  { t: "13/05", errors: 10, cpu: 38, ram: 58 },
  { t: "14/05", errors: 8, cpu: 35, ram: 55 },
];

export function AnomalyTrendChart() { return <div className="glass-card rounded-lg p-5"><h2 className="mb-4 text-sm font-semibold">Anomalies over time</h2><div className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend}><CartesianGrid strokeDasharray="3 3" opacity={0.15}/><XAxis dataKey="t" tick={{ fill: "#94a3b8", fontSize: 11 }}/><YAxis tick={{ fill: "#94a3b8", fontSize: 11 }}/><Tooltip contentStyle={{ background: "#151923", border: "1px solid rgba(255,255,255,.08)", color: "white" }}/><Area type="monotone" dataKey="anomalies" stroke="currentColor" fill="currentColor" fillOpacity={0.15}/></AreaChart></ResponsiveContainer></div></div>; }
export function SystemHealthChart() { return <div className="glass-card rounded-lg p-5"><h2 className="mb-4 text-sm font-semibold">System health</h2><div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={health}><CartesianGrid strokeDasharray="3 3" opacity={0.15}/><XAxis dataKey="t" tick={{ fill: "#94a3b8", fontSize: 11 }}/><YAxis domain={[80,100]} tick={{ fill: "#94a3b8", fontSize: 11 }}/><Tooltip contentStyle={{ background: "#151923", border: "1px solid rgba(255,255,255,.08)", color: "white" }}/><Line type="monotone" dataKey="score" stroke="currentColor" strokeWidth={2}/></LineChart></ResponsiveContainer></div></div>; }

export function PerformanceCorrelationChart({ days = 14 }: { days?: number }) {
  const data = days === 7 ? perfCorrelation.slice(-7) : perfCorrelation;
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="t" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 9 }} dy={10} interval={days === 7 ? 0 : 1} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} />
          <Tooltip contentStyle={{ backgroundColor: "rgba(11, 18, 32, 0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", backdropFilter: "blur(8px)" }} />
          <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
          <Line name="Errors" type="monotone" dataKey="errors" stroke="#ef4444" strokeWidth={3} dot={false} animationDuration={400} isAnimationActive={true} />
          <Line name="CPU %" type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={2} dot={false} animationDuration={400} isAnimationActive={true} />
          <Line name="RAM %" type="monotone" dataKey="ram" stroke="#10b981" strokeWidth={2} dot={false} animationDuration={400} isAnimationActive={true} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
>>>>>>> 494bacd (Save workspace snapshot)
