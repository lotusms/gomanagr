import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount } from '@/services/userService';
import { createDismissTodoHandler } from '@/utils/dismissTodoHandler';
import { getUserOrganization, getOrganizationMembers } from '@/services/organizationService';
import { formatDate } from '@/utils/dateTimeFormatters';
import {
  HiClipboardList,
  HiOfficeBuilding,
  HiGlobe,
  HiCurrencyDollar,
  HiUserGroup,
} from 'react-icons/hi';
import TodaysAppointments from '@/components/dashboard/TodaysAppointments';
import DashboardTodos from '@/components/dashboard/DashboardTodos';
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton';
import StatsGrid from '@/components/dashboard/StatsGrid';
import FollowUpsDueCard from '@/components/dashboard/FollowUpsDueCard';
import InvoicesNeedingAttentionCard from '@/components/dashboard/InvoicesNeedingAttentionCard';
import ProposalsPipelineCard from '@/components/dashboard/ProposalsPipelineCard';
import RecentlyUpdatedCard from '@/components/dashboard/RecentlyUpdatedCard';
import WebsiteConsultationDialog from '@/components/dashboard/WebsiteConsultationDialog';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import { isAdminRole, isOwnerRole } from '@/config/rolePermissions';
import {
  buildFollowUps,
  getInvoicesSummary,
  getProposalsPipeline,
  buildRecentlyUpdated,
} from '@/lib/dashboardActionUtils';

function getWelcomeName(account, email = '') {
  const first = (account?.firstName ?? '').trim();
  if (first) return first;
  if (email) return email.split('@')[0];
  return '';
}

function getFormattedDate(dateFormat = 'MM/DD/YYYY', timezone = 'UTC') {
  const todayInTimezone = new Date().toLocaleDateString('en-CA', { timeZone: timezone });
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: timezone,
  });
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

const TODO_ITEMS = [
  {
    id: 'company-logo',
    title: 'Add your organization logo',
    description: 'Pull your organization logo and brand into GoManagr to use on proposals, invoices, and job forms.',
    duration: '2 minutes',
    Icon: HiOfficeBuilding,
    href: '/dashboard/settings',
  },
  {
    id: 'client-portal',
    title: 'Explore your personalized online client portal',
    description: 'Clients can approve proposals, review jobs, and pay all online.',
    duration: '5 minutes',
    Icon: HiUserGroup,
    href: '/dashboard/clients',
  },
  {
    id: 'invoicing',
    title: 'Get paid with fast invoicing',
    description: 'Create and send invoices your clients can pay online.',
    duration: '2 minutes',
    Icon: HiClipboardList,
    href: '/dashboard/invoices',
  },
  {
    id: 'proposal',
    title: 'Create a proposal or quote',
    description: 'Boost your revenue with proposals and quotes for your clients.',
    duration: '2 minutes',
    Icon: HiCurrencyDollar,
    href: '/dashboard/proposals',
  },
  {
    id: 'website',
    title: 'Create a website for your business',
    description: 'Request a consultation with LOTUS Marketing Solutions for a website integrated with GoManagr.',
    duration: '5 minutes',
    Icon: HiGlobe,
    href: null,
  },
];

