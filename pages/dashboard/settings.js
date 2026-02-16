import { useState } from 'react';
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

function SettingsContent() {
  const [activeSection, setActiveSection] = useState('general');

  const renderActiveSection = () => {
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
          <SettingsMenu activeSection={activeSection} onSectionChange={setActiveSection} />
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
