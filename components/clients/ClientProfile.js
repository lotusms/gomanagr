import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { updateClients, getUserAccount, saveAppointment, deleteAppointment, getUserAccountFromServer } from '@/services/userService';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import { formatPhone, unformatPhone } from '@/utils/formatPhone';
import { COUNTRIES } from '@/utils/countries';
import { State } from 'country-state-city';
import { HiPlus } from 'react-icons/hi';
import Drawer from '@/components/ui/Drawer';
import AppointmentForm from '@/components/dashboard/AppointmentForm';
import { generateClientId } from '@/utils/clientIdGenerator';
import ResponsiveSectionWrapper from '../dashboard/ResponsiveSectionWrapper';
import BasicInfoSection from './add-client/BasicInfoSection';
import CompanyDetailsSection from './add-client/CompanyDetailsSection';
import FinancialInformationSection from './add-client/FinancialInformationSection';
import ProjectsDetailsSection from './add-client/ProjectsDetailsSection';
import CommunicationLogSection from './add-client/CommunicationLogSection';
import DocumentsFilesSection from './add-client/DocumentsFilesSection';
import ClientAppointmentsCalendar from '../dashboard/ClientAppointmentsCalendar';
import { getProjectTermForIndustry, shouldShowCompanyFinancialSections } from './clientProfileConstants';

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
 * @param {Function} [props.onSaveClient] - When in org: (clientData, isNew) => Promise. If provided, used instead of updateClients.
 */
