import { useState, useEffect, useMemo } from 'react';
import * as Switch from '@radix-ui/react-switch';
import * as Label from '@radix-ui/react-label';
import InputField from '@/components/ui/InputField';
import { AddressAutocomplete } from '@/components/ui';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import { formatPhone, unformatPhone } from '@/utils/formatPhone';
import PhoneNumberInput from '@/components/ui/PhoneNumberInput';
import { COUNTRIES } from '@/utils/countries';
import { State } from 'country-state-city';
import { HiChevronDown, HiChevronRight } from 'react-icons/hi';
import Dropdown from '@/components/ui/Dropdown';
import { getLabelClasses } from '@/components/ui/formControlStyles';

function normalizeCountryValue(value) {
  if (!value) return '';
  if (value.length === 2 && /^[A-Z]{2}$/i.test(value)) return value.toUpperCase();
  const found = COUNTRIES.find(
    (c) => c.label.toLowerCase() === value.toLowerCase() || c.value.toLowerCase() === value.toLowerCase()
  );
  return found ? found.value : value;
}

/**
 * Client Form Component
 * @param {Object} props
 * @param {Object} props.initialClient - Existing client to edit (optional)
 * @param {Function} props.onSubmit - Callback when form is submitted (receives full client data)
 * @param {Function} props.onCancel - Callback when form is cancelled
 * @param {boolean} props.saving - Whether form is saving
 */
