import { useState, useEffect, useMemo } from 'react';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import {
  InputField,
  TextareaField,
  FileInput,
  ChipsArrayBuilder,
  Dropdown,
  AddressAutocomplete,
  Drawer,
  Checkbox,
} from '@/components/ui';
import AddServiceForm from '@/components/services/AddServiceForm';
import { HiPlus } from 'react-icons/hi';
import { formatPhone, unformatPhone } from '@/utils/formatPhone';
import { COUNTRIES } from '@/utils/countries';
import { State } from 'country-state-city';

// Helper to normalize country value (convert name to code if needed)
function normalizeCountryValue(value) {
  if (!value) return '';
  // If it's already a 2-letter code, return uppercase
  if (value.length === 2 && /^[A-Z]{2}$/i.test(value)) {
    return value.toUpperCase();
  }
  // Try to find by name
  const found = COUNTRIES.find(c => 
    c.label.toLowerCase() === value.toLowerCase() ||
    c.value.toLowerCase() === value.toLowerCase()
  );
  return found ? found.value : value;
}

const GENDER_OPTIONS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'other', label: 'Other' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];


/**
 * Full add/edit team member form. Uses Radix-based UI components.
 * @param {(data: AddTeamMemberData, pictureFile: File | null, editingId?: string) => void} onSubmit
 * @param {() => void} onCancel
 * @param {boolean} [saving]
 * @param {Object} [initialMember] - When set, form is in edit mode (pre-filled, submit updates this member)
 * @param {Array<string>} [locations] - Array of location names. Location field only shows when locations.length > 1
 * @param {string} [organizationCountry] - Organization's HQ country code. This country will appear at the top of the country dropdown.
 * @param {Array} [services] - Array of service objects from userAccount.services
 * @param {Array} [teamMembers] - Array of team members for service assignment
 * @param {Function} [onServiceCreated] - Callback when a new service is created (receives updated services array)
 * @param {Function} [onInviteToLogin] - Callback when user clicks "Invite to log in" in edit mode (receives member object)
 */
