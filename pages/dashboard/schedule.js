import Head from 'next/head';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount, getUserAccountFromServer, saveAppointment, deleteAppointment, updateClients } from '@/services/userService';
import { getUserOrganization } from '@/services/organizationService';
import { supabase } from '@/lib/supabase';
import Schedule from '@/components/dashboard/Schedule';
import AppointmentForm from '@/components/dashboard/AppointmentForm';
import { PageHeader, ConfirmationDialog } from '@/components/ui';
import { PrimaryButton } from '@/components/ui/buttons';
import { HiPlus } from 'react-icons/hi';
import Drawer from '@/components/ui/Drawer';
import { DEFAULT_CLIENTS } from '@/config/defaultTeamAndClients';
import { generateClientId } from '@/utils/clientIdGenerator';
import { isMemberRole, isAdminRole } from '@/config/rolePermissions';

const REALTIME_SCHEDULE_EVENT = 'schedule-updated';

function ScheduleContent() {
  const { currentUser } = useAuth();
  const channelRef = useRef(null);
  const [userAccount, setUserAccount] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [orgSchedule, setOrgSchedule] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  const isTeamMember = isMemberRole(organization?.membership?.role);
  const isOrgAdmin = isAdminRole(organization?.membership?.role);

  const { appointments, teamMembers, clients, schedulePrefs, myStaffId } = useMemo(() => {
    if (isTeamMember && orgSchedule) {
      const emailNorm = (currentUser?.email || '').trim().toLowerCase();
      const me = (orgSchedule.teamMembers || []).find(
        (m) => (m.email || '').trim().toLowerCase() === emailNorm
      );
      const myAppointments = (orgSchedule.appointments || []).filter(
        (a) => me && String(a.staffId) === String(me.id)
      );
      return {
        appointments: myAppointments,
        teamMembers: me ? [me] : [],
        clients: orgSchedule.clients && orgSchedule.clients.length > 0 ? orgSchedule.clients : DEFAULT_CLIENTS,
        schedulePrefs: orgSchedule,
        myStaffId: me?.id ?? null,
      };
    }
    if (isOrgAdmin && orgSchedule) {
      const teamMembers = orgSchedule.teamMembers || [];
      const clients = orgSchedule.clients && orgSchedule.clients.length > 0 ? orgSchedule.clients : DEFAULT_CLIENTS;
      return {
        appointments: orgSchedule.appointments || [],
        teamMembers,
        clients,
        schedulePrefs: orgSchedule,
        myStaffId: null,
      };
    }
    const teamMembers = userAccount?.teamMembers || [];
    const clients = userAccount?.clients && userAccount.clients.length > 0
      ? userAccount.clients
      : DEFAULT_CLIENTS;
    return {
      appointments: userAccount?.appointments || [],
      teamMembers,
      clients,
      schedulePrefs: null,
      myStaffId: null,
    };
  }, [isTeamMember, isOrgAdmin, orgSchedule, userAccount, currentUser?.email]);

  const businessHoursStart = schedulePrefs?.businessHoursStart ?? userAccount?.businessHoursStart ?? '08:00';
  const businessHoursEnd = schedulePrefs?.businessHoursEnd ?? userAccount?.businessHoursEnd ?? '18:00';
  const timeFormat = schedulePrefs?.timeFormat ?? userAccount?.timeFormat ?? '24h';
  const dateFormat = schedulePrefs?.dateFormat ?? userAccount?.dateFormat ?? 'MM/DD/YYYY';
  const timezone = schedulePrefs?.timezone ?? userAccount?.timezone ?? 'UTC';
  const services = schedulePrefs?.services ?? userAccount?.services ?? [];

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserAccount(currentUser.uid)
      .then((data) => setUserAccount(data || null))
      .catch(() => setUserAccount(null));
    getUserOrganization(currentUser.uid)
      .then((org) => setOrganization(org || null))
      .catch(() => setOrganization(null));
  }, [currentUser?.uid]);

  const fetchOrgSchedule = useCallback(() => {
    if (!currentUser?.uid) return;
    fetch('/api/org-schedule-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.uid }),
    })
      .then((r) => r.json())
      .then((data) => setOrgSchedule(data?.schedule ?? null))
      .catch(() => setOrgSchedule(null));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid || (!isTeamMember && !isOrgAdmin)) return;
    fetchOrgSchedule();
  }, [currentUser?.uid, isTeamMember, isOrgAdmin, fetchOrgSchedule]);

  useEffect(() => {
    if (!currentUser?.uid || (!isTeamMember && !isOrgAdmin)) return;
    const interval = setInterval(fetchOrgSchedule, 60 * 1000);
    return () => clearInterval(interval);
  }, [currentUser?.uid, isTeamMember, isOrgAdmin, fetchOrgSchedule]);

  useEffect(() => {
    const orgId = organization?.id;
    if (!orgId || !currentUser?.uid) return;

    const channel = supabase.channel(`org:${orgId}`);
    channel
      .on('broadcast', { event: REALTIME_SCHEDULE_EVENT }, () => {
        if (isTeamMember || isOrgAdmin) {
          fetchOrgSchedule();
        } else {
          getUserAccountFromServer(currentUser.uid).then((data) => setUserAccount(data || null));
        }
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [organization?.id, currentUser?.uid, isTeamMember, fetchOrgSchedule]);

  const handleAddClick = () => {
    setEditingAppointment(null);
    setShowDrawer(true);
  };

  const handleAppointmentClick = (appointment) => {
    const appointmentData = {
      id: appointment.id,
      staffId: appointment.staffId,
      date: appointment.date,
      start: appointment.start,
      end: appointment.end,
      label: appointment.label,
      clientId: appointment.clientId,
      services: appointment.services,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    };
    setEditingAppointment(appointmentData);
    setShowDrawer(true);
  };

  const broadcastScheduleUpdated = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: REALTIME_SCHEDULE_EVENT, payload: {} });
    }
  }, []);

  const handleSaveAppointment = async (appointmentData) => {
    if (!currentUser?.uid) return;
    
    setSaving(true);
    try {
      if (isTeamMember || isOrgAdmin) {
        const res = await fetch('/api/org-schedule-mutation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.uid, action: 'save', appointment: appointmentData }),
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
        await saveAppointment(currentUser.uid, appointmentData);
        const updatedAccount = await getUserAccountFromServer(currentUser.uid);
        setUserAccount(updatedAccount);
      }
      broadcastScheduleUpdated();
      setShowDrawer(false);
      setEditingAppointment(null);
    } catch (error) {
      console.error('Failed to save appointment:', error);
      alert(error.message || 'Failed to save appointment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (appointment) => {
    setAppointmentToDelete(appointment);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!currentUser?.uid || !appointmentToDelete) return;
    
    setSaving(true);
    try {
      if (isTeamMember || isOrgAdmin) {
        const res = await fetch('/api/org-schedule-mutation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.uid, action: 'delete', appointmentId: appointmentToDelete.id }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || err.error || 'Failed to delete appointment');
        }
        const data = await fetch('/api/org-schedule-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.uid }),
        }).then((r) => r.json());
        setOrgSchedule(data?.schedule ?? null);
      } else {
        await deleteAppointment(currentUser.uid, appointmentToDelete.id);
        const updatedAccount = await getUserAccountFromServer(currentUser.uid);
        setUserAccount(updatedAccount);
      }
      broadcastScheduleUpdated();
      setDeleteDialogOpen(false);
      setAppointmentToDelete(null);
    } catch (error) {
      console.error('Failed to delete appointment:', error);
      alert(error.message || 'Failed to delete appointment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setAppointmentToDelete(null);
  };

  const handleClientAdd = async (clientData) => {
    if (!currentUser?.uid) return null;

    try {
      const existingIds = (userAccount?.clients || clients).map((c) => c.id).filter(Boolean);
      const newClientId = generateClientId(existingIds);
      const newClient = {
        id: newClientId,
        name: clientData.name,
        company: clientData.company,
      };

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
          client: {
            id: newClientId,
            name: clientData.name,
            company: clientData.company,
          },
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

  return (
    <>
      <Head>
        <title>Schedule - GoManagr</title>
        <meta name="description" content="View your schedule" />
      </Head>

      <div className="space-y-6">
        <PageHeader
          title="Schedule"
          description={isTeamMember ? 'Your appointments only. You can add and edit appointments for yourself; changes sync with your admin.' : 'Refer to the settings page to manage your schedule settings (date format, time format, timezone, etc.)'}
          actions={
            <>
              <PrimaryButton type="button" onClick={handleAddClick} className="gap-2" disabled={isTeamMember && !myStaffId}>
                <HiPlus className="w-5 h-5" />
                Add appointment
              </PrimaryButton>
              {saving && <span className="text-sm text-gray-500 dark:text-gray-400">Saving…</span>}
            </>
          }
        />
        {isTeamMember && orgSchedule === null && organization ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
          </div>
        ) : (
        <>
        <Schedule
          businessHoursStart={businessHoursStart}
          businessHoursEnd={businessHoursEnd}
          timeFormat={timeFormat}
          dateFormat={dateFormat}
          timezone={timezone}
          appointments={appointments}
          clients={clients}
          services={services}
          onAppointmentClick={handleAppointmentClick}
        />
        <Drawer 
          isOpen={showDrawer} 
          onClose={() => {
            setShowDrawer(false);
            setEditingAppointment(null);
          }} 
          title={editingAppointment ? 'Edit appointment' : 'Add appointment'}
        >
          <AppointmentForm
            teamMembers={teamMembers}
            businessHoursStart={businessHoursStart}
            businessHoursEnd={businessHoursEnd}
            timeFormat={timeFormat}
            timezone={timezone}
            dateFormat={dateFormat}
            initialAppointment={editingAppointment}
            appointments={appointments}
            services={services}
            clients={clients}
            onClientAdd={isTeamMember ? handleClientAddForOrg : handleClientAdd}
            staffRestrictedToId={myStaffId}
            onSubmit={handleSaveAppointment}
            onCancel={() => {
              setShowDrawer(false);
              setEditingAppointment(null);
            }}
            onDelete={() => {
              if (editingAppointment) {
                setShowDrawer(false);
                handleDeleteClick(editingAppointment);
              }
            }}
            saving={saving}
          />
        </Drawer>
        <ConfirmationDialog
          isOpen={deleteDialogOpen}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          title="Delete Appointment"
          message={`Are you sure you want to delete "${appointmentToDelete?.label || 'this appointment'}"? This action cannot be undone.`}
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

export default function SchedulePage() {
  return (
    <ScheduleContent />
  );
}
