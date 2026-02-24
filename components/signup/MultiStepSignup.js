import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import Step1EmailPassword from './Step1EmailPassword';
import Step2PersonalInfo from './Step2PersonalInfo';
import Step3CompanyInfo from './Step3CompanyInfo';
import Step4IndustryInfo from './Step4IndustryInfo';
import Step5Sections from './Step5Sections';
import Step6Referral from './Step6Referral';
import { createUserAccount } from '@/services/userService';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';

const TOTAL_STEPS = 6;

export default function MultiStepSignup() {
  const router = useRouter();
  const { signup } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [emailExists, setEmailExists] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false); // Track if email verification completed
  const [emailCheckFailed, setEmailCheckFailed] = useState(false); // Track if check failed (quota, etc)
  const lastSubmitAttempt = useRef(null); // Track last submit attempt to prevent rapid submissions
  const [inviteToken, setInviteToken] = useState(null); // Store invite token from URL
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    trial: true,
    firstName: '',
    lastName: '',
    purpose: '',
    role: '',
    companyName: '',
    logoPreview: null,
    logoFile: null,
    companyLocations: '',
    industry: '',
    sectionsToTrack: null, // No default - user must explicitly choose
    referralSource: '',
  });

  useEffect(() => {
    const { invite } = router.query;
    if (invite && typeof invite === 'string') {
      setInviteToken(invite);
    }
  }, [router.query]);

  const updateData = (updates) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    const newErrors = { ...errors };
    Object.keys(updates).forEach((key) => {
      delete newErrors[key];
    });
    setErrors(newErrors);
    
    validateStepRealTime(currentStep, { ...formData, ...updates });
  };

  const validateStepRealTime = (step, updatedData) => {
    const data = updatedData || formData;
    const newErrors = { ...errors };

    if (step === 1) {
      if (data.email && !/\S+@\S+\.\S+/.test(data.email)) {
        newErrors.email = 'Email is invalid';
      } else if (data.email && emailExists) {
      } else if (data.email && emailCheckFailed && emailExists) {
        newErrors.email = 'Email verification failed. Please try again.';
      } else if (data.email && !emailExists && emailVerified && /\S+@\S+\.\S+/.test(data.email)) {
        delete newErrors.email;
      } else if (data.email && emailCheckFailed && !emailExists) {
        delete newErrors.email;
      }
      if (data.password && data.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      } else if (data.password && data.password.length >= 6) {
        delete newErrors.password;
      }
      if (data.confirmPassword && data.password && data.password !== data.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      } else if (data.confirmPassword && data.password && data.password === data.confirmPassword) {
        delete newErrors.confirmPassword;
      }
    }

    if (step === 2) {
      if (data.firstName) delete newErrors.firstName;
      if (data.lastName) delete newErrors.lastName;
      if (data.purpose) delete newErrors.purpose;
      if (data.role) delete newErrors.role;
    }

    if (step === 3) {
      if (data.companyName) delete newErrors.companyName;
      if (data.companyLocations) delete newErrors.companyLocations;
    }

    if (step === 4) {
      if (data.industry) delete newErrors.industry;
    }

    if (step === 5) {
      if (data.sectionsToTrack && Array.isArray(data.sectionsToTrack) && data.sectionsToTrack.length > 0) {
        delete newErrors.sectionsToTrack;
      }
    }

    if (step === 6) {
      if (data.referralSource) delete newErrors.referralSource;
    }

    setErrors(newErrors);
  };

  const handleEmailCheck = (exists, checkFailed = false) => {
    setEmailExists(exists);
    setEmailCheckFailed(checkFailed);
    
    if (exists) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.email;
        return newErrors;
      });
    } else if (checkFailed) {
      setErrors((prev) => ({
        ...prev,
        email: 'Email verification failed. Please try again.',
      }));
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.email;
        return newErrors;
      });
    }
  };

  const handleEmailVerified = (verified) => {
    setEmailVerified(verified);
  };

  const isStepValid = (step) => {
    if (step === 1) {
      if (emailExists) {
        return false;
      }
      
      const emailFormatValid = formData.email && /\S+@\S+\.\S+/.test(formData.email);
      const emailAvailable = emailFormatValid && !emailExists;
      const passwordValid = formData.password && formData.password.length >= 6;
      const confirmPasswordValid = formData.confirmPassword && 
                                   formData.password === formData.confirmPassword;
      
      const isValid = emailAvailable && passwordValid && confirmPasswordValid;
      
      
      return isValid;
    }

    if (step === 2) {
      return formData.firstName && 
             formData.lastName && 
             formData.purpose && 
             formData.role;
    }

    if (step === 3) {
      return formData.companyName && 
             formData.companyLocations;
    }

    if (step === 4) {
      return formData.industry !== '';
    }

    if (step === 5) {
      return formData.sectionsToTrack !== null && 
             formData.sectionsToTrack !== undefined &&
             Array.isArray(formData.sectionsToTrack) && 
             formData.sectionsToTrack.length > 0;
    }

    if (step === 6) {
      return formData.referralSource !== '';
    }

    return false;
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.email) newErrors.email = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
      else if (emailCheckFailed && emailExists) {
        newErrors.email = 'Email verification failed. Please try again.';
      }
      if (!formData.password) newErrors.password = 'Password is required';
      else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
      if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
      else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    if (step === 2) {
      if (!formData.firstName) newErrors.firstName = 'First name is required';
      if (!formData.lastName) newErrors.lastName = 'Last name is required';
      if (!formData.purpose) newErrors.purpose = 'Please select what brings you here';
      if (!formData.role) newErrors.role = 'Please select your role';
    }

    if (step === 3) {
      if (!formData.companyName) newErrors.companyName = 'Company name is required';
      if (!formData.companyLocations) newErrors.companyLocations = 'Please select company locations';
    }

    if (step === 4) {
      if (!formData.industry) newErrors.industry = 'Please select your industry';
    }

    if (step === 5) {
      if (!formData.sectionsToTrack || !Array.isArray(formData.sectionsToTrack) || formData.sectionsToTrack.length === 0) {
        newErrors.sectionsToTrack = 'Please select at least one section';
      }
    }

    if (step === 6) {
      if (!formData.referralSource) newErrors.referralSource = 'Please select how you heard about us';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1 && emailExists) {
      setErrors((prev) => ({
        ...prev,
        email: 'This email is already registered. Please sign in or use a different email.',
      }));
      return;
    }

    if (!validateStep(currentStep)) {
      return;
    }

    if (isStepValid(currentStep) && !(currentStep === 1 && emailExists)) {
      if (currentStep < TOTAL_STEPS) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const stepContainer = document.querySelector('[data-step-container]');
      if (stepContainer) {
        const firstInput = stepContainer.querySelector(
          'input[type="text"]:not([tabindex="-1"]):not([type="hidden"]), ' +
          'input[type="email"]:not([tabindex="-1"]):not([type="hidden"]), ' +
          'input[type="tel"]:not([tabindex="-1"]):not([type="hidden"]), ' +
          'input[type="number"]:not([tabindex="-1"]):not([type="hidden"]), ' +
          'textarea:not([tabindex="-1"])'
        );
        if (firstInput) {
          firstInput.focus();
          return;
        }
        
        const firstRadio = stepContainer.querySelector(
          '[role="radio"]:not([tabindex="-1"]), ' +
          'button[data-state]:not([tabindex="-1"])'
        );
        if (firstRadio) {
          firstRadio.focus();
          return;
        }
        
        const firstCheckbox = stepContainer.querySelector(
          '[role="checkbox"]:not([tabindex="-1"]), ' +
          'input[type="checkbox"]:not([tabindex="-1"])'
        );
        if (firstCheckbox) {
          firstCheckbox.focus();
          return;
        }
        
        const firstButton = stepContainer.querySelector(
          'button:not([tabindex="-1"]):not([aria-label*="password" i])'
        );
        if (firstButton) {
          firstButton.focus();
        }
      }
    }, 150); // Slightly longer delay to ensure React has finished rendering

    return () => clearTimeout(timer);
  }, [currentStep]);

  const handleSubmit = async () => {
    if (!validateStep(TOTAL_STEPS)) return;

    const now = Date.now();
    if (lastSubmitAttempt.current && (now - lastSubmitAttempt.current) < 2000) {
      setErrors({ 
        submit: 'Please wait a moment before trying again.' 
      });
      return;
    }
    lastSubmitAttempt.current = now;

    setLoading(true);
    setErrors({}); // Clear previous errors
    try {
      const userCredential = await signup(formData.email, formData.password);
      const userId = userCredential.user.uid;

      const firstName = (formData.firstName || '').trim();
      const lastName = (formData.lastName || '').trim();
      const companyName = (formData.companyName || '').trim();
      
      const accountOwnerTeamMember = {
        id: `owner-${userId}`,
        name: `${firstName} ${lastName}`.trim() || formData.email.split('@')[0] || 'Account Owner',
        firstName: firstName,
        lastName: lastName,
        email: formData.email,
        role: formData.role,
        company: companyName,
        industry: formData.industry || '',
        status: 'active',
        isOwner: true,
        isAdmin: true, // Account creator is always admin
      };
      
      console.log('[Signup] Creating account owner as team member:', {
        userId,
        teamMemberId: accountOwnerTeamMember.id,
        name: accountOwnerTeamMember.name,
        email: accountOwnerTeamMember.email,
        isAdmin: accountOwnerTeamMember.isAdmin,
      });

      const reportingEmail = formData.email.trim();
      
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 14);
      
      const userAccountData = {
        userId,
        email: formData.email,
        trial: formData.trial !== false,
        trialEndsAt: formData.trial !== false ? trialEndDate.toISOString() : null,
        firstName: firstName,
        lastName: lastName,
        purpose: formData.purpose,
        role: formData.role,
        companyName: formData.companyName,
        companyLogo: formData.logoPreview || '',
        companyLocations: formData.companyLocations,
        industry: formData.industry || '',
        sectionsToTrack: Array.isArray(formData.sectionsToTrack) && formData.sectionsToTrack.length > 0 
          ? formData.sectionsToTrack 
          : [], // Only set default here at submission time if still null/empty
        referralSource: formData.referralSource,
        reportingEmail: reportingEmail, // Always use signup email as reporting email
        teamMembers: [accountOwnerTeamMember], // Only the account owner, no defaults
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };


      try {
        const result = await createUserAccount(userId, userAccountData, formData.logoFile, inviteToken);
        console.log('[Signup] Account created successfully:', {
          userId,
          resultFirstName: result?.firstName,
          resultLastName: result?.lastName,
          resultEmail: result?.email,
        });
      } catch (accountError) {
        console.error('[Signup] Failed to create user account:', {
          error: accountError,
          message: accountError.message,
          stack: accountError.stack,
          userId,
          email: userAccountData.email,
        });
        
        let cleanupNeeded = true;
        let cleanupStatus = 'unknown';
        
        if (accountError.responseData) {
          const errorData = accountError.responseData;
          if (errorData.cleanupAttempted && errorData.cleanupSuccess) {
            cleanupNeeded = false;
            cleanupStatus = 'completed-by-api';
            console.log('[Signup] API already performed cleanup');
          } else if (errorData.cleanupAttempted && !errorData.cleanupSuccess) {
            cleanupStatus = 'failed-by-api';
            console.log('[Signup] API attempted cleanup but it failed');
          }
        }
        
        if (cleanupNeeded) {
          try {
            console.log('[Signup] Attempting to delete auth user due to profile creation failure:', userId);
            const deleteResponse = await fetch('/api/delete-auth-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId }),
            });
            
            if (deleteResponse.ok) {
              cleanupStatus = 'completed-by-client';
              console.log('[Signup] Auth user deleted successfully');
            } else {
              cleanupStatus = 'failed-by-client';
              const deleteError = await deleteResponse.json().catch(() => ({ message: 'Unknown error' }));
              console.error('[Signup] Failed to delete auth user (may need manual cleanup):', deleteError);
            }
          } catch (deleteErr) {
            cleanupStatus = 'exception-during-cleanup';
            console.error('[Signup] Error during auth user cleanup:', deleteErr);
          }
        }
        
        const errorMessage = cleanupStatus.includes('completed') 
          ? `Account creation failed: ${accountError.message || 'Unknown error'}. The account has been cleaned up. Please try again.`
          : `Account creation failed: ${accountError.message || 'Unknown error'}. Please try again or contact support if the issue persists.`;
        
        throw new Error(errorMessage);
      }

      router.push('/dashboard');
    } catch (error) {
      console.error('Signup error:', error);
      const errorMessage = error.message || 'Failed to create account. Please try again.';
      
      if (errorMessage.toLowerCase().includes('rate limit') || 
          errorMessage.toLowerCase().includes('too many') ||
          errorMessage.toLowerCase().includes('exceeded')) {
        const isDevelopment = process.env.NODE_ENV === 'development' || 
                              (typeof window !== 'undefined' && window.location.hostname === 'localhost');
        
        if (isDevelopment) {
          setErrors({ 
            submit: errorMessage + '\n\n💡 Development Tip: Configure Supabase Dashboard → Authentication → Settings → "Disable email confirmations" to reduce rate limits during testing.'
          });
        } else {
          setErrors({ 
            submit: errorMessage
          });
        }
      } else if (errorMessage.toLowerCase().includes('already registered') ||
                 errorMessage.toLowerCase().includes('user already exists') ||
                 errorMessage.toLowerCase().includes('email already')) {
        setErrors({ 
          submit: 'This email is already registered. Please sign in instead or use a different email address.' 
        });
      } else {
        setErrors({ submit: errorMessage });
      }
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1EmailPassword
            data={formData}
            updateData={updateData}
            errors={errors}
            onEmailCheck={handleEmailCheck}
            onEmailVerified={handleEmailVerified}
          />
        );
      case 2:
        return <Step2PersonalInfo data={formData} updateData={updateData} errors={errors} />;
      case 3:
        return <Step3CompanyInfo data={formData} updateData={updateData} errors={errors} />;
      case 4:
        return <Step4IndustryInfo data={formData} updateData={updateData} errors={errors} />;
      case 5:
        return <Step5Sections data={formData} updateData={updateData} errors={errors} />;
      case 6:
        return <Step6Referral data={formData} updateData={updateData} errors={errors} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-primary-200 font-medium">Step {currentStep} of {TOTAL_STEPS}</span>
          <span className="text-sm text-primary-200 font-medium">{Math.round((currentStep / TOTAL_STEPS) * 100)}%</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden backdrop-blur-sm">
          <div
            className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2.5 rounded-full transition-all duration-500 ease-out shadow-lg shadow-primary-500/50"
            style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content - Glassmorphism Card */}
      <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 overflow-hidden group hover:border-white/30 transition-all duration-300">
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        
        {/* Content */}
        <div className="relative z-10">
          {errors.submit && (
            <div className="mb-6 bg-red-900/50 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg whitespace-pre-line animate-shake">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span>{errors.submit}</span>
              </div>
            </div>
          )}

          <div data-step-container>
            {renderStep()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/20">
            <SecondaryButton
              onClick={handleBack}
              disabled={currentStep === 1 || loading}
              variant="light"
              className="transform transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Back
            </SecondaryButton>

            <PrimaryButton
              onClick={handleNext}
              disabled={
                loading || 
                (currentStep === 1 && emailExists) ||
                !isStepValid(currentStep)
              }
              title={
                currentStep === 1 && emailExists
                  ? 'This user already exists. Use a different email or login.'
                  : !isStepValid(currentStep) 
                    ? 'Please complete all required fields'
                    : ''
              }
              className="transform transition-all duration-200 hover:scale-105 active:scale-95"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Account...
                </span>
              ) : currentStep === TOTAL_STEPS ? (
                'Complete Signup'
              ) : (
                'Next'
              )}
            </PrimaryButton>
          </div>
        </div>

        {/* Decorative corner accents */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-br-full"></div>
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-white/10 to-transparent rounded-tl-full"></div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
