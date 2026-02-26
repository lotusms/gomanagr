import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useState } from 'react';
import { useScheduleData } from '@/lib/useScheduleData';
import { getUserAccountFromServer, saveAppointment, updateClients, updateServices, updateOrgServices } from '@/services/userService';
import { generateClientId } from '@/utils/clientIdGenerator';
import { expandAppointmentWithRecurrence } from '@/utils/appointmentRecurrence';
import AppointmentForm from '@/components/dashboard/AppointmentForm';
import { PageHeader } from '@/components/ui';
import { SecondaryButton } from '@/components/ui/buttons';
import { HiArrowLeft } from 'react-icons/hi';

export default function NewAppointmentPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
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

  const handleSaveAppointment = async (appointmentData) => {
    if (!currentUser?.uid) return;

    setSaving(true);
    try {
      const recurrence = appointmentData.recurrence;
      const isRecurring = recurrence?.isRecurring && recurrence?.recurrenceStart;
      let appointmentsToSave = isRecurring
        ? expandAppointmentWithRecurrence(appointmentData, recurrence)
        : [appointmentData];
      appointmentsToSave = appointmentsToSave.map(({ recurrence: _r, ...apt }) => apt);

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

  const handleClientAdd = async (clientData) => {
    if (!currentUser?.uid) return null;
    try {
      const existingIds = (userAccount?.clients || clients).map((c) => c.id).filter(Boolean);
      const newClientId = generateClientId(existingIds);
      const newClient = { id: newClientId, name: clientData.name, company: clientData.company };
      const updatedClients = [...clients, newClient];
      await updateClients(currentUser.uid, updatedClients);
      setUserAccount((prev) => (prev ? { ...prev, clients: updatedClients } : null));
      return newClientId;
    } catch (error) {
      console.error('Failed to add client:', error);
      throw error;
    }
  };

  const handleClientAddForOrg = async (clientData) => {
    if (!currentUser?.uid) return null;
    try {
      const existingIds = (clients || []).map((c) => c.id).filter(Boolean);
      const newClientId = generateClientId(existingIds);
      const res = await fetch('/api/update-org-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.uid,
          client: { id: newClientId, name: clientData.name, company: clientData.company },
          action: 'add',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to add client');
      await fetchOrgSchedule();
      return newClientId;
    } catch (error) {
      console.error('Failed to add client:', error);
      throw error;
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/schedule');
  };

  if (loading) {
    return (
      <>
        <Head><title>Add appointment - GoManagr</title></Head>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Add appointment - GoManagr</title>
        <meta name="description" content="Add a new appointment" />
      </Head>
      <div className="space-y-6">
        <PageHeader
          title="Add appointment"
          description="Create a new appointment."
          actions={
            <Link href="/dashboard/schedule">
              <SecondaryButton type="button" className="gap-2">
                <HiArrowLeft className="w-5 h-5" />
                Back to schedule
              </SecondaryButton>
            </Link>
          }
        />
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <AppointmentForm
            teamMembers={teamMembers}
            businessHoursStart={businessHoursStart}
            businessHoursEnd={businessHoursEnd}
            timeFormat={timeFormat}
            timezone={timezone}
            dateFormat={dateFormat}
            initialAppointment={null}
            appointments={appointments}
            services={services}
            clients={clients}
            onClientAdd={isTeamMember ? handleClientAddForOrg : handleClientAdd}
            staffRestrictedToId={myStaffId}
            onSubmit={handleSaveAppointment}
            onCancel={handleCancel}
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
    </>
  );
}
