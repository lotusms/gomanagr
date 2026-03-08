import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount, createUserAccount } from '@/services/userService';
import { useToast } from '@/components/ui/Toast';
import InputField from '@/components/ui/InputField';
import Dropdown from '@/components/ui/Dropdown';
import { PrimaryButton } from '@/components/ui/buttons';
import { CURRENCIES, getTermForIndustry, getTermSingular } from './clientProfileConstants';
import { ChipsMulti } from '@/components/ui';

export default function ClientSettings() {
  const { currentUser } = useAuth();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accountIndustry, setAccountIndustry] = useState('');
  
  const projectTermPlural = getTermForIndustry(accountIndustry, 'project') || 'Projects';
  const clientTermPlural = getTermForIndustry(accountIndustry, 'client') || 'Clients';
  const clientTermSingular = getTermSingular(clientTermPlural) || 'Client';
  const clientTermPluralLower = clientTermPlural.toLowerCase();
  const clientTermSingularLower = clientTermSingular.toLowerCase();
  const availableTabs = [
    { value: 'company', label: 'Company Details' },
    { value: 'financial', label: 'Financial Information' },
    { value: 'projects', label: `${projectTermPlural} Details` },
    { value: 'communication', label: 'Communication Log' },
    { value: 'documents', label: 'Documents & Files' },
    { value: 'scheduling', label: 'Appointments & Schedule' },
  ];

  const [settings, setSettings] = useState({
    defaultCurrency: 'USD',
    defaultStatus: 'active',
    defaultPreferredCommunication: 'email',
    visibleTabs: ['company', 'financial', 'projects', 'communication', 'documents', 'scheduling'], // Array of tab values that should be visible
  });

  useEffect(() => {
    if (currentUser?.uid) {
      loadSettings();
    }
  }, [currentUser?.uid]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const account = await getUserAccount(currentUser.uid);
      if (account) {
        setAccountIndustry(account.industry || '');
        
        let defaultVisibleTabs = ['projects', 'communication', 'documents', 'scheduling'];
        const shouldShowCompanyFinancial = account.industry !== 'Healthcare' && account.industry !== 'Education';
        if (shouldShowCompanyFinancial) {
          defaultVisibleTabs.push('company', 'financial');
        }
        
        let visibleTabs;
        if (account.clientSettings?.visibleTabs && Array.isArray(account.clientSettings.visibleTabs)) {
          visibleTabs = account.clientSettings.visibleTabs;
        } else if (account.clientSettings) {
          visibleTabs = [];
          if (account.clientSettings.showCompanyDetails !== false) visibleTabs.push('company');
          if (account.clientSettings.showFinancialInformation !== false) visibleTabs.push('financial');
          if (account.clientSettings.showProjectsDetails !== false) visibleTabs.push('projects');
          if (account.clientSettings.showCommunicationLog !== false) visibleTabs.push('communication');
          if (account.clientSettings.showDocumentsFiles !== false) visibleTabs.push('documents');
          if (account.clientSettings.showAppointmentsSchedule !== false) visibleTabs.push('scheduling');
          if (visibleTabs.length === 0) visibleTabs = defaultVisibleTabs;
        } else {
          visibleTabs = defaultVisibleTabs;
        }
        
        setSettings({
          defaultCurrency: account.clientSettings?.defaultCurrency || account.defaultCurrency || 'USD',
          defaultStatus: account.clientSettings?.defaultStatus || 'active',
          defaultPreferredCommunication: account.clientSettings?.defaultPreferredCommunication || 'email',
          visibleTabs: visibleTabs,
        });
      }
    } catch (err) {
      console.error('Failed to load client settings:', err);
      showError(`Failed to load ${clientTermSingularLower} settings`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleVisibleTabsChange = (selectedTabs) => {
    setSettings((prev) => ({
      ...prev,
      visibleTabs: selectedTabs || [],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser?.uid) return;

    try {
      setSaving(true);
      const account = await getUserAccount(currentUser.uid);
      
      const { teamMembers, clients, services, appointments, ...accountWithoutArrays } = account || {};
      
      const updatedAccount = await createUserAccount(
        currentUser.uid,
        {
          ...accountWithoutArrays,
          teamMembers: account?.teamMembers || [],
          clients: account?.clients || [],
          services: account?.services || [],
          appointments: account?.appointments || [],
          clientSettings: {
            defaultCurrency: settings.defaultCurrency,
            defaultStatus: settings.defaultStatus,
            defaultPreferredCommunication: settings.defaultPreferredCommunication,
            visibleTabs: settings.visibleTabs,
          },
          userId: currentUser.uid,
          email: currentUser.email,
        },
        null
      );

      if (typeof window !== 'undefined' && updatedAccount) {
        window.dispatchEvent(
          new CustomEvent('useraccount', {
            detail: {
              type: 'useraccount-updated',
              payload: updatedAccount,
            },
          })
        );
      }

      success(`${clientTermSingular} settings saved successfully`);
    } catch (err) {
      console.error('Failed to save client settings:', err);
      showError(err.message || `Failed to save ${clientTermSingularLower} settings`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{clientTermSingular} Defaults</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configure default values for new {clientTermPluralLower}. These can be changed when creating individual {clientTermPluralLower}.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Dropdown
          id="defaultCurrency"
          name="defaultCurrency"
          label="Default Currency"
          value={settings.defaultCurrency || undefined}
          onChange={(e) => handleChange('defaultCurrency', e.target.value)}
          options={CURRENCIES}
          placeholder="Select default currency..."
        />

        <Dropdown
          id="defaultStatus"
          name="defaultStatus"
          label="Default Status"
          value={settings.defaultStatus || undefined}
          onChange={(e) => handleChange('defaultStatus', e.target.value)}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
            { value: 'prospect', label: 'Prospect' },
          ]}
          placeholder="Select default status..."
        />

        <Dropdown
          id="defaultPreferredCommunication"
          name="defaultPreferredCommunication"
          label="Default Preferred Communication"
          value={settings.defaultPreferredCommunication || undefined}
          onChange={(e) => handleChange('defaultPreferredCommunication', e.target.value)}
          options={[
            { value: 'email', label: 'Email' },
            { value: 'phone', label: 'Phone' },
            { value: 'sms', label: 'SMS' },
          ]}
          placeholder="Select default communication method..."
        />

        {/* Client Form Sections Settings */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="mb-4">
            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-1">{clientTermSingular} Form Configuration</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Choose what information should be collected when creating or editing {clientTermPluralLower}. Basic Information is always included.
            </p>
          </div>
          
          <ChipsMulti
            id="visibleTabs"
            label="This Information Will Be Collected"
            options={availableTabs.map(tab => tab.value)}
            value={settings.visibleTabs || []}
            onValueChange={handleVisibleTabsChange}
            layout="grid"
            variant="light"
            renderOption={(option, isSelected) => {
              const tab = availableTabs.find(t => t.value === option);
              return (
                <div className="flex items-center justify-between gap-1.5 flex-1 min-w-0">
                  <div className="flex flex-col items-start gap-0.5 flex-1 min-w-0">
                    <span className="font-medium">{tab?.label || option}</span>
                  </div>
                  {isSelected && <span className="text-sm flex-shrink-0">✓</span>}
                </div>
              );
            }}
          />
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}
