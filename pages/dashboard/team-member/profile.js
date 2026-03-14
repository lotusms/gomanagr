import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import {
  InputField,
  TextareaField,
  FileInput,
  ChipsArrayBuilder,
  Dropdown,
  AddressAutocomplete,
} from '@/components/ui';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import PhoneNumberInput from '@/components/ui/PhoneNumberInput';
import { formatPhone, unformatPhone } from '@/utils/formatPhone';
import { COUNTRIES } from '@/utils/countries';
import { State } from 'country-state-city';
import { uploadTeamPhoto } from '@/services/userService';
import { HiArrowLeft, HiUser, HiPhone, HiLocationMarker, HiBriefcase } from 'react-icons/hi';

function normalizeCountryValue(value) {
  if (!value) return '';
  if (value.length === 2 && /^[A-Z]{2}$/i.test(value)) return value.toUpperCase();
  const found = COUNTRIES.find(
    (c) =>
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

export default function TeamMemberProfilePage() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [adminUserId, setAdminUserId] = useState(null);
  const [memberId, setMemberId] = useState(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('');
  const [title, setTitle] = useState('');
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
  const [picturePreviewUrl, setPicturePreviewUrl] = useState('');
  const [fileInputKey, setFileInputKey] = useState(0);

  const sortedCountries = useMemo(() => {
    if (!country) return COUNTRIES;
    const org = normalizeCountryValue(country);
    const orgCountry = COUNTRIES.find((c) => c.value === org);
    if (!orgCountry) return COUNTRIES;
    return [orgCountry, ...COUNTRIES.filter((c) => c.value !== org)];
  }, [country]);

  const availableStates = useMemo(() => {
    if (!country) return [];
    const norm = normalizeCountryValue(country);
    const states = State.getStatesOfCountry(norm);
    return states.map((s) => ({ value: s.isoCode, label: s.name }));
  }, [country]);

  useEffect(() => {
    if (!country && state) setState('');
  }, [country]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    setLoading(true);
    setError(null);
    fetch('/api/my-team-member-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.uid }),
    })
      .then((r) => r.json())
      .then((data) => {
        const m = data?.member;
        setAdminUserId(data?.adminUserId ?? null);
        if (m) {
          setMemberId(m.id);
          setFirstName(m.firstName ?? (m.name?.split(' ')[0] ?? ''));
          setLastName(m.lastName ?? (m.name?.split(' ').slice(1).join(' ') ?? ''));
          setRole(m.role ?? '');
          setTitle(m.title ?? '');
          const pv = m.phone ?? '';
          setPhone(pv ? formatPhone(unformatPhone(pv)) : '');
          setEmail(m.email ?? '');
          const addr = m.address;
          setAddress1(addr?.address1 ?? addr?.address ?? '');
          setAddress2(addr?.address2 ?? '');
          setCity(addr?.city ?? '');
          setState(addr?.state ?? '');
          setPostalCode(addr?.postalCode ?? '');
          setCountry(normalizeCountryValue(addr?.country ?? ''));
          setBio(m.bio ?? '');
          setGender(m.gender ?? '');
          setPersonalityTraits(Array.isArray(m.personalityTraits) ? m.personalityTraits : []);
          setYearsExperience(m.yearsExperience != null ? String(m.yearsExperience) : '');
          setPicturePreviewUrl(m.pictureUrl ?? '');
        }
      })
      .catch((err) => setError(err.message || 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, [currentUser?.uid]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser?.uid || !memberId) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      let pictureUrl = picturePreviewUrl;
      if (pictureFile && adminUserId) {
        pictureUrl = await uploadTeamPhoto(adminUserId, memberId, pictureFile);
      }
      const trimmedFirst = firstName.trim();
      const trimmedLast = lastName.trim();
      const name = [trimmedFirst, trimmedLast].filter(Boolean).join(' ') || trimmedFirst || trimmedLast || ' ';
      const res = await fetch('/api/update-my-team-member-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.uid,
          teamMemberData: {
            name,
            firstName: trimmedFirst || undefined,
            lastName: trimmedLast || undefined,
            role: role.trim() || undefined,
            title: title.trim() || undefined,
            phone: unformatPhone(phone.trim()) || undefined,
            email: email.trim() || undefined,
            address:
              [address1, address2, city, state, postalCode, country].some((s) => s?.trim()) ?
                {
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
            pictureUrl: pictureUrl || undefined,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setSuccess(true);
      setPictureFile(null);
      setFileInputKey((k) => k + 1);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Head><title>{firstName}{ !lastName ? '' : ' ' + lastName}'s Profile - GoManagr</title></Head>
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-500 border-t-transparent" />
        </div>
      </>
    );
  }

  return (
    <>
      <Head><title>{firstName}{ !lastName ? '' : ' ' + lastName}'s Profile - GoManagr</title></Head>
        <div className="space-y-6">
          <Link
            href="/dashboard/team-member"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
          >
            <HiArrowLeft className="w-4 h-4" />
            Back to dashboard
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{firstName}{ !lastName ? '' : ' ' + lastName}'s Profile</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Updates here sync with your admin’s team list.
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-300">
              Profile saved.
            </div>
          )}

          {!memberId && !loading && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-6 py-4 text-sm text-amber-800 dark:text-amber-200">
              Your profile is not in the team list yet. Ask your admin to add you as a team member; then you can edit your profile here.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Photo & basic info */}
            <section className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <HiUser className="w-5 h-5 text-primary-500" />
                  Photo & name
                </h2>
              </div>
              <div className="p-6 space-y-6">
                <FileInput
                  key={fileInputKey}
                  id="profile-picture"
                  label="Profile picture"
                  value={picturePreviewUrl}
                  onChange={(file) => {
                    setPictureFile(file);
                    if (!file) setPicturePreviewUrl('');
                  }}
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
                    label="Role / position"
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
              </div>
            </section>

            {/* Contact */}
            <section className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <HiPhone className="w-5 h-5 text-primary-500" />
                  Contact
                </h2>
              </div>
              <div className="p-6 space-y-4">
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
                  />
                </div>
              </div>
            </section>

            {/* Address */}
            <section className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <HiLocationMarker className="w-5 h-5 text-primary-500" />
                  Address
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <AddressAutocomplete
                  id="address1"
                  label="Address"
                  value={address1}
                  onChange={setAddress1}
                  onSelect={(d) => {
                    setAddress1(d.address1);
                    setAddress2(d.address2 ?? '');
                    setCity(d.city ?? '');
                    setState(d.state ?? '');
                    setPostalCode(d.postalCode ?? '');
                    setCountry(normalizeCountryValue(d.country ?? ''));
                  }}
                  placeholder="Start typing..."
                  disabled={saving}
                />
                <InputField
                  id="address2"
                  label="Address line 2"
                  value={address2}
                  onChange={(e) => setAddress2(e.target.value)}
                  placeholder="Apt, suite, etc."
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
                    key={`state-${country}`}
                    id="state"
                    label="State / Province"
                    value={state || undefined}
                    onChange={(e) => setState(e.target.value)}
                    options={availableStates}
                    placeholder="Select state..."
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
            </section>

            {/* About */}
            <section className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <HiBriefcase className="w-5 h-5 text-primary-500" />
                  About
                </h2>
              </div>
              <div className="p-6 space-y-4">
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
                <ChipsArrayBuilder
                  id="personality"
                  label="Personality traits"
                  value={personalityTraits}
                  onChange={setPersonalityTraits}
                  placeholder="Add a trait..."
                  disabled={saving}
                  addButtonLabel="Add"
                />
                <InputField
                  id="years-experience"
                  label="Years of experience"
                  type="text"
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(e.target.value)}
                  placeholder="0"
                  disabled={saving}
                  variant="light"
                  inputProps={{ min: 0, max: 70 }}
                />
              </div>
            </section>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <Link href="/dashboard/team-member">
                <SecondaryButton type="button" disabled={saving}>
                  Cancel
                </SecondaryButton>
              </Link>
              <PrimaryButton type="submit" disabled={saving || !memberId}>
                {saving ? 'Saving…' : 'Save profile'}
              </PrimaryButton>
            </div>
          </form>
        </div>
    </>
  );
}
