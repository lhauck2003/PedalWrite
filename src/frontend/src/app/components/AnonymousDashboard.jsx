import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, Cell, ScatterChart, Scatter, ZAxis, ReferenceLine
} from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────

const LEVEL_COLORS = {
  1: "#6EE7B7",
  2: "#34D399",
  3: "#059669",
};

const PALETTE = {
  bg: "#0f1117",
  surface: "#181c24",
  border: "#252a36",
  accent: "#34D399",
  accentDim: "#1a3d30",
  text: "#e8f0ec",
  muted: "#6b7a72",
  l1: "#6EE7B7",
  l2: "#10B981",
  l3: "#065F46",
  avg: "#f0a500",
  total: "#60a5fa",
};

// ─── Points logic ─────────────────────────────────────────────────────────────

function buildPointsSystem(skills) {
  // skills: [{id, skillname, formlevel, category}]
  const skillsByLevel = {};
  for (const s of skills) {
    if (!skillsByLevel[s.formlevel]) skillsByLevel[s.formlevel] = [];
    skillsByLevel[s.formlevel].push(s);
  }
  // Max points per form level = count_of_skills_at_that_level * 4
  const maxAtLevel = {};
  for (const [lvl, arr] of Object.entries(skillsByLevel)) {
    maxAtLevel[Number(lvl)] = arr.length * 4;
  }
  // Lump for a given form level = sum of maxAtLevel for all lower levels
  const lumpForLevel = (formLevel) => {
    let lump = 0;
    for (let l = 1; l < formLevel; l++) {
      lump += maxAtLevel[l] ?? 0;
    }
    return lump;
  };
  return { maxAtLevel, lumpForLevel };
}

function computeFormPoints(form, skillLookup, lumpForLevel) {
  // form: {id, date, level, skill_ids[]}
  // skillLookup: Map<id, {level}>
  const rawPoints = (form.skill_ids || []).reduce((sum, sid) => {
    const sk = skillLookup.get(sid);
    return sum + (sk ? sk.level : 0);
  }, 0);
  return rawPoints + lumpForLevel(form.level);
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: PALETTE.surface, border: `1px solid ${PALETTE.border}`,
      borderRadius: 10, padding: "10px 14px", fontSize: 12, color: PALETTE.text,
    }}>
      {label && <p style={{ color: PALETTE.muted, marginBottom: 6, fontWeight: 600 }}>{label}</p>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, display: "inline-block" }} />
          <span style={{ color: PALETTE.muted }}>{p.name}:</span>
          <span style={{ fontWeight: 700 }}>{formatter ? formatter(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, subtitle, children }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ color: PALETTE.text, fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h2>
        {subtitle && <p style={{ color: PALETTE.muted, fontSize: 12, margin: "4px 0 0" }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: PALETTE.surface, border: `1px solid ${PALETTE.border}`,
      borderRadius: 14, padding: "20px 20px 16px", ...style,
    }}>
      {children}
    </div>
  );
}

