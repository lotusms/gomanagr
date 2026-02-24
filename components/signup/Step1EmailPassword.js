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

  const lastCheckResult = useRef(null);
  const hasCheckedOnMount = useRef(false);
  const hasUserInteracted = useRef(false);
  const performEmailCheckRef = useRef(null);
  const emailInputRef = useRef(null);

  const performEmailCheck = useCallback(async (emailToCheck) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailToCheck || !emailRegex.test(emailToCheck)) {
      return;
    }

    if (emailToCheck === lastCheckedEmail.current && lastCheckResult.current) {
      const cachedResult = lastCheckResult.current;
      setEmailExists(cachedResult.exists);
      setEmailVerified(!cachedResult.exists && cachedResult.verified);
      setEmailCheckError(cachedResult.error);
      
      if (onEmailCheck) {
        onEmailCheck(cachedResult.exists, !!cachedResult.error);
      }
      if (onEmailVerified) {
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

      const verified = result.error !== 'quota-exceeded' && !result.error && !result.exists;
      lastCheckResult.current = {
        exists: result.exists,
        verified: verified,
        error: result.error ? result.message : null
      };

      setEmailExists(result.exists);

      if (result.error === 'quota-exceeded') {
        setEmailCheckError(null);
        setEmailVerified(true); // Allow progression - signup will catch duplicate
      } else if (result.error) {
        setEmailCheckError(result.message || 'Email verification unavailable. You can still proceed.');
        setEmailVerified(true); // Allow progression
      } else {
        const isVerified = !result.exists;
        setEmailVerified(isVerified);
        setEmailCheckError(null);
      }

      if (onEmailCheck) {
        const checkFailed = result.error && result.error !== 'quota-exceeded';
        onEmailCheck(result.exists, checkFailed);
      }
      if (onEmailVerified) {
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

  useEffect(() => {
    performEmailCheckRef.current = performEmailCheck;
  }, [performEmailCheck]);

  useEffect(() => {
    hasCheckedOnMount.current = false;
    
    const emailToCheck = data.email || email;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (emailToCheck && emailRegex.test(emailToCheck)) {
      hasCheckedOnMount.current = true;
      
      if (data.email && data.email !== email) {
        setEmail(data.email);
      }
      
      const timeoutId = setTimeout(() => {
        const emailToVerify = data.email || email;
        const checkFn = performEmailCheckRef.current || performEmailCheck;
        
        if (checkFn && typeof checkFn === 'function') {
          checkFn(emailToVerify);
        } else {
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
  }, []); // Only run on mount

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
  }, [data.email]); // Only check when data.email changes

  useEffect(() => {
    if (emailInputRef.current) {
      const timeoutId = setTimeout(() => {
        emailInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (emailCheckDebounceTimer.current) {
        clearTimeout(emailCheckDebounceTimer.current);
      }
    };
  }, []);

  const handleEmailBlur = async () => {
    hasUserInteracted.current = true;
    
    const trimmedEmail = email.trim();
    
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      return;
    }
    
    if (trimmedEmail === lastCheckedEmail.current && lastCheckResult.current !== null) {
      return;
    }
    
    if (performEmailCheckRef.current) {
      setCheckingEmail(true);
      setEmailCheckError(null);
      try {
        await performEmailCheckRef.current(trimmedEmail);
      } catch (error) {
        console.error('Email check error:', error);
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
