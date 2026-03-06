import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { getUserOrganization } from '@/services/organizationService';
import { PageHeader } from '@/components/ui';
import { HiLockClosed, HiCloudDownload, HiDatabase, HiServer, HiUpload, HiDocumentDuplicate } from 'react-icons/hi';
import { isAdminRole, isOrgBackupAllowedRole } from '@/config/rolePermissions';

function BackupsContent() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [platformAdmin, setPlatformAdmin] = useState(false);
  const [platformCheckDone, setPlatformCheckDone] = useState(false);
  const [orgDownloading, setOrgDownloading] = useState(false);
  const [masterDownloading, setMasterDownloading] = useState(false);
  const [orgBackupType, setOrgBackupType] = useState('full');
  const [error, setError] = useState(null);
  const [restoreMode, setRestoreMode] = useState('migration');
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (currentUser?.uid) {
      getUserOrganization(currentUser.uid)
        .then((org) => {
          setOrganization(org || null);
          const role = org?.membership?.role;
          setHasAccess(!!role && isAdminRole(role));
          if (!org || !isAdminRole(role)) {
            router.replace('/dashboard');
          }
        })
        .catch(() => {
          setOrganization(null);
          setHasAccess(false);
          router.replace('/dashboard');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [currentUser?.uid, router]);

  useEffect(() => {
    if (!currentUser?.uid || !hasAccess) {
      setPlatformCheckDone(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          if (!cancelled) setPlatformCheckDone(true);
          return;
        }
        const res = await fetch('/api/platform/am-i-platform-admin', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) {
          setPlatformAdmin(res.ok && (await res.json()).platformAdmin === true);
          setPlatformCheckDone(true);
        }
      } catch {
        if (!cancelled) setPlatformCheckDone(true);
      }
    })();
    return () => { cancelled = true; };
  }, [currentUser?.uid, hasAccess]);

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const handleOrgBackup = async () => {
    if (!organization?.id) return;
    setOrgDownloading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/org-backup', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          organizationId: organization.id,
          backupType: orgBackupType,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 429) throw new Error(data.message || 'Rate limited. Try again later.');
        if (res.status === 403) throw new Error('Only organization owner or admin can export backup.');
        throw new Error(data.error || data.message || `Backup failed (${res.status})`);
      }
      if (data.downloadUrl) {
        const resFile = await fetch(data.downloadUrl);
        const blob = await resFile.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename || `gomanagr-org-backup-${orgBackupType === 'schema_only' ? 'schema-only-' : ''}${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError(err.message || 'Export failed');
    } finally {
      setOrgDownloading(false);
    }
  };

  const handleMasterBackup = async () => {
    setMasterDownloading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/platform/master-backup', {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 429) throw new Error(data.message || 'Rate limited. Try again later.');
        if (res.status === 403) throw new Error('Only platform operators can run master backup.');
        throw new Error(data.error || data.message || `Backup failed (${res.status})`);
      }
      if (data.downloadUrl) {
        const resFile = await fetch(data.downloadUrl);
        const blob = await resFile.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename || `gomanagr-master-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError(err.message || 'Export failed');
    } finally {
      setMasterDownloading(false);
    }
  };

  const canExportOrg = organization && isOrgBackupAllowedRole(organization.membership?.role);

  const handleRestoreFileChange = (e) => {
    const file = e.target.files?.[0];
    setRestoreFile(file || null);
    setRestoreResult(null);
  };

  const handleRestore = async () => {
    if (!organization?.id || !restoreFile) return;
    setRestoring(true);
    setError(null);
    setRestoreResult(null);
    try {
      const text = await restoreFile.text();
      const backup = JSON.parse(text);
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/org-restore', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          organizationId: organization.id,
          backup,
          restoreMode: restoreMode,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || `Restore failed (${res.status})`);
      }
      setRestoreResult(data);
      setRestoreFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err.message || 'Restore failed');
    } finally {
      setRestoring(false);
    }
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Backups - GoManagr</title>
        </Head>
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
        </div>
      </>
    );
  }

  if (!hasAccess) {
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
              Only organization admins can access backups.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Backups - GoManagr</title>
        <meta name="description" content="Back up organization or full database (admins only)" />
      </Head>

      <div className="space-y-6">
        <PageHeader
          title="Backups"
          description="Export your organization's data or, if you are a platform operator, the full system. Downloads use a secure link that expires in 5 minutes."
        />

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Organization backup: owner or admin only */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <HiDatabase className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Organization backup
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Export only this organization's data (org, members, invites, clients, proposals, contracts, invoices, projects, and related tables). Only owner or admin can export.
              </p>
              {canExportOrg ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Backup type:</span>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="orgBackupType"
                        checked={orgBackupType === 'full'}
                        onChange={() => setOrgBackupType('full')}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Full data</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="orgBackupType"
                        checked={orgBackupType === 'schema_only'}
                        onChange={() => setOrgBackupType('schema_only')}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Schema only (whitelabel)</span>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {orgBackupType === 'full'
                      ? 'Use for disaster recovery or migrating to another Supabase project.'
                      : 'Use for a blank copy: structure only, no rows. Run migrations on the new project for the same schema.'}
                  </p>
                  <button
                    type="button"
                    onClick={handleOrgBackup}
                    disabled={orgDownloading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium transition-colors"
                  >
                    <HiCloudDownload className="w-5 h-5" />
                    {orgDownloading ? 'Preparing…' : orgBackupType === 'schema_only' ? 'Download schema-only backup' : 'Download organization backup'}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Only organization owner or admin can export. Your role does not have permission.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Master backup: platform operators only */}
        {platformCheckDone && platformAdmin && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <HiServer className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  Master backup (all organizations)
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Export the entire database across all organizations. Only platform operators can run this.
                </p>
                <button
                  type="button"
                  onClick={handleMasterBackup}
                  disabled={masterDownloading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-medium transition-colors"
                >
                  <HiCloudDownload className="w-5 h-5" />
                  {masterDownloading ? 'Preparing…' : 'Download master backup'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Restore */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <HiUpload className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Restore from backup
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Upload a full backup JSON and choose how to restore: disaster recovery (new DB + re-auth everyone), migration (same logins), or schema-only (instructions for blank copy).
              </p>
              <div className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Restore scenario</span>
                  <div className="flex flex-wrap gap-4">
                    <label className="inline-flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="restoreMode"
                        value="disaster"
                        checked={restoreMode === 'disaster'}
                        onChange={(e) => setRestoreMode(e.target.value)}
                        className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Disaster recovery</span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400">New Supabase DB; after restore everyone is asked to set a new password (invites sent).</span>
                      </span>
                    </label>
                    <label className="inline-flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="restoreMode"
                        value="migration"
                        checked={restoreMode === 'migration'}
                        onChange={(e) => setRestoreMode(e.target.value)}
                        className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Migration</span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400">Moving to another Supabase project; no re-auth. Migrate auth users separately if needed.</span>
                      </span>
                    </label>
                    <label className="inline-flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="restoreMode"
                        value="schema_only"
                        checked={restoreMode === 'schema_only'}
                        onChange={(e) => setRestoreMode(e.target.value)}
                        className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Schema only (whitelabel)</span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400">No data inserted; get instructions for a blank DB (run migrations on new project).</span>
                      </span>
                    </label>
                  </div>
                </div>
                {restoreMode !== 'schema_only' && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Backup file (JSON)</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,application/json"
                      onChange={handleRestoreFileChange}
                      className="block w-full text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 dark:file:bg-primary-900/30 dark:file:text-primary-300 hover:file:bg-primary-100 dark:hover:file:bg-primary-900/50"
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={restoreMode === 'schema_only' ? () => {
                    setRestoring(true);
                    setError(null);
                    setRestoreResult(null);
                    getAuthHeaders().then((headers) =>
                      fetch('/api/admin/org-restore', {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                          organizationId: organization.id,
                          backup: { version: 1, scope: 'org', orgId: organization.id, schemaVersion: '049', tables: {} },
                          restoreMode: 'schema_only',
                        }),
                      })
                        .then((r) => r.json())
                        .then((data) => { setRestoreResult(data); })
                        .catch((err) => { setError(err.message || 'Request failed'); })
                        .finally(() => { setRestoring(false); })
                    );
                  } : handleRestore}
                  disabled={restoreMode !== 'schema_only' && (!restoreFile || restoring)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium transition-colors"
                >
                  <HiUpload className="w-5 h-5" />
                  {restoring ? '…' : restoreMode === 'schema_only' ? 'Show instructions' : 'Restore'}
                </button>
                {restoreResult && (
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4 text-sm text-emerald-800 dark:text-emerald-200">
                    <p className="font-medium">{restoreResult.message}</p>
                    {restoreResult.instructions && <p className="mt-2">{restoreResult.instructions}</p>}
                    {restoreResult.inserted && (
                      <p className="mt-2">Inserted: {Object.entries(restoreResult.inserted).filter(([, n]) => n > 0).map(([t, n]) => `${t}: ${n}`).join(', ')}</p>
                    )}
                    {restoreResult.invitesSent != null && <p className="mt-1">Invites sent: {restoreResult.invitesSent}</p>}
                    {restoreResult.inviteErrors?.length > 0 && (
                      <p className="mt-1 text-amber-700 dark:text-amber-300">Some invites failed: {restoreResult.inviteErrors.map((e) => e.email).join(', ')}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-300 mb-2 flex items-center gap-2">
            <HiDocumentDuplicate className="w-5 h-5" />
            Storage and manual steps
          </h3>
          <p className="text-sm text-amber-800 dark:text-amber-400">
            Storage buckets (company-logos, team-photos, client-attachments) are not included in the backup. Back them up separately. For migration, copy auth.users from the old project if you need to preserve existing passwords; otherwise use disaster recovery so users set new passwords.
          </p>
        </div>
      </div>
    </>
  );
}

export default function BackupsPage() {
  return <BackupsContent />;
}
