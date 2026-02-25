import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useAuth } from '@/lib/AuthContext';
import { useUserAccount } from '@/lib/UserAccountContext';
import { getUserAccount, createUserAccount, deleteUserAccount } from '@/services/userService';
import InputField from '@/components/ui/InputField';
import PasswordField from '@/components/ui/PasswordField';
import Dropdown from '@/components/ui/Dropdown';
import { PrimaryButton } from '@/components/ui/buttons';
import { ConfirmationDialog } from '@/components/ui';
import { PageHeader } from '@/components/ui';
import { HiUser } from 'react-icons/hi';


const NAME_VIEW_OPTIONS = [
  { value: 'full', label: 'Full Name' },
  { value: 'first', label: 'First' },
  { value: 'f_last', label: 'F. Last' },
  { value: 'last_first', label: 'Last, First' },
  { value: 'email', label: 'Email' },
];

function AccountContent() {
  const { currentUser, updatePassword, logout } = useAuth();
  const { setAccount: setGlobalAccount } = useUserAccount();
  const router = useRouter();
  const [userAccount, setUserAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [reportingEmail, setReportingEmail] = useState('');
  const [nameView, setNameView] = useState('full');
  const [accountSaveStatus, setAccountSaveStatus] = useState({ type: null, message: null });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState({ type: null, message: null });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (currentUser?.uid) {
      getUserAccount(currentUser.uid)
        .then((data) => {
          setUserAccount(data || {});
          setFirstName(data?.firstName ?? '');
          setLastName(data?.lastName ?? '');
          setReportingEmail(data?.reportingEmail || currentUser?.email || '');
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
      const normalizedReportingEmail = (reportingEmail.trim() || currentUser.email || '').trim();
      
      const payload = {
        ...userAccount,
        userId: currentUser.uid,
        email: currentUser.email,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        reportingEmail: normalizedReportingEmail, // Always normalized to signup email if empty
        nameView,
      };
      await createUserAccount(currentUser.uid, payload, null);
      setUserAccount(payload);
      setGlobalAccount(payload);
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

  const handleDeleteAccount = async () => {
    if (!currentUser?.uid) return;
    
    try {
      setDeleting(true);
      await deleteUserAccount(currentUser.uid);
      
      await logout();
      router.push('/login?deleted=true');
    } catch (err) {
      console.error('Failed to delete account:', err);
      setDeleting(false);
      setDeleteDialogOpen(false);
      alert('Failed to delete account: ' + (err.message || 'Unknown error'));
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
        <PageHeader
          title="My Account"
          description="Manage your account details and preferences" iconPosition="left"
          icon={<HiUser className="w-5 h-5" />}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Profile: Name, Reporting Email, Name View */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Profile</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
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
                    accountSaveStatus.type === 'error' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">       
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Change Password</h2>
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
                    passwordStatus.type === 'error' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
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
        <div className="mt-4">
          {/* Delete Account */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-2 border-red-200 dark:border-red-900/50">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">Delete Account</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  All your data including clients, team members, services, appointments, and files will be permanently deleted.
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <PrimaryButton
                type="button"
                onClick={() => setDeleteDialogOpen(true)}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-500 border-red-800"
              >
                Delete My Account
              </PrimaryButton>
            </div>
          </div>

          {/* Delete Account Confirmation Dialog */}
          <ConfirmationDialog
            isOpen={deleteDialogOpen}
            onClose={() => !deleting && setDeleteDialogOpen(false)}
            onConfirm={handleDeleteAccount}
            title="Delete Account"
            message="This will permanently delete your account and all associated data. This action cannot be undone. All your clients, team members, services, appointments, and files will be permanently removed."
            confirmText={deleting ? "Deleting..." : "Delete Account"}
            cancelText="Cancel"
            confirmationWord="DELETE"
            confirmationLabel='Type "DELETE" to confirm account deletion'
            variant="danger"
          />
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
