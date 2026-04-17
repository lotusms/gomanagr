import { useMemo } from 'react';
import { HiClock, HiLocationMarker } from 'react-icons/hi';
import { Table, EmptyState } from '@/components/ui';
import { SecondaryButton } from '@/components/ui/buttons';

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

function entryTagClass(kind) {
  if (kind === 'billable') {
    return 'text-[10px] uppercase tracking-wide rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.5';
  }
  if (kind === 'non-billable') {
    return 'text-[10px] uppercase tracking-wide rounded bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-1.5 py-0.5';
  }
  return 'text-[10px] uppercase tracking-wide rounded bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-200 px-1.5 py-0.5';
}

function statusBadge(status) {
  if (status === 'Approved') {
    return (
      <span className="text-[10px] font-semibold uppercase tracking-wide rounded px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200">
        Approved
      </span>
    );
  }
  if (status === 'Rejected') {
    return (
      <span className="text-[10px] font-semibold uppercase tracking-wide rounded px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-900 dark:text-red-200">
        Rejected
      </span>
    );
  }
  if (status === 'Submitted') {
    return (
      <span className="text-[10px] font-semibold uppercase tracking-wide rounded px-2 py-0.5 bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-200">
        Submitted
      </span>
    );
  }
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wide rounded px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200">
      Draft
    </span>
  );
}

function formatHours(n) {
  const x = Number(n) || 0;
  if (Number.isInteger(x)) return String(x);
  return x.toFixed(1).replace(/\.0$/, '');
}

export default function MyTimesheetSection({
  flags,
  clientTerm,
  dayLabels,
  entries,
  weeklyTotalHours,
  isRegularMember = false,
  memberLogLabels = null,
  loading = false,
  adminStats = null,
}) {
  const submissionSummary = useMemo(() => {
    const submitted = entries.filter((e) => e.status === 'Submitted' || e.status === 'Approved').length;
    const drafts = entries.filter((e) => e.status === 'Draft').length;
    return { submitted, drafts };
  }, [entries]);

  const firstColLabel = isRegularMember ? (memberLogLabels?.tableFirstColLabel ?? 'Activity') : '';

  const columns = useMemo(() => {
    const showLinked = isRegularMember && memberLogLabels?.showLinkedContext;
    const entryCol = {
      key: 'entry',
      label: firstColLabel,
      widthClass: 'w-[16rem]',
      render: (row) => (
        <div className="py-1">
          <div className="font-medium text-gray-900 dark:text-white">{row.notes}</div>
          {showLinked && row.linkedLabel != null && row.linkedLabel !== '' && (
            <div className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
              {(row.linkedType != null && `${String(row.linkedType)} · `) || ''}
              {row.linkedLabel}
            </div>
          )}
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {row.method}
            {!isRegularMember && (
              <>
                {' · '}
                {row.status}
              </>
            )}
          </div>
          {isRegularMember ? (
            <div className="flex flex-wrap items-center gap-2 mt-2">{statusBadge(row.status)}</div>
          ) : (
            <div className="flex flex-wrap gap-1 mt-2">
              {row.billable ? (
                <span className={entryTagClass('billable')}>Billable</span>
              ) : (
                <span className={entryTagClass('non-billable')}>Non-billable</span>
              )}
              {row.costable && <span className={entryTagClass('costable')}>Costable</span>}
            </div>
          )}
        </div>
      ),
    };

    return [
      entryCol,
      ...dayLabels.map((label, index) => ({
        key: `day-${index}`,
        label,
        align: 'center',
        widthClass: 'w-[6.25rem]',
        render: (row) => (row.dayIndex === index ? `${formatHours(row.hours)}h` : '—'),
      })),
      {
        key: 'dayTotal',
        label: isRegularMember ? 'Total' : 'Day total',
        align: 'right',
        widthClass: 'w-[7rem]',
        render: (row) => (
          <span className="font-medium text-gray-900 dark:text-white tabular-nums">{formatHours(row.hours)}h</span>
        ),
      },
    ];
  }, [dayLabels, isRegularMember, memberLogLabels, firstColLabel]);

  const hoursTitle = memberLogLabels?.hoursKpiTitle ?? 'Hours this week';
  const hoursSub = memberLogLabels?.hoursKpiSub ?? 'Target 40h per week';
  const weekTitle = memberLogLabels?.weekPanelTitle ?? 'This week';
  const weekHint = memberLogLabels?.weekPanelHint ?? 'Use Add time when you log new hours.';

  const billH = adminStats?.billableHours ?? 0;
  const nonBillH = adminStats?.nonBillableHours ?? 0;
  const pendingN = adminStats?.pendingApprovalCount ?? 0;

  return (
    <>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].slice(0, isRegularMember ? 2 : 4).map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      ) : isRegularMember ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
          <KpiCard label={hoursTitle} value={`${formatHours(weeklyTotalHours)}h`} sub={hoursSub} />
          <KpiCard
            label="Your entries"
            value={`${submissionSummary.submitted} submitted · ${submissionSummary.drafts} draft`}
            sub="Submit drafts when your week is ready for review."
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Hours this week" value={`${formatHours(weeklyTotalHours)}h`} sub="Target 40h" />
          {flags.showBillableAndRates ? (
            <KpiCard
              label="Billable"
              value={`${formatHours(billH)}h`}
              sub={`vs ${formatHours(nonBillH)}h non-billable`}
            />
          ) : (
            <KpiCard label="Paid hours" value={`${formatHours(weeklyTotalHours)}h`} sub="Payroll basis" />
          )}
          <KpiCard label="Overtime" value="—" sub="Rules in Settings (soon)" />
          <KpiCard
            label="Pending approval"
            value={String(pendingN)}
            sub={pendingN === 1 ? 'Submitted entry' : 'Submitted entries'}
          />
        </div>
      )}

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

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{weekTitle}</h2>
          {isRegularMember ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xl text-right">
              <span className="font-medium text-gray-700 dark:text-gray-300">Add time</span> — {weekHint}
            </p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Linked record uses <span className="font-medium">type + id</span>— not only {clientTerm.toLowerCase()}.
            </p>
          )}
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="min-h-[200px] flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
              Loading time entries…
            </div>
          ) : entries.length === 0 ? (
            <div className="p-8">
              <EmptyState
                type="custom"
                title="No time logged this week"
                description="Add time entries to see them listed by day. If loading errors appear, ensure the org_time_entries table exists (migration 076)."
                icon={HiClock}
              />
            </div>
          ) : (
            <Table
              ariaLabel="My weekly timesheet"
              columns={columns}
              data={entries}
              getRowKey={(row) => row.id}
              className="min-w-[720px] text-sm"
            />
          )}
        </div>
        <div
          className={`px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 text-xs text-gray-600 dark:text-gray-400 ${
            isRegularMember ? 'flex justify-end' : 'flex items-center justify-between gap-4'
          }`}
        >
          {!isRegularMember && entries.length > 0 && (
            <p>
              <strong className="text-gray-800 dark:text-gray-200">Linked record:</strong> {entries[0].linkedType} ·{' '}
              {entries[0].linkedLabel || '—'} — entries can link to clients, projects, or tasks for billing and costing.
            </p>
          )}
          <p className="shrink-0">
            <strong className="text-gray-800 dark:text-gray-200">Week total:</strong>{' '}
            <span className="tabular-nums text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
              {formatHours(weeklyTotalHours)}h
            </span>
          </p>
        </div>
      </div>
    </>
  );
}
