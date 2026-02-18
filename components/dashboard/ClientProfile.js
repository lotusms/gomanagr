import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { updateClients, getUserAccount, saveAppointment, deleteAppointment, getUserAccountFromServer } from '@/services/userService';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import InputField from '@/components/ui/InputField';
import CurrencyInput from '@/components/ui/CurrencyInput';
import { AddressAutocomplete, TextareaField, EmptyState } from '@/components/ui';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import { formatPhone, unformatPhone } from '@/utils/formatPhone';
import { COUNTRIES } from '@/utils/countries';
import { State } from 'country-state-city';
import { HiChevronDown, HiChevronRight, HiPlus, HiTrash, HiDocumentText } from 'react-icons/hi';
import Dropdown from '@/components/ui/Dropdown';
import { getLabelClasses } from '@/components/ui/formControlStyles';
import Drawer from '@/components/ui/Drawer';
import AppointmentForm from '@/components/dashboard/AppointmentForm';
import { generateClientId } from '@/utils/clientIdGenerator';
import ResponsiveSectionWrapper from './ResponsiveSectionWrapper';
import BasicInfoSection from './sections/BasicInfoSection';
import ClientAppointmentsCalendar from './ClientAppointmentsCalendar';
import { TIMEZONES, LANGUAGES, INDUSTRIES, COMPANY_SIZES, PAYMENT_TERMS, CURRENCIES, PRICING_TIERS } from './clientProfileConstants';

function normalizeCountryValue(value) {
  if (!value) return '';
  if (value.length === 2 && /^[A-Z]{2}$/i.test(value)) return value.toUpperCase();
  const found = COUNTRIES.find(
    (c) => c.label.toLowerCase() === value.toLowerCase() || c.value.toLowerCase() === value.toLowerCase()
  );
  return found ? found.value : value;
}


/**
 * Client Profile Component - Comprehensive client management form
 * @param {Object} props
 * @param {Object} props.initialClient - Existing client to edit (null for new)
 * @param {Object} props.userAccount - User account data
 * @param {Function} props.onSave - Callback when form is saved
 * @param {Function} props.onCancel - Callback when form is cancelled
 */
