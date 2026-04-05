'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount } from '@/services/userService';
import { getUserOrganization } from '@/services/organizationService';
import { PageHeader } from '@/components/ui';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import { getTermForIndustry } from '@/components/clients/clientProfileConstants';
import { getTimeTrackingGroup, getFeatureFlagsForGroup } from './timeTrackingPresets';
import {
  HiClock,
  HiUsers,
  HiClipboardCheck,
  HiCollection,
  HiChartBar,
  HiCog,
  HiPlay,
  HiLocationMarker,
  HiPlus,
  HiLightningBolt,
} from 'react-icons/hi';

const SECTIONS = [
  { id: 'my', label: 'My timesheet', icon: HiClock },
  { id: 'team', label: 'Team', icon: HiUsers },
  { id: 'approvals', label: 'Approvals', icon: HiClipboardCheck },
  { id: 'client', label: 'Client / job time', icon: HiCollection },
  { id: 'reports', label: 'Reports', icon: HiChartBar },
  { id: 'settings', label: 'Settings', icon: HiCog },
];

/** Monday-start week dates for header row. */
function getWeekDates(anchor = new Date()) {
  const d = new Date(anchor);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(monday);
    x.setDate(monday.getDate() + i);
    return x;
  });
}

const MOCK_ENTRIES = [
  {
    id: '1',
    member: 'You',
    dayIndex: 0,
    hours: 3,
    linkedType: 'Client',
    linkedLabel: 'Acme Corp',
    method: 'Timer',
    status: 'Submitted',
    billable: true,
    costable: true,
    notes: 'Discovery call & follow-up',
  },
  {
    id: '2',
    member: 'You',
    dayIndex: 1,
    hours: 5.5,
    linkedType: 'Project',
    linkedLabel: 'Website refresh',
    method: 'Manual',
    status: 'Draft',
    billable: true,
    costable: true,
    notes: 'Design review',
  },
  {
    id: '3',
    member: 'You',
    dayIndex: 3,
    hours: 2,
    linkedType: 'Internal',
    linkedLabel: 'Admin',
    method: 'Manual',
    status: 'Draft',
    billable: false,
    costable: true,
    notes: 'Planning',
  },
];

function KpiCard({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-gray-200/80 dark:border-gray-700/80 bg-white dark:bg-gray-900/60 p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">{value}</p>
      {sub != null && sub !== '' && (
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{sub}</p>
      )}
    </div>
  );
}

function PlaceholderPanel({ title, children }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 p-8 text-center">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-lg mx-auto">{children}</p>
    </div>
  );
}

