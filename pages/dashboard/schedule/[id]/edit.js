import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import { useScheduleData } from '@/lib/useScheduleData';
import {
  getUserAccountFromServer,
  saveAppointment,
  deleteAppointment,
  updateClients,
  updateServices,
  updateOrgServices,
} from '@/services/userService';
import {
  expandAppointmentWithRecurrence,
  getRecurrenceBaseId,
  getRecurrenceSeriesFromDate,
  isPartOfRecurringSeries,
} from '@/utils/appointmentRecurrence';
import AppointmentForm from '@/components/dashboard/AppointmentForm';
import { PageHeader, ConfirmationDialog } from '@/components/ui';
import { SecondaryButton } from '@/components/ui/buttons';
import { getTermForIndustry, getTermSingular } from '@/components/clients/clientProfileConstants';
import { HiArrowLeft } from 'react-icons/hi';

export default function EditAppointmentPage() {
  const router = useRouter();
  const { id } = router.query;
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
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
    fetchOrgClients,
    broadcastScheduleUpdated,
  } = useScheduleData();

  const accountIndustry = organization?.industry ?? userAccount?.industry;
  const clientTermSingularLower = (getTermSingular(getTermForIndustry(accountIndustry, 'client')) || 'Client').toLowerCase();

  const appointment = useMemo(() => {
    if (!id || !appointments?.length) return null;
    return appointments.find((a) => a.id === id) || null;
  }, [id, appointments]);

  const initialAppointment = appointment
    ? {
        id: appointment.id,
        title: appointment.title,
        staffId: appointment.staffId,
        staffIds: appointment.staffIds,
        date: appointment.date,
        start: appointment.start,
        end: appointment.end,
        label: appointment.label,
        clientId: appointment.clientId,
        services: appointment.services,
        recurrence: appointment.recurrence,
        createdAt: appointment.createdAt,
        updatedAt: appointment.updatedAt,
      }
    : null;

  const handleSaveAppointment = async (appointmentData) => {
    if (!currentUser?.uid) return;

    setSaving(true);
    try {
      const { pendingClients: pending = [], ...rest } = appointmentData;
      const appointmentPayload = rest;

      if (Array.isArray(pending) && pending.length > 0) {
        if (isTeamMember || isOrgAdmin) {
          for (const client of pending) {
            const res = await fetch('/api/update-org-clients', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: currentUser.uid,
                client: { id: client.id, name: client.name, company: client.company },
                action: 'add',
              }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || `Failed to add ${clientTermSingularLower}`);
          }
          await fetchOrgSchedule();
          if (fetchOrgClients) fetchOrgClients();
        } else {
          const updatedClients = [...(userAccount?.clients || clients), ...pending];
          await updateClients(currentUser.uid, updatedClients);
          setUserAccount((prev) => (prev ? { ...prev, clients: updatedClients } : null));
        }
      }

      const recurrence = appointmentPayload.recurrence;
      const isRecurring = recurrence?.isRecurring && recurrence?.recurrenceStart;
      let appointmentsToSave = isRecurring
        ? expandAppointmentWithRecurrence(appointmentPayload, recurrence)
        : [appointmentPayload];
      appointmentsToSave = appointmentsToSave.map(({ pendingClients: _p, ...apt }) => apt);

      if (isTeamMember || isOrgAdmin) {
        const payload = appointmentsToSave.length === 1
          ? { userId: currentUser.uid, action: 'save', appointment: appointmentsToSave[0] }
          : { userId: currentUser.uid, action: 'save', appointments: appointmentsToSave };
        const res = await fetch('/api/org-schedule-mutation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || err.error || 'Failed to save appointment');
        }
        const data = await fetch('/api/org-schedule-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.uid }),
        }).then((r) => r.json());
        setOrgSchedule(data?.schedule ?? null);
      } else {
        for (const apt of appointmentsToSave) {
          await saveAppointment(currentUser.uid, apt);
        }
        const updatedAccount = await getUserAccountFromServer(currentUser.uid);
        setUserAccount(updatedAccount);
      }
      broadcastScheduleUpdated();
      router.push('/dashboard/schedule');
    } catch (error) {
      console.error('Failed to save appointment:', error);
      alert(error.message || 'Failed to save appointment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRequest = () => {
    if (!appointment) return;
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
    if (!currentUser?.uid || !appointment) return;

    const idsToDelete =
      deleteRecurrenceChoice === 'series'
        ? getRecurrenceSeriesFromDate(
            appointments,
            getRecurrenceBaseId(appointment.id) || appointment.id,
            appointment.date
          ).map((a) => a.id)
        : [appointment.id];

    setSaving(true);
    try {
      if (isTeamMember || isOrgAdmin) {
        for (const aptId of idsToDelete) {
          const res = await fetch('/api/org-schedule-mutation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.uid, action: 'delete', appointmentId: aptId }),
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
        for (const aptId of idsToDelete) {
          try {
            await deleteAppointment(currentUser.uid, aptId);
          } catch (e) {
            if (!String(e?.message || '').toLowerCase().includes('not found')) throw e;
          }
        }
        const updatedAccount = await getUserAccountFromServer(currentUser.uid);
        setUserAccount(updatedAccount);
      }
      broadcastScheduleUpdated();
      setDeleteDialogOpen(false);
      setDeleteRecurrenceChoice(null);
      router.push('/dashboard/schedule');
    } catch (error) {
      console.error('Failed to delete appointment:', error);
      alert(error.message || 'Failed to delete appointment. Please try again.');
      setDeleteDialogOpen(false);
      setDeleteRecurrenceChoice(null);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/schedule');
  };

  if (loading) {
    return (
      <>
        <Head><title>Edit appointment - GoManagr</title></Head>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      </>
    );
  }

  if (router.isReady && id && !appointment) {
    return (
      <>
        <Head><title>Appointment not found - GoManagr</title></Head>
        <p className="text-gray-500">Appointment not found.</p>
        <Link href="/dashboard/schedule">
          <SecondaryButton type="button" className="mt-4">Back to schedule</SecondaryButton>
        </Link>
      </>
    );
  }

  if (!appointment) {
    return (
      <>
        <Head><title>Edit appointment - GoManagr</title></Head>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      </>
    );
  }

  const deleteMessage =
    deleteRecurrenceChoice === 'series'
      ? (() => {
          const baseId = getRecurrenceBaseId(appointment.id) || appointment.id;
          const fromDate = appointment.date;
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
      : `Are you sure you want to delete "${appointment?.title || appointment?.label || 'this appointment'}"? This action cannot be undone.`;

  return (
    <>
      <Head>
        <title>Edit appointment - GoManagr</title>
        <meta name="description" content={`Edit ${appointment?.title || 'appointment'}`} />
      </Head>
      <div className="space-y-6">
        <PageHeader
          title={initialAppointment?.title ? `Edit ${initialAppointment.title}` : 'Edit appointment'}
          description="Update this appointment."
          actions={
            <Link href="/dashboard/schedule">
              <SecondaryButton type="button" className="gap-2">
                <HiArrowLeft className="w-5 h-5" />
                Back to schedule
              </SecondaryButton>
            </Link>
          }
        />
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-visible">
          <AppointmentForm
            teamMembers={teamMembers}
            industry={organization?.industry ?? userAccount?.industry}
            businessHoursStart={businessHoursStart}
            businessHoursEnd={businessHoursEnd}
            timeFormat={timeFormat}
            timezone={timezone}
            dateFormat={dateFormat}
            initialAppointment={initialAppointment}
            appointments={appointments}
            services={services}
            clients={clients}
            staffRestrictedToId={myStaffId}
            onSubmit={handleSaveAppointment}
            onCancel={handleCancel}
            onDelete={handleDeleteRequest}
            onServiceCreated={async (updatedServicesList) => {
              if (!currentUser?.uid) return;
              try {
                if (isTeamMember || isOrgAdmin) {
                  if (organization?.id) {
                    await updateOrgServices(organization.id, currentUser.uid, updatedServicesList);
                    const data = await fetch('/api/org-schedule-data', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId: currentUser.uid }),
                    }).then((r) => r.json());
                    setOrgSchedule(data?.schedule ?? null);
                  }
                } else {
                  await updateServices(currentUser.uid, updatedServicesList);
                  const updatedAccount = await getUserAccountFromServer(currentUser.uid);
                  setUserAccount(updatedAccount);
                }
              } catch (error) {
                console.error('Failed to save service:', error);
                alert(error.message || 'Failed to save service. Please try again.');
              }
            }}
            saving={saving}
          />
        </div>
      </div>

      {/* Recurrence choice dialog */}
      {deleteRecurrenceChoiceOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Delete recurring appointment
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              This appointment is part of a recurring series. What would you like to delete?
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleRecurrenceChoice('this')}
                className="px-4 py-2 rounded-full font-semibold text-sm text-white bg-primary-600 hover:bg-primary-700"
              >
                Only this occurrence
              </button>
              <button
                type="button"
                onClick={() => handleRecurrenceChoice('series')}
                className="px-4 py-2 rounded-full font-semibold text-sm text-white bg-primary-600 hover:bg-primary-700"
              >
                All from{' '}
                {appointment?.date
                  ? new Date(appointment.date + 'T12:00:00').toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'this date'}{' '}
                forward
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteRecurrenceChoiceOpen(false);
                }}
                className="px-4 py-2 rounded-full font-semibold text-sm border-2 border-secondary-500 text-secondary-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeleteRecurrenceChoice(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Appointment"
        message={deleteMessage}
        confirmText="Delete"
        cancelText="Cancel"
        confirmationWord="delete"
        variant="danger"
      />
    </>
  );
}
