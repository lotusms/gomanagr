import { useState, useEffect } from 'react';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import {
  InputField,
  TextareaField,
  FileInput,
  ChipsArrayBuilder,
  ChipsMulti,
  Dropdown,
} from '@/components/ui';

const GENDER_OPTIONS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'other', label: 'Other' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

const PERSONALITY_TRAITS = [
  'Friendly',
  'Creative',
  'Fun',
  'Introvert',
  'Talkative',
  'Relaxed',
  'Professional',
  'Detail-oriented',
  'Empathetic',
  'Outgoing',
  'Calm',
  'Energetic',
];

/**
 * Full add/edit team member form. Uses Radix-based UI components.
 * @param {(data: AddTeamMemberData, pictureFile: File | null, editingId?: string) => void} onSubmit
 * @param {() => void} onCancel
 * @param {boolean} [saving]
 * @param {Object} [initialMember] - When set, form is in edit mode (pre-filled, submit updates this member)
 */
export default function AddTeamMemberForm({ onSubmit, onCancel, saving = false, initialMember = null }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('');
  const [title, setTitle] = useState('');
  const [services, setServices] = useState([]);
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
  const [yearsExperience, setYearsExperience] = useState('');
  const [pictureFile, setPictureFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const isEdit = !!initialMember?.id;

  useEffect(() => {
    if (!initialMember) return;
    setFirstName(initialMember.firstName ?? (initialMember.name?.split(' ')[0] ?? ''));
    setLastName(initialMember.lastName ?? (initialMember.name?.split(' ').slice(1).join(' ') ?? ''));
    setRole(initialMember.role ?? '');
    setTitle(initialMember.title ?? '');
    setServices(Array.isArray(initialMember.services) ? initialMember.services : []);
    setPhone(initialMember.phone ?? '');
    setEmail(initialMember.email ?? '');
    const addr = initialMember.address;
    setAddress1(addr?.address1 ?? '');
    setAddress2(addr?.address2 ?? '');
    setCity(addr?.city ?? '');
    setState(addr?.state ?? '');
    setPostalCode(addr?.postalCode ?? '');
    setCountry(addr?.country ?? '');
    setBio(initialMember.bio ?? '');
    setGender(initialMember.gender ?? '');
    setPersonalityTraits(Array.isArray(initialMember.personalityTraits) ? initialMember.personalityTraits : []);
    setYearsExperience(initialMember.yearsExperience != null ? String(initialMember.yearsExperience) : '');
    setPictureFile(null);
    setFileInputKey((k) => k + 1);
  }, [initialMember?.id]);

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setRole('');
    setTitle('');
    setServices([]);
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
    setYearsExperience('');
    setPictureFile(null);
    setFileInputKey((k) => k + 1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    if (!trimmedFirst && !trimmedLast) return;
    const name = [trimmedFirst, trimmedLast].filter(Boolean).join(' ') || trimmedFirst || trimmedLast;
    onSubmit(
      {
        name,
        firstName: trimmedFirst || undefined,
        lastName: trimmedLast || undefined,
        role: role.trim() || undefined,
        title: title.trim() || undefined,
        services: services.length ? services : undefined,
        phone: phone.trim() || undefined,
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
  };

  const isValid = firstName.trim() || lastName.trim();

  return (
    <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
        {/* Left column */}
        <div className="space-y-6">
          <FileInput
            key={fileInputKey}
            id="team-member-picture"
            label="Team picture"
            value=""
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
          <ChipsArrayBuilder
            id="services"
            label="Services offered"
            value={services}
            onChange={setServices}
            placeholder="Add a service..."
            disabled={saving}
            addButtonLabel="Add"
          />
          <InputField
            id="phone"
            label="Phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 234 567 8900"
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

        {/* Right column */}
        <div className="space-y-6">
          <InputField
            id="address1"
            label="Address line 1"
            value={address1}
            onChange={(e) => setAddress1(e.target.value)}
            placeholder="Street address"
            disabled={saving}
            variant="light"
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
              id="state"
              label="State / Province"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="State or province"
              disabled={saving}
              variant="light"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              id="postalCode"
              label="Postal code"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="Postal code"
              disabled={saving}
              variant="light"
            />
            <InputField
              id="country"
              label="Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Country"
              disabled={saving}
              variant="light"
            />
          </div>
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
          <ChipsMulti
            id="personality"
            label="Personality traits"
            options={PERSONALITY_TRAITS}
            value={personalityTraits}
            onValueChange={setPersonalityTraits}
            variant="light"
            layout="flex"
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

      <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200 lg:col-span-2">
        <PrimaryButton type="submit" disabled={saving || !isValid}>
          {isEdit ? 'Save member' : 'Add member'}
        </PrimaryButton>
        <SecondaryButton type="button" onClick={handleCancel} disabled={saving}>
          Cancel
        </SecondaryButton>
      </div>
    </form>
  );
}
