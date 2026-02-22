import { useState, useEffect } from 'react';
import Head from 'next/head';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { PageHeader } from '@/components/ui';
import SettingsMenu from '@/components/settings/SettingsMenu';
import GeneralSettings from '@/components/settings/GeneralSettings';
import OrganizationSettings from '@/components/settings/OrganizationSettings';
import ThemeSettings from '@/components/settings/ThemeSettings';
import SecuritySettings from '@/components/settings/SecuritySettings';
import APISettings from '@/components/settings/APISettings';
import BillingSettings from '@/components/settings/BillingSettings';
import { useAuth } from '@/lib/AuthContext';
import { getUserOrganization } from '@/services/organizationService';

const MEMBER_HIDDEN_SECTIONS = ['organization', 'api', 'billing'];

function SettingsContent() {
  const { currentUser } = useAuth();
  const [activeSection, setActiveSection] = useState('general');
  const [isTeamMember, setIsTeamMember] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserOrganization(currentUser.uid)
      .then((org) => setIsTeamMember(org?.membership?.role === 'member'))
      .catch(() => setIsTeamMember(false));
  }, [currentUser?.uid]);

  // If team member and current section is hidden, switch to general
  useEffect(() => {
    if (isTeamMember && MEMBER_HIDDEN_SECTIONS.includes(activeSection)) {
      setActiveSection('general');
    }
  }, [isTeamMember, activeSection]);

  const renderActiveSection = () => {
    if (isTeamMember && MEMBER_HIDDEN_SECTIONS.includes(activeSection)) {
      return <GeneralSettings />;
    }
    switch (activeSection) {
      case 'general':
        return <GeneralSettings />;
      case 'organization':
        return <OrganizationSettings />;
      case 'theme':
        return <ThemeSettings />;
      case 'security':
        return <SecuritySettings />;
      case 'api':
        return <APISettings />;
      case 'billing':
        return <BillingSettings />;
      default:
        return <GeneralSettings />;
    }
  };

  return (
    <>
      <Head>
        <title>Settings - GoManagr</title>
        <meta name="description" content="Application settings" />
      </Head>

      <div className="pb-6">
        <PageHeader
          title="Settings"
          description="Manage your account and application settings"
          className="mb-6"
        />

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          <SettingsMenu
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            hiddenSections={isTeamMember ? MEMBER_HIDDEN_SECTIONS : []}
          />
          <div className="flex-1 min-w-0">
            {renderActiveSection()}
          </div>
        </div>
      </div>
    </>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <SettingsContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