export default function ClientProfile({
  initialClient = null,
  userAccount = null,
  onSave,
  onCancel,
  onSaveClient,
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
  const [expandedProjectKey, setExpandedProjectKey] = useState(null); // 'active-0' | 'completed-1' | null
  
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
      
      if (onSaveClient) {
        await onSaveClient(clientData, !initialClient);
        success(initialClient ? 'Client updated successfully' : 'Client created successfully');
        if (onSave) onSave(clientData.id);
        return;
      }

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
  const sections = useMemo(() => {
    const projectTermPlural = getProjectTermForIndustry(userAccount?.industry);
    const clientSettings = userAccount?.clientSettings || {};
    
    // Determine tab visibility
    // Use visibleTabs array from clientSettings if available
    // Otherwise, use defaults based on industry (for company/financial) or default to showing all
    let visibleTabs;
    if (clientSettings.visibleTabs && Array.isArray(clientSettings.visibleTabs)) {
      // Use saved array
      visibleTabs = clientSettings.visibleTabs;
    } else if (clientSettings) {
      // Convert old individual boolean settings to array (backward compatibility)
      visibleTabs = [];
      if (clientSettings.showCompanyDetails !== false) visibleTabs.push('company');
      if (clientSettings.showFinancialInformation !== false) visibleTabs.push('financial');
      if (clientSettings.showProjectsDetails !== false) visibleTabs.push('projects');
      if (clientSettings.showCommunicationLog !== false) visibleTabs.push('communication');
      if (clientSettings.showDocumentsFiles !== false) visibleTabs.push('documents');
      if (clientSettings.showAppointmentsSchedule !== false) visibleTabs.push('scheduling');
    } else {
      // Use defaults based on industry
      visibleTabs = ['projects', 'communication', 'documents', 'scheduling'];
      const shouldShowCompanyFinancial = shouldShowCompanyFinancialSections(userAccount?.industry);
      if (shouldShowCompanyFinancial) {
        visibleTabs.push('company', 'financial');
      }
    }
    
    // Create helper functions to check if tabs should be shown
    const showCompanyDetails = visibleTabs.includes('company');
    const showFinancialInformation = visibleTabs.includes('financial');
    const showProjectsDetails = visibleTabs.includes('projects');
    const showCommunicationLog = visibleTabs.includes('communication');
    const showDocumentsFiles = visibleTabs.includes('documents');
    const showAppointmentsSchedule = visibleTabs.includes('scheduling');
    
    const allSections = [
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
            onPhoneChange={setPhone}
            onEmailChange={(e) => setEmail(e.target.value)}
            onStatusChange={setStatus}
            onPreferredCommunicationChange={setPreferredCommunication}
          />
        </div>
      ),
    },
    ...(showCompanyDetails 
      ? [{
          value: 'company',
          label: 'Company Details',
          content: (
            <CompanyDetailsSection
              companyName={companyName}
              companyPhone={companyPhone}
              companyEmail={companyEmail}
              companyWebsite={companyWebsite}
              companyIndustry={companyIndustry}
              companySize={companySize}
              billingAddressDifferent={billingAddressDifferent}
              companyAddress1={companyAddress1}
              companyAddress2={companyAddress2}
              companyCity={companyCity}
              companyState={companyState}
              companyPostalCode={companyPostalCode}
              companyCountry={companyCountry}
              billingAddress1={billingAddress1}
              billingAddress2={billingAddress2}
              billingCity={billingCity}
              billingState={billingState}
              billingPostalCode={billingPostalCode}
              billingCountry={billingCountry}
              taxId={taxId}
              timezone={timezone}
              language={language}
              primaryContactName={primaryContactName}
              primaryContactPhone={primaryContactPhone}
              primaryContactEmail={primaryContactEmail}
              secondaryContactName={secondaryContactName}
              secondaryContactPhone={secondaryContactPhone}
              secondaryContactEmail={secondaryContactEmail}
              sortedCountries={sortedCountries}
              companyAvailableStates={companyAvailableStates}
              billingAvailableStates={billingAvailableStates}
              saving={saving}
              onCompanyNameChange={handleCompanyNameChange}
              onCompanyPhoneChange={setCompanyPhone}
              onCompanyEmailChange={(e) => setCompanyEmail(e.target.value)}
              onCompanyWebsiteChange={(e) => setCompanyWebsite(e.target.value)}
              onCompanyIndustryChange={(e) => setCompanyIndustry(e.target.value)}
              onCompanySizeChange={(e) => setCompanySize(e.target.value)}
              onBillingAddressDifferentChange={setBillingAddressDifferent}
              onCompanyAddress1Change={(e) => {
                // Handle both event objects and direct string values (from AddressAutocomplete)
                const value = typeof e === 'string' ? e : e.target.value;
                setCompanyAddress1(value);
              }}
              onCompanyAddress2Change={(e) => setCompanyAddress2(e.target.value)}
              onCompanyCityChange={(e) => setCompanyCity(e.target.value)}
              onCompanyStateChange={(e) => setCompanyState(e.target.value)}
              onCompanyPostalCodeChange={(e) => setCompanyPostalCode(e.target.value)}
              onCompanyCountryChange={(e) => setCompanyCountry(e.target.value)}
              onBillingAddress1Change={(e) => {
                // Handle both event objects and direct string values (from AddressAutocomplete)
                const value = typeof e === 'string' ? e : e.target.value;
                setBillingAddress1(value);
              }}
              onBillingAddress2Change={(e) => setBillingAddress2(e.target.value)}
              onBillingCityChange={(e) => setBillingCity(e.target.value)}
              onBillingStateChange={(e) => setBillingState(e.target.value)}
              onBillingPostalCodeChange={(e) => setBillingPostalCode(e.target.value)}
              onBillingCountryChange={(e) => setBillingCountry(e.target.value)}
              onTaxIdChange={(e) => setTaxId(e.target.value)}
              onTimezoneChange={(e) => setTimezone(e.target.value)}
              onLanguageChange={(e) => setLanguage(e.target.value)}
              onPrimaryContactNameChange={(e) => setPrimaryContactName(e.target.value)}
              onPrimaryContactPhoneChange={setPrimaryContactPhone}
              onPrimaryContactEmailChange={(e) => setPrimaryContactEmail(e.target.value)}
              onSecondaryContactNameChange={(e) => setSecondaryContactName(e.target.value)}
              onSecondaryContactPhoneChange={setSecondaryContactPhone}
              onSecondaryContactEmailChange={(e) => setSecondaryContactEmail(e.target.value)}
              normalizeCountryValue={normalizeCountryValue}
            />
          ),
        }] 
      : []),
    ...(showFinancialInformation 
      ? [{
          value: 'financial',
          label: 'Financial Information',
          content: (
            <FinancialInformationSection
              paymentTerms={paymentTerms}
              pricingTier={pricingTier}
              defaultCurrency={defaultCurrency}
              activeRetainersBalance={activeRetainersBalance}
              paymentHistory={paymentHistory}
              onPaymentTermsChange={(e) => setPaymentTerms(e.target.value)}
              onPricingTierChange={(e) => setPricingTier(e.target.value)}
              onDefaultCurrencyChange={(e) => setDefaultCurrency(e.target.value)}
              onActiveRetainersBalanceChange={(e) => setActiveRetainersBalance(e.target.value)}
            />
          ),
        }] 
    : []),
    ...(showProjectsDetails 
      ? [{
          value: 'projects',
          label: `${projectTermPlural} Details`,
          content: (
            <ProjectsDetailsSection
              activeProjects={activeProjects}
              completedProjects={completedProjects}
              linkedFiles={linkedFiles}
              deliverables={deliverables}
              approvals={approvals}
              defaultCurrency={defaultCurrency}
              expandedProjectKey={expandedProjectKey}
              onActiveProjectsChange={setActiveProjects}
              onCompletedProjectsChange={setCompletedProjects}
              onLinkedFilesChange={setLinkedFiles}
              onDeliverablesChange={setDeliverables}
              onApprovalsChange={setApprovals}
              onExpandedProjectKeyChange={setExpandedProjectKey}
              clientId={initialClient?.id || clientId}
              companyIndustry={companyIndustry}
              onRefresh={async () => {
                // Refresh client data after project is added
                if (currentUser?.uid && (initialClient?.id || clientId)) {
                  try {
                    const account = await getUserAccount(currentUser.uid);
                    const client = account?.clients?.find((c) => c.id === (initialClient?.id || clientId));
                    if (client) {
                      setActiveProjects(client.activeProjects || []);
                      setCompletedProjects(client.completedProjects || []);
                    }
                  } catch (error) {
                    console.error('Failed to refresh client data:', error);
                  }
                }
              }}
            />
          ),
        }] 
      : []),
    ...(showCommunicationLog 
      ? [{
          value: 'communication',
          label: 'Communication Log',
          content: (
            <CommunicationLogSection
              emails={emails}
              messages={messages}
              calls={calls}
              meetingNotes={meetingNotes}
              internalNotes={internalNotes}
              onEmailsChange={setEmails}
              onMessagesChange={setMessages}
              onCallsChange={setCalls}
              onMeetingNotesChange={setMeetingNotes}
              onInternalNotesChange={(e) => setInternalNotes(e.target.value)}
            />
          ),
        }] 
      : []),
    ...(showDocumentsFiles 
      ? [{
          value: 'documents',
          label: 'Documents & Files',
          content: (
            <DocumentsFilesSection
              contracts={contracts}
              proposals={proposals}
              invoices={invoices}
              attachments={attachments}
              sharedAssets={sharedAssets}
              onContractsChange={setContracts}
              onProposalsChange={setProposals}
              onInvoicesChange={setInvoices}
              onAttachmentsChange={setAttachments}
              onSharedAssetsChange={setSharedAssets}
            />
          ),
        }] 
      : []),
    ...(showAppointmentsSchedule 
      ? [{
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
        }] 
      : []),
    ];
    
    return allSections;
  }, [
    firstName, lastName, clientId, status, phone, email, preferredCommunication, errors,
    companyName, companyPhone, companyEmail, companyWebsite, companyIndustry, companySize,
    companyAddress1, companyAddress2, companyCity, companyState, companyPostalCode, companyCountry,
    billingAddressDifferent, billingAddress1, billingAddress2, billingCity, billingState, billingPostalCode, billingCountry,
    taxId, timezone, language, primaryContactName, primaryContactPhone, primaryContactEmail,
    secondaryContactName, secondaryContactPhone, secondaryContactEmail,
    paymentTerms, paymentHistory, pricingTier, defaultCurrency, activeRetainersBalance,
    activeProjects, completedProjects, expandedProjectKey, linkedFiles, deliverables, approvals,
    emails, messages, calls, meetingNotes, internalNotes,
    contracts, proposals, invoices, attachments, sharedAssets,
    clientAppointments, userAccount, handleCompanyNameChange, saving,
    sortedCountries, companyAvailableStates, billingAvailableStates,
    userAccount?.clientSettings?.visibleTabs,
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
                if (onSaveClient) {
                  await onSaveClient(newClient, true);
                } else {
                  const updatedClients = [...(userAccount?.clients || []), newClient];
                  await updateClients(currentUser.uid, updatedClients);
                }
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

