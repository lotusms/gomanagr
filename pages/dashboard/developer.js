import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount, createUserAccount } from '@/services/userService';
import { PageHeader } from '@/components/ui';
import Switch from '@/components/ui/Switch';
import { HiCode, HiCheckCircle, HiXCircle, HiLockClosed } from 'react-icons/hi';
import { isAdminOrDeveloper } from '@/lib/userPermissions';

function DeveloperContent() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [userAccount, setUserAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [developerMode, setDeveloperMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (currentUser?.uid) {
      getUserAccount(currentUser.uid)
        .then((data) => {
          setUserAccount(data || null);
          setDeveloperMode(data?.developerMode === true);
          
          const access = isAdminOrDeveloper(data, currentUser.uid);
          setHasAccess(access);
          
          if (!access && process.env.NODE_ENV === 'production') {
            router.replace('/dashboard');
          }
        })
        .catch(() => {
          setUserAccount(null);
          setHasAccess(false);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [currentUser?.uid, router]);

  const handleToggleDeveloperMode = async (enabled) => {
    if (!currentUser?.uid || !userAccount) return;

    setSaving(true);
    try {
      const updatedAccount = {
        ...userAccount,
        developerMode: enabled,
      };

      await createUserAccount(currentUser.uid, updatedAccount);
      setDeveloperMode(enabled);
      setUserAccount(updatedAccount);
    } catch (error) {
      console.error('Failed to update developer mode:', error);
      alert('Failed to update developer mode. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Developer - GoManagr</title>
        </Head>
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
        </div>
      </>
    );
  }

  if (!hasAccess && process.env.NODE_ENV === 'production') {
    return (
      <>
        <Head>
          <title>Access Denied - GoManagr</title>
        </Head>
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
              <HiLockClosed className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              You must be an admin or developer to access this page.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Developer - GoManagr</title>
        <meta name="description" content="Developer settings and tools" />
      </Head>

      <div className="space-y-6">
        <PageHeader
          title="Developer"
          description="Development tools and settings (Development purposes only)"
        />

        {/* Developer Mode Toggle */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <HiCode className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  Developer Mode
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Enable developer mode to access additional development tools and features.
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  {developerMode ? (
                    <>
                      <HiCheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                        Developer mode is active
                      </span>
                    </>
                  ) : (
                    <>
                      <HiXCircle className="w-5 h-5 text-gray-400" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Developer mode is inactive
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex-shrink-0">
              <Switch
                id="developer-mode"
                checked={developerMode}
                onCheckedChange={handleToggleDeveloperMode}
                disabled={saving}
              />
            </div>
          </div>
        </div>

        {/* Developer Role Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">
            Developer Role
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-400 mb-4">
            The developer role is a special role that can be assigned to team members alongside admin and member roles.
            This role is intended for development and testing purposes only.
          </p>
          <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
            <p><strong>Available Roles:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Admin:</strong> Full administrative access</li>
              <li><strong>Member:</strong> Standard team member access</li>
              <li><strong>Developer:</strong> Development and testing access (new)</li>
            </ul>
          </div>
        </div>

        {/* Warning */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-300 mb-2">
            ⚠️ Development Only
          </h3>
          <p className="text-sm text-yellow-800 dark:text-yellow-400">
            This page and developer mode are for development purposes only. Do not enable in production environments.
          </p>
        </div>
      </div>
    </>
  );
}

export default function DeveloperPage() {
  return (
    <DeveloperContent />
  );
}
