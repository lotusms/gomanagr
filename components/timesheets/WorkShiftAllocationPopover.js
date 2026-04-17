'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Avatar } from '@/components/ui';
import { weekdayLabel, timeToInputValue } from '@/lib/orgWorkShiftPatterns';
import { formatTime } from '@/utils/dateTimeFormatters';

/** Slight overlap so the cursor can move from the bar into the popover without crossing dead space. */
const POPOVER_OFFSET = 0;
const POPOVER_OVERLAP_PX = 6;
const CLOSE_DELAY_MS = 280;
const VIEWPORT_MARGIN = 16;

/**
 * @param {Array<{ user_id: string, weekday: number, start_time: string, end_time: string }>} shifts
 * @param {string} userId
 * @param {'12h'|'24h'} timeFormat
 * @returns {Array<{ day: string, range: string }>}
 */
export function buildWeeklyHoursLines(shifts, userId, timeFormat) {
  if (!shifts?.length || !userId) return [];
  const rows = shifts.filter((s) => s.user_id === userId);
  rows.sort(
    (a, b) =>
      Number(a.weekday) - Number(b.weekday) ||
      timeToInputValue(a.start_time).localeCompare(timeToInputValue(b.start_time))
  );
  return rows.map((s) => ({
    day: weekdayLabel(Number(s.weekday)),
    range: `${formatTime(timeToInputValue(s.start_time), timeFormat)} – ${formatTime(timeToInputValue(s.end_time), timeFormat)}`,
  }));
}

function formatRole(role) {
  const r = String(role || '').trim();
  if (!r) return '';
  const s = r.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/**
 * Hover popover for a work-hours allocation bar: profile + full weekly pattern.
 *
 * @param {{
 *   className?: string,
 *   style?: React.CSSProperties,
 *   profile: { name: string, photoUrl?: string, email?: string, role?: string },
 *   weeklyLines: Array<{ day: string, range: string }>,
 *   blockRange: string,
 *   dayHeading: string,
 *   editScheduleHref?: string,
 *   children: React.ReactNode,
 * }} props
 */
export default function WorkShiftAllocationPopover({
  className = '',
  style,
  profile,
  weeklyLines = [],
  blockRange,
  dayHeading,
  editScheduleHref,
  children,
}) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const closeTimeoutRef = useRef(null);

  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const scheduleClose = () => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      setVisible(false);
    }, CLOSE_DELAY_MS);
  };

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const left = rect.left + rect.width / 2;
    const estH = 300;
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
    if (spaceBelow < estH) {
      setPosition({
        left,
        top: rect.top - estH - POPOVER_OFFSET,
      });
    } else {
      setPosition({
        left,
        top: rect.bottom - POPOVER_OVERLAP_PX,
      });
    }
  };

  const handleTriggerMouseEnter = () => {
    clearCloseTimeout();
    updatePosition();
    setVisible(true);
  };

  const handleTriggerMouseLeave = () => {
    scheduleClose();
  };

  const handlePopoverMouseEnter = () => {
    clearCloseTimeout();
  };

  const handlePopoverMouseLeave = () => {
    scheduleClose();
  };

  useEffect(() => {
    if (visible && triggerRef.current) updatePosition();
  }, [visible]);

  useLayoutEffect(() => {
    if (!visible || !triggerRef.current || !popoverRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const popoverRect = popoverRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    if (popoverRect.height > spaceBelow - VIEWPORT_MARGIN) {
      setPosition({
        left: triggerRect.left + triggerRect.width / 2,
        top: triggerRect.top - popoverRect.height - POPOVER_OFFSET,
      });
    } else {
      setPosition({
        left: triggerRect.left + triggerRect.width / 2,
        top: triggerRect.bottom - POPOVER_OVERLAP_PX,
      });
    }
  }, [visible]);

  useEffect(() => () => clearCloseTimeout(), []);

  const roleLabel = formatRole(profile.role);
  const email = (profile.email || '').trim();

  const popoverEl =
    visible &&
    typeof document !== 'undefined' && (
      <div
        ref={popoverRef}
        role="dialog"
        aria-label={`${profile.name} work hours`}
        className="fixed z-[9999] w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-xl text-left"
        style={{
          left: position.left,
          top: position.top,
          transform: 'translateX(-50%)',
        }}
        onMouseEnter={handlePopoverMouseEnter}
        onMouseLeave={handlePopoverMouseLeave}
      >
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex gap-3 min-w-0">
            <Avatar
              src={profile.photoUrl || undefined}
              name={profile.name}
              size="md"
              className="flex-shrink-0 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200"
            />
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-gray-900 dark:text-white leading-snug">{profile.name}</div>
              {email ? (
                <div className="text-sm text-gray-600 dark:text-gray-300 truncate mt-0.5" title={email}>
                  {email}
                </div>
              ) : null}
              {roleLabel ? (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Role: {roleLabel}</div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3 text-sm">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              This day
            </div>
            <div className="text-gray-800 dark:text-gray-200">{dayHeading}</div>
            <div className="text-primary-700 dark:text-primary-300 font-medium mt-0.5">{blockRange}</div>
          </div>

          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
              Weekly hours set
            </div>
            {weeklyLines.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No pattern saved for this person.</p>
            ) : (
              <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                {weeklyLines.map((line, idx) => (
                  <li key={`${line.day}-${line.range}-${idx}`} className="flex justify-between gap-3 text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300 shrink-0">{line.day}</span>
                    <span className="text-gray-600 dark:text-gray-400 text-right tabular-nums">{line.range}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {editScheduleHref ? (
          <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-gray-700">
            <Link
              href={editScheduleHref}
              className="flex w-full items-center justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800"
            >
              Edit schedule &amp; time off
            </Link>
          </div>
        ) : null}
      </div>
    );

  const hoverHandlers = {
    onMouseEnter: handleTriggerMouseEnter,
    onMouseLeave: handleTriggerMouseLeave,
  };

  return (
    <>
      <div ref={triggerRef} className={className} style={style}>
        <div className="w-full h-full min-w-0 min-h-0 flex items-center cursor-default" {...hoverHandlers}>
          {children}
        </div>
      </div>
      {typeof document !== 'undefined' && popoverEl && createPortal(popoverEl, document.body)}
    </>
  );
}
