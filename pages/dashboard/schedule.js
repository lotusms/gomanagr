import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount, getUserAccountFromServer, saveAppointment, deleteAppointment, updateClients } from '@/services/userService';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import Schedule from '@/components/dashboard/Schedule';
import AppointmentForm from '@/components/dashboard/AppointmentForm';
import { PageHeader, ConfirmationDialog } from '@/components/ui';
import { PrimaryButton } from '@/components/ui/buttons';
import { HiPlus } from 'react-icons/hi';
import Drawer from '@/components/ui/Drawer';
import { DEFAULT_TEAM_MEMBERS, DEFAULT_CLIENTS } from '@/config/defaultTeamAndClients';

function ScheduleContent() {
  const { currentUser } = useAuth();
  const [userAccount, setUserAccount] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  const appointments = userAccount?.appointments || [];
  const teamMembers = userAccount?.teamMembers || DEFAULT_TEAM_MEMBERS;
  const clients = userAccount?.clients && userAccount.clients.length > 0
    ? userAccount.clients
    : DEFAULT_CLIENTS;

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserAccount(currentUser.uid)
      .then((data) => setUserAccount(data || null))
      .catch(() => setUserAccount(null));
  }, [currentUser?.uid]);

  const handleAddClick = () => {
    setEditingAppointment(null);
    setShowDrawer(true);
  };

  const handleAppointmentClick = (appointment) => {
    // Extract only the appointment data needed for the form (remove processed properties)
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

  const handleSaveAppointment = async (appointmentData) => {
    if (!currentUser?.uid) return;
    
    setSaving(true);
    try {
      await saveAppointment(currentUser.uid, appointmentData);
      // Refresh user account from server to get updated appointments (bypass cache)
      const updatedAccount = await getUserAccountFromServer(currentUser.uid);
      setUserAccount(updatedAccount);
      setShowDrawer(false);
      setEditingAppointment(null);
    } catch (error) {
      console.error('Failed to save appointment:', error);
      alert('Failed to save appointment. Please try again.');
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
      await deleteAppointment(currentUser.uid, appointmentToDelete.id);
      // Refresh user account from server to get updated appointments (bypass cache)
      const updatedAccount = await getUserAccountFromServer(currentUser.uid);
      setUserAccount(updatedAccount);
      setDeleteDialogOpen(false);
      setAppointmentToDelete(null);
    } catch (error) {
      console.error('Failed to delete appointment:', error);
      alert('Failed to delete appointment. Please try again.');
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
      // Generate new client ID
      const newClientId = `cl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const newClient = {
        id: newClientId,
        name: clientData.name,
        company: clientData.company,
      };
      
      // Add to existing clients
      const updatedClients = [...clients, newClient];
      
      // Save to Firebase
      await updateClients(currentUser.uid, updatedClients);
      
      // Update local state
      setUserAccount((prev) => (prev ? { ...prev, clients: updatedClients } : null));
      
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
          description="Refer to the settings page to mamage your schedule settings (date format, time format, timezone, etc.)"
          actions={
            <>
              <PrimaryButton type="button" onClick={handleAddClick} className="gap-2">
                <HiPlus className="w-5 h-5" />
                Add appointment
              </PrimaryButton>
              {saving && <span className="text-sm text-gray-500 dark:text-gray-400">Saving…</span>}
            </>
          }
        />
        <Schedule
          businessHoursStart={userAccount?.businessHoursStart ?? '08:00'}
          businessHoursEnd={userAccount?.businessHoursEnd ?? '18:00'}
          timeFormat={userAccount?.timeFormat ?? '24h'}
          dateFormat={userAccount?.dateFormat ?? 'MM/DD/YYYY'}
          timezone={userAccount?.timezone ?? 'UTC'}
          appointments={appointments}
          clients={clients}
          services={userAccount?.services || []}
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
            businessHoursStart={userAccount?.businessHoursStart ?? '08:00'}
            businessHoursEnd={userAccount?.businessHoursEnd ?? '18:00'}
            timeFormat={userAccount?.timeFormat ?? '24h'}
            timezone={userAccount?.timezone ?? 'UTC'}
            dateFormat={userAccount?.dateFormat ?? 'MM/DD/YYYY'}
            initialAppointment={editingAppointment}
            appointments={appointments}
            services={userAccount?.services || []}
            clients={clients}
            onClientAdd={handleClientAdd}
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
      </div>
    </>
  );
}

export default function SchedulePage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <ScheduleContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