function DashboardContent() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [userAccount, setUserAccount] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [teamMemberCount, setTeamMemberCount] = useState(null);
  const [accountLoaded, setAccountLoaded] = useState(false);
  const [orgSchedule, setOrgSchedule] = useState(null);
  const [statsCounts, setStatsCounts] = useState(null);
  const [dashboardActionData, setDashboardActionData] = useState({
    invoices: [],
    proposals: [],
    clients: [],
  });

  useEffect(() => {
    const role = organization?.membership?.role;
    if (role !== undefined && role !== null && !isOwnerRole(role)) {
      router.replace('/dashboard/team-member');
    }
  }, [organization?.membership?.role, router]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    setAccountLoaded(false);
    import('@/services/userService').then(({ getUserAccountFromServer }) => {
      getUserAccountFromServer(currentUser.uid)
        .then((data) => {
          setUserAccount(data || null);
        })
        .catch(() => setUserAccount(null))
        .finally(() => setAccountLoaded(true));
    });
    getUserOrganization(currentUser.uid)
      .then((org) => {
        setOrganization(org || null);
        if (org?.id) {
          getOrganizationMembers(org.id)
            .then((members) => setTeamMemberCount(members?.length ?? 0))
            .catch(() => setTeamMemberCount(0));
        } else {
          setTeamMemberCount(null);
        }
      })
      .catch(() => {
        setOrganization(null);
        setTeamMemberCount(null);
      });
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    const orgId = organization?.id ?? undefined;
    Promise.all([
      fetch('/api/get-org-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid }),
      }).then((r) => r.json().then((d) => (d.clients || []).length)),
      fetch('/api/get-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid, organizationId: orgId }),
      }).then((r) => r.json().then((d) => (d.projects || []).length)),
      fetch('/api/get-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid, organizationId: orgId }),
      }).then((r) => r.json().then((d) => (d.invoices || []).length)),
      fetch('/api/get-proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid, organizationId: orgId }),
      }).then((r) => r.json().then((d) => (d.proposals || []).length)),
    ])
      .then(([clientCount, projectCount, invoiceCount, proposalCount]) => {
        setStatsCounts({ clientCount, projectCount, invoiceCount, proposalCount });
      })
      .catch(() => setStatsCounts(null));
  }, [currentUser?.uid, organization?.id]);

  const orgId = organization?.id ?? undefined;
  useEffect(() => {
    if (!currentUser?.uid) return;
    const oid = orgId;
    Promise.all([
      fetch('/api/get-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid, organizationId: oid }),
      }).then((r) => r.json().then((d) => d.invoices || [])),
      fetch('/api/get-proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid, organizationId: oid }),
      }).then((r) => r.json().then((d) => d.proposals || [])),
      fetch('/api/get-org-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid }),
      }).then((r) => r.json().then((d) => d.clients || [])),
    ])
      .then(([invoices, proposals, clients]) => {
        setDashboardActionData({ invoices, proposals, clients });
      })
      .catch(() => setDashboardActionData({ invoices: [], proposals: [], clients: [] }));
  }, [currentUser?.uid, orgId]);


  const canSeeFullSchedule = isAdminRole(organization?.membership?.role);
  useEffect(() => {
    if (!currentUser?.uid || !canSeeFullSchedule) return;
    fetch('/api/org-schedule-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.uid }),
    })
      .then((r) => r.json())
      .then((data) => setOrgSchedule(data?.schedule ?? null))
      .catch(() => setOrgSchedule(null));
  }, [currentUser?.uid, canSeeFullSchedule]);

  const scheduleSource = canSeeFullSchedule && orgSchedule ? orgSchedule : userAccount;
  const todayStaff = scheduleSource?.teamMembers ?? userAccount?.teamMembers ?? [];
  const todayAppointments = scheduleSource?.appointments ?? userAccount?.appointments ?? [];
  const todayClients = scheduleSource?.clients ?? userAccount?.clients ?? [];
  const todayServices = scheduleSource?.services ?? userAccount?.services ?? [];
  const schedulePrefs = canSeeFullSchedule && orgSchedule ? orgSchedule : null;

  useEffect(() => {
    const handleAccountUpdate = async (e) => {
      if (e.detail?.type === 'useraccount-updated' && currentUser?.uid) {
        try {
          const { getUserAccountFromServer } = await import('@/services/userService');
          const updatedData = await getUserAccountFromServer(currentUser.uid);
          if (updatedData) {
            setUserAccount(updatedData);
          }
        } catch (err) {
          console.error('Failed to refresh account data:', err);
        }
      }
    };
    window.addEventListener('useraccount', handleAccountUpdate);
    return () => window.removeEventListener('useraccount', handleAccountUpdate);
  }, [currentUser?.uid]);

  const welcomeName = getWelcomeName(userAccount, currentUser?.email ?? '');
  const dismissedTodoIds = accountLoaded ? (userAccount?.dismissedTodoIds ?? []) : null;
  const [websiteDialogOpen, setWebsiteDialogOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAppointmentClick = (appointment) => {
    router.push(`/dashboard/schedule/${appointment.id}/edit`);
  };
  const handleAppointmentDelete = (appointment) => {
    setAppointmentToDelete(appointment);
    setDeleteDialogOpen(true);
  };
  const handleDeleteConfirm = async () => {
    if (!currentUser?.uid || !appointmentToDelete) return;
    setSaving(true);
    try {
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
      setDeleteDialogOpen(false);
      setAppointmentToDelete(null);
    } catch (error) {
      console.error('Failed to delete appointment:', error);
      alert(error.message || 'Failed to delete appointment. Please try again.');
      setDeleteDialogOpen(false);
      setAppointmentToDelete(null);
    } finally {
      setSaving(false);
    }
  };
  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setAppointmentToDelete(null);
  };

  const handleDismissTodo = createDismissTodoHandler({
    userId: currentUser?.uid,
    dismissedTodoIds,
    onSuccess: (next) => setUserAccount((prev) => (prev ? { ...prev, dismissedTodoIds: next } : null)),
  });

  const todoItems =
    dismissedTodoIds === null
      ? []
      : TODO_ITEMS.filter((item) => {
          if (dismissedTodoIds.includes(item.id)) return false;
          if (item.id === 'company-logo') {
            if (!accountLoaded) return true;
            const userLogo = (userAccount?.companyLogo != null && userAccount?.companyLogo !== '')
              ? String(userAccount.companyLogo).trim()
              : '';
            const orgLogo = (organization?.logo_url != null && organization?.logo_url !== '')
              ? String(organization.logo_url).trim()
              : '';
            if (userLogo.length > 0 || orgLogo.length > 0) return false;
          }
          if (item.id === 'client-portal') {
            if (!accountLoaded) return true;
            const hasClients = Array.isArray(userAccount?.clients) && userAccount.clients.length > 0;
            if (hasClients) return false;
          }
          if (item.id === 'invoicing') {
            if (!accountLoaded) return true;
            const hasInvoices = Array.isArray(userAccount?.invoices) && userAccount.invoices.length > 0;
            if (hasInvoices) return false;
          }
          if (item.id === 'proposal') {
            const hasProposals = (statsCounts?.proposalCount ?? 0) > 0;
            if (hasProposals) return false;
          }
          if (item.id === 'quote') {
            if (!accountLoaded) return true;
            const hasQuotes = Array.isArray(userAccount?.quotes) && userAccount.quotes.length > 0;
            if (hasQuotes) return false;
          }
          return true;
        });

  const isSuperadmin = isOwnerRole(organization?.membership?.role);
  const showLoader = currentUser?.uid && (!organization || !isSuperadmin);
  if (showLoader) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" aria-hidden />
      </div>
    );
  }

  if (currentUser?.uid && !accountLoaded) {
    return (
      <>
        <Head>
          <title>Dashboard - GoManagr</title>
          <meta name="description" content="Your dashboard" />
        </Head>
        <DashboardSkeleton />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard - GoManagr</title>
        <meta name="description" content="Your dashboard" />
      </Head>

      <div className="space-y-6">
        {/* Welcome Section */}
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {getFormattedDate(userAccount?.dateFormat, userAccount?.timezone)}
          </p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Good {getTimeOfDay()}{welcomeName ? `, ${welcomeName}` : ''}
          </h1>
        </div>

        <StatsGrid
          userAccount={userAccount}
          teamMemberCount={teamMemberCount}
          apiCounts={statsCounts}
        />

        {/* Action-focused cards */}
        {(() => {
          const { invoices, proposals, clients } = dashboardActionData;
          const clientNameById = {};
          (clients || []).forEach((c) => {
            if (c?.id) clientNameById[c.id] = (c.name || c.company || 'Unknown').trim() || 'Unknown';
          });
          const data = { invoices, proposals };
          const followUps = buildFollowUps(data, clientNameById);
          const invoicesSummary = getInvoicesSummary(data);
          const proposalsPipeline = getProposalsPipeline(data);
          const recentlyUpdated = buildRecentlyUpdated(data, clientNameById, 20);
          const dateFormat = userAccount?.dateFormat ?? 'MM/DD/YYYY';
          const timezone = userAccount?.timezone ?? 'UTC';
          const currency = userAccount?.defaultCurrency ?? 'USD';
          return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FollowUpsDueCard
                items={followUps}
                dateFormat={dateFormat}
                timezone={timezone}
              />
              <InvoicesNeedingAttentionCard
                overdueCount={invoicesSummary.overdueCount}
                overdueTotal={invoicesSummary.overdueTotal}
                dueIn7DaysCount={invoicesSummary.dueIn7DaysCount}
                dueIn14DaysCount={invoicesSummary.dueIn14DaysCount}
                dueIn30DaysCount={invoicesSummary.dueIn30DaysCount}
                currency={currency}
              />
              <ProposalsPipelineCard counts={proposalsPipeline} />
              <RecentlyUpdatedCard
                items={recentlyUpdated}
                dateFormat={dateFormat}
                timezone={timezone}
              />
            </div>
          );
        })()}

        <DashboardTodos
          items={todoItems}
          onDismiss={handleDismissTodo}
          onItemClick={(item) => item.id === 'website' && setWebsiteDialogOpen(true)}
        />
        <WebsiteConsultationDialog
          open={websiteDialogOpen}
          onClose={() => setWebsiteDialogOpen(false)}
          onSuccess={() => handleDismissTodo('website')}
          defaultEmail={currentUser?.email ?? ''}
          defaultName={[userAccount?.firstName, userAccount?.lastName].filter(Boolean).join(' ').trim()}
          defaultCompany={organization?.name ?? ''}
        />

        <TodaysAppointments
          businessHoursStart={schedulePrefs?.businessHoursStart ?? userAccount?.businessHoursStart ?? '08:00'}
          businessHoursEnd={schedulePrefs?.businessHoursEnd ?? userAccount?.businessHoursEnd ?? '18:00'}
          timeFormat={schedulePrefs?.timeFormat ?? userAccount?.timeFormat ?? '24h'}
          dateFormat={schedulePrefs?.dateFormat ?? userAccount?.dateFormat ?? 'MM/DD/YYYY'}
          timezone={schedulePrefs?.timezone ?? userAccount?.timezone ?? 'UTC'}
          staff={todayStaff}
          appointments={todayAppointments}
          clients={todayClients}
          services={todayServices}
          teamMembers={todayStaff}
          onAppointmentClick={handleAppointmentClick}
          onAppointmentDelete={handleAppointmentDelete}
          isTeamMember={false}
          currentUserStaffId={null}
        />
        <ConfirmationDialog
          isOpen={deleteDialogOpen}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          title="Delete Appointment"
          message={
            appointmentToDelete
              ? `Are you sure you want to delete "${appointmentToDelete?.title || appointmentToDelete?.label || 'this appointment'}"? This action cannot be undone.`
              : 'Delete this appointment?'
          }
          confirmText="Delete"
          cancelText="Cancel"
          confirmationWord="delete"
          variant="danger"
        />
      </div>
    </>
  );
}

export default function Dashboard() {
  return (
    <DashboardContent />
  );
}
