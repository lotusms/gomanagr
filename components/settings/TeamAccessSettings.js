import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import Switch from '@/components/ui/Switch';
import { PrimaryButton } from '@/components/ui/buttons';
import {
  TEAM_MEMBER_SECTION_KEYS,
  getTeamMemberSectionLabels,
  getSectionDisplayLabels,
  DEFAULT_TEAM_MEMBER_SECTIONS,
} from '@/config/teamMemberAccess';
import { getTermForIndustry } from '@/components/clients/clientProfileConstants';
import { getUserAccount } from '@/services/userService';
import { getUserOrganization } from '@/services/organizationService';

export default function TeamAccessSettings({ industry: industryProp = null }) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [sections, setSections] = useState({ ...DEFAULT_TEAM_MEMBER_SECTIONS });
  const [industryState, setIndustryState] = useState(null);
  const industry = industryProp ?? industryState;

  useEffect(() => {
    if (!currentUser?.uid) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch('/api/get-org-member-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid }),
      }).then((r) => r.json()),
      getUserOrganization(currentUser.uid).catch(() => null),
      getUserAccount(currentUser.uid).catch(() => null),
    ]).then(([data, org, account]) => {
      if (data.teamMemberSections && typeof data.teamMemberSections === 'object') {
        setSections({ ...DEFAULT_TEAM_MEMBER_SECTIONS, ...data.teamMemberSections });
      }
      setIndustryState(org?.industry ?? account?.industry ?? null);
    }).catch(() => setError('Failed to load team access settings'))
      .finally(() => setLoading(false));
  }, [currentUser?.uid]);

  const teamTerm = getTermForIndustry(industry, 'team');
  const teamMemberTerm = getTermForIndustry(industry, 'teamMember');
  const teamMemberTermLower = (teamMemberTerm || 'team members').toLowerCase();
  const sectionLabels = getTeamMemberSectionLabels(industry);
  const sectionDisplayLabels = getSectionDisplayLabels(industry);

  const setSection = (key, enabled) => {
    setSections((prev) => ({ ...prev, [key]: !!enabled }));
    setSuccess(false);
    setError(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!currentUser?.uid) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch('/api/update-org-member-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid, teamMemberSections: sections }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to save');
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save team access settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">{teamTerm} access</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Choose which sections all {teamMemberTermLower} can see. When enabled, they can only view and change their own data (e.g. their own appointments), not yours or other members&apos;.
      </p>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300 mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-300 mb-4">
          Saved. {teamMemberTerm} will see the updated access on their next load.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="space-y-4">
          {TEAM_MEMBER_SECTION_KEYS.map((key) => (
            <div
              key={key}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-600 p-4"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white">{sectionDisplayLabels[key] ?? key}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {sectionLabels[key] || `Allow ${teamMemberTermLower} to access ${key}`}
                </p>
              </div>
              <Switch
                id={`team-access-${key}`}
                checked={!!sections[key]}
                onCheckedChange={(checked) => setSection(key, checked)}
                disabled={saving}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3">
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? 'Saving…' : `Save ${(teamTerm || 'team').toLowerCase()} access`}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}
