import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import analyticsService from '../../services/analyticsService';
import Spinner from '../../components/common/Spinner';
import { timeAgo } from '../../utils/helpers';

const PERIOD_OPTIONS = [
  { label: '7 days',  value: 7  },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
];

const CHART_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16','#f97316','#14b8a6'];

function KPICard({ label, value, sub, icon, color = 'indigo' }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green:  'bg-green-50  text-green-600',
    amber:  'bg-amber-50  text-amber-600',
    rose:   'bg-rose-50   text-rose-600',
  };
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500 font-medium">{label}</span>
        <span className={`text-xl p-2 rounded-lg ${colors[color]}`}>{icon}</span>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 className="text-base font-semibold text-gray-800 mb-3">{children}</h2>;
}

function ExportCSV({ data, filename, label = 'Export CSV' }) {
  const download = () => {
    if (!data?.length) return;
    const keys = Object.keys(data[0]);
    const rows = [keys.join(','), ...data.map(r =>
      keys.map(k => JSON.stringify(r[k] ?? '')).join(',')
    )];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  };
  return (
    <button onClick={download}
      className="btn-ghost text-xs px-3 py-1.5 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50">
      ⬇ {label}
    </button>
  );
}

export default function AnalyticsDashboard() {
  const [days, setDays]           = useState(30);
  const [loading, setLoading]     = useState(true);
  const [overview, setOverview]   = useState(null);
  const [views, setViews]         = useState([]);
  const [topArticles, setTop]     = useState([]);
  const [categories, setCats]     = useState([]);
  const [keywords, setKeywords]   = useState([]);
  const [authors, setAuthors]     = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { days };
      const [ov, vw, top, cats, kw, auth] = await Promise.all([
        analyticsService.getOverview(params),
        analyticsService.getViewsOverTime(params),
        analyticsService.getTopArticles({ ...params, limit: 10 }),
        analyticsService.getCategoryStats(params),
        analyticsService.getSearchKeywords({ ...params, limit: 15 }),
        analyticsService.getAuthorActivity(params),
      ]);
      setOverview(ov.data?.data?.overview || {});
      setViews(vw.data?.data?.views_over_time || []);
      setTop(top.data?.data?.top_articles || []);
      setCats(cats.data?.data?.categories || []);
      setKeywords(kw.data?.data?.keywords || []);
      setAuthors(auth.data?.data?.authors || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;

  const fmtDate = d => d?.slice(5); // MM-DD

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Analytics Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Content performance &amp; usage insights</p>
        </div>
        <div className="flex gap-2">
          {PERIOD_OPTIONS.map(o => (
            <button key={o.value} onClick={() => setDays(o.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                days === o.value
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
              }`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Published Articles" value={overview?.published_articles?.toLocaleString()} icon="📄" color="indigo" sub="Total in knowledge base" />
        <KPICard label="Total Views"         value={overview?.total_views?.toLocaleString()}        icon="👁"  color="green"  sub={`${overview?.views_period?.toLocaleString() || 0} in period`} />
        <KPICard label="Active Users"        value={overview?.active_users?.toLocaleString()}       icon="👥" color="amber"  sub="Registered accounts" />
        <KPICard label="Searches"            value={overview?.searches_period?.toLocaleString()}    icon="🔍" color="rose"   sub={`Last ${days} days`} />
      </div>

      {/* Views over time */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>Views Over Time</SectionTitle>
          <ExportCSV data={views} filename="views_over_time.csv" />
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={views} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip labelFormatter={d => `Date: ${d}`} />
            <Legend />
            <Line type="monotone" dataKey="events" name="Views" stroke="#6366f1" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="unique_users" name="Unique Users" stroke="#10b981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top articles */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <SectionTitle>Top Articles</SectionTitle>
            <ExportCSV data={topArticles} filename="top_articles.csv" />
          </div>
          <div className="space-y-2">
            {topArticles.slice(0, 8).map((a, i) => (
              <div key={a.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <span className="text-xs font-bold text-gray-400 w-5 text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{a.title}</p>
                  <p className="text-xs text-gray-400">{a.category_name} · {a.author_name}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-indigo-600">{Number(a.period_views).toLocaleString()}</p>
                  <p className="text-xs text-gray-400">views</p>
                </div>
              </div>
            ))}
            {topArticles.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No data yet</p>}
          </div>
        </div>

        {/* Category breakdown pie */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <SectionTitle>Category Breakdown</SectionTitle>
            <ExportCSV data={categories} filename="category_stats.csv" />
          </div>
          {categories.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categories} dataKey="article_count" nameKey="name"
                  cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) =>
                    `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}>
                  {categories.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 text-center py-16">No data yet</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Category views bar */}
        <div className="card p-5">
          <SectionTitle>Category Views ({days}d)</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categories.slice(0, 8)} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="period_views" name="Views" fill="#6366f1" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Search keywords */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <SectionTitle>Top Search Keywords</SectionTitle>
            <ExportCSV data={keywords} filename="search_keywords.csv" />
          </div>
          {keywords.length > 0 ? (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {keywords.map((k, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-4 text-right">{i+1}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full flex items-center px-2"
                      style={{ width: `${Math.max(10, (k.search_count / keywords[0].search_count) * 100)}%` }}>
                      <span className="text-xs text-white font-medium truncate">{k.query}</span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{k.search_count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-10">No search data yet</p>
          )}
        </div>
      </div>

      {/* Author activity table */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>Author Activity</SectionTitle>
          <ExportCSV data={authors} filename="author_activity.csv" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Author','Total Articles','Published','Pending','Total Views','Avg Rating','New (Period)'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {authors.slice(0, 15).map(a => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-2.5 px-3">
                    <div>
                      <p className="font-medium text-gray-800">{a.author_name}</p>
                      <p className="text-xs text-gray-400">@{a.username}</p>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-gray-700">{a.total_articles}</td>
                  <td className="py-2.5 px-3"><span className="text-green-600 font-medium">{a.published}</span></td>
                  <td className="py-2.5 px-3"><span className="text-amber-600">{a.pending}</span></td>
                  <td className="py-2.5 px-3 text-gray-700">{Number(a.total_views).toLocaleString()}</td>
                  <td className="py-2.5 px-3">
                    {a.avg_rating > 0
                      ? <span className="text-amber-500">⭐ {parseFloat(a.avg_rating).toFixed(1)}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-2.5 px-3">
                    {a.new_articles_period > 0
                      ? <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium">+{a.new_articles_period}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
              {authors.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">No author data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
