import { useState } from 'react';
import Head from 'next/head';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import SettingsMenu from '@/components/settings/SettingsMenu';
import OrganizationSettings from '@/components/settings/OrganizationSettings';
import ThemeSettings from '@/components/settings/ThemeSettings';
import SecuritySettings from '@/components/settings/SecuritySettings';
import APISettings from '@/components/settings/APISettings';
import BillingSettings from '@/components/settings/BillingSettings';

function SettingsContent() {
  const [activeSection, setActiveSection] = useState('organization');

  const renderActiveSection = () => {
    switch (activeSection) {
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
        return <OrganizationSettings />;
    }
  };

  return (
    <>
      <Head>
        <title>Settings - GoManagr</title>
        <meta name="description" content="Application settings" />
      </Head>

      <div className="pb-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Manage your account and application settings</p>
        </div>

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
