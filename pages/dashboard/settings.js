import { useState, useEffect } from 'react';
import Head from 'next/head';
import { PageHeader } from '@/components/ui';
import SettingsMenu from '@/components/settings/SettingsMenu';
import GeneralSettings from '@/components/settings/GeneralSettings';
import OrganizationSettings from '@/components/settings/OrganizationSettings';
import ThemeSettings from '@/components/settings/ThemeSettings';
import SecuritySettings from '@/components/settings/SecuritySettings';
import APISettings from '@/components/settings/APISettings';
import BillingSettings from '@/components/settings/BillingSettings';
import TeamAccessSettings from '@/components/settings/TeamAccessSettings';
import { useAuth } from '@/lib/AuthContext';
import { getUserOrganization } from '@/services/organizationService';
import { getUserAccount } from '@/services/userService';
import {
  isOwnerRole,
  isAdminRole,
  isMemberRole,
  MEMBER_HIDDEN_SETTINGS,
  ADMIN_NON_OWNER_HIDDEN_SETTINGS,
} from '@/config/rolePermissions';

function SettingsContent() {
  const { currentUser } = useAuth();
  const [activeSection, setActiveSection] = useState('general');
  const [memberRole, setMemberRole] = useState(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserOrganization(currentUser.uid)
      .then((org) => setMemberRole(org?.membership?.role || null))
      .catch(() => setMemberRole(null));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserAccount(currentUser.uid)
      .then((data) => {
        const team = data?.teamMembers || [];
        setIsOwner(
          isOwnerRole(memberRole) || team.some((m) => m.id === `owner-${currentUser.uid}`)
        );
      })
      .catch(() => setIsOwner(false));
  }, [currentUser?.uid, memberRole]);

  const isTeamMember = isMemberRole(memberRole);
  const isAdminNonOwner = isAdminRole(memberRole) && !isOwner;
  const hiddenSections = isTeamMember ? MEMBER_HIDDEN_SETTINGS : isAdminNonOwner ? ADMIN_NON_OWNER_HIDDEN_SETTINGS : [];

  useEffect(() => {
    if (hiddenSections.length && hiddenSections.includes(activeSection)) {
      setActiveSection('general');
    }
  }, [hiddenSections, activeSection]);

  const renderActiveSection = () => {
    if (hiddenSections.includes(activeSection)) {
      return <GeneralSettings />;
    }
    switch (activeSection) {
      case 'general':
        return <GeneralSettings />;
      case 'organization':
        return <OrganizationSettings />;
      case 'team-access':
        return <TeamAccessSettings />;
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
            hiddenSections={hiddenSections}
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
  return <SettingsContent />;
}
