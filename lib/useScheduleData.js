import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount, getUserAccountFromServer } from '@/services/userService';
import { getUserOrganization } from '@/services/organizationService';
import { supabase } from '@/lib/supabase';
import { DEFAULT_CLIENTS } from '@/config/defaultTeamAndClients';
import { isMemberRole, isAdminRole } from '@/config/rolePermissions';

const REALTIME_SCHEDULE_EVENT = 'schedule-updated';

/**
 * Shared hook for schedule data used by schedule index, new, and edit pages.
 * Returns appointments, teamMembers, clients, services, schedule prefs, and refetch/update helpers.
 */
export function useScheduleData() {
  const { currentUser } = useAuth();
  const channelRef = useRef(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [userAccount, setUserAccount] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [orgSchedule, setOrgSchedule] = useState(null);
  const [orgClients, setOrgClients] = useState(null);

  const isTeamMember = isMemberRole(organization?.membership?.role);
  const isOrgAdmin = isAdminRole(organization?.membership?.role);

  const { appointments, teamMembers, clients, schedulePrefs, myStaffId } = useMemo(() => {
    const scheduleClients = (orgSchedule?.clients && orgSchedule.clients.length > 0) ? orgSchedule.clients : null;
    const useClients = (orgClients && orgClients.length > 0) ? orgClients : (scheduleClients || DEFAULT_CLIENTS);

    if (isTeamMember && orgSchedule) {
      const emailNorm = (currentUser?.email || '').trim().toLowerCase();
      const me = (orgSchedule.teamMembers || []).find(
        (m) => (m.email || '').trim().toLowerCase() === emailNorm
      );
      const myAppointments = (orgSchedule.appointments || []).filter(
        (a) => me && (
          (Array.isArray(a.staffIds) && a.staffIds.some((id) => String(id) === String(me.id)))
          || String(a.staffId) === String(me.id)
        )
      );
      return {
        appointments: myAppointments,
        teamMembers: me ? [me] : [],
        clients: useClients,
        schedulePrefs: orgSchedule,
        myStaffId: me?.id ?? null,
      };
    }
    if (isOrgAdmin && orgSchedule) {
      const teamMembers = orgSchedule.teamMembers || [];
      return {
        appointments: orgSchedule.appointments || [],
        teamMembers,
        clients: useClients,
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
  }, [isTeamMember, isOrgAdmin, orgSchedule, orgClients, userAccount, currentUser?.email]);

  const businessHoursStart = schedulePrefs?.businessHoursStart ?? userAccount?.businessHoursStart ?? '08:00';
  const businessHoursEnd = schedulePrefs?.businessHoursEnd ?? userAccount?.businessHoursEnd ?? '18:00';
  const timeFormat = schedulePrefs?.timeFormat ?? userAccount?.timeFormat ?? '24h';
  const dateFormat = schedulePrefs?.dateFormat ?? userAccount?.dateFormat ?? 'MM/DD/YYYY';
  const timezone = schedulePrefs?.timezone ?? userAccount?.timezone ?? 'UTC';
  const services = schedulePrefs?.services ?? userAccount?.services ?? [];

  useEffect(() => {
    if (!currentUser?.uid) {
      setBootstrapping(false);
      return;
    }

    let active = true;
    setBootstrapping(true);

    Promise.allSettled([
      getUserAccount(currentUser.uid)
        .then((data) => {
          if (active) setUserAccount(data || null);
        })
        .catch(() => {
          if (active) setUserAccount(null);
        }),
      getUserOrganization(currentUser.uid)
        .then((org) => {
          if (active) setOrganization(org || null);
        })
        .catch(() => {
          if (active) setOrganization(null);
        }),
    ]).finally(() => {
      if (active) setBootstrapping(false);
    });

    return () => {
      active = false;
    };
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

  const fetchOrgClients = useCallback(() => {
    if (!currentUser?.uid) return;
    fetch('/api/get-org-clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.uid }),
    })
      .then((r) => r.json())
      .then((data) => setOrgClients(data?.clients ?? []))
      .catch(() => setOrgClients([]));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid || (!isTeamMember && !isOrgAdmin)) return;
    fetchOrgSchedule();
  }, [currentUser?.uid, isTeamMember, isOrgAdmin, fetchOrgSchedule]);

  useEffect(() => {
    if (!currentUser?.uid || (!isTeamMember && !isOrgAdmin)) return;
    fetchOrgClients();
  }, [currentUser?.uid, isTeamMember, isOrgAdmin, fetchOrgClients]);

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
  }, [organization?.id, currentUser?.uid, isTeamMember, isOrgAdmin, fetchOrgSchedule]);

  const broadcastScheduleUpdated = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: REALTIME_SCHEDULE_EVENT, payload: {} });
    }
  }, []);

  const loading = bootstrapping || ((isTeamMember || isOrgAdmin) && orgSchedule === null && !!organization);

  return {
    currentUser,
    userAccount,
    setUserAccount,
    organization,
    orgSchedule,
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
  };
}
