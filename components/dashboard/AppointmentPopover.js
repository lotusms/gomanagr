/**
 * Reusable appointment popover: shows a compact trigger (e.g. title + time).
 * On hover, shows a rich HTML popover with title, team member, time, service, client, notes (3-line clip).
 * Only "Click to edit" inside the popover opens the appointment in edit mode; the trigger just shows the popover.
 *
 * @param {Object} appointment - { id, title, staffId, start, end, services, clientId, label, ... }
 * @param {Array} teamMembers - [{ id, name }, ...]
 * @param {Array} clients - [{ id, name, company? }, ...]
 * @param {string} timeFormat - '12h' | '24h'
 * @param {Function} onOpenEdit - (appointment) => void when user clicks to edit
 * @param {Function} [onDelete] - (appointment) => void when user clicks delete in popover
 * @param {boolean} [canEdit=true] - If false, "Click to edit" is hidden (trigger only opens popover)
 * @param {boolean} [canDelete=true] - If false, Delete button is hidden
 * @param {React.ReactNode} children - Trigger content (optional; default is title + time)
 */

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatTime } from '@/utils/dateTimeFormatters';
import { HiTrash } from 'react-icons/hi';
import { getTermForIndustry, getTermSingular } from '@/components/clients/clientProfileConstants';

const POPOVER_OFFSET = 8;
const NOTES_LINE_CLAMP = 3;
const CLOSE_DELAY_MS = 150;
const VIEWPORT_MARGIN = 16;
const POPOVER_ESTIMATED_HEIGHT = 280;

export default function AppointmentPopover({
  appointment,
  teamMembers = [],
  clients = [],
  timeFormat = '24h',
  onOpenEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
  industry = null,
  children,
}) {
  const teamMemberLabel = getTermSingular(getTermForIndustry(industry, 'teamMember'));
  const clientLabel = getTermSingular(getTermForIndustry(industry, 'client')) || 'Client';
  const serviceTermLabel = getTermSingular(getTermForIndustry(industry, 'services')) || 'Service';
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [openUp, setOpenUp] = useState(false);
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
      setOpenUp(false);
    }, CLOSE_DELAY_MS);
  };

  const appointmentStaffIds = Array.isArray(appointment?.staffIds) && appointment.staffIds.length > 0
    ? appointment.staffIds
    : (appointment?.staffId ? [appointment.staffId] : []);
  const teamMemberNames = appointmentStaffIds
    .map((sid) => teamMembers.find((m) => String(m.id) === String(sid))?.name)
    .filter(Boolean);
  const teamMemberName = teamMemberNames.length > 0 ? teamMemberNames.join(', ') : '—';
  const client = appointment?.clientId
    ? clients.find((c) => String(c.id) === String(appointment.clientId))
    : null;
  const clientName = client ? (client.company ? `${client.name} (${client.company})` : client.name) : '—';
  const serviceNames = Array.isArray(appointment?.services) ? appointment.services : [];
  const serviceLabel = serviceNames.length > 0 ? serviceNames.join(', ') : '—';
  const timeRange =
    appointment?.start && appointment?.end
      ? `${formatTime(appointment.start, timeFormat)} – ${formatTime(appointment.end, timeFormat)}`
      : '—';
  const title = (appointment?.title || '').trim() || 'Untitled';
  const notes = (appointment?.label || '').trim() || '';

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const left = rect.left + rect.width / 2;
    const spaceBelow = window.innerHeight - rect.bottom - POPOVER_OFFSET - VIEWPORT_MARGIN;
    if (spaceBelow < POPOVER_ESTIMATED_HEIGHT) {
      setOpenUp(true);
      setPosition({
        left,
        top: rect.top - POPOVER_ESTIMATED_HEIGHT - POPOVER_OFFSET,
      });
    } else {
      setOpenUp(false);
      setPosition({
        left,
        top: rect.bottom + POPOVER_OFFSET,
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

  const handleTriggerClick = () => {
    clearCloseTimeout();
    updatePosition();
    setVisible(true);
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (canEdit) onOpenEdit?.(appointment);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    onDelete?.(appointment);
  };

  useEffect(() => {
    if (visible && triggerRef.current) updatePosition();
  }, [visible]);

  useLayoutEffect(() => {
    if (!visible || !triggerRef.current || !popoverRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const popoverRect = popoverRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - triggerRect.bottom - POPOVER_OFFSET;
    if (popoverRect.height > spaceBelow - VIEWPORT_MARGIN) {
      setOpenUp(true);
      setPosition({
        left: triggerRect.left + triggerRect.width / 2,
        top: triggerRect.top - popoverRect.height - POPOVER_OFFSET,
      });
    }
  }, [visible]);

  useEffect(() => {
    return () => clearCloseTimeout();
  }, []);

  const triggerContent =
    children !== undefined ? (
      children
    ) : (
      <>
        <span className="text-xs font-medium truncate block">{title}</span>
        <span className="text-xs text-gray-600 dark:text-primary-300 truncate block mt-0.5">{timeRange}</span>
      </>
    );

  const popoverEl =
    visible &&
    typeof document !== 'undefined' && (
      <div
        ref={popoverRef}
        role="dialog"
        aria-label="Appointment details"
        className="fixed z-[9999] w-72 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-xl p-4 text-left"
        style={{
          left: position.left,
          top: position.top,
          transform: 'translateX(-50%)',
        }}
        onMouseEnter={handlePopoverMouseEnter}
        onMouseLeave={handlePopoverMouseLeave}
      >
        <div className="space-y-2 text-sm">
          <div className="font-semibold text-gray-900 dark:text-white">{title}</div>
          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-gray-600 dark:text-gray-300">
            <span className="text-gray-500 dark:text-gray-400">Time</span>
            <span>{timeRange}</span>
            <span className="text-gray-500 dark:text-gray-400">{teamMemberLabel}</span>
            <span>{teamMemberName}</span>
            <span className="text-gray-500 dark:text-gray-400">{serviceTermLabel}</span>
            <span className="truncate">{serviceLabel}</span>
            <span className="text-gray-500 dark:text-gray-400">{clientLabel}</span>
            <span className="truncate">{clientName}</span>
          </div>
          {notes ? (
            <div className="pt-1 border-t border-gray-100 dark:border-gray-700">
              <div className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Notes</div>
              <div
                className="text-gray-600 dark:text-gray-300 break-words line-clamp-3"
                style={{ display: '-webkit-box', WebkitLineClamp: NOTES_LINE_CLAMP, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
              >
                {notes}
              </div>
            </div>
          ) : null}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          {canEdit ? (
            <button
              type="button"
              onClick={handleEditClick}
              className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium cursor-pointer"
            >
              Click to edit
            </button>
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-500">View only</span>
          )}
          {canDelete && onDelete ? (
            <button
              type="button"
              onClick={handleDeleteClick}
              className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
              aria-label="Delete appointment"
            >
              <HiTrash className="w-3.5 h-3.5" />
              Delete
            </button>
          ) : null}
        </div>
      </div>
    );

  return (
    <div
      ref={triggerRef}
      role="button"
      tabIndex={0}
      className="relative inline-block min-w-0 max-w-full w-full cursor-pointer"
      onMouseEnter={handleTriggerMouseEnter}
      onMouseLeave={handleTriggerMouseLeave}
      onClick={handleTriggerClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTriggerClick(); } }}
    >
      {triggerContent}
      {typeof document !== 'undefined' && popoverEl && createPortal(popoverEl, document.body)}
    </div>
  );
}
