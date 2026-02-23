import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import PublicLayout from '@/components/layouts/PublicLayout';
import { createUserAccount } from '@/services/userService';

export default function AcceptInvitePage() {
  const router = useRouter();
  const { invite } = router.query;
  const { signup } = useAuth();
  const [inviteData, setInviteData] = useState(null);
  const [inviteError, setInviteError] = useState(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const token = typeof invite === 'string' ? invite : null;

  useEffect(() => {
    if (!token) {
      setLoadingInvite(false);
      setInviteError('Invalid invite link.');
      return;
    }
    let cancelled = false;
    setLoadingInvite(true);
    setInviteError(null);
    fetch(`/api/invite-by-token?token=${encodeURIComponent(token)}`)
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(d));
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setInviteData({
            email: data.email,
            organizationName: data.organizationName,
            organizationLogoUrl: data.organizationLogoUrl || null,
            inviteeData: data.inviteeData && typeof data.inviteeData === 'object' ? data.inviteeData : null,
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setInviteError(err?.error || 'This invite is invalid or has expired.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingInvite(false);
      });
    return () => { cancelled = true; };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inviteData?.email || !token) return;

    const newErrors = {};
    if (!password.trim()) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    setErrors({});
    try {
      const result = await signup(inviteData.email, password);
      const user = result?.user;
      const userId = user?.uid;
      if (!userId) throw new Error('Account created but session not available');

      const now = new Date().toISOString();
      const inv = inviteData.inviteeData || {};
      const trim = (v) => (v == null ? '' : String(v).trim());
      const userAccountData = {
        userId,
        email: inviteData.email,
        firstName: trim(inv.firstName ?? inv.first_name),
        lastName: trim(inv.lastName ?? inv.last_name),
        name: trim(inv.name),
        purpose: trim(inv.purpose),
        role: trim(inv.role),
        title: inv.title != null ? trim(inv.title) : undefined,
        phone: inv.phone != null ? trim(inv.phone) : undefined,
        company: inv.company != null ? trim(inv.company) : undefined,
        industry: inv.industry != null ? trim(inv.industry) : undefined,
        bio: inv.bio != null ? trim(inv.bio) : undefined,
        gender: inv.gender != null ? trim(inv.gender) : undefined,
        yearsExperience: inv.yearsExperience,
        address: inv.address && typeof inv.address === 'object' ? inv.address : undefined,
        location: inv.location,
        personalityTraits: Array.isArray(inv.personalityTraits) ? inv.personalityTraits : undefined,
        pictureUrl: inv.pictureUrl != null ? trim(inv.pictureUrl) : undefined,
        reportingEmail: inviteData.email,
        createdAt: now,
        updatedAt: now,
      };

      const accessToken = result?.session?.access_token;
      await createUserAccount(userId, userAccountData, null, token, accessToken);
      router.push('/dashboard/team-member');
    } catch (err) {
      const message =
        err?.responseData?.message ||
        err?.responseData?.error ||
        err?.message ||
        'Something went wrong. Please try again.';
      setErrors({ submit: message });
      setSubmitting(false);
    }
  };

  if (loadingInvite) {
    return (
      <PublicLayout title="Accept invite - GoManagr">
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
            <p className="mt-4 text-white">Loading invite...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (inviteError || !inviteData) {
    return (
      <PublicLayout title="Invalid invite - GoManagr">
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white/10 backdrop-blur rounded-2xl p-8 text-center">
            <h1 className="text-xl font-semibold text-white mb-2">Invalid or expired invite</h1>
            <p className="text-white/80 mb-6">{inviteError || 'This invite link is no longer valid.'}</p>
            <a
              href="/login"
              className="inline-block px-6 py-2 rounded-lg bg-white/20 text-white hover:bg-white/30 transition"
            >
              Go to sign in
            </a>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout title="Set your password - GoManagr">
      <div className="min-h-screen flex flex-col items-center justify-center px-4 -mt-24">
          {inviteData.organizationLogoUrl && (
            <div className="flex justify-center mb-6">
              <img
                src={inviteData.organizationLogoUrl}
                alt={inviteData.organizationName}
                className="max-h-24 w-auto object-contain"
              />
            </div>
          )}
        <div className="max-w-lg w-full bg-white/10 backdrop-blur rounded-2xl p-8">
          <h1 className="text-3xl font-semibold text-center text-white mb-1">Join {inviteData.organizationName}</h1>
          <p className="text-white/80 text-center text-sm mb-6">
            Set a password to sign in. <br/>You’ll use your email as your login.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/90 mb-1">Email</label>
              <input
                type="email"
                value={inviteData.email}
                readOnly
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/90 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                placeholder="At least 6 characters"
                autoComplete="new-password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-300">{errors.password}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-white/90 mb-1">Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                placeholder="Confirm your password"
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-300">{errors.confirmPassword}</p>
              )}
            </div>
            {errors.submit && (
              <p className="text-sm text-red-300">{errors.submit}</p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Setting up…' : 'Set password and join'}
            </button>
          </form>
        </div>
      </div>
    </PublicLayout>
  );
}
