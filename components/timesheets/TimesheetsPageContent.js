'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { getMondayWeekRange, fetchOrgTimeEntriesForWeek } from '@/lib/orgTimeEntries';
import { getUserAccount } from '@/services/userService';
import { getUserOrganization } from '@/services/organizationService';
import { PageHeader } from '@/components/ui';
import { PrimaryButton } from '@/components/ui/buttons';
import { getTermForIndustry } from '@/components/clients/clientProfileConstants';
import {
  getTimeTrackingGroup,
  getFeatureFlagsForGroup,
  getMemberTimeTrackingMode,
  getMemberTimeLogLabels,
} from './timeTrackingPresets';
import { isAdminRole } from '@/config/rolePermissions';
import MyTimesheetSection from './sections/MyTimesheetSection';
import MemberTimeOffPanel from './sections/MemberTimeOffPanel';
import WorkHoursScheduleSection from './sections/WorkHoursScheduleSection';
import TeamOverviewSection from './sections/TeamOverviewSection';
import ApprovalQueueSection from './sections/ApprovalQueueSection';
import ClientJobTimeSection from './sections/ClientJobTimeSection';
import ReportsSection from './sections/ReportsSection';
import SettingsSection from './sections/SettingsSection';
import {
  HiClock,
  HiUsers,
  HiClipboardCheck,
  HiCollection,
  HiChartBar,
  HiCog,
  HiPlus,
  HiCalendar,
  HiClipboardList,
} from 'react-icons/hi';

const SECTIONS = [
  { id: 'my', label: 'My timesheet', icon: HiClock },
  { id: 'schedule', label: 'Schedule', icon: HiCalendar },
  { id: 'team', label: 'Team', icon: HiUsers },
  { id: 'approvals', label: 'Approvals', icon: HiClipboardCheck },
  { id: 'client', label: 'Client / job time', icon: HiCollection },
  { id: 'reports', label: 'Reports', icon: HiChartBar },
  { id: 'settings', label: 'Settings', icon: HiCog },
];

