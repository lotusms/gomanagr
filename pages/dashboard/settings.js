import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { PageHeader } from '@/components/ui';
import SettingsMenu from '@/components/settings/SettingsMenu';
import GeneralSettings from '@/components/settings/GeneralSettings';
import OrganizationSettings from '@/components/settings/OrganizationSettings';
import ThemeSettings from '@/components/settings/ThemeSettings';
import SecuritySettings from '@/components/settings/SecuritySettings';
import IntegrationsSettings from '@/components/settings/IntegrationsSettings';
import BillingSettings from '@/components/settings/BillingSettings';
import TeamAccessSettings from '@/components/settings/TeamAccessSettings';
import { useAuth } from '@/lib/AuthContext';
import { getUserOrganization } from '@/services/organizationService';
import { getUserAccount } from '@/services/userService';
import {
  isOwnerRole,
  isAdminRole,
  isMemberRole,
  isOwnerOrDeveloperRole,
  MEMBER_HIDDEN_SETTINGS,
  ADMIN_NON_OWNER_HIDDEN_SETTINGS,
} from '@/config/rolePermissions';
import { getTermForIndustry } from '@/components/clients/clientProfileConstants';

function SettingsContent() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const sectionFromQuery = typeof router.query.section === 'string' ? router.query.section : null;
  const normalizedSection = sectionFromQuery === 'api' ? 'integrations' : sectionFromQuery;
  const [activeSection, setActiveSection] = useState(normalizedSection || 'general');
  const [memberRole, setMemberRole] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [organization, setOrganization] = useState(null);
  const [userAccount, setUserAccount] = useState(null);

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserOrganization(currentUser.uid)
      .then((org) => {
        setOrganization(org || null);
        setMemberRole(org?.membership?.role || null);
      })
      .catch(() => {
        setOrganization(null);
        setMemberRole(null);
      });
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserAccount(currentUser.uid).then((data) => setUserAccount(data || null)).catch(() => setUserAccount(null));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid || !userAccount) return;
    const team = userAccount?.teamMembers || [];
    setIsOwner(
      isOwnerRole(memberRole) || team.some((m) => m.id === `owner-${currentUser.uid}`)
    );
  }, [currentUser?.uid, memberRole, userAccount]);

  const isTeamMember = isMemberRole(memberRole);
  const isAdminNonOwner = isAdminRole(memberRole) && !isOwner && !isOwnerOrDeveloperRole(memberRole);
  const hiddenSections = isTeamMember ? MEMBER_HIDDEN_SETTINGS : isAdminNonOwner ? ADMIN_NON_OWNER_HIDDEN_SETTINGS : [];

  useEffect(() => {
    if (sectionFromQuery === 'api') {
      router.replace('/dashboard/settings?section=integrations', undefined, { shallow: true });
    }
  }, [sectionFromQuery, router]);

  useEffect(() => {
    if (normalizedSection && normalizedSection !== activeSection && !hiddenSections.includes(normalizedSection)) {
      setActiveSection(normalizedSection);
    }
  }, [normalizedSection]);

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
        return <TeamAccessSettings industry={organization?.industry ?? userAccount?.industry} />;
      case 'theme':
        return <ThemeSettings />;
      case 'security':
        return <SecuritySettings />;
      case 'integrations':
        return <IntegrationsSettings />;
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
            sectionLabelOverrides={{
              'team-access': `${getTermForIndustry(organization?.industry ?? userAccount?.industry, 'team')} Access`,
            }}
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
