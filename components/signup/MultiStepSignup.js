import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import Step1EmailPassword from './Step1EmailPassword';
import Step2PersonalInfo from './Step2PersonalInfo';
import Step3CompanyInfo from './Step3CompanyInfo';
import Step4Sections from './Step4Sections';
import Step5Referral from './Step5Referral';
import { createUserAccount } from '@/services/userService';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';

const TOTAL_STEPS = 5;

export default function MultiStepSignup() {
  const router = useRouter();
  const { signup } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [emailExists, setEmailExists] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false); // Track if email verification completed
  const [emailCheckFailed, setEmailCheckFailed] = useState(false); // Track if check failed (quota, etc)
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
    teamSize: '',
    companySize: '',
    companyLocations: '',
    sectionsToTrack: [],
    referralSource: '',
  });

  const updateData = (updates) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    // Clear errors for updated fields
    const newErrors = { ...errors };
    Object.keys(updates).forEach((key) => {
      delete newErrors[key];
    });
    setErrors(newErrors);
    
    // Real-time validation for current step
    validateStepRealTime(currentStep, { ...formData, ...updates });
  };

  // Real-time validation (doesn't block, just shows errors)
  const validateStepRealTime = (step, updatedData) => {
    const data = updatedData || formData;
    const newErrors = { ...errors };

    if (step === 1) {
      if (data.email && !/\S+@\S+\.\S+/.test(data.email)) {
        newErrors.email = 'Email is invalid';
      } else if (data.email && emailExists) {
        // Don't set error here - let Step1EmailPassword handle the display with link
        // Error will be set by handleEmailCheck
      } else if (data.email && emailCheckFailed) {
        newErrors.email = 'Email verification failed. Please try again.';
      } else if (data.email && !emailExists && emailVerified && /\S+@\S+\.\S+/.test(data.email)) {
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
      if (data.teamSize) delete newErrors.teamSize;
      if (data.companySize) delete newErrors.companySize;
      if (data.companyLocations) delete newErrors.companyLocations;
    }

    if (step === 4) {
      if (data.sectionsToTrack && Array.isArray(data.sectionsToTrack) && data.sectionsToTrack.length > 0) {
        delete newErrors.sectionsToTrack;
      }
    }

    if (step === 5) {
      if (data.referralSource) delete newErrors.referralSource;
    }

    setErrors(newErrors);
  };

  const handleEmailCheck = (exists, checkFailed = false) => {
    setEmailExists(exists);
    setEmailCheckFailed(checkFailed);
    
    if (exists) {
      // Don't set error message here - Step1EmailPassword will display it with login link
      setErrors((prev) => {
        const newErrors = { ...prev };
        // Remove any old error messages
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

  // Check if current step is valid (without setting errors)
  const isStepValid = (step) => {
    if (step === 1) {
      // CRITICAL: If email exists, ALWAYS block regardless of other validation
      if (emailExists) {
        console.log('🚫 [MultiStepSignup] BLOCKING: Email already exists');
        return false;
      }
      
      // Basic email format validation
      const emailFormatValid = formData.email && /\S+@\S+\.\S+/.test(formData.email);
      // Email must be verified, NOT exist (available for signup), and check didn't fail
      // CRITICAL: emailExists = true means email is ALREADY REGISTERED → BLOCK signup
      const emailAvailable = emailFormatValid && emailVerified && !emailExists && !emailCheckFailed;
      const passwordValid = formData.password && formData.password.length >= 6;
      const confirmPasswordValid = formData.confirmPassword && 
                                   formData.password === formData.confirmPassword;
      
      const isValid = emailAvailable && passwordValid && confirmPasswordValid;
      
      // Only log when validation state changes significantly (not on every render)
      // Removed excessive logging to improve performance
      
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
             formData.teamSize && 
             formData.companySize && 
             formData.companyLocations;
    }

    if (step === 4) {
      return formData.sectionsToTrack && 
             Array.isArray(formData.sectionsToTrack) && 
             formData.sectionsToTrack.length > 0;
    }

    if (step === 5) {
      return formData.referralSource !== '';
    }

    return false;
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.email) newErrors.email = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
      else if (emailCheckFailed) {
        newErrors.email = 'Email verification failed. Please try again.';
      }
      // Don't set error for emailExists here - Step1EmailPassword will display it with login link
      // Don't set error for !emailVerified - only show when actually checking
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
      if (!formData.teamSize) newErrors.teamSize = 'Please select team size';
      if (!formData.companySize) newErrors.companySize = 'Please select company size';
      if (!formData.companyLocations) newErrors.companyLocations = 'Please select company locations';
    }

    if (step === 4) {
      if (!formData.sectionsToTrack || formData.sectionsToTrack.length === 0) {
        newErrors.sectionsToTrack = 'Please select at least one section';
      }
    }

    if (step === 5) {
      if (!formData.referralSource) newErrors.referralSource = 'Please select how you heard about us';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    // CRITICAL: Always block if email exists (already registered)
    if (currentStep === 1 && emailExists) {
      console.log('🚫 [MultiStepSignup] handleNext BLOCKED: Email already exists');
      setErrors((prev) => ({
        ...prev,
        email: 'This email is already registered. Please sign in or use a different email.',
      }));
      return;
    }

    // Always validate before proceeding
    if (!validateStep(currentStep)) {
      return;
    }

    // Only proceed if step is valid
    // Note: isStepValid already checks emailExists, but double-check here for safety
    if (isStepValid(currentStep) && !(currentStep === 1 && emailExists)) {
      if (currentStep < TOTAL_STEPS) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    } else {
      console.log('🚫 [MultiStepSignup] handleNext BLOCKED: Step validation failed');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(TOTAL_STEPS)) return;

    setLoading(true);
    try {
      // Create Firebase auth user
      const userCredential = await signup(formData.email, formData.password);
      const userId = userCredential.user.uid;

      // Prepare user account data
      const userAccountData = {
        userId,
        email: formData.email,
        trial: formData.trial !== false,
        firstName: formData.firstName,
        lastName: formData.lastName,
        purpose: formData.purpose,
        role: formData.role,
        companyName: formData.companyName,
        companyLogo: formData.logoPreview || '',
        teamSize: formData.teamSize,
        companySize: formData.companySize,
        companyLocations: formData.companyLocations,
        sectionsToTrack: formData.sectionsToTrack || [],
        referralSource: formData.referralSource,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to Firestore
      await createUserAccount(userId, userAccountData, formData.logoFile);

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Signup error:', error);
      setErrors({ submit: error.message || 'Failed to create account. Please try again.' });
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
        return <Step4Sections data={formData} updateData={updateData} errors={errors} />;
      case 5:
        return <Step5Referral data={formData} updateData={updateData} errors={errors} />;
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

          {renderStep()}

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
                // CRITICAL: Always disable if email exists (already registered)
                (currentStep === 1 && emailExists) ||
                !isStepValid(currentStep) || 
                (currentStep === 1 && (!emailVerified || emailCheckFailed))
              }
              title={
                currentStep === 1 && emailExists
                  ? 'This user already exists. Use a different email or login.'
                  : !isStepValid(currentStep) 
                    ? currentStep === 1 && (!emailVerified || emailCheckFailed)
                      ? 'Email verification is required before proceeding'
                      : 'Please complete all required fields'
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
