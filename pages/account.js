import { useState, useEffect } from 'react';
import Head from 'next/head';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount, createUserAccount } from '@/services/userService';
import InputField from '@/components/ui/InputField';
import PasswordField from '@/components/ui/PasswordField';
import Dropdown from '@/components/ui/Dropdown';
import { PrimaryButton } from '@/components/ui/buttons';

const NAME_VIEW_OPTIONS = [
  { value: 'full', label: 'Full Name' },
  { value: 'first', label: 'First' },
  { value: 'f_last', label: 'F. Last' },
  { value: 'last_first', label: 'Last, First' },
  { value: 'email', label: 'Email' },
];

function AccountContent() {
  const { currentUser, updatePassword } = useAuth();
  const [userAccount, setUserAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form state (name, reporting email, name view)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [reportingEmail, setReportingEmail] = useState('');
  const [nameView, setNameView] = useState('full');
  const [accountSaveStatus, setAccountSaveStatus] = useState({ type: null, message: null });

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState({ type: null, message: null });

  useEffect(() => {
    if (currentUser?.uid) {
      getUserAccount(currentUser.uid)
        .then((data) => {
          setUserAccount(data || {});
          setFirstName(data?.firstName ?? '');
          setLastName(data?.lastName ?? '');
          setReportingEmail(data?.reportingEmail ?? '');
          setNameView(data?.nameView ?? 'full');
        })
        .catch(() => setUserAccount({}))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [currentUser?.uid]);

  const clearAccountStatus = () => setAccountSaveStatus({ type: null, message: null });

  const handleNameViewChange = (e) => {
    setNameView(e.target.value);
    clearAccountStatus();
  };

  // Live preview: push current form state to header so it updates as user changes name or name view
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('useraccount-preview', {
        detail: { firstName, lastName, nameView },
      })
    );
  }, [firstName, lastName, nameView]);

  const saveAccountDetails = async (e) => {
    e.preventDefault();
    if (!currentUser?.uid) return;
    setAccountSaveStatus({ type: null, message: null });
    try {
      const payload = {
        ...userAccount,
        userId: currentUser.uid,
        email: currentUser.email,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        reportingEmail: reportingEmail.trim(),
        nameView,
      };
      await createUserAccount(currentUser.uid, payload, null);
      setUserAccount(payload);
      setAccountSaveStatus({ type: 'success', message: 'Account details saved.' });
      window.dispatchEvent(
        new CustomEvent('useraccount-updated', { detail: payload })
      );
    } catch (err) {
      setAccountSaveStatus({ type: 'error', message: err.message || 'Failed to save.' });
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordStatus({ type: null, message: null });
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordStatus({ type: 'error', message: 'Password must be at least 6 characters.' });
      return;
    }
    try {
      await updatePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordStatus({ type: 'success', message: 'Password updated successfully.' });
    } catch (err) {
      setPasswordStatus({
        type: 'error',
        message: err.message || 'Failed to update password. Check current password.',
      });
    }
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>My Account - GoManagr</title>
          <meta name="description" content="Manage your account" />
        </Head>
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
        </div>
      </>
    );
  }

  return (
    <div>
      <Head>
        <title>My Account - GoManagr</title>
        <meta name="description" content="Manage your account" />
      </Head>

      <div className="space-y-6">
        {/* Profile: Name, Reporting Email, Name View */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile</h2>
          <p className="text-sm text-gray-600 mb-4">
            Update your name, reporting email (not used for sign-in), and how your name is displayed.
          </p>
          <form onSubmit={saveAccountDetails} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                id="firstName"
                label="First Name"
                type="text"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  clearAccountStatus();
                }}
                placeholder="First name"
                variant="light"
                inputProps={{ name: 'firstName' }}
              />
              <InputField
                id="lastName"
                label="Last Name"
                type="text"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  clearAccountStatus();
                }}
                placeholder="Last name"
                variant="light"
                inputProps={{ name: 'lastName' }}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                id="reportingEmail"
                label="Reporting Email"
                type="email"
                value={reportingEmail}
                onChange={(e) => {
                  setReportingEmail(e.target.value);
                  clearAccountStatus();
                }}
                placeholder="reports@example.com"
                variant="light"
                inputProps={{ name: 'reportingEmail' }}
              />
              <Dropdown
                id="nameView"
                name="nameView"
                label="Name view"
                value={nameView}
                onChange={handleNameViewChange}
                options={NAME_VIEW_OPTIONS}
                placeholder="Select display format"
              />
            </div>
            {accountSaveStatus.message && (
              <p
                className={`text-sm ${
                  accountSaveStatus.type === 'error' ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {accountSaveStatus.message}
              </p>
            )}
            <div className="flex justify-end">
              <PrimaryButton type="submit">Save Profile</PrimaryButton>
            </div>
          </form>
        </div>

        {/* Change Password */}
        <div className="grid grid-cols-1 md:grid-cols-2 ">
          <div className="bg-white rounded-lg shadow p-6">          
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Change Password</h2>
            <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
              <PasswordField
                id="currentPassword"
                label="Current Password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                variant="light"
                inputProps={{ name: 'currentPassword', autoComplete: 'current-password' }}
              />
              <PasswordField
                id="newPassword"
                label="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                variant="light"
                inputProps={{ name: 'newPassword', autoComplete: 'new-password' }}
              />
              <PasswordField
                id="confirmPassword"
                label="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                variant="light"
                inputProps={{ name: 'confirmPassword', autoComplete: 'new-password' }}
              />
              {passwordStatus.message && (
                <p
                  className={`text-sm ${
                    passwordStatus.type === 'error' ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {passwordStatus.message}
                </p>
              )}
              <div className="flex justify-end">
                <PrimaryButton type="submit">Update Password</PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <AccountContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
