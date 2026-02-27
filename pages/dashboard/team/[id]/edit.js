import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useUserAccount } from '@/lib/UserAccountContext';
import { getUserAccount, updateServices, uploadTeamPhoto } from '@/services/userService';
import { getUserOrganization } from '@/services/organizationService';
import { persistTeam, generateId } from '@/lib/teamMemberSave';
import AddTeamMemberForm from '@/components/dashboard/AddTeamMemberForm';
import { PageHeader, ConfirmationDialog } from '@/components/ui';
import { SecondaryButton } from '@/components/ui/buttons';
import { useToast } from '@/components/ui/Toast';
import { isOwnerRole, isAdminRole, ORG_ROLE } from '@/config/rolePermissions';
import { getInviteAvailability } from '@/lib/teamInviteUtils';
import Link from 'next/link';
import { HiArrowLeft } from 'react-icons/hi';

function removeUndefined(obj) {
  const cleaned = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) cleaned[key] = obj[key];
  });
  return cleaned;
}

export default function EditTeamMemberPage() {
  const router = useRouter();
  const { id } = router.query;
  const { currentUser } = useAuth();
  const { account: userAccount, setAccount, refetch: refetchAccount } = useUserAccount();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [organization, setOrganization] = useState(null);
  const [ownerUserId, setOwnerUserId] = useState(null);
  const [ownerTeamMembers, setOwnerTeamMembers] = useState([]);
  const [orgTeamLoaded, setOrgTeamLoaded] = useState(false);
  const [orgMembers, setOrgMembers] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [orgMembersLoaded, setOrgMembersLoaded] = useState(false);
  const [pendingInvitesLoaded, setPendingInvitesLoaded] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [memberToRevoke, setMemberToRevoke] = useState(null);

  const isAdminNonOwner = useMemo(
    () =>
      organization?.membership?.role != null &&
      isAdminRole(organization.membership.role) &&
      !isOwnerRole(organization.membership.role),
    [organization?.membership?.role]
  );

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserOrganization(currentUser.uid).then((org) => setOrganization(org || null)).catch(() => setOrganization(null));
  }, [currentUser?.uid]);

  // Refetch account when opening this page so services/team are up to date (e.g. after deleting a service elsewhere).
  useEffect(() => {
    if (router.isReady && id && currentUser?.uid) {
      refetchAccount();
    }
  }, [router.isReady, id, currentUser?.uid, refetchAccount]);

  useEffect(() => {
    if (!organization?.id || !currentUser?.uid || !isAdminNonOwner) {
      setOrgTeamLoaded(true);
      return;
    }
    setOrgTeamLoaded(false);
    fetch('/api/get-org-team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId: organization.id, callerUserId: currentUser.uid }),
    })
      .then((r) => r.json())
      .then((data) => {
        setOwnerTeamMembers(data?.teamMembers ?? []);
        setOwnerUserId(data?.ownerUserId ?? null);
      })
      .catch(() => {
        setOwnerTeamMembers([]);
        setOwnerUserId(null);
      })
      .finally(() => setOrgTeamLoaded(true));
  }, [organization?.id, currentUser?.uid, isAdminNonOwner]);

  useEffect(() => {
    if (!organization?.id || !currentUser?.uid) return;
    setOrgMembersLoaded(false);
    fetch('/api/get-org-members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId: organization.id, callerUserId: currentUser.uid }),
    })
      .then((r) => r.json())
      .then((data) => setOrgMembers(data?.members ?? []))
      .catch(() => setOrgMembers([]))
      .finally(() => setOrgMembersLoaded(true));
  }, [organization?.id, currentUser?.uid]);

  useEffect(() => {
    if (!organization?.id || !currentUser?.uid) return;
    setPendingInvitesLoaded(false);
    fetch('/api/get-org-invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId: organization.id, callerUserId: currentUser.uid }),
    })
      .then((r) => r.json())
      .then((data) => setPendingInvites(data?.invites ?? []))
      .catch(() => setPendingInvites([]))
      .finally(() => setPendingInvitesLoaded(true));
  }, [organization?.id, currentUser?.uid]);

  const team = ownerUserId ? ownerTeamMembers : (userAccount?.teamMembers ?? []);
  const member = useMemo(() => (id ? team.find((m) => m.id === id) : null), [id, team]);

  const memberEmailToUserId = useMemo(() => {
    const map = {};
    (orgMembers || []).forEach((om) => {
      if (om.user_id === currentUser?.uid) return;
      if (isOwnerRole(om.role) || om.role === ORG_ROLE.ADMIN) return;
      const email = (om.user?.email || '').toLowerCase().trim();
      if (email) map[email] = om.user_id;
    });
    return map;
  }, [orgMembers, currentUser?.uid]);

  const orgMemberUserIds = useMemo(() => {
    const set = new Set();
    (orgMembers || []).forEach((om) => {
      if (om.user_id === currentUser?.uid) return;
      if (isOwnerRole(om.role) || om.role === ORG_ROLE.ADMIN) return;
      set.add(om.user_id);
    });
    return set;
  }, [orgMembers, currentUser?.uid]);

  const pendingInviteEmails = useMemo(() => {
    const set = new Set();
    (pendingInvites || []).forEach((inv) => {
      const e = (inv.email || '').toLowerCase().trim();
      if (e) set.add(e);
    });
    return set;
  }, [pendingInvites]);

  const currentUserIsOrgAdmin = useMemo(
    () => isAdminRole(organization?.membership?.role),
    [organization?.membership?.role]
  );

  const currentUserIsOwner = useMemo(
    () => isOwnerRole(organization?.membership?.role) || team.some((m) => m.id === `owner-${currentUser?.uid}`),
    [organization?.membership?.role, team, currentUser?.uid]
  );

  const pageInviteRevoke = useMemo(() => {
    if (!member) return { showInvite: false, showRevoke: false, revokeUserId: null };
    const memberEmail = (member.email || '').toLowerCase().trim();
    const hasAccessByEmail = !!memberEmailToUserId[memberEmail];
    const hasAccessByUserId = !!(member.userId && orgMemberUserIds.has(member.userId));
    const hasAccess = hasAccessByEmail || hasAccessByUserId;
    const hasPendingInvite = memberEmail && (pendingInviteEmails.has(memberEmail) || !!member.invitedAt);
    const isCurrentUser = currentUser?.email && currentUser.email.toLowerCase().trim() === memberEmail;
    const { showInvite, showRevoke } = getInviteAvailability(member, {
      hasAccess,
      hasPendingInvite,
      isCurrentUser,
      currentUserIsOrgAdmin,
    });
    const revokeUserId = memberEmailToUserId[memberEmail] || (hasAccessByUserId ? member.userId : null);
    return { showInvite, showRevoke, revokeUserId };
  }, [member, memberEmailToUserId, orgMemberUserIds, pendingInviteEmails, currentUser?.email, currentUserIsOrgAdmin]);

  const handleInviteToLogin = async (memberToInvite) => {
    const email = (memberToInvite?.email || '').trim();
    if (!email) {
      toast.warning('This team member has no email. Add an email in the form and save, then invite.');
      return;
    }
    if (!organization?.id || !currentUser?.uid) {
      toast.error('Unable to send invite. Please try again.');
      return;
    }
    setSaving(true);
    try {
      const invRes = await fetch('/api/create-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization.id,
          email,
          role: 'member',
          invitedByUserId: currentUser.uid,
          inviteeData: {
            id: memberToInvite.id,
            name: memberToInvite.name,
            firstName: memberToInvite.firstName,
            lastName: memberToInvite.lastName,
            role: memberToInvite.role,
            title: memberToInvite.title,
            email: memberToInvite.email,
            phone: memberToInvite.phone,
            company: memberToInvite.company,
            industry: memberToInvite.industry,
            address: memberToInvite.address,
            location: memberToInvite.location,
            bio: memberToInvite.bio,
            gender: memberToInvite.gender,
            personalityTraits: memberToInvite.personalityTraits,
            yearsExperience: memberToInvite.yearsExperience,
            pictureUrl: memberToInvite.pictureUrl,
          },
        }),
      });
      const invData = await invRes.json();
      if (!invRes.ok || !invData.inviteLink) {
        toast.error(invData.error || invData.message || 'Failed to create invite.');
        return;
      }
      const emailRes = await fetch('/api/send-invite-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          inviteLink: invData.inviteLink,
          memberName: memberToInvite.name,
          inviterName: userAccount?.firstName || userAccount?.name,
          inviterEmail: currentUser?.email,
        }),
      });
      const emailData = await emailRes.json();
      const updatedMember = { ...memberToInvite, invitedAt: new Date().toISOString() };
      const allTeamMembers = ownerUserId ? ownerTeamMembers : (await getUserAccount(currentUser.uid))?.teamMembers || team;
      const nextAllMembers = allTeamMembers.map((m) => (m.id === memberToInvite.id ? updatedMember : m));
      await persistTeam(nextAllMembers, {
        currentUserId: currentUser.uid,
        organization,
        ownerUserId,
        setUserAccount: setAccount,
      });
      if (emailData.sent) {
        toast.success(`Invite email sent to ${email}`);
      } else if (emailData.inviteLink) {
        try {
          await navigator.clipboard.writeText(emailData.inviteLink);
          toast.info('Invite link copied to clipboard.');
        } catch {
          toast.info(`No email was sent. Copy this link and send it to ${email}: ${emailData.inviteLink}`);
        }
      }
      router.replace(router.asPath);
    } catch (err) {
      console.error('Failed to invite:', err);
      toast.error('Failed to send invite. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const openRevokeDialog = () => {
    setMemberToRevoke({ member, userId: pageInviteRevoke.revokeUserId });
    setRevokeDialogOpen(true);
  };

  const handleRevokeConfirm = async () => {
    if (!memberToRevoke?.member || !organization?.id || !currentUser?.uid) return;
    const email = (memberToRevoke.member.email || '').trim();
    if (!email) {
      toast.error('This team member has no email; cannot revoke.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/revoke-org-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          userId: memberToRevoke.userId || undefined,
          organizationId: organization.id,
          callerUserId: currentUser.uid,
          memberName: memberToRevoke.member.name,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Failed to revoke access.');
        return;
      }
      const allTeamMembers = ownerUserId ? ownerTeamMembers : (await getUserAccount(currentUser.uid))?.teamMembers || team;
      const emailNorm = email.toLowerCase().trim();
      const nextAllMembers = allTeamMembers.map((m) => {
        const em = (m.email || '').toLowerCase().trim();
        if (em !== emailNorm) return m;
        const { invitedAt, userId: _uid, ...rest } = m;
        return rest;
      });
      await persistTeam(nextAllMembers, {
        currentUserId: currentUser.uid,
        organization,
        ownerUserId,
        setUserAccount: setAccount,
      });
      toast.success('Access revoked.');
      setRevokeDialogOpen(false);
      setMemberToRevoke(null);
      router.replace(router.asPath);
    } catch (err) {
      console.error('Revoke error:', err);
      toast.error('Failed to revoke access.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMember = async (data, pictureFile, editingId) => {
    setSaving(true);
    try {
      await handleSaveMemberImpl(data, pictureFile, editingId);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMemberImpl = async (data, pictureFile, editingId) => {
    const isEdit = !!editingId;
    const memberId = isEdit ? editingId : generateId();

    let allTeamMembers = team;
    if (currentUser?.uid && !ownerUserId) {
      try {
        const account = await getUserAccount(currentUser.uid);
        allTeamMembers = account?.teamMembers ?? team;
      } catch (err) {
        console.error('Failed to fetch all team members:', err);
      }
    }

    let pictureUrl = isEdit ? allTeamMembers.find((m) => m.id === editingId)?.pictureUrl ?? '' : '';
    if (pictureFile && currentUser?.uid) {
      try {
        pictureUrl = await uploadTeamPhoto(currentUser.uid, memberId, pictureFile);
      } catch (err) {
        console.error('Failed to upload team photo:', err);
      }
    }

    const existingMember = isEdit ? allTeamMembers.find((m) => m.id === editingId) : null;
    const isAdmin = isEdit ? (data.isAdmin !== undefined ? data.isAdmin : (existingMember?.isAdmin ?? false)) : false;
    const isOwnerMember = isEdit ? (existingMember?.isOwner ?? false) : false;
    const memberEmailNorm = (data.email || existingMember?.email || '').trim().toLowerCase();
    const resolvedUserId = existingMember?.userId || (memberEmailNorm ? memberEmailToUserId[memberEmailNorm] : null);

    const updatedMember = removeUndefined({
      id: memberId,
      name: data.name,
      role: data.role || '',
      firstName: data.firstName,
      lastName: data.lastName,
      title: data.title,
      location: data.location && data.location !== null ? (typeof data.location === 'object' ? data.location : data.location) : undefined,
      services: data.services?.length ? data.services : undefined,
      phone: data.phone,
      email: data.email,
      address: data.address && typeof data.address === 'object' ? data.address : undefined,
      bio: data.bio,
      gender: data.gender,
      personalityTraits: data.personalityTraits?.length ? data.personalityTraits : undefined,
      yearsExperience: data.yearsExperience,
      pictureUrl: pictureUrl || undefined,
      status: isEdit ? (existingMember?.status || 'active') : 'active',
      isAdmin,
      isOwner: isOwnerMember,
      ...(isEdit && existingMember?.invitedAt && { invitedAt: existingMember.invitedAt }),
      ...(isEdit && (existingMember?.userId || resolvedUserId) && { userId: existingMember?.userId || resolvedUserId }),
    });

    let finalMember = updatedMember;
    if (data.sendInviteToLogin && (data.email || '').trim() && organization?.id && currentUser?.uid) {
      try {
        const invRes = await fetch('/api/create-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId: organization.id,
            email: (data.email || '').trim(),
            role: 'member',
            invitedByUserId: currentUser.uid,
            inviteeData: {
              id: updatedMember.id,
              name: updatedMember.name,
              firstName: updatedMember.firstName,
              lastName: updatedMember.lastName,
              role: updatedMember.role,
              title: updatedMember.title,
              email: (data.email || '').trim(),
              phone: updatedMember.phone,
              company: updatedMember.company,
              industry: updatedMember.industry,
              address: updatedMember.address,
              location: updatedMember.location,
              bio: updatedMember.bio,
              gender: updatedMember.gender,
              personalityTraits: updatedMember.personalityTraits,
              yearsExperience: updatedMember.yearsExperience,
              pictureUrl: updatedMember.pictureUrl,
            },
          }),
        });
        const invData = await invRes.json();
        if (invRes.ok && invData.inviteLink) {
          const emailRes = await fetch('/api/send-invite-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: (data.email || '').trim(),
              inviteLink: invData.inviteLink,
              memberName: data.name,
              inviterName: userAccount?.firstName || userAccount?.name,
              inviterEmail: currentUser?.email,
            }),
          });
          const emailData = await emailRes.json();
          finalMember = { ...updatedMember, invitedAt: new Date().toISOString() };
          if (emailData.sent) toast.success(`Invite email sent to ${(data.email || '').trim()}`);
          else if (emailData.inviteLink) {
            try {
              await navigator.clipboard.writeText(emailData.inviteLink);
              toast.info('Invite link copied to clipboard.');
            } catch {
              toast.info(`No email was sent. Copy this link and send it to ${(data.email || '').trim()}: ${emailData.inviteLink}`);
            }
          }
        }
      } catch (err) {
        console.error('Failed to create/send invite:', err);
        toast.warning('Member saved, but the invite could not be sent. You can invite them later from this page.');
      }
    }

    const nextAllMembers = isEdit ? allTeamMembers.map((m) => (m.id === editingId ? finalMember : m)) : [...allTeamMembers, finalMember];
    await persistTeam(nextAllMembers, {
      currentUserId: currentUser.uid,
      organization,
      ownerUserId,
      setUserAccount: setAccount,
    });

    const memberEmail = (finalMember.email || '').trim();
    if (memberEmail && organization?.id && currentUser?.uid) {
      fetch('/api/sync-team-member-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization.id,
          callerUserId: currentUser.uid,
          email: memberEmail,
          teamMemberData: {
            name: finalMember.name,
            firstName: finalMember.firstName,
            lastName: finalMember.lastName,
            role: finalMember.role,
            title: finalMember.title,
            phone: finalMember.phone,
            company: finalMember.company,
            industry: finalMember.industry,
            address: finalMember.address,
            location: finalMember.location,
            bio: finalMember.bio,
            gender: finalMember.gender,
            personalityTraits: finalMember.personalityTraits,
            yearsExperience: finalMember.yearsExperience,
            pictureUrl: finalMember.pictureUrl,
          },
        }),
      }).catch((err) => console.error('Failed to sync team member profile:', err));
    }

    if (data.isAdmin !== undefined && organization?.id && currentUser?.uid && finalMember.userId) {
      fetch('/api/update-org-member-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization.id,
          callerUserId: currentUser.uid,
          targetUserId: finalMember.userId,
          role: finalMember.isAdmin ? 'admin' : 'member',
        }),
      }).catch((err) => console.error('Failed to sync org role:', err));
    }

    const hasServiceSelection = data.selectedServiceIds !== undefined && Array.isArray(data.selectedServiceIds);
    const pendingServices = Array.isArray(data.pendingServices) ? data.pendingServices : [];
    const servicesForAssignment =
      pendingServices.length > 0
        ? [...(userAccount?.services || []), ...pendingServices]
        : userAccount?.services;
    if (hasServiceSelection && (servicesForAssignment?.length ?? 0) > 0 && currentUser?.uid) {
      const currentServices = [...(servicesForAssignment || [])];
      const selectedServiceIds = data.selectedServiceIds;
      const updatedServices = currentServices.map((service) => {
        const shouldBeAssigned = selectedServiceIds.includes(service.id);
        let assignedIds = [...(service.assignedTeamMemberIds || [])];
        if (shouldBeAssigned && !assignedIds.includes(memberId)) assignedIds.push(memberId);
        else if (!shouldBeAssigned && assignedIds.includes(memberId)) assignedIds = assignedIds.filter((id) => id !== memberId);
        return { ...service, assignedTeamMemberIds: assignedIds };
      });
      await updateServices(currentUser.uid, updatedServices);
      setAccount((prev) => (prev ? { ...prev, services: updatedServices } : null));
    }

    toast.success('Member saved.');
    router.push('/dashboard/team');
  };

  const handleCancel = () => {
    router.push('/dashboard/team');
  };

  const dataReady =
    (userAccount != null || (isAdminNonOwner && orgTeamLoaded)) &&
    (orgMembersLoaded || !organization?.id) &&
    (pendingInvitesLoaded || !organization?.id);

  if (router.isReady && id && dataReady && !member) {
    return (
      <>
        <Head><title>Team member not found - GoManagr</title></Head>
        <p className="text-gray-500">Team member not found.</p>
        <Link href="/dashboard/team">
          <SecondaryButton type="button" className="mt-4">Back to team</SecondaryButton>
        </Link>
      </>
    );
  }

  if (!dataReady || !member) {
    return (
      <>
        <Head><title>Edit team member - GoManagr</title></Head>
        <p className="text-gray-500">Loading…</p>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Edit {member.name} - GoManagr</title>
        <meta name="description" content={`Edit ${member.name}`} />
      </Head>
      <div className="space-y-6">
        <PageHeader
          title={`Edit ${member.name}`}
          description="Update this team member's details."
          actions={
            <Link href="/dashboard/team">
              <SecondaryButton type="button" className="gap-2">
                <HiArrowLeft className="w-5 h-5" />
                Back to team
              </SecondaryButton>
            </Link>
          }
        />
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <AddTeamMemberForm
            initialMember={member}
            onSubmit={handleSaveMember}
            onCancel={handleCancel}
            saving={saving}
            locations={userAccount?.locations || []}
            organizationCountry={userAccount?.organizationCountry || ''}
            services={userAccount?.services || []}
            teamMembers={team}
            onInviteToLogin={handleInviteToLogin}
            canPromoteToAdmin={currentUserIsOwner}
            showInviteInDrawer={pageInviteRevoke.showInvite}
            showRevokeInDrawer={pageInviteRevoke.showRevoke}
            onRevokeAccess={pageInviteRevoke.showRevoke ? openRevokeDialog : undefined}
            onServiceCreated={async (updatedServices) => {
              if (currentUser?.uid) {
                await updateServices(currentUser.uid, updatedServices);
                setAccount((prev) => (prev ? { ...prev, services: updatedServices } : null));
              }
            }}
          />
        </div>
      </div>

      <ConfirmationDialog
        isOpen={revokeDialogOpen}
        onClose={() => { setRevokeDialogOpen(false); setMemberToRevoke(null); }}
        onConfirm={handleRevokeConfirm}
        title="Revoke access"
        message={
          memberToRevoke?.member
            ? `${memberToRevoke.member.name} will be removed from the organization and will no longer be able to sign in or use invite links. This cannot be undone.`
            : ''
        }
        confirmText="Revoke access"
        cancelText="Cancel"
        confirmationWord="REVOKE"
        confirmationLabel="Type REVOKE to confirm"
        variant="danger"
      />
    </>
  );
}
