import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount, createUserAccount } from '@/services/userService';
import Dropdown from '@/components/ui/Dropdown';
import Toggle from '@/components/ui/Toggle';
import { PrimaryButton } from '@/components/ui/buttons';
import { getTimeZoneSelectOptions, ensureTimeZoneOption } from '@/utils/timezoneOptions';

const DATE_FORMATS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
  { value: 'DD MMM YYYY', label: 'DD MMM YYYY' },
];

const NUMBER_FORMATS = [
  { value: '1,234.56', label: '1,234.56 (US)' },
  { value: '1.234,56', label: '1.234,56 (EU)' },
  { value: '1 234,56', label: '1 234,56 (FR)' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
];

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'JPY', label: 'JPY (¥)' },
  { value: 'CAD', label: 'CAD (C$)' },
  { value: 'AUD', label: 'AUD (A$)' },
];

const TIME_FORMAT_OPTIONS = [
  { value: '24h', label: '24-hour (e.g. 18:00)' },
  { value: '12h', label: '12-hour (e.g. 6:00 PM)' },
];

const DATA_VIEW_STYLE_OPTIONS = [
  { 
    value: 'cards', 
    label: 'Cards',
    description: 'Responsive and user-friendly. Cards adapt to different screen sizes and provide a modern, visual experience.'
  },
  { 
    value: 'tables', 
    label: 'Tables',
    description: 'Data-friendly and efficient. Tables display more information at once but are not responsive on mobile devices.'
  },
];

export default function GeneralSettings() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    numberFormat: '1,234.56',
    defaultLanguage: 'en',
    timeFormat: '24h',
    currency: 'USD',
    dataViewStyle: 'cards',
  });

  const baseTimeZoneOptions = useMemo(() => getTimeZoneSelectOptions(), []);
  const timezoneOptions = useMemo(
    () => ensureTimeZoneOption(baseTimeZoneOptions, formData.timezone),
    [baseTimeZoneOptions, formData.timezone]
  );

  useEffect(() => {
    if (currentUser) {
      loadUserData();
    }
  }, [currentUser]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const userData = await getUserAccount(currentUser.uid);
      if (userData) {
        setFormData({
          timezone: userData.timezone || 'UTC',
          dateFormat: userData.dateFormat || 'MM/DD/YYYY',
          numberFormat: userData.numberFormat || '1,234.56',
          defaultLanguage: userData.defaultLanguage || 'en',
          timeFormat: userData.timeFormat || '24h',
          currency: userData.currency || 'USD',
          dataViewStyle: userData.dataViewStyle || 'cards',
        });
      }
    } catch (err) {
      console.error('Error loading user data:', err);
      setError('Failed to load general settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      
      await createUserAccount(
        currentUser.uid,
        {
          ...formData,
          userId: currentUser.uid,
          email: currentUser.email,
        },
        null
      );

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving general settings:', err);
      setError(err.message || 'Failed to save general settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">General</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Manage your preferences and display settings</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date & Number Formats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Time Zone */}
          <Dropdown
            id="timezone"
            name="timezone"
            label="Time Zone"
            sublabel="Common IANA zones from the tz database. Search by region (Eastern, Central, Pacific, …)."
            value={formData.timezone}
            onChange={handleInputChange}
            options={timezoneOptions}
            placeholder="Select time zone"
          />
          <Dropdown
            id="dateFormat"
            name="dateFormat"
            label="Date Format"
            value={formData.dateFormat}
            onChange={handleInputChange}
            options={DATE_FORMATS}
            placeholder="Select date format"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Dropdown
            id="numberFormat"
            name="numberFormat"
            label="Number Format"
            value={formData.numberFormat}
            onChange={handleInputChange}
            options={NUMBER_FORMATS}
            placeholder="Select number format"
          />

          {/* Default Language */}
          <Dropdown
            id="defaultLanguage"
            name="defaultLanguage"
            label="Default Language"
            value={formData.defaultLanguage}
            onChange={handleInputChange}
            options={LANGUAGES}
            placeholder="Select language"
          />
        </div>

        {/* Time Format & Currency */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Dropdown
            id="timeFormat"
            name="timeFormat"
            label="Time Format"
            value={formData.timeFormat}
            onChange={handleInputChange}
            options={TIME_FORMAT_OPTIONS}
            placeholder="Select time format"
          />
          {/* Currency */}
          <Dropdown
            id="currency"
            name="currency"
            label="Currency"
            value={formData.currency}
            onChange={handleInputChange}
            options={CURRENCIES}
            placeholder="Select currency"
          />
        </div>

        {/* Data View Style */}
        <div className="space-y-2">
          <Toggle
            id="dataViewStyle"
            label="Preferred Data View Style"
            value={formData.dataViewStyle || 'cards'}
            onValueChange={(newValue) => {
              setFormData((prev) => ({ ...prev, dataViewStyle: newValue || 'cards' }));
              setError(null);
              setSuccess(false);
            }}
            option1="cards"
            option1Label="Cards"
            option2="tables"
            option2Label="Tables"
            variant="light"
          />
          {formData.dataViewStyle && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 ml-1">
              {DATA_VIEW_STYLE_OPTIONS.find(opt => opt.value === formData.dataViewStyle)?.description}
            </p>
          )}
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg">
            General settings saved successfully!
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}
