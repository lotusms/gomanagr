import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { checkEmailExists } from '@/utils/emailCheck';
import { Checkbox, PasswordField, InputField } from '@/components/ui';

export default function Step1EmailPassword({ data, updateData, errors, onEmailCheck, onEmailVerified }) {
  const [email, setEmail] = useState(data.email || '');
  const [password, setPassword] = useState(data.password || '');
  const [confirmPassword, setConfirmPassword] = useState(data.confirmPassword || '');
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [emailCheckError, setEmailCheckError] = useState(null);
  const [emailVerified, setEmailVerified] = useState(false); // Track if verification completed successfully
  const debounceTimer = useRef(null);
  const lastCheckedEmail = useRef('');
  const emailCheckDebounceTimer = useRef(null);

  // Store the last check result to maintain state even when skipping re-check
  const lastCheckResult = useRef(null);
  const hasCheckedOnMount = useRef(false);
  const hasUserInteracted = useRef(false);
  const performEmailCheckRef = useRef(null);
  const emailInputRef = useRef(null);

  // Helper function to perform email check (memoized with useCallback)
  const performEmailCheck = useCallback(async (emailToCheck) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailToCheck || !emailRegex.test(emailToCheck)) {
      return;
    }

    // Skip if already checked this email
    if (emailToCheck === lastCheckedEmail.current && lastCheckResult.current) {
      const cachedResult = lastCheckResult.current;
      setEmailExists(cachedResult.exists);
      // emailVerified should be true only if email doesn't exist (is available)
      setEmailVerified(!cachedResult.exists && cachedResult.verified);
      setEmailCheckError(cachedResult.error);
      
      if (onEmailCheck) {
        onEmailCheck(cachedResult.exists, !!cachedResult.error);
      }
      if (onEmailVerified) {
        // Only verified if email doesn't exist
        onEmailVerified(!cachedResult.exists && cachedResult.verified);
      }
      return;
    }

    setCheckingEmail(true);
    setEmailCheckError(null);
    setEmailVerified(false);

    try {
      const result = await checkEmailExists(emailToCheck);

      lastCheckedEmail.current = emailToCheck;

      // Store the result for future reference
      // verified means: check completed successfully AND email doesn't exist (is available)
      const verified = result.error !== 'quota-exceeded' && !result.error && !result.exists;
      lastCheckResult.current = {
        exists: result.exists,
        verified: verified,
        error: result.error ? result.message : null
      };

      setEmailExists(result.exists);

      // If quota exceeded, don't block - allow signup to proceed (it will catch duplicate email)
      if (result.error === 'quota-exceeded') {
        // Don't set error - allow signup to proceed and handle duplicate email error
        setEmailCheckError(null);
        setEmailVerified(true); // Allow progression - signup will catch duplicate
      } else if (result.error) {
        // Other errors - show warning but don't block
        setEmailCheckError(result.message || 'Email verification unavailable. You can still proceed.');
        setEmailVerified(true); // Allow progression
      } else {
        // Verification completed successfully
        // Only set verified to true if email doesn't exist (is available)
        // If email exists, it's NOT verified/valid for signup
        const isVerified = !result.exists;
        setEmailVerified(isVerified);
        setEmailCheckError(null);
      }

      // Call callbacks AFTER state updates
      if (onEmailCheck) {
        // Don't treat quota-exceeded as a failure - allow signup to proceed
        const checkFailed = result.error && result.error !== 'quota-exceeded';
        onEmailCheck(result.exists, checkFailed);
      }
      if (onEmailVerified) {
        // Verified if email doesn't exist OR if quota exceeded (allow signup to handle it)
        const verified = (!result.exists || result.error === 'quota-exceeded') && result.error !== 'server-error';
        onEmailVerified(verified);
      }
    } catch (error) {
      console.error('Email check error:', error);
      setEmailExists(false);
      setEmailVerified(false);
      setEmailCheckError('Network error. Please check your connection and try again.');
      lastCheckResult.current = {
        exists: false,
        verified: false,
        error: 'Network error. Please check your connection and try again.'
      };
      if (onEmailCheck) {
        onEmailCheck(false, true);
      }
      if (onEmailVerified) {
        onEmailVerified(false);
      }
    } finally {
      setCheckingEmail(false);
    }
  }, [onEmailCheck, onEmailVerified]);

  // Store performEmailCheck in a ref so useEffect can access it
  useEffect(() => {
    performEmailCheckRef.current = performEmailCheck;
  }, [performEmailCheck]);

  // Check email on mount if it exists - runs ONLY once on mount
  useEffect(() => {
    // Reset mount flag when component mounts (in case of remount)
    hasCheckedOnMount.current = false;
    
    const emailToCheck = data.email || email;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    // Check if we have a valid email on mount
    if (emailToCheck && emailRegex.test(emailToCheck)) {
      hasCheckedOnMount.current = true;
      
      // Ensure state is synced
      if (data.email && data.email !== email) {
        setEmail(data.email);
      }
      
      // Use a small delay to ensure performEmailCheck is ready
      // This handles the case where the component mounts before performEmailCheck is fully initialized
      const timeoutId = setTimeout(() => {
        const emailToVerify = data.email || email;
        const checkFn = performEmailCheckRef.current || performEmailCheck;
        
        if (checkFn && typeof checkFn === 'function') {
          checkFn(emailToVerify);
        } else {
          // Retry once more after a longer delay
          setTimeout(() => {
            const retryFn = performEmailCheckRef.current || performEmailCheck;
            if (retryFn && typeof retryFn === 'function') {
              retryFn(emailToVerify);
            }
          }, 100);
        }
      }, 50);
      
      return () => clearTimeout(timeoutId);
    } else {
      hasCheckedOnMount.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Check email when data.email changes externally (after mount)
  useEffect(() => {
    if (!hasCheckedOnMount.current) {
      return; // Don't run until mount check is done
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (data.email && data.email !== email && emailRegex.test(data.email) && data.email !== lastCheckedEmail.current) {
      setEmail(data.email);
      const checkFn = performEmailCheckRef.current || performEmailCheck;
      if (checkFn && typeof checkFn === 'function') {
        checkFn(data.email);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.email]); // Only check when data.email changes

  // Focus email field on mount
  useEffect(() => {
    if (emailInputRef.current) {
      // Small delay to ensure the component is fully rendered
      const timeoutId = setTimeout(() => {
        emailInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (emailCheckDebounceTimer.current) {
        clearTimeout(emailCheckDebounceTimer.current);
      }
    };
  }, []);

  // Check email on blur if it's valid and different from last checked
  const handleEmailBlur = async () => {
    hasUserInteracted.current = true;
    
    const trimmedEmail = email.trim();
    
    // Only check if email is valid and different from last checked
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      return;
    }
    
    // Skip if we already checked this email
    if (trimmedEmail === lastCheckedEmail.current && lastCheckResult.current !== null) {
      return;
    }
    
    // Perform email check
    if (performEmailCheckRef.current) {
      setCheckingEmail(true);
      setEmailCheckError(null);
      try {
        await performEmailCheckRef.current(trimmedEmail);
      } catch (error) {
        console.error('Email check error:', error);
        // Don't block signup if check fails - Supabase will catch duplicates
      } finally {
        setCheckingEmail(false);
      }
    }
  };


  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    updateData({ email: value });
    hasUserInteracted.current = true;
    
    // Reset email verification state when user types (but keep last checked email)
    if (value !== lastCheckedEmail.current) {
      setEmailExists(false);
      setEmailCheckError(null);
      setEmailVerified(false);
      lastCheckResult.current = null; // Clear cached result when email changes
      if (onEmailCheck) {
        onEmailCheck(false, false);
      }
      if (onEmailVerified) {
        onEmailVerified(false);
      }
    }

    // Email checking is now optional and non-blocking
    // We only check on blur to reduce API calls and prevent rate limiting
    // Supabase will handle duplicate emails during signup
    // Debounce removed to eliminate unnecessary API calls during typing
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    updateData({ password: value });
  };

  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);
    updateData({ confirmPassword: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Create your account</h2>
        <p className="text-primary-200">Start your free trial - no credit card required</p>
      </div>

      <InputField
        ref={emailInputRef}
        id="email"
        type="email"
        label="Email Address"
        value={email}
        onChange={handleEmailChange}
        onBlur={handleEmailBlur}
        placeholder="you@example.com"
        required
        checking={checkingEmail}
        disabled={false}
        hasErrorState={emailExists}
        inputProps={{ autoComplete: 'off' }}
        validate={(value) => {
          if (!value) return null; // Let required handle empty
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            return 'Email is invalid';
          }
          return null;
        }}
        error={
          emailExists
            ? null // We'll show custom message below
            : emailCheckError && !emailExists
            ? emailCheckError
            : errors.email && !emailExists
            ? errors.email
            : null
        }
        successIcon={
          !emailExists && emailVerified && email && email.includes('@') ? (
            <span className="text-green-400">✓</span>
          ) : null
        }
        errorIcon={emailExists ? <span className="text-red-500 text-xl">⚠️</span> : null}
      />
      {checkingEmail && (
        <p className="mt-1 text-sm text-yellow-300">Checking email availability...</p>
      )}
      {emailExists && (
        <p className="mt-1 text-sm text-red-300 font-medium">
          This user already exists. Use a different email or{' '}
          <Link href="/login" className="underline hover:text-red-200 font-semibold">
            login
          </Link>.
        </p>
      )}

      <PasswordField
        id="password"
        label="Password"
        value={password}
        onChange={handlePasswordChange}
        placeholder="At least 6 characters"
        required
        error={errors.password}
        inputProps={{ autoComplete: 'new-password' }}
      />

      <PasswordField
        id="confirmPassword"
        label="Confirm Password"
        value={confirmPassword}
        onChange={handleConfirmPasswordChange}
        placeholder="Confirm your password"
        required
        error={errors.confirmPassword}
        inputProps={{ autoComplete: 'new-password' }}
      />

      <div className="flex items-center space-x-2">
        <Checkbox
          id="trial"
          checked={data.trial === true}
          onCheckedChange={(checked) => updateData({ trial: checked === true ? true : false })}
        >
          <span className="text-white">Free trial enabled - Start with full access, no credit card required</span>
        </Checkbox>
      </div>
    </div>
  );
}