function StatPill({ label, value, color }) {
  return (
    <div style={{
      background: PALETTE.surface, border: `1px solid ${PALETTE.border}`,
      borderRadius: 12, padding: "16px 20px", flex: 1, minWidth: 120,
    }}>
      <p style={{ color: color || PALETTE.accent, fontSize: 28, fontWeight: 800, margin: 0, lineHeight: 1 }}>{value}</p>
      <p style={{ color: PALETTE.muted, fontSize: 11, margin: "6px 0 0", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</p>
    </div>
  );
}

// ─── Axis tick styles ─────────────────────────────────────────────────────────

const tickStyle = { fill: PALETTE.muted, fontSize: 11 };

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function AnonymousDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/data/view/", {
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ─── Data processing ────────────────────────────────────────────────────────

  const computed = useMemo(() => {
    if (!data) return null;

    const skills = data.skill?.content ?? [];
    const dailyForms = data.dailyform?.content ?? [];
    const finalForms = data.finalform?.content ?? [];
    const dailyFormSkills = data.dailyformskill?.content ?? [];
    const finalFormSkills = data.finalformskill?.content ?? [];

    const { lumpForLevel, maxAtLevel } = buildPointsSystem(skills);

    // Build skill lookup maps: id -> {level}
    const dailySkillMap = new Map(dailyFormSkills.map(s => [s.id, s]));
    const finalSkillMap = new Map(finalFormSkills.map(s => [s.id, s]));

    // Combine all forms (daily + final) with points
    // rider_token is a salted SHA-256 hash of the real rider UUID — safe to use for grouping
    const allForms = [
      ...dailyForms.map((f) => ({
        ...f,
        formType: "daily",
        riderToken: f.rider_token ?? null,
        points: computeFormPoints(f, dailySkillMap, lumpForLevel),
      })),
      ...finalForms.map((f) => ({
        ...f,
        formType: "final",
        riderToken: f.rider_token ?? null,
        points: computeFormPoints(f, finalSkillMap, lumpForLevel),
      })),
    ];

    // Compute absolute max possible points (for %)
    const absoluteMax = Object.entries(maxAtLevel).reduce((sum, [, v]) => sum + v, 0);

    const totalEarned = allForms.reduce((s, f) => s + f.points, 0);
    const overallAvg = allForms.length ? Math.round((totalEarned / allForms.length) * 10) / 10 : 0;
    const overallMax = allForms.reduce((s, f) => s + (maxAtLevel[f.level] ?? 0) + lumpForLevel(f.level), 0);
    const prcnt = absoluteMax > 0 ? Math.round((overallAvg / absoluteMax) * 100) : 0;

    // Group by date
    const byDate = {};
    for (const f of allForms) {
      const d = f.date?.slice(0, 10) ?? "unknown";
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(f);
    }

    const sortedDates = Object.keys(byDate).sort();

    // Per-day aggregates
    const dailyStats = sortedDates.map((date, dayIdx) => {
      const forms = byDate[date];
      const points = forms.map(f => f.points);
      const total = points.reduce((a, b) => a + b, 0);
      const avg = points.length ? total / points.length : 0;
      const max = Math.max(...points, 0);
      const min = Math.min(...points, Infinity);

      // Level distribution
      const levelCounts = { 1: 0, 2: 0, 3: 0 };
      for (const f of forms) levelCounts[f.level] = (levelCounts[f.level] || 0) + 1;
      const n = forms.length || 1;

      return {
        date,
        label: `Day ${dayIdx + 1}`,
        shortLabel: `D${dayIdx + 1}`,
        n: forms.length,
        total: Math.round(total),
        avg: Math.round(avg * 10) / 10,
        max,
        min: min === Infinity ? 0 : min,
        pctL1: Math.round((levelCounts[1] / n) * 100),
        pctL2: Math.round((levelCounts[2] / n) * 100),
        pctL3: Math.round((levelCounts[3] / n) * 100),
        levelCounts,
        forms,
        points,
      };
    });

    // Histogram data for selected day (or first day)
    function buildHistogram(forms, buckets = 8) {
      if (!forms.length) return [];
      const pts = forms.map(f => f.points);
      const lo = Math.min(...pts);
      const hi = Math.max(...pts);
      const range = hi - lo || 1;
      const bw = Math.ceil(range / buckets) || 1;
      const bins = {};
      for (let b = lo; b <= hi; b += bw) {
        bins[b] = 0;
      }
      for (const p of pts) {
        const key = Math.floor((p - lo) / bw) * bw + lo;
        bins[key] = (bins[key] || 0) + 1;
      }
      return Object.entries(bins).map(([start, count]) => ({
        range: `${start}–${Number(start) + bw - 1}`,
        count,
        start: Number(start),
      }));
    }

    // Per-rider progression over days using rider_token for grouping
    const uniqueTokens = [...new Set(allForms.map(f => f.riderToken).filter(Boolean))];
    const riderProgressionMap = {};
    for (const token of uniqueTokens) {
      riderProgressionMap[token] = {};
    }
    for (const f of allForms) {
      if (!f.riderToken) continue;
      const dayLabel = `Day ${sortedDates.indexOf(f.date?.slice(0, 10) ?? "") + 1}`;
      const prev = riderProgressionMap[f.riderToken][dayLabel] ?? -1;
      if (f.points > prev) riderProgressionMap[f.riderToken][dayLabel] = f.points;
    }
    const riderProgressionData = sortedDates.map((date, i) => {
      const dayLabel = `Day ${i + 1}`;
      const row = { label: dayLabel };
      for (const token of uniqueTokens) {
        row[token] = riderProgressionMap[token][dayLabel] ?? null;
      }
      return row;
    });

    // Skills category breakdown across all forms
    const catPoints = {};
    for (const fs of dailyFormSkills) {
      const skill = skills.find(s => s.id === fs.skill);
      const cat = skill?.category ?? "Unknown";
      catPoints[cat] = (catPoints[cat] || 0) + fs.level;
    }
    for (const fs of finalFormSkills) {
      const skill = skills.find(s => s.id === fs.skill);
      const cat = skill?.category ?? "Unknown";
      catPoints[cat] = (catPoints[cat] || 0) + fs.level;
    }
    const categoryData = Object.entries(catPoints)
      .map(([cat, pts]) => ({ cat, pts }))
      .sort((a, b) => b.pts - a.pts);

    // Score distribution across all forms (for dot plot)
    const scoreDistribution = allForms.map((f, i) => ({
      x: sortedDates.indexOf(f.date?.slice(0, 10) ?? "") + 1,
      y: f.points,
      level: f.level,
    }));

    // Cumulative points over days
    let cumulative = 0;
    const cumulativeData = dailyStats.map(d => {
      cumulative += d.total;
      return { label: d.label, cumulative };
    });

    return {
      dailyStats,
      buildHistogram,
      categoryData,
      scoreDistribution,
      cumulativeData,
      riderProgressionData,
      uniqueTokens,
      absoluteMax,
      totalForms: allForms.length,
      uniqueRiders: uniqueTokens.length,
      overallAvg,
      sortedDates,
      overallMax,
      prcnt,
    };
  }, [data]);

  // ─── Loading / Error states ──────────────────────────────────────────────────

  if (loading) return (
    <div style={{
      minHeight: "100vh", background: PALETTE.bg, display: "flex",
      alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          border: `3px solid ${PALETTE.border}`, borderTopColor: PALETTE.accent,
          animation: "spin 0.8s linear infinite", margin: "0 auto 16px",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: PALETTE.muted, fontSize: 13 }}>Loading program data…</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={{
      minHeight: "100vh", background: PALETTE.bg, display: "flex",
      alignItems: "center", justifyContent: "center",
    }}>
      <p style={{ color: "#f87171", fontSize: 14 }}>Failed to load data: {error}</p>
    </div>
  );

  if (!computed) return null;

  const {
    dailyStats, buildHistogram, categoryData,
    scoreDistribution, cumulativeData, riderProgressionData,
    uniqueTokens, absoluteMax,
    totalForms, uniqueRiders, overallAvg, sortedDates, overallMax, prcnt
  } = computed;

  const activeDay = selectedDay ?? dailyStats[0];
  const histData = activeDay ? buildHistogram(activeDay.forms) : [];

  return (
    <div style={{
      minHeight: "100vh", background: PALETTE.bg, color: PALETTE.text,
      fontFamily: "'Inter', system-ui, sans-serif",
      padding: "0 0 60px",
    }}>

      {/* ── Header ── */}
      <div style={{
        background: `linear-gradient(135deg, #0f1a14 0%, #0f1117 60%)`,
        borderBottom: `1px solid ${PALETTE.border}`,
        padding: "40px 32px 32px",
        position: "relative", overflow: "hidden",
      }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "transparent", border: "none",
              color: PALETTE.muted, fontSize: 12, cursor: "pointer",
              padding: "0 0 16px", fontFamily: "inherit",
            }}
          >
            ← Back to dashboard
          </button>
        <div style={{
          position: "absolute", top: -60, right: -60,
          width: 240, height: 240, borderRadius: "50%",
          background: PALETTE.accentDim, opacity: 0.4, filter: "blur(60px)",
        }} />
        <div style={{ position: "relative" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: PALETTE.accentDim, borderRadius: 20, padding: "4px 12px",
            marginBottom: 14,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: PALETTE.accent, display: "inline-block" }} />
            <span style={{ color: PALETTE.accent, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Program Analytics
            </span>
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 6px", letterSpacing: "-0.02em" }}>
            Bike First!
          </h1>
          <p style={{ color: PALETTE.muted, fontSize: 14, margin: 0 }}>
            Rider progress overview · {sortedDates.length} session days recorded
          </p>
        </div>
      </div>

      <div style={{ padding: "32px 32px 0", maxWidth: 1100, margin: "0 auto" }}>

        {/* ── Summary stats ── */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 40 }}>
          <StatPill label="Total Assessments" value={totalForms} color={PALETTE.accent} />
          <StatPill label="Unique Riders" value={uniqueRiders} color={PALETTE.total} />
          <StatPill label="Session Days" value={sortedDates.length} color={PALETTE.avg} />
          <StatPill label="Avg Points / Rider" value={overallAvg} color={PALETTE.muted} />
          <StatPill label="Total Possible Points / Rider" value={absoluteMax} color={PALETTE.muted} />
          <StatPill label="Avg Percentage of Points" value={prcnt} color={PALETTE.muted} />
        </div>

        {/* ── Per-rider progression ── */}
        {uniqueTokens.length > 0 && uniqueTokens.length <= 30 && (
          <Section title="Individual Rider* Progression" subtitle="Points earned per rider across days — each line is one anonymized rider">
            <Card>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={riderProgressionData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.border} vertical={false} />
                  <XAxis dataKey="label" tick={tickStyle} axisLine={false} tickLine={false} />
                  <YAxis tick={tickStyle} axisLine={false} tickLine={false} width={40} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const valid = payload.filter(p => p.value !== null);
                      return (
                        <div style={{
                          background: PALETTE.surface, border: `1px solid ${PALETTE.border}`,
                          borderRadius: 10, padding: "10px 14px", fontSize: 12, color: PALETTE.text,
                          maxHeight: 200, overflowY: "auto",
                        }}>
                          <p style={{ color: PALETTE.muted, marginBottom: 6, fontWeight: 600 }}>{label}</p>
                          {valid.map((p, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: p.color, display: "inline-block" }} />
                              <span style={{ fontWeight: 700 }}>{p.value} pts</span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  {uniqueTokens.map((token, i) => (
                    <Line
                      key={token}
                      type="monotone"
                      dataKey={token}
                      dot={{ r: 3, strokeWidth: 0 }}
                      strokeWidth={1.5}
                      connectNulls
                      stroke={`hsl(${(i * 137.5) % 360}, 55%, 60%)`}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              <p style={{ color: PALETTE.muted, fontSize: 11, marginTop: 10, textAlign: "center" }}>
                *Rider identities are anonymized
              </p>
            </Card>
          </Section>
        )}
        {uniqueTokens.length > 30 && (
          <Section title="Individual Rider Progression" subtitle="Too many riders to display individual lines — showing summary only">
            <Card style={{ padding: "24px", textAlign: "center" }}>
              <p style={{ color: PALETTE.muted, fontSize: 13 }}>
                {uniqueTokens.length} riders enrolled — use the day-by-day histogram above to explore score distributions.
              </p>
            </Card>
          </Section>
        )}

        {/* ── Average points per day ── */}
        <Section title="Average Points per Rider by Day" subtitle="Mean assessment score across all riders each day">
          <Card>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dailyStats} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.border} vertical={false} />
                <XAxis dataKey="label" tick={tickStyle} axisLine={false} tickLine={false} />
                <YAxis tick={tickStyle} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<ChartTooltip formatter={v => `${v} pts`} />} />
                <Line
                  type="monotone" dataKey="avg" name="Avg Points"
                  stroke={PALETTE.avg} strokeWidth={2.5} dot={{ r: 4, fill: PALETTE.avg, strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone" dataKey="max" name="Max"
                  stroke={PALETTE.accent} strokeWidth={1.5} strokeDasharray="5 3"
                  dot={false}
                />
                <Line
                  type="monotone" dataKey="min" name="Min"
                  stroke={PALETTE.muted} strokeWidth={1.5} strokeDasharray="5 3"
                  dot={false}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: PALETTE.muted, paddingTop: 8 }}
                  iconType="circle" iconSize={8}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Section>

        {/* ── Total points by day ── */}
        <Section title="Total Points Across All Riders by Day" subtitle="Cumulative skill score earned per session day">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Card>
              <p style={{ color: PALETTE.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 14px" }}>Daily Total</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyStats} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.border} vertical={false} />
                  <XAxis dataKey="shortLabel" tick={tickStyle} axisLine={false} tickLine={false} />
                  <YAxis tick={tickStyle} axisLine={false} tickLine={false} width={40} />
                  <Tooltip content={<ChartTooltip formatter={v => `${v} pts`} />} />
                  <Bar dataKey="total" name="Total Points" radius={[6, 6, 0, 0]} fill={PALETTE.total} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card>
              <p style={{ color: PALETTE.muted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 14px" }}>Cumulative Total</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={cumulativeData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.border} vertical={false} />
                  <XAxis dataKey="label" tick={tickStyle} axisLine={false} tickLine={false} />
                  <YAxis tick={tickStyle} axisLine={false} tickLine={false} width={40} />
                  <Tooltip content={<ChartTooltip formatter={v => `${v} pts`} />} />
                  <Line
                    type="monotone" dataKey="cumulative" name="Cumulative Points"
                    stroke={PALETTE.total} strokeWidth={2.5}
                    dot={{ r: 4, fill: PALETTE.total, strokeWidth: 0 }}
                    fill={PALETTE.total}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </Section>

        {/* ── Form level distribution ── */}
        <Section title="Rider Distribution by Form Level" subtitle="Percentage of riders assessed at each level per day">
          <Card>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dailyStats} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.border} vertical={false} />
                <XAxis dataKey="label" tick={tickStyle} axisLine={false} tickLine={false} />
                <YAxis tick={tickStyle} axisLine={false} tickLine={false} width={40} tickFormatter={v => `${v}%`} />
                <Tooltip content={<ChartTooltip formatter={v => `${v}%`} />} />
                <Legend wrapperStyle={{ fontSize: 11, color: PALETTE.muted, paddingTop: 8 }} iconType="circle" iconSize={8} />
                <Bar dataKey="pctL1" name="Level 1" stackId="a" fill={PALETTE.l1} />
                <Bar dataKey="pctL2" name="Level 2" stackId="a" fill={PALETTE.l2} />
                <Bar dataKey="pctL3" name="Level 3" stackId="a" fill={PALETTE.l3} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Section>

        {/* ── Points histogram ── */}
        <Section
          title="Points Distribution by Day"
          subtitle="How rider scores are spread across a single session day — click a day to explore"
        >
          {/* Day selector */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {dailyStats.map((d) => (
              <button
                key={d.date}
                onClick={() => setSelectedDay(d)}
                style={{
                  padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                  cursor: "pointer", border: "1px solid",
                  borderColor: activeDay?.date === d.date ? PALETTE.accent : PALETTE.border,
                  background: activeDay?.date === d.date ? PALETTE.accentDim : "transparent",
                  color: activeDay?.date === d.date ? PALETTE.accent : PALETTE.muted,
                  transition: "all 0.15s",
                }}
              >
                {d.label}
                <span style={{ marginLeft: 6, opacity: 0.6 }}>({d.n})</span>
              </button>
            ))}
          </div>
          <Card>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
              <p style={{ color: PALETTE.text, fontWeight: 700, fontSize: 14, margin: 0 }}>{activeDay?.label}</p>
              <span style={{ color: PALETTE.muted, fontSize: 12 }}>{activeDay?.date}</span>
              <span style={{ marginLeft: "auto", color: PALETTE.accent, fontSize: 12, fontWeight: 600 }}>
                avg {activeDay?.avg} pts · {activeDay?.n} riders
              </span>
            </div>
            {histData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={histData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.border} vertical={false} />
                  <XAxis dataKey="range" tick={tickStyle} axisLine={false} tickLine={false} />
                  <YAxis tick={tickStyle} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip formatter={v => `${v} riders`} />} />
                  <Bar dataKey="count" name="Riders" radius={[6, 6, 0, 0]}>
                    {histData.map((entry, i) => (
                      <Cell key={i} fill={PALETTE.accent} opacity={0.5 + (i / histData.length) * 0.5} />
                    ))}
                  </Bar>
                  <ReferenceLine
                    x={histData.find(b => b.start <= (activeDay?.avg ?? 0) && b.start + 10 > (activeDay?.avg ?? 0))?.range}
                    stroke={PALETTE.avg} strokeDasharray="4 2" strokeWidth={1.5}
                    label={{ value: "avg", fill: PALETTE.avg, fontSize: 10, position: "top" }}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ color: PALETTE.muted, fontSize: 13, textAlign: "center", padding: "32px 0" }}>
                No data for this day
              </p>
            )}
          </Card>
        </Section>

        {/* ── Score scatter (all forms, all days) ── */}
        <Section title="Score Spread Across All Days" subtitle="Each dot is one assessment, colored by form level">
          <Card>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
              {[1, 2, 3].map(l => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: LEVEL_COLORS[l], display: "inline-block" }} />
                  <span style={{ color: PALETTE.muted, fontSize: 11 }}>Level {l}</span>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.border} />
                <XAxis
                  type="number" dataKey="x" name="Day" tick={tickStyle}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => `D${v}`}
                  domain={[0.5, sortedDates.length + 0.5]}
                />
                <YAxis type="number" dataKey="y" name="Points" tick={tickStyle} axisLine={false} tickLine={false} width={40} />
                <ZAxis range={[30, 30]} />
                <Tooltip
                  cursor={{ stroke: PALETTE.border }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div style={{
                        background: PALETTE.surface, border: `1px solid ${PALETTE.border}`,
                        borderRadius: 10, padding: "8px 12px", fontSize: 12,
                      }}>
                        <p style={{ color: PALETTE.muted, margin: "0 0 4px" }}>Day {d?.x}</p>
                        <p style={{ color: PALETTE.text, margin: 0, fontWeight: 700 }}>{d?.y} pts · Level {d?.level}</p>
                      </div>
                    );
                  }}
                />
                {[1, 2, 3].map(lvl => (
                  <Scatter
                    key={lvl}
                    name={`Level ${lvl}`}
                    data={scoreDistribution.filter(d => d.level === lvl)}
                    fill={LEVEL_COLORS[lvl]}
                    opacity={0.7}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </Card>
        </Section>

        {/* ── Category breakdown ── */}
        {categoryData.length > 0 && (
          <Section title="Skill Category Breakdown" subtitle="Total skill points earned across all assessments, by category">
            <Card>
              <ResponsiveContainer width="100%" height={Math.max(180, categoryData.length * 36)}>
                <BarChart
                  data={categoryData} layout="vertical"
                  margin={{ top: 4, right: 20, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.border} horizontal={false} />
                  <XAxis type="number" tick={tickStyle} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category" dataKey="cat" tick={{ fill: PALETTE.muted, fontSize: 11 }}
                    axisLine={false} tickLine={false} width={100}
                  />
                  <Tooltip content={<ChartTooltip formatter={v => `${v} pts`} />} />
                  <Bar dataKey="pts" name="Points" radius={[0, 6, 6, 0]}>
                    {categoryData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PALETTE.accent}
                        opacity={1 - (i / categoryData.length) * 0.55}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Section>
        )}

        {/* ── Per-day level counts table ── */}
        <Section title="Day-by-Day Summary" subtitle="Assessment counts and average scores at a glance">
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${PALETTE.border}` }}>
                  {["Day", "Date", "Assessments", "Avg Points", "Max", "L1", "L2", "L3"].map(h => (
                    <th key={h} style={{
                      padding: "12px 16px", textAlign: "left",
                      color: PALETTE.muted, fontWeight: 600,
                      fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dailyStats.map((d, i) => (
                  <tr
                    key={d.date}
                    style={{
                      borderBottom: i < dailyStats.length - 1 ? `1px solid ${PALETTE.border}` : "none",
                      background: activeDay?.date === d.date ? PALETTE.accentDim : "transparent",
                      cursor: "pointer",
                      transition: "background 0.1s",
                    }}
                    onClick={() => setSelectedDay(d)}
                  >
                    <td style={{ padding: "10px 16px", color: PALETTE.accent, fontWeight: 700 }}>{d.label}</td>
                    <td style={{ padding: "10px 16px", color: PALETTE.muted }}>{d.date}</td>
                    <td style={{ padding: "10px 16px", fontWeight: 600 }}>{d.n}</td>
                    <td style={{ padding: "10px 16px", color: PALETTE.avg, fontWeight: 700 }}>{d.avg}</td>
                    <td style={{ padding: "10px 16px" }}>{d.max}</td>
                    <td style={{ padding: "10px 16px", color: PALETTE.l1 }}>{d.levelCounts[1] ?? 0}</td>
                    <td style={{ padding: "10px 16px", color: PALETTE.l2 }}>{d.levelCounts[2] ?? 0}</td>
                    <td style={{ padding: "10px 16px", color: PALETTE.l3 }}>{d.levelCounts[3] ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </Section>

        <p style={{ color: PALETTE.muted, fontSize: 11, textAlign: "center", marginTop: 32 }}>
          All data is anonymized · Bike First! Program Analytics
        </p>
      </div>
    </div>
  );
}