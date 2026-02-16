import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount, createUserAccount } from '@/services/userService';
import Dropdown from '@/components/ui/Dropdown';
import { PrimaryButton } from '@/components/ui/buttons';

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'America/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Dubai',
  'Australia/Sydney',
];

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
  });

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
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">General</h2>
      <p className="text-sm text-gray-600 mb-6">Manage your preferences and display settings</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date & Number Formats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Time Zone */}
          <Dropdown
            id="timezone"
            name="timezone"
            label="Time Zone"
            value={formData.timezone}
            onChange={handleInputChange}
            options={TIMEZONES.map((tz) => ({ value: tz, label: tz }))}
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

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
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
