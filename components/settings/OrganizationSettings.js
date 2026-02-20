import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount, createUserAccount, listStorageFiles, getStoragePublicUrl, removeStorageFiles } from '@/services/userService';
import { getUserOrganization, updateOrganization, createOrganization, addUserToOrganization } from '@/services/organizationService';
import { HiCloudUpload, HiX, HiPlus } from 'react-icons/hi';
import Dropdown from '@/components/ui/Dropdown';
import InputField from '@/components/ui/InputField';
import { AddressAutocomplete } from '@/components/ui';
import { PrimaryButton } from '@/components/ui/buttons';
import { COUNTRIES } from '@/utils/countries';
import { INDUSTRIES } from '@/components/clients/clientProfileConstants';

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
  const [newLocationValue, setNewLocationValue] = useState('');
  
  const [formData, setFormData] = useState({
    companyName: '',
    companyLogo: '',
    logoFile: null,
    industry: '',
    organizationCountry: '',
    organizationAddress: '',
    organizationAddress2: '',
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
      
      // Fetch both user account and organization data
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
      
      // Use organization data for name, logo, and industry (multi-tenant source of truth)
      const orgName = orgData?.name || userData?.companyName || '';
      const orgLogo = orgData?.logo_url || userData?.companyLogo || '';
      const orgIndustry = orgData?.industry || userData?.industry || '';
      
      console.log('[OrganizationSettings] Resolved values:', {
        orgName,
        orgLogo,
        orgIndustry,
      });
      
      // Set logo preview from organization logo
      if (orgLogo && orgLogo.trim() !== '') {
        setLogoPreview(orgLogo);
      } else {
        setLogoPreview(null);
      }
      
      // If organization doesn't exist but user data exists, try to create it
      if (!orgData && userData && userData.companyName) {
        console.warn('[OrganizationSettings] Organization not found! Attempting to create from user data...');
        try {
          const newOrg = await createOrganization({
            name: userData.companyName || 'My Organization',
            logo_url: userData.companyLogo || '',
            industry: userData.industry || '',
            company_size: userData.companySize || '',
            company_locations: userData.companyLocations || '',
            team_size: userData.teamSize || '',
            sections_to_track: userData.sectionsToTrack || [],
            trial: userData.trial !== undefined ? userData.trial : true,
            trial_ends_at: userData.trialEndsAt || null,
            selected_palette: userData.selectedPalette || 'palette1',
          });
          
          // Add user to organization as admin
          await addUserToOrganization(newOrg.id, currentUser.uid, 'admin');
          
          console.log('[OrganizationSettings] Created organization:', newOrg);
          
          // Reload data with new organization
          return loadUserData();
        } catch (createErr) {
          console.error('[OrganizationSettings] Failed to create organization:', createErr);
          setError('Organization not found and could not be created. Please contact support.');
        }
      }
      
      // Build locations array - always include HQ location
      const hqAddress = userData?.organizationAddress || '';
      const existingLocations = userData?.locations || [];
      let locations = [];
      
      // If HQ address exists, add it as first location (as object with full details)
      if (hqAddress.trim()) {
        locations = [{
          address: hqAddress.trim(),
          address2: userData.organizationAddress2 || '',
          city: userData.organizationCity || '',
          state: userData.organizationState || '',
          postalCode: userData.organizationPostalCode || '',
          country: userData.organizationCountry || '',
        }];
      }
      
      // Add other locations (convert strings to objects if needed, excluding HQ)
      existingLocations.forEach(loc => {
        if (loc) {
          // If it's already an object, use it
          if (typeof loc === 'object' && loc.address) {
            const locAddress = loc.address.trim();
            // Only add if it's different from HQ address
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
            // Convert string to object format
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
        organizationCountry: userData?.organizationCountry || '',
        organizationAddress: userData?.organizationAddress || '',
        organizationAddress2: userData?.organizationAddress2 || '',
        organizationCity: userData?.organizationCity || '',
        organizationState: userData?.organizationState || '',
        organizationPostalCode: userData?.organizationPostalCode || '',
        businessHoursStart: userData?.businessHoursStart || '08:00',
        businessHoursEnd: userData?.businessHoursEnd || '18:00',
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
      
      // If organization address changes, update HQ location in locations array
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
      
      // Update HQ location details when address fields change
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
      // Check if location already exists
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
        
        // Clear the input field after a short delay to allow the selection to complete
        setTimeout(() => {
          setNewLocationValue('');
        }, 100);
      }
    }
  };

  const handleRemoveLocation = (indexToRemove) => {
    // Don't allow removing the first location (HQ)
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
      // Get organization data
      const orgData = await getUserOrganization(currentUser.uid);
      if (!orgData || !orgData.id) {
        throw new Error('Organization not found');
      }

      // Update organization to remove logo URL
      await updateOrganization(orgData.id, {
        logo_url: '',
      });

      // Also update user account to keep in sync
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

      // Get organization data first
      const orgData = await getUserOrganization(currentUser.uid);
      if (!orgData || !orgData.id) {
        throw new Error('Organization not found. Please contact support.');
      }

      const { logoFile, ...dataToSave } = formData;
      
      // Handle logo upload to organization-specific path if new logo provided
      let logoUrl = formData.companyLogo || '';
      if (logoFile) {
        try {
          // Convert file to base64 for API upload
          const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(logoFile);
          });
          
          // Upload logo via API to organization-specific path
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
      
      // Update organization data (name, logo, industry)
      const updatedOrg = await updateOrganization(orgData.id, {
        name: dataToSave.companyName || '',
        logo_url: logoUrl,
        industry: dataToSave.industry || '',
      });

      // Update user account data for other fields (locations, business hours, etc.)
      // Ensure HQ location is always first in locations array
      const hqAddress = dataToSave.organizationAddress || '';
      let locations = dataToSave.locations || [];
      
      // Remove HQ from locations if it exists elsewhere
      locations = locations.filter(loc => loc !== hqAddress);
      
      // Add HQ as first location if it exists
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

      // Update logo preview with the saved logo URL
      if (logoUrl && logoUrl.trim() !== '') {
        setLogoPreview(logoUrl);
        setFormData((prev) => ({ ...prev, companyLogo: logoUrl, logoFile: null }));
      }
      
      // Dispatch event to update header avatar
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
      
      // Reload data to ensure everything is in sync
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
              // Handle both string and object formats
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
