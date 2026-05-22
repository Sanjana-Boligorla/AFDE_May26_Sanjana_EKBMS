import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getStats, getPopularArticles, getRecentArticles,
  getPendingApprovals, getCategoryStats
} from '../../services/dashboardService';
import { useAuth } from '../../context/AuthContext';
import { timeAgo } from '../../utils/helpers';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const StatCard = ({ icon, label, value, sub, color }) => (
  <div className="card flex items-start gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-0.5">{value ?? <span className="text-gray-300">—</span>}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

const CHART_COLORS = ['#6366f1','#818cf8','#a5b4fc','#c7d2fe','#22c55e','#f59e0b'];

export default function Dashboard() {
  const { user, isReviewer } = useAuth();
  const navigate = useNavigate();
  const [stats,    setStats]    = useState(null);
  const [popular,  setPopular]  = useState([]);
  const [recent,   setRecent]   = useState([]);
  const [pending,  setPending]  = useState([]);
  const [catStats, setCatStats] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, p, r, cs] = await Promise.all([
          getStats(), getPopularArticles(), getRecentArticles(), getCategoryStats()
        ]);
        // Each service returns { success, data: { ... } }
        setStats(s.data?.data || {});
        setPopular(p.data?.data?.articles || []);
        setRecent(r.data?.data?.articles || []);
        setCatStats((cs.data?.data?.categories || []).slice(0, 6));
        if (isReviewer()) {
          const pen = await getPendingApprovals();
          setPending(pen.data?.data?.pending || []);
        }
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []); // eslint-disable-line

  if (loading) return (
    <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Welcome back, {user?.first_name}! Here's what's happening in the knowledge base.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="📄" label="Total Articles"
          value={stats?.articles?.total_articles}
          sub={`${stats?.articles?.published || 0} published`}
          color="bg-indigo-50"
        />
        <StatCard
          icon="✅" label="Published"
          value={stats?.articles?.published}
          sub="Live & accessible"
          color="bg-green-50"
        />
        <StatCard
          icon="⏳" label="Pending Review"
          value={stats?.articles?.pending_review}
          sub="Awaiting approval"
          color="bg-amber-50"
        />
        <StatCard
          icon="👥" label="Total Users"
          value={stats?.users?.total_users}
          sub={`${stats?.users?.active_users || 0} active`}
          color="bg-blue-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category chart */}
        <div className="card lg:col-span-1">
          <h2 className="section-title mb-4">Articles by Category</h2>
          {catStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={catStats} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(v) => [`${v} articles`, 'Count']}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="total_articles" radius={[0, 4, 4, 0]}>
                  {catStats.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-10">No category data yet</p>
          )}
        </div>

        {/* Recent articles */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Recent Articles</h2>
            <button onClick={() => navigate('/articles')} className="text-sm text-primary-600 hover:text-primary-800 font-medium">
              View all
            </button>
          </div>
          <div className="space-y-2">
            {recent.slice(0, 5).map(a => (
              <div
                key={a.id}
                onClick={() => navigate(`/articles/${a.slug}`)}
                className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-sm flex-shrink-0">
                  📄
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-700 transition-colors">
                    {a.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {a.category_name} · {timeAgo(a.published_at || a.created_at)}
                  </p>
                </div>
                <div className="text-xs text-gray-400 flex-shrink-0 text-right">
                  <div>{(a.view_count || 0).toLocaleString()}</div>
                  <div>views</div>
                </div>
              </div>
            ))}
            {recent.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No articles yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Pending approvals widget (reviewers/admins) */}
      {isReviewer() && pending.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Pending Approvals</h2>
            <button onClick={() => navigate('/approval-queue')} className="text-sm text-primary-600 hover:text-primary-800 font-medium">
              Open queue
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {pending.slice(0, 4).map(item => (
              <div key={item.workflow_id} className="py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    by {item.author_name}
                    {item.department ? ` · ${item.department}` : ''}
                    {' · '}{timeAgo(item.submitted_at)}
                  </p>
                </div>
                <Badge variant="warning" size="sm">
                  {item.workflow_status?.replace('_', ' ')}
                </Badge>
                <button
                  onClick={() => navigate('/approval-queue')}
                  className="btn-secondary py-1 px-3 text-xs"
                >
                  Review
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Most popular articles */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Most Popular Articles</h2>
          <button
            onClick={() => navigate('/articles?sort=popular')}
            className="text-sm text-primary-600 hover:text-primary-800 font-medium"
          >
            See all
          </button>
        </div>
        {popular.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No data yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {popular.slice(0, 6).map((a, i) => (
              <div
                key={a.id}
                onClick={() => navigate(`/articles/${a.slug}`)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors group"
              >
                <span className={`text-lg font-bold w-7 text-center flex-shrink-0 ${i < 3 ? 'text-indigo-600' : 'text-gray-300'}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-700 transition-colors">
                    {a.title}
                  </p>
                  <p className="text-xs text-gray-400">{a.category_name}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-semibold text-gray-700">{(a.view_count || 0).toLocaleString()}</p>
                  <p className="text-xs text-gray-400">views</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
