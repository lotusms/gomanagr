'use client';

import Link from 'next/link';
import { HiDocumentText, HiPlus } from 'react-icons/hi';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const STATUS_CONFIG = [
  { key: 'draft', label: 'Draft', color: '#9ca3af' },
  { key: 'sent', label: 'Sent', color: '#3b82f6' },
  { key: 'viewed', label: 'Viewed', color: '#6366f1' },
  { key: 'accepted', label: 'Accepted', color: '#10b981' },
  { key: 'expired', label: 'Expired', color: '#f59e0b' },
  { key: 'rejected', label: 'Rejected', color: '#ef4444' },
];

/**
 * Pipeline counts as a horizontal bar chart: Draft / Sent / Viewed / Accepted / Expired / Rejected, "Create proposal" CTA.
 */
export default function ProposalsPipelineCard({ counts = {} }) {
  const chartData = STATUS_CONFIG.map(({ key, label, color }) => ({
    name: label,
    value: counts[key] ?? 0,
    key,
    fill: color,
  }));

  const total = chartData.reduce((sum, d) => sum + d.value, 0);
  const maxCount = Math.max(...chartData.map((d) => d.value), 1);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
          <HiDocumentText className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Proposals pipeline
        </h3>
      </div>
      <div className="px-5 py-4 space-y-4">
        {total === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-32 h-32 rounded-lg bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center mb-3">
              <span className="text-2xl font-bold text-gray-400 dark:text-gray-500">0</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">No proposals yet</p>
          </div>
        ) : (
          <div className="h-56 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e5e7eb"
                  horizontal={false}
                  vertical={true}
                />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                  domain={[0, maxCount]}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={80}
                  tick={{ fontSize: 11, fill: '#374151' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} minPointSize={2}>
                  {chartData.map((entry) => (
                    <Cell key={entry.key} fill={entry.fill} />
                  ))}
                </Bar>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload;
                    return (
                      <div className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 shadow-lg">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {p.name}: <span className="tabular-nums">{p.value}</span>
                        </p>
                      </div>
                    );
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="flex justify-end">
          <Link
            href="/dashboard/proposals/new"
            className="inline-flex items-center gap-2 w-full sm:w-auto justify-center px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white font-medium text-sm transition-colors"
          >
            <HiPlus className="w-4 h-4" />
            Create proposal
          </Link>
        </div>
      </div>
    </div>
  );
}
