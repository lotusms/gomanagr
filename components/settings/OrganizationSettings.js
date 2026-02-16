import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount, createUserAccount } from '@/services/userService';
import { HiCloudUpload, HiX } from 'react-icons/hi';
import Dropdown from '@/components/ui/Dropdown';
import InputField from '@/components/ui/InputField';
import { AddressAutocomplete } from '@/components/ui';
import { PrimaryButton } from '@/components/ui/buttons';
import { COUNTRIES } from '@/utils/countries';

// Business hours: every hour from 00:00 to 23:00 (value stored as HH:00)
const BUSINESS_HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const h = String(i).padStart(2, '0');
  return { value: `${h}:00`, label: `${h}:00` };
});

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
    organizationCountry: '',
    organizationAddress: '',
    organizationAddress2: '',
    organizationCity: '',
    organizationState: '',
    organizationPostalCode: '',
    businessHoursStart: '08:00',
    businessHoursEnd: '18:00',
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
        let logoUrl = userData.companyLogo || '';
        
        // If logo URL is missing but logo file exists in storage, get the URL
        if (!logoUrl || logoUrl.trim() === '') {
          try {
            const { ref: storageRef, listAll, getDownloadURL } = await import('firebase/storage');
            const { storage } = await import('@/lib/firebase');
            
            const userLogosFolderRef = storageRef(storage, `company-logos/${currentUser.uid}`);
            const listResult = await listAll(userLogosFolderRef);
            
            if (listResult.items.length > 0) {
              // Get the first logo file's download URL
              const firstLogoRef = listResult.items[0];
              logoUrl = await getDownloadURL(firstLogoRef);
              
              // Save the URL to Firestore for future use
              const { createUserAccount } = await import('@/services/userService');
              const updatedData = await createUserAccount(
                currentUser.uid,
                {
                  ...userData,
                  companyLogo: logoUrl,
                  userId: currentUser.uid,
                  email: currentUser.email,
                },
                null
              );
              
              // Dispatch event to update header avatar immediately
              if (typeof window !== 'undefined' && updatedData) {
                window.dispatchEvent(
                  new CustomEvent('useraccount', {
                    detail: {
                      type: 'useraccount-updated',
                      payload: updatedData,
                    },
                  })
                );
              }
            }
          } catch (err) {
            console.error('No logo found in storage or error retrieving:', err);
          }
        }
        
        // Set logo preview FIRST before setting formData to ensure it displays
        if (logoUrl && logoUrl.trim() !== '') {
          setLogoPreview(logoUrl);
        } else {
          setLogoPreview(null);
        }
        
        setFormData({
          companyName: userData.companyName || '',
          companyLogo: logoUrl,
          logoFile: null,
          organizationCountry: userData.organizationCountry || '',
          organizationAddress: userData.organizationAddress || '',
          organizationAddress2: userData.organizationAddress2 || '',
          organizationCity: userData.organizationCity || '',
          organizationState: userData.organizationState || '',
          organizationPostalCode: userData.organizationPostalCode || '',
          businessHoursStart: userData.businessHoursStart || '08:00',
          businessHoursEnd: userData.businessHoursEnd || '18:00',
        });
      } else {
        // No user data found, reset everything
        setLogoPreview(null);
        setFormData({
          companyName: '',
          companyLogo: '',
          logoFile: null,
          organizationCountry: '',
          organizationAddress: '',
          organizationAddress2: '',
          organizationCity: '',
          organizationState: '',
          organizationPostalCode: '',
          businessHoursStart: '08:00',
          businessHoursEnd: '18:00',
        });
      }
    } catch (err) {
      console.error('Error loading user data:', err);
      setError('Failed to load organization settings');
      setLogoPreview(null);
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

  const removeLogo = async () => {
    if (!currentUser) return;
    
    try {
      // Delete logo from storage
      const { ref: storageRef, listAll, deleteObject } = await import('firebase/storage');
      const { storage } = await import('@/lib/firebase');
      
      const userLogosFolderRef = storageRef(storage, `company-logos/${currentUser.uid}`);
      const listResult = await listAll(userLogosFolderRef);
      
      // Delete all logo files
      const deletePromises = listResult.items.map((itemRef) => deleteObject(itemRef));
      await Promise.all(deletePromises);
      
      // Update Firestore to remove logo URL
      const { createUserAccount } = await import('@/services/userService');
      const updatedData = await createUserAccount(
        currentUser.uid,
        {
          ...formData,
          companyLogo: '',
          userId: currentUser.uid,
          email: currentUser.email,
        },
        null
      );
      
      // Dispatch event to update header avatar
      if (typeof window !== 'undefined' && updatedData) {
        window.dispatchEvent(
          new CustomEvent('useraccount', {
            detail: {
              type: 'useraccount-updated',
              payload: updatedData,
            },
          })
        );
      }
      
      setLogoPreview(null);
      setFormData((prev) => ({ ...prev, companyLogo: '', logoFile: null }));
      
      // Reset file input
      const fileInput = document.getElementById('logo');
      if (fileInput) {
        fileInput.value = '';
      }
      
      // Reload to sync
      await loadUserData();
    } catch (err) {
      console.error('Error removing logo:', err);
      setError('Failed to remove logo: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const { logoFile, ...dataToSave } = formData;
      
      const savedData = await createUserAccount(
        currentUser.uid,
        {
          ...dataToSave,
          userId: currentUser.uid,
          email: currentUser.email,
        },
        logoFile || null
      );

      // Update logo preview with the saved logo URL
      if (savedData && savedData.companyLogo) {
        setLogoPreview(savedData.companyLogo);
        setFormData((prev) => ({ ...prev, companyLogo: savedData.companyLogo, logoFile: null }));
      }
      
      // Dispatch event to update header avatar
      if (typeof window !== 'undefined' && savedData) {
        window.dispatchEvent(
          new CustomEvent('useraccount', {
            detail: {
              type: 'useraccount-updated',
              payload: savedData,
            },
          })
        );
      }
      
      // Reload user data to ensure everything is in sync
      await loadUserData();

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
              <div className="relative group">
                <label
                  htmlFor="logo"
                  className="cursor-pointer block"
                  title="Click to replace logo"
                >
                  <img
                    src={logoPreview}
                    alt="Organization logo"
                    className="w-24 h-24 object-contain border border-gray-300 rounded-lg bg-gray-50 group-hover:opacity-80 transition-opacity"
                  />
                </label>
                <button
                  type="button"
                  onClick={removeLogo}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  title="Remove logo"
                >
                  <HiX className="w-4 h-4" />
                </button>
                <input
                  type="file"
                  id="logo"
                  name="logo"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
              </div>
            )}
            <div className="flex-1">
              {!logoPreview && (
                <>
                  <label
                    htmlFor="logo"
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors w-fit"
                  >
                    <HiCloudUpload className="w-5 h-5 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">
                      Upload Logo
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
                </>
              )}
              {logoPreview && (
                <p className="text-xs text-gray-500 mt-1">Click the logo to replace it</p>
              )}
            </div>
          </div>
        </div>

        {/* Organization Country */}
        <Dropdown
          id="organizationCountry"
          name="organizationCountry"
          label="Organization Country (HQ)"
          value={formData.organizationCountry || undefined}
          onChange={handleInputChange}
          options={COUNTRIES}
          placeholder="Select organization country..."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> 
          {/* Organization Address */}
          <AddressAutocomplete
            id="organizationAddress"
            label="Organization Address"
            value={formData.organizationAddress}
            onChange={(address) => setFormData((prev) => ({ ...prev, organizationAddress: address }))}
            onSelect={(addressData) => {
              setFormData((prev) => ({
                ...prev,
                organizationAddress: addressData.address1,
                organizationAddress2: addressData.address2 || '',
                organizationCity: addressData.city || '',
                organizationState: addressData.state || '',
                organizationPostalCode: addressData.postalCode || '',
                organizationCountry: addressData.country || prev.organizationCountry,
              }));
            }}
            placeholder="Start typing organization address..."
          />
          
          {/* Address Line 2 */}
          {formData.organizationAddress && (
            <InputField
              id="organizationAddress2"
              name="organizationAddress2"
              label="Address line 2"
              type="text"
              value={formData.organizationAddress2}
              onChange={handleInputChange}
              placeholder="Apt, suite, etc. (optional)"
              variant="light"
            />
          )}
        </div>

        {/* City, State, Postal Code */}
        {formData.organizationAddress && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField
              id="organizationCity"
              name="organizationCity"
              label="City"
              type="text"
              value={formData.organizationCity}
              onChange={handleInputChange}
              variant="light"
            />
            <InputField
              id="organizationState"
              name="organizationState"
              label="State / Province"
              type="text"
              value={formData.organizationState}
              onChange={handleInputChange}
              variant="light"
            />
            <InputField
              id="organizationPostalCode"
              name="organizationPostalCode"
              label="Postal Code"
              type="text"
              value={formData.organizationPostalCode}
              onChange={handleInputChange}
              variant="light"
            />
          </div>
        )}

        {/* Business hours (used by appointments calendar) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