export default function TimesheetsPageContent() {
  const { currentUser } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [userAccount, setUserAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState('my');

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([getUserOrganization(currentUser.uid), getUserAccount(currentUser.uid)])
      .then(([org, acct]) => {
        if (!cancelled) {
          setOrganization(org || null);
          setUserAccount(acct || null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOrganization(null);
          setUserAccount(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid]);

  const industry = organization?.industry ?? userAccount?.industry ?? '';
  const group = getTimeTrackingGroup(industry);
  const flags = useMemo(() => getFeatureFlagsForGroup(group), [group]);

  const clientTerm = getTermForIndustry(industry, 'client');
  const projectTerm = getTermForIndustry(industry, 'project');
  const teamTerm = getTermForIndustry(industry, 'team');

  const weekDates = useMemo(() => getWeekDates(), []);
  const dayLabels = useMemo(
    () => weekDates.map((d) => d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })),
    [weekDates]
  );

  const sectionTabs = useMemo(() => {
    return SECTIONS.map((s) => {
      if (s.id === 'client') {
        return { ...s, label: `${clientTerm} / job time` };
      }
      if (s.id === 'team') {
        return { ...s, label: `${teamTerm}` };
      }
      return s;
    });
  }, [clientTerm, teamTerm]);

  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-pulse">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-64" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full max-w-xl" />
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-10 w-28 rounded-lg bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
        <div className="h-96 rounded-2xl bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <PageHeader
        title="Time tracking"
        description="Log hours for payroll, client billing, and internal costing—one flexible engine, configurable by industry and how your team works."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/40 px-3 py-1 text-xs font-medium text-amber-900 dark:text-amber-200">
              Preview
            </span>
            <SecondaryButton type="button" className="gap-2" disabled title="Coming soon">
              <HiPlay className="w-5 h-5" />
              Start timer
            </SecondaryButton>
            <PrimaryButton type="button" className="gap-2" disabled title="Coming soon">
              <HiPlus className="w-5 h-5" />
              Add time
            </PrimaryButton>
          </div>
        }
      />

      {/* Industry hint */}
      <div className="flex flex-wrap items-start gap-3 rounded-xl border border-primary-200/60 dark:border-primary-800/50 bg-primary-50/50 dark:bg-primary-950/20 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
        <HiLightningBolt className="w-5 h-5 flex-shrink-0 text-primary-600 dark:text-primary-400 mt-0.5" />
        <div>
          <p className="font-medium text-gray-900 dark:text-white">
            Defaults for {industry || 'your industry'}
          </p>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            {flags.emphasizeTimer &&
              'Manual entries and timers suit knowledge work; billable and costable can differ on the same row. '}
            {flags.emphasizeClock && 'Clock in/out and breaks map to attendance and overtime. '}
            {flags.showWorkOrderJobSite && 'Link time to jobs, sites, or work orders— not just clients. '}
            {flags.showAppointmentLink && 'Time can tie to appointments and services. '}
            {flags.showGrantProgram && 'Program and funding tags help grants and compliance reporting. '}
            {!flags.emphasizeTimer && !flags.emphasizeClock && 'Use the tabs below to explore how your team could use time tracking.'}
          </p>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 dark:border-gray-600 pb-2 mb-2 overflow-x-auto">
        {sectionTabs.map((tab) => {
          const Icon = tab.icon;
          const active = section === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                active
                  ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-200'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {section === 'my' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Hours this week" value="10.5h" sub="Target 40h" />
            {flags.showBillableAndRates ? (
              <KpiCard label="Billable" value="8.5h" sub="vs 2h non-billable" />
            ) : (
              <KpiCard label="Paid hours" value="10.5h" sub="Payroll basis" />
            )}
            <KpiCard label="Overtime" value="—" sub="Rules in Settings (soon)" />
            <KpiCard label="Pending approval" value="1" sub="Submitted entries" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {flags.emphasizeClock && (
              <SecondaryButton type="button" className="gap-2" disabled title="Coming soon">
                <HiClock className="w-5 h-5" />
                Clock in
              </SecondaryButton>
            )}
            {flags.showWorkOrderJobSite && (
              <SecondaryButton type="button" className="gap-2" disabled title="Coming soon">
                <HiLocationMarker className="w-5 h-5" />
                On site
              </SecondaryButton>
            )}
          </div>

          {/* Weekly grid (mock) */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">This week</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Linked record uses <span className="font-medium">type + id</span>— not only{' '}
                {clientTerm.toLowerCase()}.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/80 text-left text-gray-600 dark:text-gray-400">
                    <th className="px-4 py-3 font-medium w-40">Day</th>
                    {dayLabels.map((label) => (
                      <th key={label} className="px-2 py-3 font-medium text-center">
                        {label}
                      </th>
                    ))}
                    <th className="px-4 py-3 font-medium text-right">Day total</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_ENTRIES.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50/80 dark:hover:bg-gray-800/40"
                    >
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-gray-900 dark:text-white">{row.notes}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {row.method} · {row.status}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {row.billable && (
                            <span className="text-[10px] uppercase tracking-wide rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.5">
                              Billable
                            </span>
                          )}
                          {!row.billable && (
                            <span className="text-[10px] uppercase tracking-wide rounded bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-1.5 py-0.5">
                              Non-billable
                            </span>
                          )}
                          {row.costable && (
                            <span className="text-[10px] uppercase tracking-wide rounded bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-200 px-1.5 py-0.5">
                              Costable
                            </span>
                          )}
                        </div>
                      </td>
                      {dayLabels.map((_, di) => (
                        <td key={di} className="px-2 py-3 text-center tabular-nums text-gray-900 dark:text-white">
                          {row.dayIndex === di ? `${row.hours}h` : '—'}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-900 dark:text-white">
                        {row.hours}h
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 text-xs text-gray-600 dark:text-gray-400">
              <strong className="text-gray-800 dark:text-gray-200">Linked record (preview):</strong>{' '}
              {MOCK_ENTRIES[0].linkedType} · {MOCK_ENTRIES[0].linkedLabel} — same entry can feed billing, costing, and
              payroll separately.
            </div>
          </div>
        </>
      )}

      {section === 'team' && (
        <PlaceholderPanel title={`${teamTerm} overview`}>
          See who submitted, who is clocked in, overtime, and missing entries— filtered by location, {projectTerm.toLowerCase()},{' '}
          {clientTerm.toLowerCase()}, or department. Full implementation will respect role-based visibility for rates and
          payroll.
        </PlaceholderPanel>
      )}

      {section === 'approvals' && (
        <PlaceholderPanel title="Approval queue">
          Submitted rows, exceptions, reject with reason, bulk approve, and locked periods after approval. Compliance-heavy
          industries can require immutable approved time with audit notes.
        </PlaceholderPanel>
      )}

      {section === 'client' && (
        <PlaceholderPanel title={`${clientTerm} & ${projectTerm} time`}>
          Roll up hours by {clientTerm.toLowerCase()}, {projectTerm.toLowerCase()}, case, job, or property— billable vs
          non-billable, uninvoiced time, and labor cost in one place. Labels follow your industry settings.
        </PlaceholderPanel>
      )}

      {section === 'reports' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {['Hours by person', 'Hours by client / job', 'Utilization & overtime', 'Exceptions & missing time'].map(
            (label) => (
              <div
                key={label}
                className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-5 shadow-sm"
              >
                <p className="font-medium text-gray-900 dark:text-white">{label}</p>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Report builder — coming soon.</p>
              </div>
            )
          )}
        </div>
      )}

      {section === 'settings' && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Organization defaults (preview)</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Onboarding will guide primary purpose (payroll, billing, costing, attendance), default entry mode (manual, timer,
            clock), what time links to (clients, jobs, cases, appointments…), approvals, and overtime— not only industry.
          </p>
          <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-2">
            <li>Separate toggles for billable, costable, and payable where they differ.</li>
            <li>Default tracking mode: hybrid-friendly (office vs field vs shift).</li>
            <li>Optional fields: breaks, location, attachments, tags— shown when relevant.</li>
          </ul>
        </div>
      )}
    </div>
  );
}
