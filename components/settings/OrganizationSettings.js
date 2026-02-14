import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount, createUserAccount } from '@/services/userService';
import { HiCloudUpload, HiX } from 'react-icons/hi';
import Dropdown from '@/components/ui/Dropdown';
import InputField from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/buttons';

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

// Business hours: every hour from 00:00 to 23:00 (value stored as HH:00)
const BUSINESS_HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const h = String(i).padStart(2, '0');
  return { value: `${h}:00`, label: `${h}:00` };
});

const TIME_FORMAT_OPTIONS = [
  { value: '24h', label: '24-hour (e.g. 18:00)' },
  { value: '12h', label: '12-hour (e.g. 6:00 PM)' },
];

export default function OrganizationSettings() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  
  const [formData, setFormData] = useState({
    companyName: '',
    companyLogo: '',
    logoFile: null,
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    numberFormat: '1,234.56',
    defaultLanguage: 'en',
    businessHoursStart: '08:00',
    businessHoursEnd: '18:00',
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
          companyName: userData.companyName || '',
          companyLogo: userData.companyLogo || '',
          timezone: userData.timezone || 'UTC',
          dateFormat: userData.dateFormat || 'MM/DD/YYYY',
          numberFormat: userData.numberFormat || '1,234.56',
          defaultLanguage: userData.defaultLanguage || 'en',
          businessHoursStart: userData.businessHoursStart || '08:00',
          businessHoursEnd: userData.businessHoursEnd || '18:00',
          timeFormat: userData.timeFormat || '24h',
          currency: userData.currency || 'USD',
        });
        if (userData.companyLogo) {
          setLogoPreview(userData.companyLogo);
        }
      }
    } catch (err) {
      console.error('Error loading user data:', err);
      setError('Failed to load organization settings');
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

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Logo file size must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
      
      setFormData((prev) => ({ ...prev, logoFile: file }));
      setError(null);
    }
  };

  const removeLogo = () => {
    setLogoPreview(null);
    setFormData((prev) => ({ ...prev, companyLogo: '', logoFile: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const { logoFile, ...dataToSave } = formData;
      
      await createUserAccount(
        currentUser.uid,
        {
          ...dataToSave,
          userId: currentUser.uid,
          email: currentUser.email,
        },
        logoFile || null
      );

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving organization settings:', err);
      setError(err.message || 'Failed to save organization settings');
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
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Organization</h2>
      <p className="text-sm text-gray-600 mb-6">Manage your organization profile, members, and preferences</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Organization Name */}
        <InputField
          id="companyName"
          label="Organization Name"
          type="text"
          value={formData.companyName}
          onChange={handleInputChange}
          placeholder="Enter organization name"
          required
          variant="light"
          inputProps={{ name: 'companyName' }}
        />

        {/* Logo / Branding */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Logo / Branding
          </label>
          <div className="flex items-start gap-4">
            {logoPreview && (
              <div className="relative">
                <img
                  src={logoPreview}
                  alt="Organization logo"
                  className="w-24 h-24 object-contain border border-gray-300 rounded-lg bg-gray-50"
                />
                <button
                  type="button"
                  onClick={removeLogo}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  <HiX className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex-1">
              <label
                htmlFor="logo"
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors w-fit"
              >
                <HiCloudUpload className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  {logoPreview ? 'Change Logo' : 'Upload Logo'}
                </span>
                <input
                  type="file"
                  id="logo"
                  name="logo"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
            </div>
          </div>
        </div>

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

        {/* Business hours & time format (used by appointments calendar) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Dropdown
            id="businessHoursStart"
            name="businessHoursStart"
            label="Business hours start"
            value={formData.businessHoursStart}
            onChange={handleInputChange}
            options={BUSINESS_HOUR_OPTIONS}
            placeholder="Start"
          />
          <Dropdown
            id="businessHoursEnd"
            name="businessHoursEnd"
            label="Business hours end"
            value={formData.businessHoursEnd}
            onChange={handleInputChange}
            options={BUSINESS_HOUR_OPTIONS}
            placeholder="End"
          />
          <Dropdown
            id="timeFormat"
            name="timeFormat"
            label="Time format"
            value={formData.timeFormat}
            onChange={handleInputChange}
            options={TIME_FORMAT_OPTIONS}
            placeholder="Format"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            Organization settings saved successfully!
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