export default function ClientProfile({
  initialClient = null,
  userAccount = null,
  onSave,
  onCancel,
}) {
  const { currentUser } = useAuth();
  const { success, error: showError } = useToast();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Basic Info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [clientId, setClientId] = useState('');
  const [status, setStatus] = useState('active');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [preferredCommunication, setPreferredCommunication] = useState('email');
  
  // Company
  const [isCompany, setIsCompany] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyIndustry, setCompanyIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [billingAddressDifferent, setBillingAddressDifferent] = useState(false);
  const [companyAddress1, setCompanyAddress1] = useState('');
  const [companyAddress2, setCompanyAddress2] = useState('');
  const [companyCity, setCompanyCity] = useState('');
  const [companyState, setCompanyState] = useState('');
  const [companyPostalCode, setCompanyPostalCode] = useState('');
  const [companyCountry, setCompanyCountry] = useState('');
  const [billingAddress1, setBillingAddress1] = useState('');
  const [billingAddress2, setBillingAddress2] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingState, setBillingState] = useState('');
  const [billingPostalCode, setBillingPostalCode] = useState('');
  const [billingCountry, setBillingCountry] = useState('');
  const [taxId, setTaxId] = useState('');
  const [timezone, setTimezone] = useState('');
  const [language, setLanguage] = useState('');
  const [primaryContactName, setPrimaryContactName] = useState('');
  const [primaryContactPhone, setPrimaryContactPhone] = useState('');
  const [primaryContactEmail, setPrimaryContactEmail] = useState('');
  const [secondaryContactName, setSecondaryContactName] = useState('');
  const [secondaryContactPhone, setSecondaryContactPhone] = useState('');
  const [secondaryContactEmail, setSecondaryContactEmail] = useState('');
  
  // Financial
  const [paymentTerms, setPaymentTerms] = useState('');
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [pricingTier, setPricingTier] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [activeRetainersBalance, setActiveRetainersBalance] = useState('');
  
  // Projects
  const [activeProjects, setActiveProjects] = useState([]);
  const [completedProjects, setCompletedProjects] = useState([]);
  const [legalCaseNumber, setLegalCaseNumber] = useState('');
  const [linkedFiles, setLinkedFiles] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [approvals, setApprovals] = useState([]);
  
  // Communication Log
  const [emails, setEmails] = useState([]);
  const [messages, setMessages] = useState([]);
  const [calls, setCalls] = useState([]);
  const [meetingNotes, setMeetingNotes] = useState([]);
  const [internalNotes, setInternalNotes] = useState('');
  
  // Documents & Files
  const [contracts, setContracts] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [sharedAssets, setSharedAssets] = useState([]);
  
  // Note: Section open/closed state is now handled by ResponsiveSectionWrapper
  
  // Appointment drawer
  const [showAppointmentDrawer, setShowAppointmentDrawer] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  
  const sortedCountries = useMemo(() => COUNTRIES, []);
  
  const companyAvailableStates = useMemo(() => {
    if (!companyCountry) return [];
    const normalized = normalizeCountryValue(companyCountry);
    const states = State.getStatesOfCountry(normalized);
    return states.map((s) => ({ value: s.isoCode, label: s.name }));
  }, [companyCountry]);
  
  const billingAvailableStates = useMemo(() => {
    if (!billingCountry) return [];
    const normalized = normalizeCountryValue(billingCountry);
    const states = State.getStatesOfCountry(normalized);
    return states.map((s) => ({ value: s.isoCode, label: s.name }));
  }, [billingCountry]);
  
  // Get client appointments
  const clientAppointments = useMemo(() => {
    if (!userAccount?.appointments || !initialClient?.id) return [];
    return userAccount.appointments.filter((apt) => apt.clientId === initialClient.id);
  }, [userAccount?.appointments, initialClient?.id]);
  
  // Get existing client IDs for uniqueness check
  const existingClientIds = useMemo(() => {
    if (!userAccount?.clients) return [];
    return userAccount.clients.map((c) => c.id).filter(Boolean);
  }, [userAccount?.clients]);
  
  // Track initialization - only initialize once, never reset
  const hasInitializedRef = useRef(false);
  const initialClientRef = useRef(initialClient);
  
  // Update ref on every render to capture latest initialClient (doesn't trigger effects)
  initialClientRef.current = initialClient;
  
  // Initialize form ONLY ONCE on mount - never re-initialize to prevent focus loss
  useEffect(() => {
    // Only initialize once if we haven't already and initialClient is available
    if (!hasInitializedRef.current && initialClientRef.current) {
      hasInitializedRef.current = true;
      const clientData = initialClientRef.current;
      if (clientData) {
        // Parse name into first/last
        const nameParts = (clientData.name || '').split(' ');
        setFirstName(nameParts[0] || '');
        setLastName(nameParts.slice(1).join(' ') || '');
        setClientId(clientData.id || '');
        setStatus(clientData.status || 'active');
        const phoneVal = clientData.phone ?? '';
        setPhone(phoneVal ? formatPhone(unformatPhone(phoneVal)) : '');
        setEmail(clientData.email ?? '');
        setPreferredCommunication(clientData.preferredCommunication || 'email');
        
        // Company - always show company section
        setIsCompany(true);
        setCompanyName(clientData.company || clientData.companyName || '');
        const companyPhoneVal = clientData.companyPhone ?? '';
        setCompanyPhone(companyPhoneVal ? formatPhone(unformatPhone(companyPhoneVal)) : '');
        setCompanyEmail(clientData.companyEmail ?? '');
        setCompanyWebsite(clientData.companyWebsite || '');
        setCompanyIndustry(clientData.companyIndustry || '');
        setCompanySize(clientData.companySize || '');
        setBillingAddressDifferent(clientData.billingAddressDifferent || false);
        const addr = clientData.companyAddress || {};
        setCompanyAddress1(addr.address1 ?? addr.address ?? '');
        setCompanyAddress2(addr.address2 ?? '');
        setCompanyCity(addr.city ?? '');
        setCompanyState(addr.state ?? '');
        setCompanyPostalCode(addr.postalCode ?? '');
        setCompanyCountry(normalizeCountryValue(addr.country ?? ''));
        const billingAddr = clientData.billingAddress || {};
        setBillingAddress1(billingAddr.address1 ?? billingAddr.address ?? '');
        setBillingAddress2(billingAddr.address2 ?? '');
        setBillingCity(billingAddr.city ?? '');
        setBillingState(billingAddr.state ?? '');
        setBillingPostalCode(billingAddr.postalCode ?? '');
        setBillingCountry(normalizeCountryValue(billingAddr.country ?? ''));
        setTaxId(clientData.taxId || '');
        setTimezone(clientData.timezone || '');
        setLanguage(clientData.language || '');
        setPrimaryContactName(clientData.primaryContactName || '');
        const primaryPhoneVal = clientData.primaryContactPhone ?? '';
        setPrimaryContactPhone(primaryPhoneVal ? formatPhone(unformatPhone(primaryPhoneVal)) : '');
        setPrimaryContactEmail(clientData.primaryContactEmail || '');
        setSecondaryContactName(clientData.secondaryContactName || '');
        const secondaryPhoneVal = clientData.secondaryContactPhone ?? '';
        setSecondaryContactPhone(secondaryPhoneVal ? formatPhone(unformatPhone(secondaryPhoneVal)) : '');
        setSecondaryContactEmail(clientData.secondaryContactEmail || '');
        
        // Financial
        setPaymentTerms(clientData.paymentTerms || '');
        // Handle both old string format and new array format
        const paymentHistoryData = clientData.paymentHistory;
        if (Array.isArray(paymentHistoryData)) {
          setPaymentHistory(paymentHistoryData);
        } else if (typeof paymentHistoryData === 'string' && paymentHistoryData.trim()) {
          // Legacy: if it's a string, convert to empty array (old format)
          setPaymentHistory([]);
        } else {
          setPaymentHistory([]);
        }
        setPricingTier(clientData.pricingTier || '');
        setDefaultCurrency(clientData.defaultCurrency || 'USD');
        setActiveRetainersBalance(clientData.activeRetainersBalance || '');
        
        // Projects
        setActiveProjects(clientData.activeProjects || []);
        setCompletedProjects(clientData.completedProjects || []);
        setLegalCaseNumber(clientData.legalCaseNumber || '');
        setLinkedFiles(clientData.linkedFiles || []);
        setDeliverables(clientData.deliverables || []);
        setApprovals(clientData.approvals || []);
        
        // Communication
        setEmails(clientData.emails || []);
        setMessages(clientData.messages || []);
        setCalls(clientData.calls || []);
        setMeetingNotes(clientData.meetingNotes || []);
        setInternalNotes(clientData.internalNotes || '');
        
        // Documents
        setContracts(clientData.contracts || []);
        setProposals(clientData.proposals || []);
        setInvoices(clientData.invoices || []);
        setAttachments(clientData.attachments || []);
        setSharedAssets(clientData.sharedAssets || []);
        setIsCompany(true);
      } else {
        // New client - ID will be generated in separate useEffect when existingClientIds is available
        setIsCompany(true);
      }
      setErrors({});
    }
    // Empty dependency array - ONLY runs once on mount
    // Never re-runs, preventing any form resets that would cause focus loss
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // NEVER re-run - this is the key to preventing focus loss
  
  // Generate ID for new client when existingClientIds becomes available (only once)
  const idGeneratedRef = useRef(false);
  const previousInitialClientIdForGenerationRef = useRef(undefined);
  
  useEffect(() => {
    const currentInitialClientId = initialClient?.id;
    const switchedToNew = previousInitialClientIdForGenerationRef.current !== undefined && previousInitialClientIdForGenerationRef.current !== null && (currentInitialClientId === undefined || currentInitialClientId === null);
    
    // Reset ID generation flag when switching to new client mode
    if (switchedToNew) {
      idGeneratedRef.current = false;
    }
    
    previousInitialClientIdForGenerationRef.current = currentInitialClientId;
    
    // Generate ID only for new clients, only once, when existingClientIds is available
    if ((initialClient === null || initialClient === undefined) && !clientId && Array.isArray(existingClientIds) && existingClientIds.length >= 0 && !idGeneratedRef.current) {
      const newId = generateClientId(existingClientIds);
      setClientId(newId);
      idGeneratedRef.current = true;
    }
  }, [initialClient?.id]); // Depend on initialClient ID for ID generation
  
  // Also check for ID generation when existingClientIds first becomes available (separate effect to avoid dependency issues)
  const existingIdsLengthRef = useRef(-1);
  useEffect(() => {
    const currentLength = Array.isArray(existingClientIds) ? existingClientIds.length : -1;
    const lengthChanged = existingIdsLengthRef.current !== currentLength;
    
    if (lengthChanged) {
      existingIdsLengthRef.current = currentLength;
      
      // Generate ID only for new clients, only once, when existingClientIds becomes available
      if ((initialClient === null || initialClient === undefined) && !clientId && currentLength >= 0 && !idGeneratedRef.current) {
        const newId = generateClientId(existingClientIds);
        setClientId(newId);
        idGeneratedRef.current = true;
      }
    }
  }, [existingClientIds]); // Depend on existingClientIds but use ref to track length changes
  
  // Memoize onChange handlers to prevent InputField from being recreated
  const handleCompanyNameChange = useCallback((e) => {
    setCompanyName(e.target.value);
  }, []);
  
  const validate = () => {
    const newErrors = {};
    if (!firstName || firstName.trim() === '') newErrors.firstName = 'Please enter first name';
    if (!lastName || lastName.trim() === '') newErrors.lastName = 'Please enter last name';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate() || !currentUser?.uid) return;
    
    setSaving(true);
    try {
      const name = `${firstName.trim()} ${lastName.trim()}`.trim();
      
      const companyAddress = (companyAddress1 || companyAddress2 || companyCity || companyState || companyPostalCode || companyCountry)
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
      
      const billingAddress = billingAddressDifferent && (billingAddress1 || billingAddress2 || billingCity || billingState || billingPostalCode || billingCountry)
        ? {
            address1: billingAddress1.trim() || undefined,
            address2: billingAddress2.trim() || undefined,
            address: billingAddress1.trim() || undefined,
            city: billingCity.trim() || undefined,
            state: billingState.trim() || undefined,
            postalCode: billingPostalCode.trim() || undefined,
            country: billingCountry || undefined,
          }
        : undefined;
      
      const clientData = {
        id: clientId,
        name,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        status,
        phone: phone.trim() ? unformatPhone(phone.trim()) : undefined,
        email: email.trim() || undefined,
        preferredCommunication,
        company: companyName.trim() || undefined,
        companyPhone: companyPhone.trim() ? unformatPhone(companyPhone.trim()) : undefined,
        companyEmail: companyEmail.trim() ? companyEmail.trim() : undefined,
        companyWebsite: companyWebsite.trim() ? companyWebsite.trim() : undefined,
        companyIndustry: companyIndustry ? companyIndustry : undefined,
        companySize: companySize ? companySize : undefined,
        companyAddress,
        billingAddressDifferent: billingAddressDifferent || undefined,
        billingAddress,
        taxId: taxId.trim() ? taxId.trim() : undefined,
        timezone: timezone ? timezone : undefined,
        language: language ? language : undefined,
        primaryContactName: primaryContactName.trim() ? primaryContactName.trim() : undefined,
        primaryContactPhone: primaryContactPhone.trim() ? unformatPhone(primaryContactPhone.trim()) : undefined,
        primaryContactEmail: primaryContactEmail.trim() ? primaryContactEmail.trim() : undefined,
        secondaryContactName: secondaryContactName.trim() ? secondaryContactName.trim() : undefined,
        secondaryContactPhone: secondaryContactPhone.trim() ? unformatPhone(secondaryContactPhone.trim()) : undefined,
        secondaryContactEmail: secondaryContactEmail.trim() ? secondaryContactEmail.trim() : undefined,
        paymentTerms: paymentTerms || undefined,
        paymentHistory: paymentHistory.length > 0 ? paymentHistory : undefined,
        pricingTier: pricingTier || undefined,
        defaultCurrency,
        activeRetainersBalance: activeRetainersBalance || undefined,
        activeProjects: activeProjects.length > 0 ? activeProjects : undefined,
        completedProjects: completedProjects.length > 0 ? completedProjects : undefined,
        legalCaseNumber: legalCaseNumber.trim() || undefined,
        linkedFiles: linkedFiles.length > 0 ? linkedFiles : undefined,
        deliverables: deliverables.length > 0 ? deliverables : undefined,
        approvals: approvals.length > 0 ? approvals : undefined,
        emails: emails.length > 0 ? emails : undefined,
        messages: messages.length > 0 ? messages : undefined,
        calls: calls.length > 0 ? calls : undefined,
        meetingNotes: meetingNotes.length > 0 ? meetingNotes : undefined,
        internalNotes: internalNotes.trim() || undefined,
        contracts: contracts.length > 0 ? contracts : undefined,
        proposals: proposals.length > 0 ? proposals : undefined,
        invoices: invoices.length > 0 ? invoices : undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
        sharedAssets: sharedAssets.length > 0 ? sharedAssets : undefined,
      };
      
      // Get existing clients
      const account = await getUserAccount(currentUser.uid);
      const existingClients = account?.clients || [];
      
      let updatedClients;
      if (initialClient) {
        // Update existing
        updatedClients = existingClients.map((c) => (c.id === clientId ? clientData : c));
      } else {
        // Add new
        updatedClients = [...existingClients, clientData];
      }
      
      await updateClients(currentUser.uid, updatedClients);
      
      success(initialClient ? 'Client updated successfully' : 'Client created successfully');
      
      if (onSave) {
        onSave(clientData.id);
      } else {
        // Fallback: navigate if no onSave callback provided
        setTimeout(() => {
          router.push(`/dashboard/clients/${clientData.id}`);
        }, 500);
      }
    } catch (error) {
      console.error('Failed to save client:', error);
      const errorMessage = error.message || 'Failed to save client. Please try again.';
      
      // Show detailed error message
      if (errorMessage.includes('RLS') || errorMessage.includes('permission') || errorMessage.includes('policy')) {
        showError('Permission denied. Please ensure you are logged in and try again.');
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        showError('Network error. Please check your connection and try again.');
      } else {
        showError(errorMessage);
      }
      
      setErrors({ submit: errorMessage });
    } finally {
      setSaving(false);
    }
  };
  
  // Prepare all sections for ResponsiveSectionWrapper
  const sections = useMemo(() => [
    {
      value: 'basic',
      label: 'Basic Information',
      content: (
        <div className="space-y-4">
          <BasicInfoSection
            firstName={firstName}
            lastName={lastName}
            clientId={clientId}
            status={status}
            phone={phone}
            email={email}
            preferredCommunication={preferredCommunication}
            errors={errors}
            onFirstNameChange={(e) => {
              setFirstName(e.target.value);
              setErrors((prev) => ({ ...prev, firstName: '' }));
            }}
            onLastNameChange={(e) => {
              setLastName(e.target.value);
              setErrors((prev) => ({ ...prev, lastName: '' }));
            }}
            onPhoneChange={(e) => setPhone(formatPhone(e.target.value))}
            onEmailChange={(e) => setEmail(e.target.value)}
            onStatusChange={setStatus}
            onPreferredCommunicationChange={setPreferredCommunication}
          />
        </div>
      ),
    },
    {
      value: 'company',
      label: 'Company Details',
      content: (
        <div className="space-y-4">
          {/* Company Name */}
          <InputField
            id="companyName"
            label="Company Name"
            value={companyName}
            onChange={handleCompanyNameChange}
            variant="light"
          />

          {/* Company Phone, Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              id="companyPhone"
              label="Company Phone"
              type="tel"
              value={companyPhone}
              onChange={(e) => setCompanyPhone(formatPhone(e.target.value))}
              placeholder="(717) 123-4567"
              variant="light"
            />
            <InputField
              id="companyEmail"
              label="Company Email"
              type="email"
              value={companyEmail}
              onChange={(e) => setCompanyEmail(e.target.value)}
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
              onChange={(e) => setCompanyWebsite(e.target.value)}
              onBlur={(e) => {
                let value = e.target.value.trim();
                // Auto-prepend https:// when field loses focus if there's a value and no protocol
                if (value && !value.match(/^https?:\/\//i)) {
                  setCompanyWebsite('https://' + value);
                } else if (!value) {
                  setCompanyWebsite('');
                }
              }}
              placeholder="example.com"
              variant="light"
            />
            <Dropdown
              id="companyIndustry"
              label="Industry"
              value={companyIndustry || undefined}
              onChange={(e) => setCompanyIndustry(e.target.value)}
              options={INDUSTRIES.map((ind) => ({ value: ind, label: ind }))}
              placeholder="Select industry..."
              variant="light"
            />
            <Dropdown
              id="companySize"
              label="Company Size"
              value={companySize || undefined}
              onChange={(e) => setCompanySize(e.target.value)}
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
          
          {/* Same as Company Address check */}
          <div className="flex items-start space-x-3 py-4">
            <CheckboxPrimitive.Root
              className="flex h-5 w-5 items-center justify-center rounded border-2 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary-600 data-[state=checked]:border-primary-600 hover:border-primary-400 mt-0.5"
              checked={billingAddressDifferent}
              onCheckedChange={setBillingAddressDifferent}
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
                onChange={(addr) => setBillingAddress1(addr)}
                onSelect={(addressData) => {
                  setBillingAddress1(addressData.address1 || addressData.fullAddress || '');
                  setBillingAddress2(addressData.address2 || '');
                  setBillingCity(addressData.city || '');
                  setBillingState(addressData.state || '');
                  setBillingPostalCode(addressData.postalCode || '');
                  setBillingCountry(normalizeCountryValue(addressData.country || ''));
                }}
                placeholder="Start typing billing address..."
                disabled={saving}
              />
              <InputField
                id="billingAddress2"
                label="Address line 2"
                value={billingAddress2}
                onChange={(e) => setBillingAddress2(e.target.value)}
                placeholder="Apt, suite, etc. (optional)"
                variant="light"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Dropdown
                  id="billingCountry"
                  label="Country"
                  value={billingCountry || undefined}
                  onChange={(e) => setBillingCountry(e.target.value)}
                  options={sortedCountries}
                  placeholder="Select country..."
                  disabled={saving}
                />
                <Dropdown
                  key={`billing-state-${billingCountry}`}
                  id="billingState"
                  label="State / Province"
                  value={billingState || undefined}
                  onChange={(e) => setBillingState(e.target.value)}
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
                  onChange={(e) => setBillingCity(e.target.value)}
                  placeholder="City"
                  variant="light"
                />
                <InputField
                  id="billingPostalCode"
                  label="Postal code"
                  value={billingPostalCode}
                  onChange={(e) => setBillingPostalCode(e.target.value)}
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
              onChange={(e) => setTaxId(e.target.value)}
              placeholder="Tax ID or VAT number"
              variant="light"
            />
            <Dropdown
              id="timezone"
              label="Timezone"
              value={timezone || undefined}
              onChange={(e) => setTimezone(e.target.value)}
              options={TIMEZONES}
              placeholder="Select timezone..."
              variant="light"
            />
          
            <Dropdown
              id="language"
              label="Language"
              value={language || undefined}
              onChange={(e) => setLanguage(e.target.value)}
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
                  onChange={(e) => setPrimaryContactName(e.target.value)}
                  variant="light"
                />
                <InputField
                  id="primaryContactPhone"
                  label="Phone"
                  type="tel"
                  value={primaryContactPhone}
                  onChange={(e) => setPrimaryContactPhone(formatPhone(e.target.value))}
                  placeholder="(717) 123-4567"
                  variant="light"
                />
                <InputField
                  id="primaryContactEmail"
                  label="Email"
                  type="email"
                  value={primaryContactEmail}
                  onChange={(e) => setPrimaryContactEmail(e.target.value)}
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
                  onChange={(e) => setSecondaryContactName(e.target.value)}
                  variant="light"
                />
                <InputField
                  id="secondaryContactPhone"
                  label="Phone"
                  type="tel"
                  value={secondaryContactPhone}
                  onChange={(e) => setSecondaryContactPhone(formatPhone(e.target.value))}
                  placeholder="(717) 123-4567"
                  variant="light"
                />
                <InputField
                  id="secondaryContactEmail"
                  label="Email"
                  type="email"
                  value={secondaryContactEmail}
                  onChange={(e) => setSecondaryContactEmail(e.target.value)}
                  placeholder="contact@example.com"
                  variant="light"
                />
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      value: 'financial',
      label: 'Financial Information',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Dropdown
              id="paymentTerms"
              label="Payment Terms"
              value={paymentTerms || undefined}
              onChange={(e) => setPaymentTerms(e.target.value)}
              options={PAYMENT_TERMS.map((term) => ({ value: term, label: term }))}
              placeholder="Select payment terms..."
              variant="light"
            />
            <Dropdown
              id="pricingTier"
              label="Pricing Tier"
              value={pricingTier}
              onChange={(e) => setPricingTier(e.target.value)}
              options={PRICING_TIERS}
              variant="light"
            />
            <Dropdown
              id="defaultCurrency"
              label="Default Currency"
              value={defaultCurrency}
              onChange={(e) => setDefaultCurrency(e.target.value)}
              options={CURRENCIES}
              variant="light"
            />
            <CurrencyInput
              id="activeRetainersBalance"
              label="Active Retainers Balance"
              value={activeRetainersBalance}
              onChange={(e) => setActiveRetainersBalance(e.target.value)}
              currency={defaultCurrency || 'USD'}
              placeholder="0.00"
              variant="light"
            />
          </div>
          <div>
            <label className={getLabelClasses('light')}>
              Payment History
            </label>
            {paymentHistory.length === 0 ? (
              <EmptyState
                type="custom"
                title="No payments yet"
                description="Payment history will appear here once payments are recorded."
                icon={HiDocumentText}
                className="mt-2"
              />
            ) : (
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Payment Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Project Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Invoice #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Receipt #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Payment Type
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {paymentHistory.map((payment, index) => {
                      const paymentDate = payment.paymentDate ? new Date(payment.paymentDate) : null;
                      const isPastDue = payment.status === 'past due';
                      const isPaid = payment.status === 'paid';
                      const isPastDate = paymentDate && paymentDate < new Date();
                      
                      return (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            {paymentDate ? (
                              <span className={isPastDate ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-900 dark:text-gray-100'}>
                                {paymentDate.toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            {isPastDue ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                Past Due
                              </span>
                            ) : isPaid ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                Paid
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                {payment.status || 'Pending'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                            {payment.projectName || '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                            {payment.invoiceNumber || '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                            {payment.receiptNumber || '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                            {payment.paymentType || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      value: 'projects',
      label: 'Projects Details',
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Active Projects</h3>
            {activeProjects.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No active projects</p>
            ) : (
              <div className="space-y-3">
                {activeProjects.map((project, idx) => (
                  <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InputField
                        id={`active-project-name-${idx}`}
                        label="Project Name"
                        value={project.name || ''}
                        onChange={(e) => {
                          const updated = [...activeProjects];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          setActiveProjects(updated);
                        }}
                        variant="light"
                      />
                      <InputField
                        id={`active-project-id-${idx}`}
                        label="Project ID"
                        value={project.id || ''}
                        onChange={(e) => {
                          const updated = [...activeProjects];
                          updated[idx] = { ...updated[idx], id: e.target.value };
                          setActiveProjects(updated);
                        }}
                        variant="light"
                      />
                    </div>
                    <TextareaField
                      id={`active-project-notes-${idx}`}
                      label="Notes/Description"
                      value={project.notes || ''}
                      onChange={(e) => {
                        const updated = [...activeProjects];
                        updated[idx] = { ...updated[idx], notes: e.target.value };
                        setActiveProjects(updated);
                      }}
                      rows={2}
                      variant="light"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InputField
                        id={`active-project-estimate-${idx}`}
                        label="Project Estimate"
                        type="number"
                        value={project.estimate || ''}
                        onChange={(e) => {
                          const updated = [...activeProjects];
                          updated[idx] = { ...updated[idx], estimate: e.target.value };
                          setActiveProjects(updated);
                        }}
                        placeholder="0.00"
                        variant="light"
                      />
                      <InputField
                        id={`active-project-address-${idx}`}
                        label="Project Address"
                        value={project.address || ''}
                        onChange={(e) => {
                          const updated = [...activeProjects];
                          updated[idx] = { ...updated[idx], address: e.target.value };
                          setActiveProjects(updated);
                        }}
                        variant="light"
                      />
                    </div>
                    <InputField
                      id={`active-project-invoices-${idx}`}
                      label="Project Invoices"
                      value={project.invoices || ''}
                      onChange={(e) => {
                        const updated = [...activeProjects];
                        updated[idx] = { ...updated[idx], invoices: e.target.value };
                        setActiveProjects(updated);
                      }}
                      placeholder="Comma-separated invoice IDs"
                      variant="light"
                    />
                    <button
                      type="button"
                      onClick={() => setActiveProjects(activeProjects.filter((_, i) => i !== idx))}
                      className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                    >
                      Remove Project
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setActiveProjects([...activeProjects, { name: '', id: '', notes: '', estimate: '', address: '', invoices: '' }])}
              className="mt-3 inline-flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
            >
              <HiPlus className="w-4 h-4" />
              Add Active Project
            </button>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Completed/Previous Projects</h3>
            {completedProjects.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No completed projects</p>
            ) : (
              <div className="space-y-3">
                {completedProjects.map((project, idx) => (
                  <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InputField
                        id={`completed-project-name-${idx}`}
                        label="Project Name"
                        value={project.name || ''}
                        onChange={(e) => {
                          const updated = [...completedProjects];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          setCompletedProjects(updated);
                        }}
                        variant="light"
                      />
                      <InputField
                        id={`completed-project-id-${idx}`}
                        label="Project ID"
                        value={project.id || ''}
                        onChange={(e) => {
                          const updated = [...completedProjects];
                          updated[idx] = { ...updated[idx], id: e.target.value };
                          setCompletedProjects(updated);
                        }}
                        variant="light"
                      />
                    </div>
                    <TextareaField
                      id={`completed-project-notes-${idx}`}
                      label="Notes/Description"
                      value={project.notes || ''}
                      onChange={(e) => {
                        const updated = [...completedProjects];
                        updated[idx] = { ...updated[idx], notes: e.target.value };
                        setCompletedProjects(updated);
                      }}
                      rows={2}
                      variant="light"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InputField
                        id={`completed-project-estimate-${idx}`}
                        label="Project Estimate"
                        type="number"
                        value={project.estimate || ''}
                        onChange={(e) => {
                          const updated = [...completedProjects];
                          updated[idx] = { ...updated[idx], estimate: e.target.value };
                          setCompletedProjects(updated);
                        }}
                        placeholder="0.00"
                        variant="light"
                      />
                      <InputField
                        id={`completed-project-address-${idx}`}
                        label="Project Address"
                        value={project.address || ''}
                        onChange={(e) => {
                          const updated = [...completedProjects];
                          updated[idx] = { ...updated[idx], address: e.target.value };
                          setCompletedProjects(updated);
                        }}
                        variant="light"
                      />
                    </div>
                    <InputField
                      id={`completed-project-invoices-${idx}`}
                      label="Project Invoices"
                      value={project.invoices || ''}
                      onChange={(e) => {
                        const updated = [...completedProjects];
                        updated[idx] = { ...updated[idx], invoices: e.target.value };
                        setCompletedProjects(updated);
                      }}
                      placeholder="Comma-separated invoice IDs"
                      variant="light"
                    />
                    <button
                      type="button"
                      onClick={() => setCompletedProjects(completedProjects.filter((_, i) => i !== idx))}
                      className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                    >
                      Remove Project
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setCompletedProjects([...completedProjects, { name: '', id: '', notes: '', estimate: '', address: '', invoices: '' }])}
              className="mt-3 inline-flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
            >
              <HiPlus className="w-4 h-4" />
              Add Completed Project
            </button>
          </div>
          
          <InputField
            id="legalCaseNumber"
            label="Legal Case Number"
            value={legalCaseNumber}
            onChange={(e) => setLegalCaseNumber(e.target.value)}
            variant="light"
          />
          
          <div>
            <label className={`${getLabelClasses('light')} mb-2`}>Linked Files</label>
            <div className="space-y-2">
              {linkedFiles.map((file, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <InputField
                    id={`linked-file-${idx}`}
                    value={file}
                    onChange={(e) => {
                      const updated = [...linkedFiles];
                      updated[idx] = e.target.value;
                      setLinkedFiles(updated);
                    }}
                    variant="light"
                  />
                  <button
                    type="button"
                    onClick={() => setLinkedFiles(linkedFiles.filter((_, i) => i !== idx))}
                    className="text-red-600 dark:text-red-400"
                  >
                    <HiTrash className="w-5 h-5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setLinkedFiles([...linkedFiles, ''])}
                className="text-sm text-primary-600 dark:text-primary-400"
              >
                <HiPlus className="w-4 h-4 inline mr-1" />
                Add Linked File
              </button>
            </div>
          </div>
          
          <div>
            <label className={`${getLabelClasses('light')} mb-2`}>Deliverables</label>
            <div className="space-y-2">
              {deliverables.map((deliverable, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <InputField
                    id={`deliverable-${idx}`}
                    value={deliverable}
                    onChange={(e) => {
                      const updated = [...deliverables];
                      updated[idx] = e.target.value;
                      setDeliverables(updated);
                    }}
                    variant="light"
                  />
                  <button
                    type="button"
                    onClick={() => setDeliverables(deliverables.filter((_, i) => i !== idx))}
                    className="text-red-600 dark:text-red-400"
                  >
                    <HiTrash className="w-5 h-5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setDeliverables([...deliverables, ''])}
                className="text-sm text-primary-600 dark:text-primary-400"
              >
                <HiPlus className="w-4 h-4 inline mr-1" />
                Add Deliverable
              </button>
            </div>
          </div>
          
          <div>
            <label className={`${getLabelClasses('light')} mb-2`}>Approvals</label>
            <div className="space-y-2">
              {approvals.map((approval, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <InputField
                    id={`approval-${idx}`}
                    value={approval}
                    onChange={(e) => {
                      const updated = [...approvals];
                      updated[idx] = e.target.value;
                      setApprovals(updated);
                    }}
                    variant="light"
                  />
                  <button
                    type="button"
                    onClick={() => setApprovals(approvals.filter((_, i) => i !== idx))}
                    className="text-red-600 dark:text-red-400"
                  >
                    <HiTrash className="w-5 h-5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setApprovals([...approvals, ''])}
                className="text-sm text-primary-600 dark:text-primary-400"
              >
                <HiPlus className="w-4 h-4 inline mr-1" />
                Add Approval
              </button>
            </div>
          </div>
        </div>
      ),
    },
    {
      value: 'communication',
      label: 'Communication Log',
      content: (
        <div className="space-y-4">
          <div>
            <label className={`${getLabelClasses('light')} mb-2`}>Emails</label>
            <div className="space-y-2">
              {emails.map((email, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <TextareaField
                    id={`email-${idx}`}
                    value={email}
                    onChange={(e) => {
                      const updated = [...emails];
                      updated[idx] = e.target.value;
                      setEmails(updated);
                    }}
                    rows={2}
                    variant="light"
                  />
                  <button
                    type="button"
                    onClick={() => setEmails(emails.filter((_, i) => i !== idx))}
                    className="text-red-600 dark:text-red-400"
                  >
                    <HiTrash className="w-5 h-5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setEmails([...emails, ''])}
                className="text-sm text-primary-600 dark:text-primary-400"
              >
                <HiPlus className="w-4 h-4 inline mr-1" />
                Add Email
              </button>
            </div>
          </div>
          
          <div>
            <label className={`${getLabelClasses('light')} mb-2`}>Messages</label>
            <div className="space-y-2">
              {messages.map((message, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <TextareaField
                    id={`message-${idx}`}
                    value={message}
                    onChange={(e) => {
                      const updated = [...messages];
                      updated[idx] = e.target.value;
                      setMessages(updated);
                    }}
                    rows={2}
                    variant="light"
                  />
                  <button
                    type="button"
                    onClick={() => setMessages(messages.filter((_, i) => i !== idx))}
                    className="text-red-600 dark:text-red-400"
                  >
                    <HiTrash className="w-5 h-5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setMessages([...messages, ''])}
                className="text-sm text-primary-600 dark:text-primary-400"
              >
                <HiPlus className="w-4 h-4 inline mr-1" />
                Add Message
              </button>
            </div>
          </div>
          
          <div>
            <label className={`${getLabelClasses('light')} mb-2`}>Calls</label>
            <div className="space-y-2">
              {calls.map((call, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <TextareaField
                    id={`call-${idx}`}
                    value={call}
                    onChange={(e) => {
                      const updated = [...calls];
                      updated[idx] = e.target.value;
                      setCalls(updated);
                    }}
                    rows={2}
                    variant="light"
                  />
                  <button
                    type="button"
                    onClick={() => setCalls(calls.filter((_, i) => i !== idx))}
                    className="text-red-600 dark:text-red-400"
                  >
                    <HiTrash className="w-5 h-5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setCalls([...calls, ''])}
                className="text-sm text-primary-600 dark:text-primary-400"
              >
                <HiPlus className="w-4 h-4 inline mr-1" />
                Add Call
              </button>
            </div>
          </div>
          
          <div>
            <label className={`${getLabelClasses('light')} mb-2`}>Meeting Notes</label>
            <div className="space-y-2">
              {meetingNotes.map((note, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <TextareaField
                    id={`meeting-note-${idx}`}
                    value={note}
                    onChange={(e) => {
                      const updated = [...meetingNotes];
                      updated[idx] = e.target.value;
                      setMeetingNotes(updated);
                    }}
                    rows={2}
                    variant="light"
                  />
                  <button
                    type="button"
                    onClick={() => setMeetingNotes(meetingNotes.filter((_, i) => i !== idx))}
                    className="text-red-600 dark:text-red-400"
                  >
                    <HiTrash className="w-5 h-5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setMeetingNotes([...meetingNotes, ''])}
                className="text-sm text-primary-600 dark:text-primary-400"
              >
                <HiPlus className="w-4 h-4 inline mr-1" />
                Add Meeting Note
              </button>
            </div>
          </div>
          
          <TextareaField
            id="internalNotes"
            label="Internal Notes"
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            placeholder="Internal notes (not visible to client)..."
            rows={4}
            variant="light"
          />
        </div>
      ),
    },
    {
      value: 'documents',
      label: 'Documents & Files',
      content: (
        <div className="space-y-4">
          <div>
            <label className={`${getLabelClasses('light')} mb-2`}>Contracts</label>
            <div className="space-y-2">
              {contracts.map((contract, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <InputField
                    id={`contract-${idx}`}
                    value={contract}
                    onChange={(e) => {
                      const updated = [...contracts];
                      updated[idx] = e.target.value;
                      setContracts(updated);
                    }}
                    variant="light"
                  />
                  <button
                    type="button"
                    onClick={() => setContracts(contracts.filter((_, i) => i !== idx))}
                    className="text-red-600 dark:text-red-400"
                  >
                    <HiTrash className="w-5 h-5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setContracts([...contracts, ''])}
                className="text-sm text-primary-600 dark:text-primary-400"
              >
                <HiPlus className="w-4 h-4 inline mr-1" />
                Add Contract
              </button>
            </div>
          </div>
          
          <div>
            <label className={`${getLabelClasses('light')} mb-2`}>Proposals</label>
            <div className="space-y-2">
              {proposals.map((proposal, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <InputField
                    id={`proposal-${idx}`}
                    value={proposal}
                    onChange={(e) => {
                      const updated = [...proposals];
                      updated[idx] = e.target.value;
                      setProposals(updated);
                    }}
                    variant="light"
                  />
                  <button
                    type="button"
                    onClick={() => setProposals(proposals.filter((_, i) => i !== idx))}
                    className="text-red-600 dark:text-red-400"
                  >
                    <HiTrash className="w-5 h-5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setProposals([...proposals, ''])}
                className="text-sm text-primary-600 dark:text-primary-400"
              >
                <HiPlus className="w-4 h-4 inline mr-1" />
                Add Proposal
              </button>
            </div>
          </div>
          
          <div>
            <label className={`${getLabelClasses('light')} mb-2`}>Invoices</label>
            <div className="space-y-2">
              {invoices.map((invoice, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <InputField
                    id={`invoice-${idx}`}
                    value={invoice}
                    onChange={(e) => {
                      const updated = [...invoices];
                      updated[idx] = e.target.value;
                      setInvoices(updated);
                    }}
                    variant="light"
                  />
                  <button
                    type="button"
                    onClick={() => setInvoices(invoices.filter((_, i) => i !== idx))}
                    className="text-red-600 dark:text-red-400"
                  >
                    <HiTrash className="w-5 h-5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setInvoices([...invoices, ''])}
                className="text-sm text-primary-600 dark:text-primary-400"
              >
                <HiPlus className="w-4 h-4 inline mr-1" />
                Add Invoice
              </button>
            </div>
          </div>
          
          <div>
            <label className={`${getLabelClasses('light')} mb-2`}>Attachments</label>
            <div className="space-y-2">
              {attachments.map((attachment, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <InputField
                    id={`attachment-${idx}`}
                    value={attachment}
                    onChange={(e) => {
                      const updated = [...attachments];
                      updated[idx] = e.target.value;
                      setAttachments(updated);
                    }}
                    variant="light"
                  />
                  <button
                    type="button"
                    onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                    className="text-red-600 dark:text-red-400"
                  >
                    <HiTrash className="w-5 h-5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setAttachments([...attachments, ''])}
                className="text-sm text-primary-600 dark:text-primary-400"
              >
                <HiPlus className="w-4 h-4 inline mr-1" />
                Add Attachment
              </button>
            </div>
          </div>
          
          <div>
            <label className={`${getLabelClasses('light')} mb-2`}>Shared Assets</label>
            <div className="space-y-2">
              {sharedAssets.map((asset, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <InputField
                    id={`shared-asset-${idx}`}
                    value={asset}
                    onChange={(e) => {
                      const updated = [...sharedAssets];
                      updated[idx] = e.target.value;
                      setSharedAssets(updated);
                    }}
                    variant="light"
                  />
                  <button
                    type="button"
                    onClick={() => setSharedAssets(sharedAssets.filter((_, i) => i !== idx))}
                    className="text-red-600 dark:text-red-400"
                  >
                    <HiTrash className="w-5 h-5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setSharedAssets([...sharedAssets, ''])}
                className="text-sm text-primary-600 dark:text-primary-400"
              >
                <HiPlus className="w-4 h-4 inline mr-1" />
                Add Shared Asset
              </button>
            </div>
          </div>
        </div>
      ),
    },
    {
      value: 'scheduling',
      label: 'Appointments & Schedule',
      content: (
        <ClientAppointmentsCalendar
          appointments={clientAppointments}
          userAccount={userAccount}
          onAppointmentClick={(appointment) => {
            setEditingAppointment(appointment);
            setShowAppointmentDrawer(true);
          }}
        />
      ),
    },
  ], [
    firstName, lastName, clientId, status, phone, email, preferredCommunication, errors,
    companyName, companyPhone, companyEmail, companyWebsite, companyIndustry, companySize,
    companyAddress1, companyAddress2, companyCity, companyState, companyPostalCode, companyCountry,
    billingAddressDifferent, billingAddress1, billingAddress2, billingCity, billingState, billingPostalCode, billingCountry,
    taxId, timezone, language, primaryContactName, primaryContactPhone, primaryContactEmail,
    secondaryContactName, secondaryContactPhone, secondaryContactEmail,
    paymentTerms, paymentHistory, pricingTier, defaultCurrency, activeRetainersBalance,
    activeProjects, completedProjects, legalCaseNumber, linkedFiles, deliverables, approvals,
    emails, messages, calls, meetingNotes, internalNotes,
    contracts, proposals, invoices, attachments, sharedAssets,
    clientAppointments, userAccount, handleCompanyNameChange, saving,
    sortedCountries, companyAvailableStates, billingAvailableStates,
  ]);
  
  return (
    <form onSubmit={handleSave} className="space-y-6">
      <ResponsiveSectionWrapper 
        sections={sections}
        defaultTab="basic"
      />
      
      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <SecondaryButton type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={saving}>
          {saving ? 'Saving...' : initialClient ? 'Update Client' : 'Add Client'}
        </PrimaryButton>
      </div>
      
      {errors.submit && (
        <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
      )}
      
      {/* Appointment Drawer */}
      {showAppointmentDrawer && (
        <Drawer
          isOpen={showAppointmentDrawer}
          onClose={() => {
            setShowAppointmentDrawer(false);
            setEditingAppointment(null);
          }}
          title={editingAppointment ? 'Edit Appointment' : 'Add Appointment'}
        >
          <AppointmentForm
            teamMembers={userAccount?.teamMembers || []}
            businessHoursStart={userAccount?.businessHoursStart ?? '08:00'}
            businessHoursEnd={userAccount?.businessHoursEnd ?? '18:00'}
            timeFormat={userAccount?.timeFormat ?? '24h'}
            timezone={userAccount?.timezone ?? 'UTC'}
            dateFormat={userAccount?.dateFormat ?? 'MM/DD/YYYY'}
            initialAppointment={editingAppointment || (initialClient ? { clientId: initialClient.id } : null)}
            appointments={userAccount?.appointments || []}
            services={userAccount?.services || []}
            clients={userAccount?.clients || []}
            onClientAdd={async (clientData) => {
              try {
                const existingIds = (userAccount?.clients || []).map((c) => c.id).filter(Boolean);
                const newClientId = generateClientId(existingIds);
                const newClient = { id: newClientId, ...clientData };
                const updatedClients = [...(userAccount?.clients || []), newClient];
                await updateClients(currentUser.uid, updatedClients);
                success('Client added to appointment');
                return newClientId;
              } catch (error) {
                console.error('Failed to add client:', error);
                showError('Failed to add client. Please try again.');
                throw error;
              }
            }}
            onSubmit={async (appointmentData) => {
              if (!currentUser?.uid) return;
              try {
                await saveAppointment(currentUser.uid, appointmentData);
                success(editingAppointment ? 'Appointment updated successfully' : 'Appointment created successfully');
                // Refresh user account to get updated appointments
                const updatedAccount = await getUserAccountFromServer(currentUser.uid);
                // Update userAccount prop would need to be handled by parent
                setShowAppointmentDrawer(false);
                setEditingAppointment(null);
                // Reload page to refresh appointments
                setTimeout(() => {
                  window.location.reload();
                }, 500);
              } catch (error) {
                console.error('Failed to save appointment:', error);
                showError('Failed to save appointment. Please try again.');
              }
            }}
            onDelete={editingAppointment ? async () => {
              if (!currentUser?.uid || !editingAppointment?.id) return;
              if (!confirm('Are you sure you want to delete this appointment?')) return;
              try {
                await deleteAppointment(currentUser.uid, editingAppointment.id);
                success('Appointment deleted successfully');
                setShowAppointmentDrawer(false);
                setEditingAppointment(null);
                setTimeout(() => {
                  window.location.reload();
                }, 500);
              } catch (error) {
                console.error('Failed to delete appointment:', error);
                showError('Failed to delete appointment. Please try again.');
              }
            } : undefined}
            onCancel={() => {
              setShowAppointmentDrawer(false);
              setEditingAppointment(null);
            }}
            saving={false}
          />
        </Drawer>
      )}
    </form>
  );
}