export default function AddTeamMemberForm({ 
  onSubmit, 
  onCancel, 
  saving = false, 
  initialMember = null, 
  locations = [], 
  organizationCountry = '', 
  services = [], 
  teamMembers = [], 
  onServiceCreated,
  onInviteToLogin,
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('');
  const [title, setTitle] = useState('');
  // Initialize location as empty string to keep dropdown controlled from the start
  // Will be set to undefined or a valid location value by useEffect
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState('');
  const [personalityTraits, setPersonalityTraits] = useState([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [serviceToAdd, setServiceToAdd] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [pictureFile, setPictureFile] = useState(null);
  const [picturePreviewUrl, setPicturePreviewUrl] = useState('');
  const [fileInputKey, setFileInputKey] = useState(0);
  const [showServiceDrawer, setShowServiceDrawer] = useState(false);
  const [savingService, setSavingService] = useState(false);
  const [sendInviteToLogin, setSendInviteToLogin] = useState(false);

  const isEdit = !!initialMember?.id;

  // Sort countries with organization country at the top
  const sortedCountries = useMemo(() => {
    if (!organizationCountry) return COUNTRIES;
    const normalizedOrgCountry = normalizeCountryValue(organizationCountry);
    const orgCountry = COUNTRIES.find(c => c.value === normalizedOrgCountry);
    if (!orgCountry) return COUNTRIES;
    const otherCountries = COUNTRIES.filter(c => c.value !== normalizedOrgCountry);
    return [orgCountry, ...otherCountries];
  }, [organizationCountry]);

  // Get available states/provinces based on selected country
  const availableStates = useMemo(() => {
    if (!country) return [];
    // Ensure country is normalized (uppercase ISO code)
    const normalizedCountry = normalizeCountryValue(country);
    // Use country-state-city package to get states
    const states = State.getStatesOfCountry(normalizedCountry);
    // Convert to dropdown format: { value, label }
    return states.map(state => ({
      value: state.isoCode,
      label: state.name
    }));
  }, [country]);

  // Reset state when country changes if current state is not valid for new country
  useEffect(() => {
    if (country && state) {
      const normalizedCountry = normalizeCountryValue(country);
      const states = State.getStatesOfCountry(normalizedCountry);
      const isValidState = states.some(s => s.isoCode === state || s.name === state);
      if (!isValidState && states.length > 0) {
        setState('');
      }
    } else if (!country) {
      setState('');
    }
  }, [country, state]);

  useEffect(() => {
    if (!initialMember) {
      setSendInviteToLogin(false);
      setPicturePreviewUrl('');
      return;
    }
    setFirstName(initialMember.firstName ?? (initialMember.name?.split(' ')[0] ?? ''));
    setLastName(initialMember.lastName ?? (initialMember.name?.split(' ').slice(1).join(' ') ?? ''));
    setRole(initialMember.role ?? '');
    setTitle(initialMember.title ?? '');
    // Location will be set by the separate useEffect when locations are loaded
    // Don't set it here to avoid controlled/uncontrolled switch
    // Format phone if it exists, otherwise set empty
    const phoneValue = initialMember.phone ?? '';
    setPhone(phoneValue ? formatPhone(unformatPhone(phoneValue)) : '');
    setEmail(initialMember.email ?? '');
    const addr = initialMember.address;
    setAddress1(addr?.address1 ?? '');
    setAddress2(addr?.address2 ?? '');
    setCity(addr?.city ?? '');
    setState(addr?.state ?? '');
    setPostalCode(addr?.postalCode ?? '');
    setCountry(normalizeCountryValue(addr?.country ?? ''));
    setBio(initialMember.bio ?? '');
    setGender(initialMember.gender ?? '');
    setPersonalityTraits(Array.isArray(initialMember.personalityTraits) ? initialMember.personalityTraits : []);
    setYearsExperience(initialMember.yearsExperience != null ? String(initialMember.yearsExperience) : '');
    setPictureFile(null);
    setPicturePreviewUrl(initialMember.pictureUrl ?? '');
    setFileInputKey((k) => k + 1);
  }, [initialMember?.id]);

  // Separate effect to update location when locations array is loaded/updated
  useEffect(() => {
    // Wait for locations to be loaded and initial member to be set
    if (!Array.isArray(locations) || locations.length <= 1) {
      // If no locations or only one location, clear the location state
      if (!initialMember?.location) {
        setLocation('');
      }
      return;
    }

    // Only process if we have an initial member with a location
    if (!initialMember?.location) {
      setLocation('');
      return;
    }

    const savedLocation = initialMember.location;
    let locationValue = undefined;
    
    // Helper to normalize address for comparison
    const normalizeAddress = (addr) => {
      if (!addr) return '';
      return String(addr).trim().toLowerCase().replace(/\s+/g, ' ');
    };
    
    if (typeof savedLocation === 'object' && savedLocation !== null && savedLocation.address) {
      // If saved location is an object, find matching location by address
      const savedAddr = String(savedLocation.address || '').trim();
      const savedAddrNormalized = normalizeAddress(savedAddr);
      
      // Try to find exact match first
      let matchingLoc = locations.find(loc => {
        const locAddress = typeof loc === 'string' ? loc.trim() : String(loc.address || '').trim();
        const normalizedLocAddr = normalizeAddress(locAddress);
        const matches = normalizedLocAddr === savedAddrNormalized;
        return matches;
      });
      
      if (matchingLoc) {
        locationValue = typeof matchingLoc === 'string' ? matchingLoc.trim() : String(matchingLoc.address || '').trim();
      } else {
        locationValue = undefined;
      }
    } else if (typeof savedLocation === 'string' && savedLocation.trim()) {
      const trimmedSaved = savedLocation.trim();
      const savedAddrNormalized = normalizeAddress(trimmedSaved);
      
      let matchingLoc = locations.find(loc => {
        const locAddress = typeof loc === 'string' ? loc : (loc.address || '');
        return normalizeAddress(locAddress) === savedAddrNormalized;
      });
      
      if (matchingLoc) {
        locationValue = typeof matchingLoc === 'string' ? matchingLoc.trim() : (matchingLoc.address || '').trim();
      } else {
        // If no match found, use the saved string as fallback
        locationValue = trimmedSaved || undefined;
      }
    }
    
    // Set the location value directly - ensure it's exactly what's in the dropdown options
    // Convert undefined to empty string to keep dropdown controlled
    if (locationValue) {
      // Double-check that the value exists in the options
      const valueExists = locations.some(loc => {
        const addr = typeof loc === 'string' ? loc.trim() : (loc.address || '').trim();
        return addr === locationValue;
      });
      if (valueExists) {
        setLocation(locationValue);
      } else {
        setLocation('');
      }
    } else {
      setLocation('');
    }
  }, [locations, initialMember?.location, initialMember?.id]);

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setRole('');
    setTitle('');
    setLocation('');
    setPhone('');
    setEmail('');
    setAddress1('');
    setAddress2('');
    setCity('');
    setState('');
    setPostalCode('');
    setCountry('');
    setBio('');
    setGender('');
    setPersonalityTraits([]);
    setSelectedServiceIds([]);
    setServiceToAdd('');
    setYearsExperience('');
    setPictureFile(null);
    setPicturePreviewUrl('');
    setFileInputKey((k) => k + 1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    if (!trimmedFirst && !trimmedLast) return;
    const name = [trimmedFirst, trimmedLast].filter(Boolean).join(' ') || trimmedFirst || trimmedLast;
    
    // Find the full location object if a location is selected
    let locationToSave = undefined;
    if (location && typeof location === 'string' && location.trim() && locations.length > 1) {
      const selectedLoc = locations.find(loc => {
        const locAddress = typeof loc === 'string' ? loc : loc.address || '';
        return locAddress === location.trim();
      });
      
      if (selectedLoc) {
        // Save the full location object with all address components
        if (typeof selectedLoc === 'object') {
          locationToSave = {
            address: selectedLoc.address || '',
            address2: selectedLoc.address2 || '',
            city: selectedLoc.city || '',
            state: selectedLoc.state || '',
            postalCode: selectedLoc.postalCode || '',
            country: selectedLoc.country || '',
          };
        } else {
          // If it's a string, save it as is (for backward compatibility)
          locationToSave = selectedLoc;
        }
      }
    }
    
    onSubmit(
      {
        name,
        firstName: trimmedFirst || undefined,
        lastName: trimmedLast || undefined,
        role: role.trim() || undefined,
        title: title.trim() || undefined,
        location: locationToSave,
        phone: unformatPhone(phone.trim()) || undefined,
        email: email.trim() || undefined,
        address: [address1, address2, city, state, postalCode, country].some((s) => s?.trim())
          ? {
              address1: address1.trim() || undefined,
              address2: address2.trim() || undefined,
              city: city.trim() || undefined,
              state: state.trim() || undefined,
              postalCode: postalCode.trim() || undefined,
              country: country.trim() || undefined,
            }
          : undefined,
        bio: bio.trim() || undefined,
        gender: gender || undefined,
        personalityTraits: personalityTraits.length ? personalityTraits : undefined,
        yearsExperience: yearsExperience.trim() ? Number(yearsExperience) : undefined,
        selectedServiceIds: selectedServiceIds,
        sendInviteToLogin: sendInviteToLogin && email.trim() ? true : undefined,
      },
      pictureFile,
      initialMember?.id ?? null
    );
    resetForm();
  };

  const handleCancel = () => {
    resetForm();
    onCancel();
  };

  const handlePictureChange = (file) => {
    setPictureFile(file);
    if (!file) {
      setPicturePreviewUrl('');
    }
  };

  const isValid = firstName.trim() || lastName.trim();

  // Initialize selectedServiceIds when editing a team member
  useEffect(() => {
    if (initialMember?.id && services && services.length > 0) {
      const assignedIds = services
        .filter(service => 
          service.assignedTeamMemberIds && 
          Array.isArray(service.assignedTeamMemberIds) &&
          service.assignedTeamMemberIds.includes(initialMember.id)
        )
        .map(service => service.id)
        .filter(Boolean);
      setSelectedServiceIds(assignedIds);
    } else {
      setSelectedServiceIds([]);
    }
  }, [initialMember?.id, services]);

  // Get service options for dropdown (show all services, highlight assigned ones)
  const serviceOptions = useMemo(() => {
    if (!services || services.length === 0) return [];
    return services.map(service => ({
      value: service.id,
      label: service.name || 'Unnamed Service',
      disabled: selectedServiceIds.includes(service.id), // Disable already assigned services
      isAssigned: selectedServiceIds.includes(service.id) // Flag for visual highlighting
    }));
  }, [services, selectedServiceIds]);

  // Get assigned service names for display
  const assignedServiceNames = useMemo(() => {
    if (!services || services.length === 0 || selectedServiceIds.length === 0) return [];
    return selectedServiceIds
      .map(serviceId => {
        const service = services.find(s => s.id === serviceId);
        return service?.name;
      })
      .filter(Boolean);
  }, [services, selectedServiceIds]);

  // Handle adding a service from dropdown
  const handleAddService = (serviceId) => {
    if (serviceId && !selectedServiceIds.includes(serviceId)) {
      setSelectedServiceIds([...selectedServiceIds, serviceId]);
      setServiceToAdd(''); // Reset dropdown
    }
  };

  // Handle removing a service from chips
  const handleRemoveService = (serviceId) => {
    setSelectedServiceIds(selectedServiceIds.filter(id => id !== serviceId));
  };

  // Handle creating a new service
  const handleCreateService = async (serviceData) => {
    if (!onServiceCreated) {
      console.error('onServiceCreated callback not provided');
      alert('Error: Service creation callback not available');
      return;
    }
    
    setSavingService(true);
    try {      
      // Ensure the current team member is assigned to the new service
      const currentMemberId = initialMember?.id;
      let assignedIds = [...(serviceData.assignedTeamMemberIds || [])];
      
      // If we're editing a team member, add them to the service assignment
      if (currentMemberId && !assignedIds.includes(currentMemberId)) {
        assignedIds.push(currentMemberId);
      }
      
      // Update service data with assigned team members
      const serviceWithAssignment = {
        ...serviceData,
        assignedTeamMemberIds: assignedIds,
      };
      
      // Add the new service to the services array
      const updatedServices = [...(services || []), serviceWithAssignment];
      await onServiceCreated(updatedServices);

      if (!selectedServiceIds.includes(serviceData.id)) {
        setSelectedServiceIds([...selectedServiceIds, serviceData.id]);
      }
      
      // Close the service drawer (team member drawer stays open)
      setShowServiceDrawer(false);
    } catch (error) {
      console.error('Failed to create service:', error);
      alert(`Failed to create service: ${error.message || 'Unknown error'}`);
      setSavingService(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
        {/* Left column */}
        <div className="space-y-6">
          <FileInput
            key={fileInputKey}
            id="team-member-picture"
            label="Team picture"
            value={picturePreviewUrl}
            onChange={handlePictureChange}
            disabled={saving}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              id="first-name"
              label="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              disabled={saving}
              variant="light"
            />
            <InputField
              id="last-name"
              label="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              disabled={saving}
              variant="light"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              id="role"
              label="Role / Position"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Stylist, Developer"
              disabled={saving}
              variant="light"
            />
            <InputField
              id="title"
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Stylist"
              disabled={saving}
              variant="light"
            />
          </div>
          
          {locations && locations.length > 1 && (
            <Dropdown
              key={`location-${location || 'empty'}-${initialMember?.id || 'new'}`}
              id="location"
              label="Location"
              value={location}
              onChange={(e) => {
                const newValue = e.target.value;
                setLocation(newValue && newValue.trim() ? newValue.trim() : '');
              }}
              options={locations.map((loc, index) => {
                // Handle both string and object formats
                const locAddress = typeof loc === 'string' ? loc.trim() : (loc.address || '').trim();
                const locCity = typeof loc === 'object' ? loc.city : '';
                const locState = typeof loc === 'object' ? loc.state : '';
                const locPostalCode = typeof loc === 'object' ? loc.postalCode : '';
                const locationLabel = [locAddress, locCity, locState, locPostalCode].filter(Boolean).join(', ');
                // Use the trimmed address as the value to ensure exact matching
                // This must match exactly what we set in the location state
                const locationKey = locAddress;
                return { value: locationKey, label: locationLabel };
              })}
              placeholder="Select location..."
              disabled={saving}
            />
          )}

          <AddressAutocomplete
            id="address1"
            label="Address"
            value={address1}
            onChange={(address) => setAddress1(address)}
            onSelect={(addressData) => {
              setAddress1(addressData.address1);
              setAddress2(addressData.address2);
              setCity(addressData.city);
              setState(addressData.state);
              setPostalCode(addressData.postalCode);
              setCountry(normalizeCountryValue(addressData.country));
            }}
            placeholder="Start typing an address..."
            disabled={saving}
          />
          <InputField
            id="address2"
            label="Address line 2"
            value={address2}
            onChange={(e) => setAddress2(e.target.value)}
            placeholder="Apt, suite, etc. (optional)"
            disabled={saving}
            variant="light"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Dropdown
              id="country"
              label="Country"
              value={country || undefined}
              onChange={(e) => setCountry(e.target.value)}
              options={sortedCountries}
              placeholder="Select country..."
              disabled={saving}
            />
            <Dropdown
              key={`state-dropdown-${country}`}
              id="state"
              label="State / Province"
              value={state || undefined}
              onChange={(e) => setState(e.target.value)}
              options={availableStates}
              placeholder="Select state/province..."
              disabled={saving || !country}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              id="city"
              label="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              disabled={saving}
              variant="light"
            />
            <InputField
              id="postalCode"
              label="Postal code"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="Postal code"
              disabled={saving}
              variant="light"
            />
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              id="phone"
              label="Phone"
              type="tel"
              value={phone}
              onChange={(e) => {
                const formatted = formatPhone(e.target.value);
                setPhone(formatted);
              }}
              placeholder="(717) 123-4567"
              disabled={saving}
              variant="light"
            />
            <InputField
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              disabled={saving}
              variant="light"
            />
          </div>
          {!isEdit && (
            <Checkbox
              id="send-invite"
              label="Send invite to log in (they'll get an email with a link to set their password and join as a team member)"
              checked={sendInviteToLogin}
              onCheckedChange={setSendInviteToLogin}
              disabled={saving || !email.trim()}
            />
          )}
          {isEdit && (email?.trim() || initialMember?.email) && !initialMember?.userId && typeof onInviteToLogin === 'function' && (
            <div className="flex flex-col items-center gap-2">
              <SecondaryButton
                type="button"
                onClick={() => onInviteToLogin({ ...initialMember, email: email?.trim() || initialMember?.email })}
                disabled={saving}
                className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Invite to Join
              </SecondaryButton>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Send this member an email to set their password and access GoManagr as a member.
              </span>
            </div>
          )}
          <TextareaField
            id="bio"
            label="Bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Short bio..."
            disabled={saving}
            rows={4}
          />
          <Dropdown
            id="gender"
            label="Gender"
            value={gender || undefined}
            onChange={(e) => setGender(e.target.value)}
            options={GENDER_OPTIONS}
            placeholder="Select..."
            disabled={saving}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Services offered
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Dropdown
                  id="service-select"
                  label=""
                  value={serviceToAdd}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    if (selectedId) {
                      handleAddService(selectedId);
                    }
                  }}
                  options={[{ value: '', label: 'Select a service to assign...' }, ...serviceOptions]}
                  placeholder="Select a service to assign..."
                  disabled={saving}
                />
              </div>
              <PrimaryButton
                type="button"
                onClick={() => setShowServiceDrawer(true)}
                disabled={saving}
                className="flex-shrink-0 gap-1.5 h-9 px-4"
              >
                <HiPlus className="w-4 h-4" />
                Add
              </PrimaryButton>
            </div>
            {selectedServiceIds.length > 0 && (
              <div className="mt-3">
                <div className="flex flex-wrap gap-2">
                  {selectedServiceIds.map((serviceId) => {
                    const serviceName = (services || []).find(s => s.id === serviceId)?.name || serviceId;
                    return (
                      <span
                        key={serviceId}
                        className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-primary-50 dark:bg-gray-700 text-primary-800 dark:text-gray-200 border border-primary-200 dark:border-gray-600 text-sm font-medium"
                      >
                        {serviceName}
                        <button
                          type="button"
                          onClick={() => handleRemoveService(serviceId)}
                          disabled={saving}
                          className="p-0.5 rounded-full hover:bg-primary-200 dark:hover:bg-gray-600 text-primary-700 dark:text-gray-300 focus:outline-none"
                          aria-label={`Remove ${serviceName}`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <ChipsArrayBuilder
            id="personality"
            label="Personality traits"
            value={personalityTraits}
            onChange={setPersonalityTraits}
            placeholder="Add a personality trait..."
            disabled={saving}
            addButtonLabel="Add"
          />
          <InputField
            id="years-experience"
            label="Years of experience"
            type="number"
            value={yearsExperience}
            onChange={(e) => setYearsExperience(e.target.value)}
            placeholder="0"
            disabled={saving}
            variant="light"
            inputProps={{ min: 0, max: 70 }}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-200 lg:col-span-2">
        <SecondaryButton type="button" onClick={handleCancel} disabled={saving}>
          Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={saving || !isValid}>
          {isEdit ? 'Save member' : 'Add member'}
        </PrimaryButton>
      </div>
      </form>
      
      {/* Add Service Drawer - Render outside the form to avoid form submission issues */}
    {showServiceDrawer && (
      <Drawer
        isOpen={showServiceDrawer}
        onClose={(e) => {
          e?.stopPropagation?.();
          setShowServiceDrawer(false);
        }}
        title="Add Service"
        width="75vw"
      >
        <AddServiceForm
          teamMembers={teamMembers}
          existingServices={services || []}
          onSubmit={async (serviceData) => {
            try {
              await handleCreateService(serviceData);
            } catch (error) {
              console.error('Error in onSubmit handler:', error);
              // Don't close drawer on error
            }
          }}
          onCancel={() => {
            setShowServiceDrawer(false);
          }}
          saving={savingService}
          preselectedTeamMemberIds={initialMember?.id ? [initialMember.id] : []}
        />
      </Drawer>
    )}
    </>
  );
}
