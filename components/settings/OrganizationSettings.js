import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount, createUserAccount, listStorageFiles, getStoragePublicUrl, removeStorageFiles } from '@/services/userService';
import { getUserOrganization } from '@/services/organizationService';
import { HiCloudUpload, HiX, HiPlus } from 'react-icons/hi';
import Dropdown from '@/components/ui/Dropdown';
import InputField from '@/components/ui/InputField';
import { AddressAutocomplete, PhoneNumberInput } from '@/components/ui';
import { PrimaryButton } from '@/components/ui/buttons';
import { COUNTRIES } from '@/utils/countries';
import { INDUSTRIES } from '@/components/clients/clientProfileConstants';

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
  const [newLocationValue, setNewLocationValue] = useState('');
  
  const [formData, setFormData] = useState({
    companyName: '',
    companyLogo: '',
    logoFile: null,
    industry: '',
    organizationCountry: '',
    organizationAddress: '',
    organizationAddress2: '',
    organizationPhone: '',
    organizationCity: '',
    organizationState: '',
    organizationPostalCode: '',
    businessHoursStart: '08:00',
    businessHoursEnd: '18:00',
    locations: [],
  });

  useEffect(() => {
    if (currentUser) {
      loadUserData();
    }
  }, [currentUser]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      const [userData, orgData] = await Promise.all([
        getUserAccount(currentUser.uid).catch((err) => {
          console.error('[OrganizationSettings] Error fetching user account:', err);
          return null;
        }),
        getUserOrganization(currentUser.uid).catch((err) => {
          console.error('[OrganizationSettings] Error fetching organization:', err);
          return null;
        })
      ]);
      
      console.log('[OrganizationSettings] Loaded data:', {
        hasUserData: !!userData,
        hasOrgData: !!orgData,
        orgData: orgData,
        userDataCompanyName: userData?.companyName,
        userDataCompanyLogo: userData?.companyLogo,
        userDataIndustry: userData?.industry,
      });
      
      const orgName = orgData?.name || userData?.companyName || '';
      const orgLogo = orgData?.logo_url || userData?.companyLogo || '';
      const orgIndustry = orgData?.industry || userData?.industry || '';
      const orgAddress = orgData?.address_line_1 ?? userData?.organizationAddress ?? '';
      const orgAddress2 = orgData?.address_line_2 ?? userData?.organizationAddress2 ?? '';
      const orgCity = orgData?.city ?? userData?.organizationCity ?? '';
      const orgState = orgData?.state ?? userData?.organizationState ?? '';
      const orgPostalCode = orgData?.postal_code ?? userData?.organizationPostalCode ?? '';
      const orgCountry = orgData?.country ?? userData?.organizationCountry ?? '';
      const orgPhone = orgData?.phone ?? userData?.organizationPhone ?? '';
      const orgBusinessHoursStart = orgData?.business_hours_start ?? userData?.businessHoursStart ?? '08:00';
      const orgBusinessHoursEnd = orgData?.business_hours_end ?? userData?.businessHoursEnd ?? '18:00';
      const userLocations = userData?.locations || [];
      const existingLocations = Array.isArray(orgData?.locations) && orgData.locations.length
        ? orgData.locations
        : userLocations;

      if (orgLogo && orgLogo.trim() !== '') {
        setLogoPreview(orgLogo);
      } else {
        setLogoPreview(null);
      }

      const hqAddress = orgAddress || userData?.organizationAddress || '';
      let locations = [];

      if (hqAddress.trim()) {
        locations = [{
          address: hqAddress.trim(),
          address2: orgAddress2 || userData?.organizationAddress2 || '',
          city: orgCity || userData?.organizationCity || '',
          state: orgState || userData?.organizationState || '',
          postalCode: orgPostalCode || userData?.organizationPostalCode || '',
          country: orgCountry || userData?.organizationCountry || '',
        }];
      }

      existingLocations.forEach(loc => {
        if (loc) {
          if (typeof loc === 'object' && loc.address) {
            const locAddress = loc.address.trim();
            if (locAddress && locAddress !== hqAddress.trim()) {
              locations.push({
                address: locAddress,
                address2: loc.address2 || '',
                city: loc.city || '',
                state: loc.state || '',
                postalCode: loc.postalCode || '',
                country: loc.country || '',
              });
            }
          } else if (typeof loc === 'string' && loc.trim() && loc.trim() !== hqAddress.trim()) {
            locations.push({
              address: loc.trim(),
              address2: '',
              city: '',
              state: '',
              postalCode: '',
              country: '',
            });
          }
        }
      });
      
      setFormData({
        companyName: orgName,
        companyLogo: orgLogo,
        logoFile: null,
        industry: orgIndustry,
        organizationCountry: orgCountry || '',
        organizationAddress: orgAddress || '',
        organizationAddress2: orgAddress2 || '',
        organizationPhone: orgPhone || '',
        organizationCity: orgCity || '',
        organizationState: orgState || '',
        organizationPostalCode: orgPostalCode || '',
        businessHoursStart: orgBusinessHoursStart || '08:00',
        businessHoursEnd: orgBusinessHoursEnd || '18:00',
        locations: locations,
      });
    } catch (err) {
      console.error('Error loading organization data:', err);
      setError('Failed to load organization settings');
      setLogoPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      
      if (name === 'organizationAddress' && value.trim()) {
        const hqAddress = value.trim();
        const otherLocations = prev.locations.filter((loc, idx) => idx !== 0);
        updated.locations = [{
          address: hqAddress,
          address2: prev.organizationAddress2 || '',
          city: prev.organizationCity || '',
          state: prev.organizationState || '',
          postalCode: prev.organizationPostalCode || '',
          country: prev.organizationCountry || '',
        }, ...otherLocations];
      }
      
      if (['organizationAddress2', 'organizationCity', 'organizationState', 'organizationPostalCode', 'organizationCountry'].includes(name)) {
        if (updated.locations.length > 0) {
          updated.locations[0] = {
            ...updated.locations[0],
            address: updated.organizationAddress || updated.locations[0].address,
            address2: name === 'organizationAddress2' ? value : (updated.organizationAddress2 || updated.locations[0].address2),
            city: name === 'organizationCity' ? value : (updated.organizationCity || updated.locations[0].city),
            state: name === 'organizationState' ? value : (updated.organizationState || updated.locations[0].state),
            postalCode: name === 'organizationPostalCode' ? value : (updated.organizationPostalCode || updated.locations[0].postalCode),
            country: name === 'organizationCountry' ? value : (updated.organizationCountry || updated.locations[0].country),
          };
        }
      }
      
      return updated;
    });
    setError(null);
    setSuccess(false);
  };

  const handleAddLocation = (addressData) => {
    const newLocationAddress = addressData.address1 || addressData.fullAddress || '';
    if (newLocationAddress.trim()) {
      const locationExists = formData.locations.some(loc => 
        (typeof loc === 'string' ? loc.trim() : loc.address?.trim()) === newLocationAddress.trim()
      );
      
      if (!locationExists) {
        const newLocation = {
          address: newLocationAddress.trim(),
          address2: addressData.address2 || '',
          city: addressData.city || '',
          state: addressData.state || '',
          postalCode: addressData.postalCode || '',
          country: addressData.country || '',
        };
        
        setFormData((prev) => ({
          ...prev,
          locations: [...prev.locations, newLocation],
        }));
        
        setTimeout(() => {
          setNewLocationValue('');
        }, 100);
      }
    }
  };

  const handleRemoveLocation = (indexToRemove) => {
    if (indexToRemove === 0) return;
    
    setFormData((prev) => ({
      ...prev,
      locations: prev.locations.filter((_, index) => index !== indexToRemove),
    }));
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
      const orgData = await getUserOrganization(currentUser.uid);
      if (!orgData || !orgData.id) {
        throw new Error('Organization not found');
      }

      const orgRes = await fetch('/api/update-organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: orgData.id,
          userId: currentUser.uid,
          updates: { logo_url: '' },
        }),
      });
      if (!orgRes.ok) {
        const errData = await orgRes.json().catch(() => ({}));
        throw new Error(errData.error || orgRes.statusText || 'Failed to remove logo');
      }

      const userData = await getUserAccount(currentUser.uid);
      const updatedData = await createUserAccount(
        currentUser.uid,
        {
          ...userData,
          companyLogo: '',
          userId: currentUser.uid,
          email: currentUser.email,
        },
        null
      );
      
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
      
      const fileInput = document.getElementById('logo');
      if (fileInput) {
        fileInput.value = '';
      }
      
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

      const orgData = await getUserOrganization(currentUser.uid);
      if (!orgData || !orgData.id) {
        throw new Error('Organization not found. Please contact support.');
      }

      const { logoFile, ...dataToSave } = formData;
      
      let logoUrl = formData.companyLogo || '';
      if (logoFile) {
        try {
          const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(logoFile);
          });
          
          const uploadResponse = await fetch('/api/upload-organization-logo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              organizationId: orgData.id,
              logoData: {
                base64,
                filename: logoFile.name,
                contentType: logoFile.type || 'image/png'
              }
            }),
          });

          if (!uploadResponse.ok) {
            throw new Error('Failed to upload logo');
          }

          const uploadResult = await uploadResponse.json();
          logoUrl = uploadResult.logoUrl || logoUrl;
        } catch (logoErr) {
          console.error('Error uploading logo:', logoErr);
          setError('Failed to upload logo. Please try again.');
          return;
        }
      }
      
      const orgRes = await fetch('/api/update-organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: orgData.id,
          userId: currentUser.uid,
          updates: {
            name: dataToSave.companyName || '',
            logo_url: logoUrl,
            industry: dataToSave.industry || '',
            address_line_1: (dataToSave.organizationAddress || '').trim() || null,
            address_line_2: (dataToSave.organizationAddress2 || '').trim() || null,
            city: (dataToSave.organizationCity || '').trim() || null,
            state: (dataToSave.organizationState || '').trim() || null,
            postal_code: (dataToSave.organizationPostalCode || '').trim() || null,
            country: (dataToSave.organizationCountry || '').trim() || null,
            phone: (dataToSave.organizationPhone || '').trim() || null,
            website: (dataToSave.organizationWebsite || '').trim() || null,
            business_hours_start: (dataToSave.businessHoursStart || '').trim() || null,
            business_hours_end: (dataToSave.businessHoursEnd || '').trim() || null,
            locations: Array.isArray(dataToSave.locations) ? dataToSave.locations : [],
          },
        }),
      });
      if (!orgRes.ok) {
        const errData = await orgRes.json().catch(() => ({}));
        throw new Error(errData.error || orgRes.statusText || 'Failed to update organization');
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('organization-updated'));
      }

      const hqAddress = dataToSave.organizationAddress || '';
      let locations = dataToSave.locations || [];
      
      locations = locations.filter(loc => loc !== hqAddress);
      
      if (hqAddress.trim()) {
        locations = [hqAddress.trim(), ...locations];
      }
      
      const userData = await getUserAccount(currentUser.uid);
      const savedUserData = await createUserAccount(
        currentUser.uid,
        {
          ...userData,
          ...dataToSave,
          companyLogo: logoUrl, // Keep in sync with organization
          locations: locations,
          userId: currentUser.uid,
          email: currentUser.email,
        },
        null // Logo already uploaded, don't upload again
      );

      if (logoUrl && logoUrl.trim() !== '') {
        setLogoPreview(logoUrl);
        setFormData((prev) => ({ ...prev, companyLogo: logoUrl, logoFile: null }));
      }
      
      if (typeof window !== 'undefined' && savedUserData) {
        window.dispatchEvent(
          new CustomEvent('useraccount', {
            detail: {
              type: 'useraccount-updated',
              payload: { ...savedUserData, companyLogo: logoUrl },
            },
          })
        );
      }
      
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Organization</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Manage your organization profile, members, and preferences</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Organization Name and Industry */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <Dropdown
            id="industry"
            name="industry"
            label="Industry"
            value={formData.industry || undefined}
            onChange={handleInputChange}
            options={INDUSTRIES.map((ind) => ({ value: ind, label: ind }))}
            placeholder="Select industry..."
            variant="light"
          />
        </div>

        {/* Logo / Branding */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
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
                    className="w-24 h-24 object-contain border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 group-hover:opacity-80 transition-opacity"
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
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors w-fit"
                  >
                    <HiCloudUpload className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">PNG, JPG up to 5MB</p>
                </>
              )}
              {logoPreview && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Click the logo to replace it</p>
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
          <PhoneNumberInput
            id="organizationPhone"
            label="Organization Phone Number"
            value={formData.organizationPhone}
            onChange={(formatted) => setFormData((prev) => ({ ...prev, organizationPhone: formatted }))}
            placeholder="(717) 123-4567"
            variant="light"
            inputProps={{ name: 'organizationPhone' }}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* Locations */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
            Locations
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Add additional locations where your team works. The HQ address is automatically included as the first location.
          </p>
          
          {/* List of locations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {formData.locations.map((location, index) => {
              const locationObj = typeof location === 'string' 
                ? { address: location, address2: '', city: '', state: '', postalCode: '', country: '' }
                : location;
              
              const locationAddress = locationObj.address || '';
              const locationCity = locationObj.city || '';
              const locationState = locationObj.state || '';
              const locationPostalCode = locationObj.postalCode || '';
              
              return (
                <div
                  key={index}
                  className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {index === 0 && (
                      <span className="px-2 py-1 text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded flex-shrink-0 self-start">
                        HQ
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-200 break-words">{locationAddress}</div>
                      {(locationCity || locationState || locationPostalCode) && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {[locationCity, locationState, locationPostalCode].filter(Boolean).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLocation(index)}
                      className="ml-2 p-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors flex-shrink-0 self-start"
                      title="Remove location"
                    >
                      <HiX className="w-5 h-5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add new location */}
          <div>
            <AddressAutocomplete
              id="newLocation"
              label="Add Location"
              value={newLocationValue}
              onChange={(value) => setNewLocationValue(value)}
              onSelect={(addressData) => {
                handleAddLocation(addressData);
              }}
              placeholder="Start typing an address to add a new location..."
            />
          </div>
        </div>        

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg">
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