export default function ClientForm({
  initialClient = null,
  onSubmit,
  onCancel,
  saving = false,
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyAddress1, setCompanyAddress1] = useState('');
  const [companyAddress2, setCompanyAddress2] = useState('');
  const [companyCity, setCompanyCity] = useState('');
  const [companyState, setCompanyState] = useState('');
  const [companyPostalCode, setCompanyPostalCode] = useState('');
  const [companyCountry, setCompanyCountry] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [isCompany, setIsCompany] = useState(false);
  const [companySectionOpen, setCompanySectionOpen] = useState(false);
  const [errors, setErrors] = useState({});

  const sortedCountries = useMemo(() => COUNTRIES, []);

  const companyAvailableStates = useMemo(() => {
    if (!companyCountry) return [];
    const normalized = normalizeCountryValue(companyCountry);
    const states = State.getStatesOfCountry(normalized);
    return states.map((s) => ({ value: s.isoCode, label: s.name }));
  }, [companyCountry]);

  useEffect(() => {
    if (companyCountry && companyState) {
      const normalized = normalizeCountryValue(companyCountry);
      const states = State.getStatesOfCountry(normalized);
      const valid = states.some((s) => s.isoCode === companyState || s.name === companyState);
      if (!valid && states.length > 0) setCompanyState('');
    } else if (!companyCountry) setCompanyState('');
  }, [companyCountry, companyState]);

  useEffect(() => {
    if (initialClient) {
      setName(initialClient.name || '');
      const phoneVal = initialClient.phone ?? '';
      setPhone(phoneVal ? formatPhone(unformatPhone(phoneVal)) : '');
      setEmail(initialClient.email ?? '');
      setCompany(initialClient.company ?? '');
      const hadCompany = !!(initialClient.company || initialClient.companyName || initialClient.companyPhone || initialClient.companyEmail || (initialClient.companyAddress && (initialClient.companyAddress.address || initialClient.companyAddress.address1)));
      setIsCompany(hadCompany);
      setCompanySectionOpen(false); // Always collapsed by default when editing
      const companyPhoneVal = initialClient.companyPhone ?? '';
      setCompanyPhone(companyPhoneVal ? formatPhone(unformatPhone(companyPhoneVal)) : '');
      const addr = initialClient.companyAddress || {};
      setCompanyAddress1(addr.address1 ?? addr.address ?? '');
      setCompanyAddress2(addr.address2 ?? '');
      setCompanyCity(addr.city ?? '');
      setCompanyState(addr.state ?? '');
      setCompanyPostalCode(addr.postalCode ?? '');
      setCompanyCountry(normalizeCountryValue(addr.country ?? ''));
      setCompanyEmail(initialClient.companyEmail ?? '');
    } else {
      setName('');
      setPhone('');
      setEmail('');
      setCompany('');
      setCompanyPhone('');
      setCompanyAddress1('');
      setCompanyAddress2('');
      setCompanyCity('');
      setCompanyState('');
      setCompanyPostalCode('');
      setCompanyCountry('');
      setCompanyEmail('');
      setIsCompany(false);
      setCompanySectionOpen(false);
    }
    setErrors({});
  }, [initialClient]);

  const validate = () => {
    const newErrors = {};
    if (!name || name.trim() === '') newErrors.name = 'Please enter a client name';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const companyAddress = isCompany && (companyAddress1 || companyAddress2 || companyCity || companyState || companyPostalCode || companyCountry)
        ? {
            address1: companyAddress1.trim() || undefined,
            address2: companyAddress2.trim() || undefined,
            address: companyAddress1.trim() || undefined,
            city: companyCity.trim() || undefined,
            state: companyState.trim() || undefined,
            postalCode: companyPostalCode.trim() || undefined,
            country: companyCountry || undefined,
          }
        : undefined;

    onSubmit({
      name: name.trim(),
      phone: phone.trim() ? unformatPhone(phone.trim()) : undefined,
      email: email.trim() || undefined,
      company: isCompany ? (company.trim() || undefined) : undefined,
      companyPhone: isCompany && companyPhone.trim() ? unformatPhone(companyPhone.trim()) : undefined,
      companyAddress,
      companyEmail: isCompany && companyEmail.trim() ? companyEmail.trim() : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6">
      <div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <InputField
          id="clientName"
          type="text"
          label="Client Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErrors((prev) => ({ ...prev, name: '' }));
          }}
          placeholder="Enter client name"
          required
          error={errors.name}
          variant="light"
          autoFocus
        />
        <PhoneNumberInput
          id="clientPhone"
          label="Phone"
          value={phone}
          onChange={setPhone}
          placeholder="(717) 123-4567"
          error={errors.phone}
          variant="light"
        />
        <InputField
          id="clientEmail"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          error={errors.email}
          variant="light"
        />
      </div>

      {/* Is this a company? */}
      <div className="flex flex-col gap-2">
        <Label.Root htmlFor="is-company" className={`${getLabelClasses('light')} mb-0`}>
          Is this a company?
        </Label.Root>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 dark:text-gray-400">No</span>
          <Switch.Root
            id="is-company"
            checked={isCompany}
            onCheckedChange={(checked) => {
              setIsCompany(checked);
              if (checked) setCompanySectionOpen(true);
              else setCompanySectionOpen(false);
            }}
            disabled={saving}
            className="relative w-11 h-6 rounded-full bg-gray-300 dark:bg-gray-600 data-[state=checked]:bg-primary-600 outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Switch.Thumb className="block w-5 h-5 rounded-full bg-white shadow-sm transition-transform translate-x-0.5 data-[state=checked]:translate-x-[22px]" />
          </Switch.Root>
          <span className="text-sm text-gray-600 dark:text-gray-400">Yes</span>
        </div>
      </div>

      {/* Expandable Company details */}
      {isCompany && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setCompanySectionOpen((prev) => !prev)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 text-left text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <span>Company details</span>
            {companySectionOpen ? (
              <HiChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            ) : (
              <HiChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            )}
          </button>
          {companySectionOpen && (
            <div className="p-4 space-y-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/30">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <InputField
                  id="companyName"
                  type="text"
                  label="Company name"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Company name"
                  variant="light"
                />
                <PhoneNumberInput
                  id="companyPhone"
                  label="Company phone"
                  value={companyPhone}
                  onChange={setCompanyPhone}
                  placeholder="(717) 123-4567"
                  variant="light"
                />
                <InputField
                  id="companyEmail"
                  label="Company email"
                  type="email"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  placeholder="company@example.com"
                  variant="light"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AddressAutocomplete
                  id="companyAddress"
                  label="Company address"
                  value={companyAddress1}
                  onChange={(addr) => setCompanyAddress1(addr)}
                  onSelect={(addressData) => {
                    setCompanyAddress1(addressData.address1 || addressData.fullAddress || '');
                    setCompanyAddress2(addressData.address2 || '');
                    setCompanyCity(addressData.city || '');
                    setCompanyState(addressData.state || '');
                    setCompanyPostalCode(addressData.postalCode || '');
                    setCompanyCountry(normalizeCountryValue(addressData.country || ''));
                  }}
                  placeholder="Start typing company address..."
                  disabled={saving}
                />
                <InputField
                  id="companyAddress2"
                  label="Address line 2"
                  value={companyAddress2}
                  onChange={(e) => setCompanyAddress2(e.target.value)}
                  placeholder="Apt, suite, etc. (optional)"
                  variant="light"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Dropdown
                  id="companyCountry"
                  label="Country"
                  value={companyCountry || undefined}
                  onChange={(e) => setCompanyCountry(e.target.value)}
                  options={sortedCountries}
                  placeholder="Select country..."
                  disabled={saving}
                />
                <Dropdown
                  key={`company-state-${companyCountry}`}
                  id="companyState"
                  label="State / Province"
                  value={companyState || undefined}
                  onChange={(e) => setCompanyState(e.target.value)}
                  options={companyAvailableStates}
                  placeholder="Select state/province..."
                  disabled={saving || !companyCountry}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  id="companyCity"
                  label="City"
                  value={companyCity}
                  onChange={(e) => setCompanyCity(e.target.value)}
                  placeholder="City"
                  variant="light"
                />
                <InputField
                  id="companyPostalCode"
                  label="Postal code"
                  value={companyPostalCode}
                  onChange={(e) => setCompanyPostalCode(e.target.value)}
                  placeholder="Postal code"
                  variant="light"
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <SecondaryButton type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={saving}>
          {saving ? 'Saving...' : initialClient ? 'Update Client' : 'Add Client'}
        </PrimaryButton>
      </div>
    </form>
  );
}