export default function TimesheetsPageContent() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [userAccount, setUserAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState('my');
  /** Teammate hub: log hours, time off, schedule overview (owners/admins use top tabs instead). */
  const [memberHub, setMemberHub] = useState('log');
  const [timeEntries, setTimeEntries] = useState([]);
  const [timeEntriesLoading, setTimeEntriesLoading] = useState(false);
  const [timeEntriesError, setTimeEntriesError] = useState(null);

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
  const memberRole = organization?.membership?.role;
  const isRegularMember = memberRole === 'member';
  const group = getTimeTrackingGroup(industry);
  const flags = useMemo(() => getFeatureFlagsForGroup(group), [group]);
  const memberTimeMode = useMemo(() => getMemberTimeTrackingMode(group), [group]);

  const clientTerm = getTermForIndustry(industry, 'client');
  const projectTerm = getTermForIndustry(industry, 'project');
  const teamTerm = getTermForIndustry(industry, 'team');

  const memberLogLabels = useMemo(
    () => (isRegularMember ? getMemberTimeLogLabels(memberTimeMode.mode, projectTerm) : null),
    [isRegularMember, memberTimeMode.mode, projectTerm]
  );

  const weekRange = useMemo(() => getMondayWeekRange(new Date()), []);
  const dayLabels = useMemo(
    () =>
      weekRange.dayDates.map((d) =>
        d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
      ),
    [weekRange]
  );

  useEffect(() => {
    if (!currentUser?.uid || !organization?.id) {
      setTimeEntries([]);
      setTimeEntriesLoading(false);
      setTimeEntriesError(null);
      return;
    }
    let cancelled = false;
    setTimeEntriesLoading(true);
    setTimeEntriesError(null);
    fetchOrgTimeEntriesForWeek(supabase, {
      organizationId: organization.id,
      userId: currentUser.uid,
      startYmd: weekRange.startYmd,
      endYmd: weekRange.endYmd,
      dayYmds: weekRange.dayYmds,
    })
      .then((rows) => {
        if (!cancelled) setTimeEntries(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[TimesheetsPageContent] org_time_entries', err);
          setTimeEntries([]);
          setTimeEntriesError(err.message || 'Could not load time entries.');
        }
      })
      .finally(() => {
        if (!cancelled) setTimeEntriesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid, organization?.id, weekRange.startYmd, weekRange.endYmd, weekRange.dayYmds]);

  const weeklyTotalHours = useMemo(
    () => timeEntries.reduce((sum, row) => sum + (Number(row.hours) || 0), 0),
    [timeEntries]
  );

  const adminTimesheetStats = useMemo(() => {
    const bill = timeEntries.filter((e) => e.billable).reduce((s, e) => s + (Number(e.hours) || 0), 0);
    const total = timeEntries.reduce((s, e) => s + (Number(e.hours) || 0), 0);
    const pending = timeEntries.filter((e) => e.status === 'Submitted').length;
    return {
      billableHours: bill,
      nonBillableHours: Math.max(0, total - bill),
      pendingApprovalCount: pending,
    };
  }, [timeEntries]);

  const sectionTabs = useMemo(() => {
    const withIndustryLabels = SECTIONS.map((s) => {
      if (s.id === 'client') {
        return { ...s, label: `${clientTerm} / job time` };
      }
      if (s.id === 'team') {
        return { ...s, label: `${teamTerm}` };
      }
      return s;
    });
    if (isRegularMember) {
      return withIndustryLabels.filter(
        (tab) =>
          tab.id !== 'schedule' &&
          tab.id !== 'team' &&
          tab.id !== 'approvals' &&
          tab.id !== 'reports' &&
          tab.id !== 'settings' &&
          tab.id !== 'client'
      );
    }
    if (!isAdminRole(memberRole)) {
      return withIndustryLabels.filter((tab) => tab.id !== 'schedule');
    }
    return withIndustryLabels;
  }, [clientTerm, teamTerm, isRegularMember, memberRole]);

  useEffect(() => {
    const availableIds = new Set(sectionTabs.map((tab) => tab.id));
    if (!availableIds.has(section)) {
      setSection('my');
    }
  }, [sectionTabs, section]);

  useEffect(() => {
    if (!router.isReady || isRegularMember || !isAdminRole(memberRole)) return;
    const { section: qSection, manageMember } = router.query;
    if (
      qSection === 'schedule' ||
      (typeof manageMember === 'string' && manageMember.trim().length > 0)
    ) {
      setSection('schedule');
    }
  }, [router.isReady, router.query.section, router.query.manageMember, isRegularMember, memberRole]);

  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-pulse">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-64" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full max-w-xl" />
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
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
        title={isRegularMember ? 'My work & time' : 'Time tracking'}
        description={
          isRegularMember
            ? 'Log your hours, request time off, and check your schedule. Some industries track time by the hour or shift; others by project, case, or job—this space adapts to how your org works.'
            : 'Log hours for payroll, client billing, and internal costing—one flexible engine, configurable by industry and how your team works.'
        }
        actions={
          <PrimaryButton type="button" className="gap-2" disabled title="Coming soon">
            <HiPlus className="w-5 h-5" />
            Add time
          </PrimaryButton>
        }
      />

      {timeEntriesError && (
        <div
          className="rounded-lg border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-800 dark:text-red-200"
          role="alert"
        >
          {timeEntriesError}
        </div>
      )}

      {isRegularMember && (
        <div
          className="flex flex-wrap items-center gap-2 border-b border-gray-200 dark:border-gray-600 pb-3 mb-2"
          role="tablist"
          aria-label="Time, time off, and schedule"
        >
          <button
            type="button"
            role="tab"
            aria-selected={memberHub === 'log'}
            onClick={() => setMemberHub('log')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              memberHub === 'log'
                ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-200'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <HiClock className="w-4 h-4 flex-shrink-0" aria-hidden />
            Log time
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={memberHub === 'timeoff'}
            onClick={() => setMemberHub('timeoff')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              memberHub === 'timeoff'
                ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-200'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <HiClipboardList className="w-4 h-4 flex-shrink-0" aria-hidden />
            Time off
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={memberHub === 'schedule'}
            onClick={() => setMemberHub('schedule')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              memberHub === 'schedule'
                ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-200'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <HiCalendar className="w-4 h-4 flex-shrink-0" aria-hidden />
            Schedule
          </button>
        </div>
      )}

      {/* Section tabs (hidden when only one section, e.g. regular members on My timesheet) */}
      {sectionTabs.length > 1 && (
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
      )}

      {section === 'my' && isRegularMember && memberHub === 'log' && (
        <MyTimesheetSection
          flags={flags}
          clientTerm={clientTerm}
          dayLabels={dayLabels}
          entries={timeEntries}
          weeklyTotalHours={weeklyTotalHours}
          isRegularMember
          memberLogLabels={memberLogLabels}
          loading={timeEntriesLoading}
        />
      )}
      {section === 'my' && isRegularMember && memberHub === 'timeoff' && <MemberTimeOffPanel />}
      {section === 'my' && isRegularMember && memberHub === 'schedule' && (
        <WorkHoursScheduleSection
          organizationId={organization?.id}
          currentUserId={currentUser?.uid}
          memberView
          teamTerm={teamTerm}
        />
      )}
      {section === 'schedule' && (
        <WorkHoursScheduleSection
          organizationId={organization?.id}
          currentUserId={currentUser?.uid}
          memberView={false}
          teamTerm={teamTerm}
        />
      )}
      {section === 'my' && !isRegularMember && (
        <MyTimesheetSection
          flags={flags}
          clientTerm={clientTerm}
          dayLabels={dayLabels}
          entries={timeEntries}
          weeklyTotalHours={weeklyTotalHours}
          isRegularMember={false}
          loading={timeEntriesLoading}
          adminStats={adminTimesheetStats}
        />
      )}
      {section === 'team' && <TeamOverviewSection teamTerm={teamTerm} projectTerm={projectTerm} clientTerm={clientTerm} />}
      {section === 'approvals' && <ApprovalQueueSection />}
      {section === 'client' && <ClientJobTimeSection clientTerm={clientTerm} projectTerm={projectTerm} />}
      {section === 'reports' && <ReportsSection />}
      {section === 'settings' && <SettingsSection />}
    </div>
  );
}
