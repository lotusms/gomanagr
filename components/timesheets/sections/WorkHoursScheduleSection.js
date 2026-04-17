'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import * as Dialog from '@radix-ui/react-dialog';
import { supabase } from '@/lib/supabase';
import {
  WEEKDAY_SHORT,
  fetchWorkShiftsForMember,
  fetchAllWorkShiftsForOrg,
  replaceWorkShiftsForMember,
  timeToInputValue,
  weekdayLabel,
} from '@/lib/orgWorkShiftPatterns';
import WorkHoursCalendarGrid from '@/components/timesheets/WorkHoursCalendarGrid';
import { useUserAccount } from '@/lib/UserAccountContext';
import { Avatar } from '@/components/ui';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import { HiCalendar, HiPlus, HiSearch, HiTrash, HiUserAdd, HiX } from 'react-icons/hi';

function formatDisplayTime(isoOrTime) {
  const t = timeToInputValue(isoOrTime);
  const parts = t.split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (Number.isNaN(h) || Number.isNaN(m)) return t;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** `HH:MM` from &lt;input type="time" /&gt; → minutes from midnight */
function timeStrToMinutes(str) {
  const parts = String(str || '').trim().split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

/** Same calendar day only; null if end is not after start. */
function shiftDurationMinutes(startTime, endTime) {
  const a = timeStrToMinutes(startTime);
  const b = timeStrToMinutes(endTime);
  if (a == null || b == null || b <= a) return null;
  return b - a;
}

/** Human-readable length for one row (e.g. 10h, 9h 30m). */
function formatShiftTotalHours(startTime, endTime) {
  const mins = shiftDurationMinutes(startTime, endTime);
  if (mins == null) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h}h`;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function nextLocalKey() {
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function draftFromDbRows(rows) {
  return (rows || []).map((r) => ({
    localKey: r.id ? String(r.id) : nextLocalKey(),
    weekday: Number(r.weekday),
    startTime: timeToInputValue(r.start_time),
    endTime: timeToInputValue(r.end_time),
  }));
}

/** Profile / registration images from merged user account (same sources as header UserMenu). */
function accountAvatarUrl(account) {
  if (!account || typeof account !== 'object') return '';
  const raw = account.photoUrl || account.pictureUrl || account.companyLogo;
  if (raw == null || raw === undefined) return '';
  const s = String(raw).trim();
  return s.length > 0 ? s : '';
}

function memberPhotoUrl(entry) {
  if (!entry) return '';
  const fromApi = (entry.photoUrl || '').trim();
  if (fromApi) return fromApi;
  const p = entry?.user?.profile;
  if (p && typeof p === 'object') {
    const u = p.photoUrl || p.pictureUrl || p.avatarUrl || p.avatar;
    if (u) return String(u).trim();
  }
  return '';
}

function memberDisplayName(entry) {
  if (!entry) return '…';
  const dn = (entry.displayName || '').trim();
  if (dn) return dn;
  const u = entry.user;
  const parts = [u?.first_name, u?.last_name].filter((x) => x != null && String(x).trim() !== '');
  if (parts.length) return parts.map((x) => String(x).trim()).join(' ');
  return (u?.email || '').trim() || String(entry.user_id || '').slice(0, 8) || 'Member';
}

function WeeklyHoursRowList({ draftRows, onRowChange, onRemoveRow, emptyHint }) {
  return (
    <>
      {draftRows.length === 0 && emptyHint ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic py-1">{emptyHint}</p>
      ) : null}
      {draftRows.map((row) => {
        const blockMins = shiftDurationMinutes(row.startTime, row.endTime);
        const totalLabel = formatShiftTotalHours(row.startTime, row.endTime);
        const titleHint =
          blockMins == null
            ? 'End time must be after start (same day)'
            : `${totalLabel} (${(blockMins / 60).toFixed(2)} h)`;
        return (
          <div
            key={row.localKey}
            className="flex flex-col gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-600 w-full sm:flex-row sm:items-center sm:gap-2"
          >
            <select
              className="w-full sm:w-[4.75rem] shrink-0 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm"
              value={row.weekday}
              onChange={(e) => onRowChange(row.localKey, 'weekday', Number(e.target.value))}
              aria-label="Day"
            >
              {WEEKDAY_SHORT.map((label, idx) => (
                <option key={label} value={idx}>
                  {label}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1.5 w-full min-w-0 sm:flex-1">
              <input
                type="time"
                className="min-w-0 flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm"
                value={row.startTime}
                onChange={(e) => onRowChange(row.localKey, 'startTime', e.target.value)}
                aria-label="Start time"
              />
              <span className="text-gray-500 shrink-0 text-sm" aria-hidden>
                –
              </span>
              <input
                type="time"
                className="min-w-0 flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1.5 text-sm"
                value={row.endTime}
                onChange={(e) => onRowChange(row.localKey, 'endTime', e.target.value)}
                aria-label="End time"
              />
            </div>
            <div className="flex items-center justify-end gap-2 shrink-0 sm:ml-auto border-t border-gray-200/80 dark:border-gray-600/80 pt-2 sm:pt-0 sm:border-0">
              <span
                className="text-xs font-semibold tabular-nums text-gray-700 dark:text-gray-200 whitespace-nowrap"
                title={titleHint}
              >
                <span className="sr-only">Block total hours: </span>
                {totalLabel}
              </span>
              <button
                type="button"
                onClick={() => onRemoveRow(row.localKey)}
                className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                aria-label="Remove row"
              >
                <HiTrash className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}

/**
 * Weekly work hours (which days / times each person works). Separate from task appointments.
 *
 * @param {{
 *   organizationId: string | undefined,
 *   currentUserId: string | undefined,
 *   memberView: boolean,
 *   teamTerm?: string,
 * }} props
 */
export default function WorkHoursScheduleSection({
  organizationId,
  currentUserId,
  memberView,
  teamTerm = 'Team',
}) {
  const router = useRouter();
  const { account: userAccountCtx, preview: previewAccountCtx } = useUserAccount();
  const viewerAccount = previewAccountCtx ? { ...userAccountCtx, ...previewAccountCtx } : userAccountCtx;
  const selfAvatarUrl = useMemo(() => accountAvatarUrl(viewerAccount), [viewerAccount]);

  const manageMemberId =
    !memberView && router.isReady && typeof router.query.manageMember === 'string'
      ? router.query.manageMember.trim() || null
      : null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [members, setMembers] = useState([]);
  const [orgShifts, setOrgShifts] = useState([]);
  const [draftRows, setDraftRows] = useState([]);
  const [myShifts, setMyShifts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [membersLoading, setMembersLoading] = useState(true);
  const [teamSearch, setTeamSearch] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addTargetUserId, setAddTargetUserId] = useState(null);
  const [addDraftRows, setAddDraftRows] = useState([]);
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const clearManageMember = useCallback(() => {
    const next = { ...router.query };
    delete next.manageMember;
    router.replace({ pathname: router.pathname, query: next }, undefined, { shallow: true });
  }, [router]);

  const shiftsByUser = useMemo(() => {
    const m = new Map();
    for (const r of orgShifts) {
      if (!m.has(r.user_id)) m.set(r.user_id, []);
      m.get(r.user_id).push(r);
    }
    return m;
  }, [orgShifts]);

  const loadOrgShifts = useCallback(async () => {
    if (!organizationId) return [];
    const rows = await fetchAllWorkShiftsForOrg(supabase, { organizationId });
    setOrgShifts(rows);
    return rows;
  }, [organizationId]);

  useEffect(() => {
    if (!organizationId || !currentUserId || memberView) {
      setMembers([]);
      setMembersLoading(false);
      return;
    }
    let cancel = false;
    setMembersLoading(true);
    fetch('/api/get-org-members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId, callerUserId: currentUserId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancel) setMembers(Array.isArray(data?.members) ? data.members : []);
      })
      .catch(() => {
        if (!cancel) setMembers([]);
      })
      .finally(() => {
        if (!cancel) setMembersLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [organizationId, currentUserId, memberView]);

  useEffect(() => {
    if (!organizationId || !currentUserId || memberView) {
      setOrgShifts([]);
      setLoading(false);
      return;
    }
    let cancel = false;
    setLoading(true);
    setError(null);
    fetchAllWorkShiftsForOrg(supabase, { organizationId })
      .then((rows) => {
        if (!cancel) setOrgShifts(rows);
      })
      .catch((e) => {
        if (!cancel) {
          setOrgShifts([]);
          setError(e.message || 'Could not load work schedules.');
        }
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [organizationId, currentUserId, memberView]);

  useEffect(() => {
    if (memberView || !manageMemberId) return;
    const raw = shiftsByUser.get(manageMemberId) || [];
    setDraftRows(draftFromDbRows(raw));
  }, [manageMemberId, shiftsByUser, memberView]);

  useEffect(() => {
    if (memberView || !router.isReady || !manageMemberId || membersLoading || members.length === 0) return;
    if (!members.some((m) => m.user_id === manageMemberId)) {
      clearManageMember();
    }
  }, [
    memberView,
    router.isReady,
    manageMemberId,
    membersLoading,
    members,
    clearManageMember,
  ]);

  useEffect(() => {
    if (!organizationId || !currentUserId || !memberView) {
      setMyShifts([]);
      return;
    }
    let cancel = false;
    setLoading(true);
    setError(null);
    fetchWorkShiftsForMember(supabase, { organizationId, userId: currentUserId })
      .then((rows) => {
        if (!cancel) setMyShifts(rows);
      })
      .catch((e) => {
        if (!cancel) {
          setMyShifts([]);
          setError(e.message || 'Could not load your work schedule.');
        }
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [organizationId, currentUserId, memberView]);

  const handleAddRow = () => {
    setDraftRows((prev) => {
      const last = prev.length > 0 ? prev[prev.length - 1] : null;
      if (last) {
        const nextWeekday = (Number(last.weekday) + 1) % 7;
        return [
          ...prev,
          {
            localKey: nextLocalKey(),
            weekday: nextWeekday,
            startTime: last.startTime,
            endTime: last.endTime,
          },
        ];
      }
      return [...prev, { localKey: nextLocalKey(), weekday: 0, startTime: '09:00', endTime: '17:00' }];
    });
  };

  const handleRemoveRow = (localKey) => {
    setDraftRows((prev) => prev.filter((r) => r.localKey !== localKey));
  };

  const handleRowChange = (localKey, field, value) => {
    setDraftRows((prev) => prev.map((r) => (r.localKey === localKey ? { ...r, [field]: value } : r)));
  };

  const handleAddRowForAddModal = () => {
    setAddDraftRows((prev) => {
      const last = prev.length > 0 ? prev[prev.length - 1] : null;
      if (last) {
        const nextWeekday = (Number(last.weekday) + 1) % 7;
        return [
          ...prev,
          {
            localKey: nextLocalKey(),
            weekday: nextWeekday,
            startTime: last.startTime,
            endTime: last.endTime,
          },
        ];
      }
      return [...prev, { localKey: nextLocalKey(), weekday: 1, startTime: '09:00', endTime: '17:00' }];
    });
  };

  const handleRemoveAddRow = (localKey) => {
    setAddDraftRows((prev) => prev.filter((r) => r.localKey !== localKey));
  };

  const handleAddRowChange = (localKey, field, value) => {
    setAddDraftRows((prev) => prev.map((r) => (r.localKey === localKey ? { ...r, [field]: value } : r)));
  };

  const persistWeeklyHours = async (userId, rows) => {
    if (!organizationId || !userId || !currentUserId) return;
    setSaving(true);
    setError(null);
    try {
      const payload = rows.map((r) => ({
        weekday: Number(r.weekday),
        startTime: r.startTime,
        endTime: r.endTime,
      }));
      await replaceWorkShiftsForMember(supabase, {
        organizationId,
        userId,
        rows: payload,
      });
      await loadOrgShifts();
    } catch (e) {
      setError(e.message || 'Could not save schedule.');
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveManage = async () => {
    if (!manageMemberId) return;
    await persistWeeklyHours(manageMemberId, draftRows);
  };

  const handleSaveAdd = async () => {
    if (!addTargetUserId) return;
    await persistWeeklyHours(addTargetUserId, addDraftRows);
    setAddModalOpen(false);
  };

  const mySummary = useMemo(() => {
    if (myShifts.length === 0) return null;
    const byDay = new Map();
    for (const r of myShifts) {
      const w = Number(r.weekday);
      if (!byDay.has(w)) byDay.set(w, []);
      byDay.get(w).push(`${formatDisplayTime(r.start_time)}–${formatDisplayTime(r.end_time)}`);
    }
    const lines = [];
    for (let w = 0; w <= 6; w++) {
      if (!byDay.has(w)) continue;
      lines.push({
        day: weekdayLabel(w),
        spans: byDay.get(w),
      });
    }
    return lines;
  }, [myShifts]);

  const manageMemberEntry = useMemo(
    () => (manageMemberId ? members.find((x) => x.user_id === manageMemberId) : null),
    [members, manageMemberId]
  );
  const manageMemberLabel = memberDisplayName(manageMemberEntry);
  const manageMemberPhoto = memberPhotoUrl(manageMemberEntry);

  const adminBusy = membersLoading || loading;

  const unscheduledMembers = useMemo(
    () => members.filter((m) => (shiftsByUser.get(m.user_id) || []).length === 0),
    [members, shiftsByUser]
  );

  const openAddModal = useCallback(() => {
    setAddModalOpen(true);
    if (unscheduledMembers.length > 0) {
      const first = unscheduledMembers[0];
      setAddTargetUserId(first.user_id);
      setAddDraftRows([{ localKey: nextLocalKey(), weekday: 1, startTime: '09:00', endTime: '17:00' }]);
    } else {
      setAddTargetUserId(null);
      setAddDraftRows([]);
    }
  }, [unscheduledMembers]);

  const getEditMemberScheduleHref = useCallback(
    (userId) => {
      if (!userId || memberView) return undefined;
      return `${router.pathname}?section=schedule&manageMember=${encodeURIComponent(userId)}`;
    },
    [memberView, router.pathname]
  );

  const filteredShiftsForCalendar = useMemo(() => {
    const q = teamSearch.trim().toLowerCase();
    if (!q) return orgShifts;
    const allow = new Set(
      members
        .filter((m) => {
          const name = memberDisplayName(m).toLowerCase();
          const email = (m.user?.email || '').toLowerCase();
          return name.includes(q) || email.includes(q);
        })
        .map((m) => m.user_id)
    );
    return orgShifts.filter((s) => allow.has(s.user_id));
  }, [orgShifts, members, teamSearch]);

  const searchMatchCount = useMemo(() => {
    const q = teamSearch.trim().toLowerCase();
    if (!q) return members.length;
    return members.filter((m) => {
      const name = memberDisplayName(m).toLowerCase();
      const email = (m.user?.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    }).length;
  }, [members, teamSearch]);

  const resolveMember = useCallback(
    (userId) => {
      const m = members.find((x) => x.user_id === userId);
      if (!m) return { label: String(userId || '').slice(0, 8) || 'Member', photoUrl: '', email: '', role: '' };
      return {
        label: memberDisplayName(m),
        photoUrl: memberPhotoUrl(m),
        email: (m.user?.email || '').trim(),
        role: (m.role || '').trim(),
      };
    },
    [members]
  );

  const memberCalendarShifts = useMemo(
    () =>
      (myShifts || []).map((r) => ({
        user_id: currentUserId,
        weekday: r.weekday,
        start_time: r.start_time,
        end_time: r.end_time,
      })),
    [myShifts, currentUserId]
  );

  const resolveMemberSolo = useCallback(
    (_uid) => ({
      label: 'You',
      photoUrl: selfAvatarUrl,
      email: (viewerAccount?.email || '').trim(),
      role: '',
    }),
    [selfAvatarUrl, viewerAccount?.email]
  );

  const calendarNavHandlers = useMemo(
    () => ({
      onPrev: () =>
        setCalendarCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 })),
      onNext: () =>
        setCalendarCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 })),
      onToday: () => {
        const d = new Date();
        const y = d.getFullYear();
        const m = d.getMonth();
        const day = d.getDate();
        const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        setCalendarCursor({ year: y, month: m });
        requestAnimationFrame(() => {
          document.getElementById(`wh-day-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      },
    }),
    []
  );

  if (!organizationId || !currentUserId) {
    return (
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Sign in and join an organization to use work schedules.
      </p>
    );
  }

  const migrationHint = String(error || '').toLowerCase().includes('relation') ||
    String(error || '').toLowerCase().includes('does not exist');

  if (memberView) {
    return (
      <div className="space-y-6">
        {error && (
          <div
            className="rounded-lg border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-800 dark:text-red-200"
            role="alert"
          >
            {error}
            {migrationHint ? (
              <span className="block mt-1 text-xs opacity-90">
                Apply migration <code className="text-xs">077_org_work_shift_patterns.sql</code> in Supabase.
              </span>
            ) : null}
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-4 sm:p-6 shadow-sm max-sm:-mx-1">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <HiCalendar className="w-5 h-5 text-primary-600 dark:text-primary-400" aria-hidden />
            Your work week
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Recurring weekly hours set by your {teamTerm.toLowerCase()} admin. Separate from client appointments and tasks on the
            main{' '}
            <Link href="/dashboard/schedule" className="text-primary-600 dark:text-primary-400 underline hover:no-underline">
              Schedule
            </Link>{' '}
            page.
          </p>

          {loading ? (
            <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">Loading…</p>
          ) : mySummary && mySummary.length > 0 ? (
            <div className="mt-6 space-y-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Same pattern repeats every week. Your hours appear on each day like the tasks calendar—hover a block for details.
              </p>
              <WorkHoursCalendarGrid
                year={calendarCursor.year}
                month={calendarCursor.month}
                shifts={memberCalendarShifts}
                resolveMember={resolveMemberSolo}
                teamColumnLabel={teamTerm}
                variant="monthGrid"
                {...calendarNavHandlers}
              />
            </div>
          ) : (
            <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">
              No weekly hours has been set for you yet. Ask an admin to add your days and hours in Time tracking → Schedule.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div
          className="rounded-lg border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-800 dark:text-red-200"
          role="alert"
        >
          {error}
          {migrationHint ? (
            <span className="block mt-1 text-xs">
              Apply migration <code className="text-xs">077_org_work_shift_patterns.sql</code> in Supabase.
            </span>
          ) : null}
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-4 sm:p-6 shadow-sm max-sm:-mx-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <HiCalendar className="w-5 h-5 text-primary-600 dark:text-primary-400" aria-hidden />
              Work schedules ({teamTerm})
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-3xl">
              One calendar for everyone: times across the top, days down the left; each block shows who is working. Hover a block
              for details—you can move the cursor into the card and open <span className="font-medium text-gray-800 dark:text-gray-200">Edit schedule &amp; time off</span>, or click someone&apos;s name in the bar. Use{' '}
              <span className="font-medium text-gray-800 dark:text-gray-200">Add to schedule</span> only for {teamTerm.toLowerCase()} members who
              don&apos;t have weekly hours yet. Client appointments stay on the{' '}
              <Link href="/dashboard/schedule" className="text-primary-600 dark:text-primary-400 underline hover:no-underline">
                Schedule
              </Link>{' '}
              page.
            </p>
          </div>
          <PrimaryButton
            type="button"
            className="gap-2 shrink-0 self-start"
            disabled={members.length === 0 || adminBusy}
            onClick={openAddModal}
          >
            <HiUserAdd className="w-4 h-4" aria-hidden />
            Add to schedule
          </PrimaryButton>
        </div>

        {adminBusy && members.length === 0 ? (
          <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">Loading…</p>
        ) : members.length === 0 ? (
          <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">No {teamTerm.toLowerCase()} members found.</p>
        ) : manageMemberId && manageMemberEntry ? (
          <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-900/30 p-4 sm:p-6 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar
                  src={manageMemberPhoto || undefined}
                  name={manageMemberLabel}
                  size="md"
                  className="flex-shrink-0"
                />
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight">
                    {manageMemberLabel}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    Weekly hours, coverage, and time off
                  </p>
                </div>
              </div>
              <SecondaryButton
                type="button"
                className="w-full sm:w-auto justify-center shrink-0"
                onClick={clearManageMember}
              >
                Back to team calendar
              </SecondaryButton>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              One row per time block. Extra rows on the same day for split shifts. Same day only—no overnight.
            </p>
            <div className="space-y-2 max-h-[min(52vh,28rem)] overflow-y-auto pr-1">
              <WeeklyHoursRowList
                draftRows={draftRows}
                onRowChange={handleRowChange}
                onRemoveRow={handleRemoveRow}
                emptyHint="No rows yet—add below, or save to clear this person's pattern."
              />
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 flex-wrap">
              <PrimaryButton
                type="button"
                className="gap-1.5 w-full sm:w-auto justify-center"
                onClick={handleAddRow}
              >
                <HiPlus className="w-4 h-4" />
                Add day / hours
              </PrimaryButton>
              <PrimaryButton
                type="button"
                className="w-full sm:w-auto justify-center"
                onClick={handleSaveManage}
                disabled={saving || !manageMemberId}
              >
                {saving ? 'Saving…' : 'Save weekly hours'}
              </PrimaryButton>
            </div>
            <div className="pt-5 mt-2 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Time off</h4>
              <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">
                Per-person time-off rules and requests will show here as that workflow is wired up. Until then, use the Approvals
                tab for anything pending org-wide.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-5 space-y-2">
              <label className="relative block max-w-xl">
                <span className="sr-only">Search {teamTerm.toLowerCase()} by name or email</span>
                <HiSearch
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                  aria-hidden
                />
                <input
                  type="search"
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  placeholder="Filter calendar by name or email…"
                  autoComplete="off"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                />
              </label>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 tabular-nums">
                {teamSearch.trim()
                  ? `Showing shifts for ${searchMatchCount} of ${members.length} people`
                  : `Hover a shift for details, or click a name to edit (${members.length} ${
                      members.length === 1 ? 'person' : 'people'
                    })`}
              </p>
            </div>

            <div className="mt-4">
              <WorkHoursCalendarGrid
                year={calendarCursor.year}
                month={calendarCursor.month}
                shifts={filteredShiftsForCalendar}
                resolveMember={resolveMember}
                getEditMemberScheduleHref={getEditMemberScheduleHref}
                teamColumnLabel={teamTerm}
                {...calendarNavHandlers}
              />
            </div>
          </>
        )}
      </div>

      <Dialog.Root open={addModalOpen} onOpenChange={setAddModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] data-[state=open]:animate-[fadeIn_150ms_ease-out] data-[state=closed]:animate-[fadeOut_150ms_ease-out]" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-[201] w-full max-w-lg max-h-[min(92vh,720px)] flex flex-col data-[state=open]:animate-[scaleIn_200ms_ease-out] data-[state=closed]:animate-[scaleOut_200ms_ease-out] focus:outline-none overflow-hidden border border-gray-100 dark:border-gray-700">
            <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="min-w-0">
                <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white leading-tight">
                  {unscheduledMembers.length > 0 ? 'Add weekly hours' : 'No one left to add'}
                </Dialog.Title>
                <Dialog.Description className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {unscheduledMembers.length > 0 ? (
                    <>
                      Choose a {teamTerm.toLowerCase()} member who does not have weekly hours yet. One row per time block; same
                      day only—no overnight.
                    </>
                  ) : (
                    <>
                      Everyone already in your {teamTerm.toLowerCase()} has weekly hours. Invite someone new under Team, then
                      you can add their hours here.
                    </>
                  )}
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400"
                  aria-label="Close"
                >
                  <HiX className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {unscheduledMembers.length > 0 ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {teamTerm} member (not on the schedule yet)
                    </label>
                    <select
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
                      value={addTargetUserId || ''}
                      onChange={(e) => {
                        const uid = e.target.value;
                        setAddTargetUserId(uid);
                        setAddDraftRows([
                          { localKey: nextLocalKey(), weekday: 1, startTime: '09:00', endTime: '17:00' },
                        ]);
                      }}
                    >
                      {unscheduledMembers.map((m) => (
                        <option key={m.user_id} value={m.user_id}>
                          {memberDisplayName(m)}
                          {(m.user?.email || '').trim() ? ` · ${m.user.email}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <WeeklyHoursRowList
                    draftRows={addDraftRows}
                    onRowChange={handleAddRowChange}
                    onRemoveRow={handleRemoveAddRow}
                    emptyHint={null}
                  />
                </>
              ) : (
                <div className="space-y-4 py-1">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    When a new person joins your organization, they will appear in this list until you set their weekly pattern.
                  </p>
                  <Link
                    href="/dashboard/team"
                    className="inline-flex text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                    onClick={() => setAddModalOpen(false)}
                  >
                    Open Team → invite or manage members
                  </Link>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40">
              <SecondaryButton type="button" className="w-full sm:w-auto justify-center" onClick={() => setAddModalOpen(false)}>
                {unscheduledMembers.length > 0 ? 'Cancel' : 'Close'}
              </SecondaryButton>
              {unscheduledMembers.length > 0 ? (
                <>
                  <PrimaryButton
                    type="button"
                    className="gap-1.5 w-full sm:w-auto justify-center"
                    onClick={handleAddRowForAddModal}
                  >
                    <HiPlus className="w-4 h-4" />
                    Add day / hours
                  </PrimaryButton>
                  <PrimaryButton
                    type="button"
                    className="w-full sm:w-auto justify-center"
                    onClick={handleSaveAdd}
                    disabled={saving || !addTargetUserId}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </PrimaryButton>
                </>
              ) : null}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
