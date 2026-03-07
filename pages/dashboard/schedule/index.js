import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useScheduleData } from '@/lib/useScheduleData';
import { getUserAccountFromServer, deleteAppointment } from '@/services/userService';
import Schedule from '@/components/dashboard/Schedule';
import SchedulePageSkeleton from '@/components/dashboard/SchedulePageSkeleton';
import { PageHeader, ConfirmationDialog } from '@/components/ui';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import { HiPlus, HiX } from 'react-icons/hi';
import * as Dialog from '@radix-ui/react-dialog';
import { getRecurrenceBaseId, getRecurrenceSeriesFromDate, isPartOfRecurringSeries } from '@/utils/appointmentRecurrence';

const SKELETON_MIN_LOAD_MS = 1000;

export default function ScheduleIndexPage() {
  const router = useRouter();
  const [showSkeleton, setShowSkeleton] = useState(false);
  const skeletonTimeoutRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState(null);
  const [deleteRecurrenceChoiceOpen, setDeleteRecurrenceChoiceOpen] = useState(false);
  const [deleteRecurrenceChoice, setDeleteRecurrenceChoice] = useState(null);

  const {
    currentUser,
    userAccount,
    setUserAccount,
    organization,
    setOrgSchedule,
    appointments,
    teamMembers,
    clients,
    services,
    businessHoursStart,
    businessHoursEnd,
    timeFormat,
    dateFormat,
    timezone,
    myStaffId,
    isTeamMember,
    isOrgAdmin,
    loading,
    fetchOrgSchedule,
    broadcastScheduleUpdated,
  } = useScheduleData();

  useEffect(() => {
    if (!loading) {
      if (skeletonTimeoutRef.current) {
        clearTimeout(skeletonTimeoutRef.current);
        skeletonTimeoutRef.current = null;
      }
      setShowSkeleton(false);
      return;
    }
    setShowSkeleton(false);
    if (skeletonTimeoutRef.current) clearTimeout(skeletonTimeoutRef.current);
    skeletonTimeoutRef.current = setTimeout(() => setShowSkeleton(true), SKELETON_MIN_LOAD_MS);
    return () => {
      if (skeletonTimeoutRef.current) clearTimeout(skeletonTimeoutRef.current);
    };
  }, [loading]);

  const handleAppointmentClick = (appointment) => {
    router.push(`/dashboard/schedule/${appointment.id}/edit`);
  };

  const handleDeleteClick = (appointment) => {
    setAppointmentToDelete(appointment);
    if (isPartOfRecurringSeries(appointment, appointments)) {
      setDeleteRecurrenceChoice(null);
      setDeleteRecurrenceChoiceOpen(true);
    } else {
      setDeleteRecurrenceChoice(null);
      setDeleteDialogOpen(true);
    }
  };

  const handleRecurrenceChoice = (choice) => {
    setDeleteRecurrenceChoice(choice);
    setDeleteRecurrenceChoiceOpen(false);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!currentUser?.uid || !appointmentToDelete) return;

    const idsToDelete =
      deleteRecurrenceChoice === 'series'
        ? getRecurrenceSeriesFromDate(
            appointments,
            getRecurrenceBaseId(appointmentToDelete.id) || appointmentToDelete.id,
            appointmentToDelete.date
          ).map((a) => a.id)
        : [appointmentToDelete.id];

    setSaving(true);
    try {
      if (isTeamMember || isOrgAdmin) {
        for (const id of idsToDelete) {
          const res = await fetch('/api/org-schedule-mutation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.uid, action: 'delete', appointmentId: id }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            const msg = err.message || err.error || 'Failed to delete appointment';
            if (!msg.toLowerCase().includes('not found')) throw new Error(msg);
          }
        }
        const data = await fetch('/api/org-schedule-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.uid }),
        }).then((r) => r.json());
        setOrgSchedule(data?.schedule ?? null);
      } else {
        for (const id of idsToDelete) {
          try {
            await deleteAppointment(currentUser.uid, id);
          } catch (e) {
            if (!String(e?.message || '').toLowerCase().includes('not found')) throw e;
          }
        }
        const updatedAccount = await getUserAccountFromServer(currentUser.uid);
        setUserAccount(updatedAccount);
      }
      broadcastScheduleUpdated();
      setDeleteDialogOpen(false);
      setAppointmentToDelete(null);
      setDeleteRecurrenceChoice(null);
    } catch (error) {
      console.error('Failed to delete appointment:', error);
      alert(error.message || 'Failed to delete appointment. Please try again.');
      setDeleteDialogOpen(false);
      setAppointmentToDelete(null);
      setDeleteRecurrenceChoice(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setAppointmentToDelete(null);
    setDeleteRecurrenceChoice(null);
    setDeleteRecurrenceChoiceOpen(false);
  };

  return (
    <>
      <Head>
        <title>Schedule - GoManagr</title>
        <meta name="description" content="View your schedule" />
      </Head>

      <div className="space-y-6">
        {loading ? (
          showSkeleton ? (
            <SchedulePageSkeleton />
          ) : (
            <p className="text-center py-12 text-gray-500 dark:text-gray-400">Loading…</p>
          )
        ) : (
          <>
            <PageHeader
              title="Schedule"
              description={
                isTeamMember
                  ? 'Your appointments only. You can add and edit appointments for yourself; changes sync with your admin.'
                  : "Refer to the settings page to manage your schedule settings (date format, time format, timezone, etc.)"
              }
              actions={
                <>
                  <Link href="/dashboard/schedule/new">
                    <PrimaryButton
                      type="button"
                      className="gap-2"
                      disabled={isTeamMember && !myStaffId}
                    >
                      <HiPlus className="w-5 h-5" />
                      Add appointment
                    </PrimaryButton>
                  </Link>
                  {saving && <span className="text-sm text-gray-500 dark:text-gray-400">Saving…</span>}
                </>
              }
            />
            <Schedule
              businessHoursStart={businessHoursStart}
              businessHoursEnd={businessHoursEnd}
              timeFormat={timeFormat}
              dateFormat={dateFormat}
              timezone={timezone}
              appointments={appointments}
              teamMembers={teamMembers}
              clients={clients}
              services={services}
              onAppointmentClick={handleAppointmentClick}
              onAppointmentDelete={handleDeleteClick}
              isTeamMember={isTeamMember}
              currentUserStaffId={myStaffId ?? null}
              industry={organization?.industry ?? userAccount?.industry}
            />
            <Dialog.Root
              open={deleteRecurrenceChoiceOpen}
              onOpenChange={(open) => !open && (setDeleteRecurrenceChoiceOpen(false), setAppointmentToDelete(null))}
            >
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200]" />
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-[201] w-full max-w-md p-6 focus:outline-none border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-start mb-4">
                    <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-white">
                      Delete recurring appointment
                    </Dialog.Title>
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                        aria-label="Close"
                      >
                        <HiX className="w-5 h-5" />
                      </button>
                    </Dialog.Close>
                  </div>
                  <Dialog.Description className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    This appointment is part of a recurring series. What would you like to delete?
                  </Dialog.Description>
                  <div className="flex flex-col gap-2">
                    <PrimaryButton
                      type="button"
                      onClick={() => handleRecurrenceChoice('this')}
                      className="w-full justify-center"
                    >
                      Only this occurrence
                    </PrimaryButton>
                    <PrimaryButton
                      type="button"
                      onClick={() => handleRecurrenceChoice('series')}
                      className="w-full justify-center"
                    >
                      All from{' '}
                      {appointmentToDelete?.date
                        ? new Date(appointmentToDelete.date + 'T12:00:00').toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'this date'}{' '}
                      forward
                    </PrimaryButton>
                    <SecondaryButton
                      type="button"
                      onClick={() => {
                        setDeleteRecurrenceChoiceOpen(false);
                        setAppointmentToDelete(null);
                      }}
                    >
                      Cancel
                    </SecondaryButton>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
            <ConfirmationDialog
              isOpen={deleteDialogOpen}
              onClose={handleDeleteCancel}
              onConfirm={handleDeleteConfirm}
              title="Delete Appointment"
              message={
                deleteRecurrenceChoice === 'series' && appointmentToDelete
                  ? (() => {
                      const baseId = getRecurrenceBaseId(appointmentToDelete.id) || appointmentToDelete.id;
                      const fromDate = appointmentToDelete.date;
                      const count = getRecurrenceSeriesFromDate(appointments, baseId, fromDate).length;
                      const dateStr = fromDate
                        ? new Date(fromDate + 'T12:00:00').toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'this date';
                      return `Are you sure you want to delete all ${count} occurrence(s) from ${dateStr} forward? Past appointments will not be deleted. This cannot be undone.`;
                    })()
                  : `Are you sure you want to delete "${appointmentToDelete?.title || appointmentToDelete?.label || 'this appointment'}"? This action cannot be undone.`
              }
              confirmText="Delete"
              cancelText="Cancel"
              confirmationWord="delete"
              variant="danger"
            />
          </>
        )}
      </div>
    </>
  );
}
