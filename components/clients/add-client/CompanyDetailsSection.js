import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import InputField from '@/components/ui/InputField';
import { AddressAutocomplete, PhoneNumberInput } from '@/components/ui';
import Dropdown from '@/components/ui/Dropdown';
import { INDUSTRIES, COMPANY_SIZES, TIMEZONES, LANGUAGES } from '../clientProfileConstants';

function normalizeCountryValue(value) {
  if (!value) return '';
  if (value.length === 2 && /^[A-Z]{2}$/i.test(value)) return value.toUpperCase();
  return value;
}

export default function CompanyDetailsSection({
  companyName,
  companyPhone,
  companyEmail,
  companyWebsite,
  companyIndustry,
  companySize,
  billingAddressDifferent,
  companyAddress1,
  companyAddress2,
  companyCity,
  companyState,
  companyPostalCode,
  companyCountry,
  billingAddress1,
  billingAddress2,
  billingCity,
  billingState,
  billingPostalCode,
  billingCountry,
  taxId,
  timezone,
  language,
  primaryContactName,
  primaryContactPhone,
  primaryContactEmail,
  secondaryContactName,
  secondaryContactPhone,
  secondaryContactEmail,
  sortedCountries,
  companyAvailableStates,
  billingAvailableStates,
  saving,
  onCompanyNameChange,
  onCompanyPhoneChange,
  onCompanyEmailChange,
  onCompanyWebsiteChange,
  onCompanyIndustryChange,
  onCompanySizeChange,
  onBillingAddressDifferentChange,
  onCompanyAddress1Change,
  onCompanyAddress2Change,
  onCompanyCityChange,
  onCompanyStateChange,
  onCompanyPostalCodeChange,
  onCompanyCountryChange,
  onBillingAddress1Change,
  onBillingAddress2Change,
  onBillingCityChange,
  onBillingStateChange,
  onBillingPostalCodeChange,
  onBillingCountryChange,
  onTaxIdChange,
  onTimezoneChange,
  onLanguageChange,
  onPrimaryContactNameChange,
  onPrimaryContactPhoneChange,
  onPrimaryContactEmailChange,
  onSecondaryContactNameChange,
  onSecondaryContactPhoneChange,
  onSecondaryContactEmailChange,
  normalizeCountryValue: normalizeFn = normalizeCountryValue,
}) {
  return (
    <div className="space-y-4">
      {/* Company Name */}
      <InputField
        id="companyName"
        label="Company Name"
        value={companyName}
        onChange={onCompanyNameChange}
        variant="light"
      />

      {/* Company Phone, Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PhoneNumberInput
          id="companyPhone"
          label="Company Phone"
          value={companyPhone}
          onChange={onCompanyPhoneChange}
          placeholder="(717) 123-4567"
          variant="light"
        />
        <InputField
          id="companyEmail"
          label="Company Email"
          type="email"
          value={companyEmail}
          onChange={onCompanyEmailChange}
          placeholder="company@example.com"
          variant="light"
        />
      </div>
      
      {/* Company Website, Industry, Size */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <InputField
          id="companyWebsite"
          label="Website"
          type="url"
          value={companyWebsite}
          onChange={onCompanyWebsiteChange}
          onBlur={(e) => {
            let value = e.target.value.trim();
            if (value && !value.match(/^https?:\/\//i)) {
              onCompanyWebsiteChange({ target: { value: 'https://' + value } });
            } else if (!value) {
              onCompanyWebsiteChange({ target: { value: '' } });
            }
          }}
          placeholder="example.com"
          variant="light"
        />
        <Dropdown
          id="companyIndustry"
          label="Industry"
          value={companyIndustry || undefined}
          onChange={onCompanyIndustryChange}
          options={INDUSTRIES.map((ind) => ({ value: ind, label: ind }))}
          placeholder="Select industry..."
          variant="light"
        />
        <Dropdown
          id="companySize"
          label="Company Size"
          value={companySize || undefined}
          onChange={onCompanySizeChange}
          options={COMPANY_SIZES.map((size) => ({ value: size, label: size }))}
          placeholder="Select size..."
          variant="light"
        />
      </div>
      
      {/* Company Address */}
      <div className="flex flex-col gap-4">
        <h3 className="text-md font-bold uppercase text-gray-700 dark:text-gray-300 mt-8">Company Address</h3>
        <AddressAutocomplete
          id="companyAddress"
          label="Address"
          value={companyAddress1}
          onChange={(addr) => {
            if (typeof onCompanyAddress1Change === 'function') {
              onCompanyAddress1Change(addr);
            }
          }}
          onSelect={(addressData) => {
            onCompanyAddress1Change({ target: { value: addressData.address1 || addressData.fullAddress || '' } });
            onCompanyAddress2Change({ target: { value: addressData.address2 || '' } });
            onCompanyCityChange({ target: { value: addressData.city || '' } });
            onCompanyStateChange({ target: { value: addressData.state || '' } });
            onCompanyPostalCodeChange({ target: { value: addressData.postalCode || '' } });
            onCompanyCountryChange({ target: { value: normalizeFn(addressData.country || '') } });
          }}
          placeholder="Start typing company address..."
          disabled={saving}
        />
        <InputField
          id="companyAddress2"
          label="Address line 2"
          value={companyAddress2}
          onChange={onCompanyAddress2Change}
          placeholder="Apt, suite, etc. (optional)"
          variant="light"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Dropdown
            id="companyCountry"
            label="Country"
            value={companyCountry || undefined}
            onChange={onCompanyCountryChange}
            options={sortedCountries}
            placeholder="Select country..."
            disabled={saving}
          />
          <Dropdown
            key={`company-state-${companyCountry}`}
            id="companyState"
            label="State / Province"
            value={companyState || undefined}
            onChange={onCompanyStateChange}
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
            onChange={onCompanyCityChange}
            placeholder="City"
            variant="light"
          />
          <InputField
            id="companyPostalCode"
            label="Postal code"
            value={companyPostalCode}
            onChange={onCompanyPostalCodeChange}
            placeholder="Postal code"
            variant="light"
          />
        </div>
      </div>
      
      {/* Same as Company Address check */}
      <div className="flex items-start space-x-3 py-4">
        <CheckboxPrimitive.Root
          className="flex h-5 w-5 items-center justify-center rounded border-2 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary-600 data-[state=checked]:border-primary-600 hover:border-primary-400 mt-0.5"
          checked={billingAddressDifferent}
          onCheckedChange={onBillingAddressDifferentChange}
          id="billingAddressDifferent"
        >
          <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.6666 3.5L5.24998 9.91667L2.33331 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
        <label htmlFor="billingAddressDifferent" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
          Billing address is different from company address
        </label>
      </div>
      
      {/* Billing Address */}
      {billingAddressDifferent && (
        <div className="pl-8 border-l-2 border-gray-200 dark:border-gray-700 flex flex-col gap-4 pb-8">
          <h3 className="text-md font-bold uppercase text-gray-700 dark:text-gray-300 mt-8 mb-2">Billing Address</h3>
          <AddressAutocomplete
            id="billingAddress"
            label="Address"
            value={billingAddress1}
            onChange={(addr) => {
              if (typeof onBillingAddress1Change === 'function') {
                onBillingAddress1Change(addr);
              }
            }}
            onSelect={(addressData) => {
              onBillingAddress1Change({ target: { value: addressData.address1 || addressData.fullAddress || '' } });
              onBillingAddress2Change({ target: { value: addressData.address2 || '' } });
              onBillingCityChange({ target: { value: addressData.city || '' } });
              onBillingStateChange({ target: { value: addressData.state || '' } });
              onBillingPostalCodeChange({ target: { value: addressData.postalCode || '' } });
              onBillingCountryChange({ target: { value: normalizeFn(addressData.country || '') } });
            }}
            placeholder="Start typing billing address..."
            disabled={saving}
          />
          <InputField
            id="billingAddress2"
            label="Address line 2"
            value={billingAddress2}
            onChange={onBillingAddress2Change}
            placeholder="Apt, suite, etc. (optional)"
            variant="light"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Dropdown
              id="billingCountry"
              label="Country"
              value={billingCountry || undefined}
              onChange={onBillingCountryChange}
              options={sortedCountries}
              placeholder="Select country..."
              disabled={saving}
            />
            <Dropdown
              key={`billing-state-${billingCountry}`}
              id="billingState"
              label="State / Province"
              value={billingState || undefined}
              onChange={onBillingStateChange}
              options={billingAvailableStates}
              placeholder="Select state/province..."
              disabled={saving || !billingCountry}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              id="billingCity"
              label="City"
              value={billingCity}
              onChange={onBillingCityChange}
              placeholder="City"
              variant="light"
            />
            <InputField
              id="billingPostalCode"
              label="Postal code"
              value={billingPostalCode}
              onChange={onBillingPostalCodeChange}
              placeholder="Postal code"
              variant="light"
            />
          </div>
        </div>
      )}
      
      {/* Tax ID / VAT, Timezone, Language */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <InputField
          id="taxId"
          label="Tax ID / VAT"
          value={taxId}
          onChange={onTaxIdChange}
          placeholder="Tax ID or VAT number"
          variant="light"
        />
        <Dropdown
          id="timezone"
          label="Timezone"
          value={timezone || undefined}
          onChange={onTimezoneChange}
          options={TIMEZONES}
          placeholder="Select timezone..."
          variant="light"
        />
      
        <Dropdown
          id="language"
          label="Language"
          value={language || undefined}
          onChange={onLanguageChange}
          options={LANGUAGES}
          placeholder="Select language..."
          variant="light"
        />
      </div>
      
      {/* Primary Contact */}
      <div>
        <h3 className="text-md font-bold uppercase text-gray-700 dark:text-gray-300 mt-8 mb-2">Primary Contact</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <InputField
              id="primaryContactName"
              label="Name"
              value={primaryContactName}
              onChange={onPrimaryContactNameChange}
              variant="light"
            />
            <PhoneNumberInput
              id="primaryContactPhone"
              label="Phone"
              value={primaryContactPhone}
              onChange={onPrimaryContactPhoneChange}
              placeholder="(717) 123-4567"
              variant="light"
            />
            <InputField
              id="primaryContactEmail"
              label="Email"
              type="email"
              value={primaryContactEmail}
              onChange={onPrimaryContactEmailChange}
              placeholder="contact@example.com"
              variant="light"
            />
          </div>
        </div>
      </div>
      
      {/* Secondary Contact */}
      <div>
        <h3 className="text-md font-bold uppercase text-gray-700 dark:text-gray-300 mt-8 mb-2">Secondary Contact</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <InputField
              id="secondaryContactName"
              label="Name"
              value={secondaryContactName}
              onChange={onSecondaryContactNameChange}
              variant="light"
            />
            <PhoneNumberInput
              id="secondaryContactPhone"
              label="Phone"
              value={secondaryContactPhone}
              onChange={onSecondaryContactPhoneChange}
              placeholder="(717) 123-4567"
              variant="light"
            />
            <InputField
              id="secondaryContactEmail"
              label="Email"
              type="email"
              value={secondaryContactEmail}
              onChange={onSecondaryContactEmailChange}
              placeholder="contact@example.com"
              variant="light"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
