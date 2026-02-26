import { useState, useEffect, useMemo } from 'react';
import { PrimaryButton, SecondaryButton, DangerButton } from '@/components/ui/buttons';
import {
  InputField,
  TextareaField,
  FileInput,
  ChipsArrayBuilder,
  Dropdown,
  AddressAutocomplete,
  Checkbox,
} from '@/components/ui';
import ServiceSelector from '@/components/dashboard/ServiceSelector';
import { formatPhone, unformatPhone } from '@/utils/formatPhone';
import PhoneNumberInput from '@/components/ui/PhoneNumberInput';
import { COUNTRIES } from '@/utils/countries';
import { State } from 'country-state-city';

function normalizeCountryValue(value) {
  if (!value) return '';
  if (value.length === 2 && /^[A-Z]{2}$/i.test(value)) {
    return value.toUpperCase();
  }
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
 * @param {boolean} [showInviteInDrawer] - Whether to show "Invite to Join" in the drawer (edit mode)
 * @param {boolean} [showRevokeInDrawer] - Whether to show "Revoke access" in the drawer (edit mode)
 * @param {Function} [onRevokeAccess] - Callback when user clicks "Revoke access" in the drawer
 * @param {Function} [onNestedDrawerChange] - (open: boolean) => void — called when Add Service drawer opens/closes so parent drawer can avoid closing on overlay click
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
  onNestedDrawerChange,
  onInviteToLogin,
  canPromoteToAdmin = false,
  showInviteInDrawer = false,
  showRevokeInDrawer = false,
  onRevokeAccess,
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('');
  const [title, setTitle] = useState('');
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
  const [pendingServices, setPendingServices] = useState([]);
  const [yearsExperience, setYearsExperience] = useState('');
  const [pictureFile, setPictureFile] = useState(null);
  const [picturePreviewUrl, setPicturePreviewUrl] = useState('');
  const [fileInputKey, setFileInputKey] = useState(0);
  const [sendInviteToLogin, setSendInviteToLogin] = useState(false);
  const [isAdminCheckbox, setIsAdminCheckbox] = useState(false);

  const isEdit = !!initialMember?.id;

  const sortedCountries = useMemo(() => {
    if (!organizationCountry) return COUNTRIES;
    const normalizedOrgCountry = normalizeCountryValue(organizationCountry);
    const orgCountry = COUNTRIES.find(c => c.value === normalizedOrgCountry);
    if (!orgCountry) return COUNTRIES;
    const otherCountries = COUNTRIES.filter(c => c.value !== normalizedOrgCountry);
    return [orgCountry, ...otherCountries];
  }, [organizationCountry]);

  const availableStates = useMemo(() => {
    if (!country) return [];
    const normalizedCountry = normalizeCountryValue(country);
    const states = State.getStatesOfCountry(normalizedCountry);
    return states.map(state => ({
      value: state.isoCode,
      label: state.name
    }));
  }, [country]);

  const emailDuplicateError = useMemo(() => {
    const norm = (email || '').trim().toLowerCase();
    if (!norm) return '';
    const others = (teamMembers || []).filter((m) => m.id !== initialMember?.id);
    const taken = others.some((m) => (m.email || '').trim().toLowerCase() === norm);
    return taken ? 'This email has already been assigned to someone else' : '';
  }, [email, teamMembers, initialMember?.id]);

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
    setIsAdminCheckbox(initialMember?.isAdmin === true);
  }, [initialMember?.id]);

  useEffect(() => {
    if (!Array.isArray(locations) || locations.length <= 1) {
      if (!initialMember?.location) {
        setLocation('');
      }
      return;
    }

    if (!initialMember?.location) {
      setLocation('');
      return;
    }

    const savedLocation = initialMember.location;
    let locationValue = undefined;

    const normalizeAddress = (addr) => {
      if (!addr) return '';
      return String(addr).trim().toLowerCase().replace(/\s+/g, ' ');
    };
    
    if (typeof savedLocation === 'object' && savedLocation !== null && savedLocation.address) {
      const savedAddr = String(savedLocation.address || '').trim();
      const savedAddrNormalized = normalizeAddress(savedAddr);
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
        locationValue = trimmedSaved || undefined;
      }
    }

    if (locationValue) {
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
    setPendingServices([]);
    setYearsExperience('');
    setPictureFile(null);
    setPicturePreviewUrl('');
    setFileInputKey((k) => k + 1);
    setIsAdminCheckbox(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (emailDuplicateError) return;
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    if (!trimmedFirst && !trimmedLast) return;
    const name = [trimmedFirst, trimmedLast].filter(Boolean).join(' ') || trimmedFirst || trimmedLast;

    let locationToSave = undefined;
    if (location && typeof location === 'string' && location.trim() && locations.length > 1) {
      const selectedLoc = locations.find(loc => {
        const locAddress = typeof loc === 'string' ? loc : loc.address || '';
        return locAddress === location.trim();
      });

      if (selectedLoc) {
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
        pendingServices: pendingServices.length > 0 ? pendingServices : undefined,
        sendInviteToLogin: sendInviteToLogin && email.trim() ? true : undefined,
        ...(canPromoteToAdmin && { isAdmin: isAdminCheckbox }),
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

  const assignedServiceNames = useMemo(() => {
    if (!services || services.length === 0 || selectedServiceIds.length === 0) return [];
    return selectedServiceIds
      .map(serviceId => {
        const service = services.find(s => s.id === serviceId);
        return service?.name;
      })
      .filter(Boolean);
  }, [services, selectedServiceIds]);

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

          {canPromoteToAdmin && (
            <Checkbox
              id="team-member-is-admin"
              label="Team member is admin"
              checked={isAdminCheckbox}
              onCheckedChange={setIsAdminCheckbox}
              disabled={saving}
            />
          )}

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
                const locAddress = typeof loc === 'string' ? loc.trim() : (loc.address || '').trim();
                const locCity = typeof loc === 'object' ? loc.city : '';
                const locState = typeof loc === 'object' ? loc.state : '';
                const locPostalCode = typeof loc === 'object' ? loc.postalCode : '';
                const locationLabel = [locAddress, locCity, locState, locPostalCode].filter(Boolean).join(', ');
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
            <PhoneNumberInput
              id="phone"
              label="Phone"
              value={phone}
              onChange={setPhone}
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
              error={emailDuplicateError}
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
          {isEdit && (email?.trim() || initialMember?.email) && (showInviteInDrawer || showRevokeInDrawer) && (
            <div className="flex flex-col items-center gap-2">
              {showInviteInDrawer && !initialMember?.userId && typeof onInviteToLogin === 'function' && (
                <>
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
                </>
              )}
              {showRevokeInDrawer && typeof onRevokeAccess === 'function' && (
                <>
                  <DangerButton
                    type="button"
                    onClick={onRevokeAccess}
                    disabled={saving}
                  >
                    Revoke access
                  </DangerButton>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Revoke this member&apos;s access. They will be removed from the organization and cannot sign in or use invite links.
                  </span>
                </>
              )}
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
          <ServiceSelector
            services={[...(services || []), ...pendingServices]}
            value={selectedServiceIds}
            onChange={setSelectedServiceIds}
            onAddServiceLocally={(serviceData) => {
              setPendingServices((prev) => [...prev, serviceData]);
              setSelectedServiceIds((prev) => (prev.includes(serviceData.id) ? prev : [...prev, serviceData.id]));
            }}
            onNestedDrawerChange={onNestedDrawerChange}
            teamMembers={teamMembers}
            multiple
            preselectedTeamMemberIds={initialMember?.id ? [initialMember.id] : []}
            label="Services offered"
            chipsSectionLabel="Assigned to this member"
            disabled={saving}
            dropdownPlaceholder="Select a service to assign..."
            addButtonLabel="Add"
            drawerTitle="Add Service"
            drawerWidth="75vw"
          />
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
    </>
  );
}
