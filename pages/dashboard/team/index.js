import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount } from '@/services/userService';
import { getUserOrganization } from '@/services/organizationService';
import { supabase } from '@/lib/supabase';
import { persistTeam } from '@/lib/teamMemberSave';
import PersonCard from '@/components/dashboard/PersonCard';
import { PageHeader, TeamFilter, ConfirmationDialog, ConfirmDialog, EmptyState, InputField, Table } from '@/components/ui';
import { IconButton, PrimaryButton, SecondaryButton, DangerButton } from '@/components/ui/buttons';
import { useToast } from '@/components/ui/Toast';
import * as Dialog from '@radix-ui/react-dialog';
import { HiExclamationCircle, HiPlus, HiRefresh, HiTrash, HiX } from 'react-icons/hi';
import { isOwnerRole, isAdminRole, ORG_ROLE } from '@/config/rolePermissions';
import { sortTeamMembersPinned } from '@/lib/teamMemberSort';
import { getInviteAvailability } from '@/lib/teamInviteUtils';

const REALTIME_TEAM_EVENT = 'team-updated';
const REALTIME_USER_KICKED_EVENT = 'user-kicked';

function TeamContent() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const toast = useToast();
  const [userAccount, setUserAccount] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [team, setTeam] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [deactivateDialogConfirmWord, setDeactivateDialogConfirmWord] = useState('');
  const [filters, setFilters] = useState({
    roles: [],
    services: [],
    genders: [],
    personalityTraits: [],
  });
  const [showInactive, setShowInactive] = useState(false);
  const [organization, setOrganization] = useState(null);
  const [orgMembers, setOrgMembers] = useState([]);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteDialogMember, setInviteDialogMember] = useState(null);
  const [inviteDialogEmail, setInviteDialogEmail] = useState('');
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [memberToRevoke, setMemberToRevoke] = useState(null);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [orgMembersLoaded, setOrgMembersLoaded] = useState(false);
  const [pendingInvitesLoaded, setPendingInvitesLoaded] = useState(false);
  const [deactivatedPanelOpen, setDeactivatedPanelOpen] = useState(false);
  const [memberToReactivate, setMemberToReactivate] = useState(null);
  const [memberToPermanentlyDelete, setMemberToPermanentlyDelete] = useState(null);
  const [ownerTeamMembers, setOwnerTeamMembers] = useState([]);
  const [ownerUserId, setOwnerUserId] = useState(null);
  const channelRef = useRef(null);
  const refetchTeamDataRef = useRef(null);

  useEffect(() => {
    if (!currentUser?.uid) return;
    setLoaded(false);
    getUserAccount(currentUser.uid)
      .then((data) => {
        setUserAccount(data || null);
        if (!ownerUserId) {
          const list = data?.teamMembers ?? [];
          const filteredList = showInactive
            ? list
            : list.filter((m) => (m.status || 'active') !== 'inactive');
          setTeam(filteredList);
        }
      })
      .catch(() => {
        setTeam([]);
      })
      .finally(() => setLoaded(true));
  }, [currentUser?.uid, showInactive, ownerUserId]);

  const isAdminNonOwner = useMemo(
    () =>
      organization?.membership?.role != null &&
      isAdminRole(organization.membership.role) &&
      !isOwnerRole(organization.membership.role),
    [organization?.membership?.role]
  );

  useEffect(() => {
    if (!organization?.id || !currentUser?.uid || !isAdminNonOwner) return;
    setLoaded(false);
    fetch('/api/get-org-team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId: organization.id, callerUserId: currentUser.uid }),
    })
      .then((r) => r.json())
      .then((data) => {
        const list = data?.teamMembers ?? [];
        const ownerId = data?.ownerUserId ?? null;
        setOwnerTeamMembers(list);
        setOwnerUserId(ownerId);
        if (ownerId != null) {
          const filteredList = showInactive
            ? list
            : list.filter((m) => (m.status || 'active') !== 'inactive');
          setTeam(filteredList);
        }
      })
      .catch(() => {
        setOwnerTeamMembers([]);
        setOwnerUserId(null);
      })
      .finally(() => setLoaded(true));
  }, [organization?.id, currentUser?.uid, isAdminNonOwner, showInactive]);

  useEffect(() => {
    if (ownerUserId == null) return;
    const filteredList = showInactive
      ? ownerTeamMembers
      : ownerTeamMembers.filter((m) => (m.status || 'active') !== 'inactive');
    setTeam(filteredList);
  }, [ownerUserId, ownerTeamMembers, showInactive]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserOrganization(currentUser.uid).then((org) => setOrganization(org || null)).catch(() => setOrganization(null));
  }, [currentUser?.uid]);

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

  const refetchTeamData = useCallback(() => {
    if (!currentUser?.uid) return;
    if (isAdminNonOwner && organization?.id) {
      fetch('/api/get-org-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: organization.id, callerUserId: currentUser.uid }),
      })
        .then((r) => r.json())
        .then((data) => {
          const list = data?.teamMembers ?? [];
          const ownerId = data?.ownerUserId ?? null;
          setOwnerTeamMembers(list);
          setOwnerUserId(ownerId);
          const filteredList = showInactive
            ? list
            : list.filter((m) => (m.status || 'active') !== 'inactive');
          setTeam(filteredList);
        })
        .catch(() => {});
    } else {
      getUserAccount(currentUser.uid)
        .then((data) => {
          setUserAccount(data || null);
          const list = data?.teamMembers ?? [];
          const filteredList = showInactive
            ? list
            : list.filter((m) => (m.status || 'active') !== 'inactive');
          setTeam(filteredList);
        })
        .catch(() => {});
    }
    if (organization?.id && currentUser?.uid) {
      fetch('/api/get-org-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: organization.id, callerUserId: currentUser.uid }),
      })
        .then((r) => r.json())
        .then((data) => setOrgMembers(data?.members ?? []))
        .catch(() => {});
      fetch('/api/get-org-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: organization.id, callerUserId: currentUser.uid }),
      })
        .then((r) => r.json())
        .then((data) => setPendingInvites(data?.invites ?? []))
        .catch(() => {});
    }
  }, [currentUser?.uid, isAdminNonOwner, organization?.id, showInactive]);

  refetchTeamDataRef.current = refetchTeamData;

  useEffect(() => {
    const orgId = organization?.id;
    const uid = currentUser?.uid;
    if (!uid) return;
    const channelName = orgId ? `org:${orgId}` : `user:${uid}`;
    const channel = supabase.channel(channelName);
    channel
      .on('broadcast', { event: REALTIME_TEAM_EVENT }, () => {
        refetchTeamDataRef.current?.();
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [organization?.id, currentUser?.uid]);

  const broadcastTeamUpdated = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: REALTIME_TEAM_EVENT, payload: {} });
    }
  }, []);

  const broadcastUserKicked = useCallback((userId) => {
    if (userId && channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: REALTIME_USER_KICKED_EVENT, payload: { userId } });
    }
  }, []);

  const saveTeam = async (cleanedTeam) => {
    await persistTeam(cleanedTeam, {
      currentUserId: currentUser.uid,
      organization,
      ownerUserId,
      showInactive,
      setUserAccount,
      setOwnerTeamMembers,
      setTeam,
      broadcastTeamUpdated,
    });
  };

  const handleRemoveClick = (id) => {
    const member = team.find((m) => m.id === id);
    setMemberToDelete(member);
    setDeactivateDialogConfirmWord('');
    setDeleteDialogOpen(true);
  };

  const handleDeactivateConfirm = async () => {
    if (!memberToDelete || !currentUser?.uid) return;

    const memberEmail = (memberToDelete.email || '').toLowerCase().trim();
    const hasAccessByEmail = !!memberEmailToUserId[memberEmail];
    const hasAccessByUserId = !!(memberToDelete.userId && orgMemberUserIds.has(memberToDelete.userId));
    const hasAccess = hasAccessByEmail || hasAccessByUserId;
    const hasPendingInvite = memberEmail && (pendingInviteEmails.has(memberEmail) || !!memberToDelete.invitedAt);
    const shouldRevokeFirst = hasAccess || hasPendingInvite;

    if (shouldRevokeFirst) {
      const email = (memberToDelete.email || '').trim();
      if (!email) {
        toast.error('This team member has no email; cannot revoke access. Add an email first or revoke from the member edit screen.');
        return;
      }
      if (!organization?.id) {
        toast.error('Organization not loaded. Please try again.');
        return;
      }
    }

    setSaving(true);
    try {
      if (shouldRevokeFirst && organization?.id) {
        const email = (memberToDelete.email || '').trim();
        const revokeUserId = memberEmailToUserId[memberEmail] || (hasAccessByUserId ? memberToDelete.userId : null);
        const res = await fetch('/api/revoke-org-member', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            userId: revokeUserId || undefined,
            organizationId: organization.id,
            callerUserId: currentUser.uid,
            memberName: memberToDelete.name,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data.error || 'Failed to revoke access. Deactivation cancelled.');
          return;
        }
        const kickedUserId = data.userId ?? revokeUserId;
        if (kickedUserId) broadcastUserKicked(kickedUserId);
        toast.success('Access revoked. They have been signed out and can no longer access the org.');
        const emailNorm = email.toLowerCase().trim();
        setPendingInvites((prev) => (prev || []).filter((inv) => (inv.email || '').toLowerCase().trim() !== emailNorm));
        if (revokeUserId) {
          setOrgMembers((prev) => (prev || []).filter((om) => om.user_id !== revokeUserId));
        }
        fetch('/api/get-org-members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ organizationId: organization.id, callerUserId: currentUser.uid }),
        })
          .then((r) => r.json())
          .then((d) => setOrgMembers(d?.members ?? []))
          .catch(() => {});
        fetch('/api/get-org-invites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ organizationId: organization.id, callerUserId: currentUser.uid }),
        })
          .then((r) => r.json())
          .then((d) => setPendingInvites(d?.invites ?? []))
          .catch(() => {});
      }

      const allTeamMembers = ownerUserId ? ownerTeamMembers : (await getUserAccount(currentUser.uid))?.teamMembers || [];
      const updatedTeamMembers = allTeamMembers.map((m) =>
        m.id === memberToDelete.id ? { ...m, status: 'inactive' } : m
      );
      await saveTeam(updatedTeamMembers);

      setDeleteDialogOpen(false);
      setMemberToDelete(null);
      setDeactivateDialogConfirmWord('');
      toast.success(shouldRevokeFirst ? 'Member deactivated. They no longer have access to your org.' : 'Member deactivated.', 5000);
    } catch (err) {
      console.error('Failed to deactivate team member:', err);
      toast.error('Failed to deactivate team member. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCancel = () => {
    setDeleteDialogOpen(false);
    setMemberToDelete(null);
    setDeactivateDialogConfirmWord('');
  };

  const deactivateDialogConfirmed = deactivateDialogConfirmWord.trim().toUpperCase() === 'confirm';

  const handleDeleteFromDeactivateDialog = async () => {
    if (!memberToDelete || !currentUser?.uid) return;
    setSaving(true);
    try {
      const allTeamMembers = ownerUserId ? ownerTeamMembers : (await getUserAccount(currentUser.uid))?.teamMembers || [];
      const updatedTeamMembers = allTeamMembers.filter((m) => m.id !== memberToDelete.id);
      await saveTeam(updatedTeamMembers);
      setDeleteDialogOpen(false);
      setMemberToDelete(null);
      setDeactivateDialogConfirmWord('');
      toast.success('Member permanently deleted.', 5000);
    } catch (err) {
      console.error('Failed to permanently delete team member:', err);
      toast.error('Failed to delete. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const effectiveTeamMembers = ownerUserId ? ownerTeamMembers : (userAccount?.teamMembers ?? []);
  const deactivatedMembers = useMemo(() => {
    return effectiveTeamMembers.filter((m) => (m.status || 'active') === 'inactive');
  }, [effectiveTeamMembers]);

  const handleReactivateConfirm = async () => {
    if (!memberToReactivate || !currentUser?.uid) return;
    setSaving(true);
    try {
      const allTeamMembers = ownerUserId ? ownerTeamMembers : (await getUserAccount(currentUser.uid))?.teamMembers || [];
      const updatedTeamMembers = allTeamMembers.map((m) =>
        m.id === memberToReactivate.id ? { ...m, status: 'active' } : m
      );
      await saveTeam(updatedTeamMembers);
      setMemberToReactivate(null);
      setDeactivatedPanelOpen(false);
      toast.success(`${memberToReactivate.name} has been reactivated. They will appear on the team page and can be invited to join again.`);
    } catch (err) {
      console.error('Failed to reactivate team member:', err);
      toast.error('Failed to reactivate. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePermanentlyDeleteConfirm = async () => {
    if (!memberToPermanentlyDelete || !currentUser?.uid) return;
    setSaving(true);
    try {
      const allTeamMembers = ownerUserId ? ownerTeamMembers : (await getUserAccount(currentUser.uid))?.teamMembers || [];
      const updatedTeamMembers = allTeamMembers.filter((m) => m.id !== memberToPermanentlyDelete.id);
      await saveTeam(updatedTeamMembers);
      setMemberToPermanentlyDelete(null);
      setDeactivatedPanelOpen(false);
      toast.success('Member permanently deleted.');
    } catch (err) {
      console.error('Failed to permanently delete team member:', err);
      toast.error('Failed to delete. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const openInviteDialog = (member) => {
    setInviteDialogMember(member);
    setInviteDialogEmail((member?.email || '').trim());
    setInviteDialogOpen(true);
  };

  const closeInviteDialog = () => {
    setInviteDialogOpen(false);
    setInviteDialogMember(null);
    setInviteDialogEmail('');
  };

  const handleInviteFromDialog = async () => {
    const email = inviteDialogEmail.trim();
    if (!email) {
      toast.warning('Enter an email address to invite.');
      return;
    }
    if (!inviteDialogMember) return;
    await handleInviteToLogin({ ...inviteDialogMember, email });
    closeInviteDialog();
  };

  const openRevokeDialog = (member, userId) => {
    setMemberToRevoke({ member, userId });
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
      const revokedUserId = data.userId ?? memberToRevoke.userId;
      if (revokedUserId) broadcastUserKicked(revokedUserId);
      toast.success('Access revoked. They have been signed out and cannot use invite links or sign in again.');
      setRevokeDialogOpen(false);
      setMemberToRevoke(null);
      const emailNorm = email.toLowerCase().trim();

      setPendingInvites((prev) => (prev || []).filter((inv) => (inv.email || '').toLowerCase().trim() !== emailNorm));
      setOrgMembers((prev) => (prev || []).filter((om) => om.user_id !== revokedUserId));
      fetch('/api/get-org-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: organization.id, callerUserId: currentUser.uid }),
      })
        .then((r) => r.json())
        .then((data) => setOrgMembers(data?.members ?? []))
        .catch(() => {});
      fetch('/api/get-org-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: organization.id, callerUserId: currentUser.uid }),
      })
        .then((r) => r.json())
        .then((d) => setPendingInvites(d?.invites ?? []))
        .catch(() => {});

      const allTeamMembers = ownerUserId ? ownerTeamMembers : (await getUserAccount(currentUser.uid))?.teamMembers ?? [];
      const nextAllMembers = allTeamMembers.map((m) => {
        const em = (m.email || '').toLowerCase().trim();
        if (em !== emailNorm) return m;
        const { invitedAt, userId: _uid, ...rest } = m;
        return rest;
      });
      await saveTeam(nextAllMembers);
    } catch (err) {
      console.error('Revoke error:', err);
      toast.error('Failed to revoke access.');
    } finally {
      setSaving(false);
    }
  };

  const handleInviteToLogin = async (member) => {
    const email = (member?.email || '').trim();
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
            id: member.id,
            name: member.name,
            firstName: member.firstName,
            lastName: member.lastName,
            role: member.role,
            title: member.title,
            email: member.email,
            phone: member.phone,
            company: member.company,
            industry: member.industry,
            address: member.address,
            location: member.location,
            bio: member.bio,
            gender: member.gender,
            personalityTraits: member.personalityTraits,
            yearsExperience: member.yearsExperience,
            pictureUrl: member.pictureUrl,
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
          memberName: member.name,
          inviterName: userAccount?.firstName || userAccount?.name,
          inviterEmail: currentUser?.email,
        }),
      });
      const emailData = await emailRes.json();
      const updatedMember = { ...member, invitedAt: new Date().toISOString() };
      const allTeamMembers = ownerUserId ? ownerTeamMembers : (await getUserAccount(currentUser.uid))?.teamMembers ?? team;
      const nextAllMembers = allTeamMembers.map((m) => (m.id === member.id ? updatedMember : m));
      await saveTeam(nextAllMembers);
      if (emailData.sent) {
        toast.success(`Invite email sent to ${email}`);
      } else if (emailData.inviteLink) {
        try {
          await navigator.clipboard.writeText(emailData.inviteLink);
          toast.info('Invite link copied to clipboard. Paste it into an email or message and send it to the team member.');
        } catch {
          toast.info(`No email was sent. Copy this link and send it to ${email}: ${emailData.inviteLink}`);
        }
      }
    } catch (err) {
      console.error('Failed to invite:', err);
      toast.error('Failed to send invite. Please try again.');
    } finally {
      setSaving(false);
    }
  };

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

  const memberEmailToOrgRole = useMemo(() => {
    const map = {};
    (orgMembers || []).forEach((om) => {
      const email = (om.user?.email || '').toLowerCase().trim();
      if (email) map[email] = om.role;
    });
    return map;
  }, [orgMembers]);

  const memberUserIdToOrgRole = useMemo(() => {
    const map = {};
    (orgMembers || []).forEach((om) => {
      if (om.user_id) map[om.user_id] = om.role;
    });
    return map;
  }, [orgMembers]);

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

  const currentUserIsOwner = useMemo(() => {
    const role = organization?.membership?.role;
    const team = userAccount?.teamMembers || [];
    return isOwnerRole(role) || team.some((m) => m.id === `owner-${currentUser?.uid}`);
  }, [organization?.membership?.role, userAccount?.teamMembers, currentUser?.uid]);

  const orgAndInvitesLoaded = orgMembersLoaded && pendingInvitesLoaded;
  useEffect(() => {
    if (!currentUser?.uid || saving || !orgAndInvitesLoaded) return;
    const allTeamMembers = ownerUserId ? ownerTeamMembers : (userAccount?.teamMembers ?? []);
    if (allTeamMembers.length === 0) return;
    const toFix = allTeamMembers.filter((m) => {
      if (!m.invitedAt) return false;
      const em = (m.email || '').toLowerCase().trim();
      if (!em) return false;
      const hasAccess = !!memberEmailToUserId[em];
      const hasPending = pendingInviteEmails.has(em);
      return !hasAccess && !hasPending;
    });
    if (toFix.length === 0) return;
    const emailNorms = new Set(toFix.map((m) => (m.email || '').toLowerCase().trim()));
    const nextAllMembers = allTeamMembers.map((m) => {
      const em = (m.email || '').toLowerCase().trim();
      if (!emailNorms.has(em)) return m;
      const { invitedAt, userId: _uid, ...rest } = m;
      return rest;
    });
    saveTeam(nextAllMembers).catch((err) => console.error('[team] sync revoked members', err));
  }, [currentUser?.uid, userAccount?.teamMembers, ownerUserId, ownerTeamMembers, orgMembers, pendingInvites, saving, orgAndInvitesLoaded]);

  const filteredTeam = useMemo(() => {
    return team.filter((member) => {
      if (filters.roles.length > 0 && !filters.roles.includes(member.role)) {
        return false;
      }

      if (filters.services.length > 0) {
        const userServices = userAccount?.services || [];
        const memberServiceNames = userServices
          .filter(service => 
            service.assignedTeamMemberIds && 
            Array.isArray(service.assignedTeamMemberIds) &&
            service.assignedTeamMemberIds.includes(member.id)
          )
          .map(service => service.name)
          .filter(Boolean);
        const legacyMemberServices = member.services || [];
        const allMemberServices = [...new Set([...memberServiceNames, ...legacyMemberServices])];
        
        const hasMatchingService = filters.services.some((service) =>
          allMemberServices.includes(service)
        );
        if (!hasMatchingService) {
          return false;
        }
      }

      if (filters.genders.length > 0 && !filters.genders.includes(member.gender)) {
        return false;
      }

      if (filters.personalityTraits.length > 0) {
        const memberTraits = member.personalityTraits || [];
        const hasMatchingTrait = filters.personalityTraits.some((trait) =>
          memberTraits.includes(trait)
        );
        if (!hasMatchingTrait) {
          return false;
        }
      }

      return true;
    });
  }, [team, filters, userAccount?.services]);

  return (
    <>
      <Head>
        <title>Team - GoManagr</title>
        <meta name="description" content="Manage your team" />
      </Head>

      <div className="space-y-6">
        <PageHeader
          title="Team"
          description="Manage your team members. Changes sync to Today's appointments."
          actions={
            <>
              {currentUserIsOrgAdmin && (
                <SecondaryButton
                  type="button"
                  onClick={() => setDeactivatedPanelOpen((prev) => !prev)}
                  className="gap-2"
                  aria-expanded={deactivatedPanelOpen}
                  data-testid="deactivated-members-button"
                >
                  Deactivated Members
                  {deactivatedMembers.length > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-xs font-medium rounded-full">
                      {deactivatedMembers.length}
                    </span>
                  )}
                </SecondaryButton>
              )}
              <Link href="/dashboard/team/new">
                <PrimaryButton type="button" className="gap-2">
                  <HiPlus className="w-5 h-5" />
                  Add member
                </PrimaryButton>
              </Link>
              {saving && <span className="text-sm text-gray-500">Saving…</span>}
            </>
          }
        />

        {!loaded ? (
          <p className="text-gray-500">Loading…</p>
        ) : (
          <>
            {deactivatedPanelOpen && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden" data-testid="deactivated-members-panel">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Deactivated members</h2>
                  <button
                    type="button"
                    onClick={() => setDeactivatedPanelOpen(false)}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                    aria-label="Close"
                  >
                    <HiX className="w-5 h-5" />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  {deactivatedMembers.length === 0 ? (
                    <p className="px-4 py-8 text-gray-500 dark:text-gray-400 text-center" data-testid="deactivated-members-empty">No deactivated members.</p>
                  ) : (
                    <Table
                      ariaLabel="Deactivated members"
                      data-testid="deactivated-members-table"
                      columns={[
                        { key: 'name', label: 'Name' },
                        { key: 'email', label: 'Email' },
                        { key: 'role', label: 'Role' },
                        {
                          key: 'actions',
                          label: 'Actions',
                          align: 'center',
                          compact: true,
                          render: (member) => (
                            <div className="flex items-center justify-center gap-1">
                              <IconButton
                                variant="primary"
                                onClick={() => setMemberToReactivate(member)}
                                disabled={saving}
                                aria-label="Reactivate"
                                title="Reactivate"
                              >
                                <HiRefresh className="w-5 h-5" />
                              </IconButton>
                              <IconButton
                                variant="danger"
                                onClick={() => setMemberToPermanentlyDelete(member)}
                                disabled={saving}
                                aria-label="Delete forever"
                                title="Delete forever"
                              >
                                <HiTrash className="w-5 h-5" />
                              </IconButton>
                            </div>
                          ),
                        },
                      ]}
                      data={deactivatedMembers}
                      getRowKey={(m) => m.id}
                    />
                  )}
                </div>
              </div>
            )}

            <ConfirmDialog
              isOpen={!!memberToReactivate}
              onClose={() => setMemberToReactivate(null)}
              onConfirm={handleReactivateConfirm}
              title="Reactivate member"
              message={
                memberToReactivate
                  ? `${memberToReactivate.name} will be reactivated. They will appear back on the team page and can be invited to join again.`
                  : ''
              }
              confirmText="Reactivate"
              cancelText="Cancel"
              variant="info"
              loading={saving}
            />

            <ConfirmationDialog
              isOpen={!!memberToPermanentlyDelete}
              onClose={() => setMemberToPermanentlyDelete(null)}
              onConfirm={handlePermanentlyDeleteConfirm}
              title="Permanently delete member"
              message={
                memberToPermanentlyDelete
                  ? `This member will be fully deleted forever. This cannot be undone. Their record will be removed from the team.`
                  : ''
              }
              confirmText="Delete forever"
              cancelText="Cancel"
              confirmationWord="delete"
              confirmationLabel="Type delete to confirm"
              variant="danger"
            />

            <Dialog.Root open={deleteDialogOpen} onOpenChange={(open) => !open && handleRemoveCancel()}>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200]" />
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-[201] w-full max-w-lg p-0 focus:outline-none overflow-hidden border border-gray-100 dark:border-gray-700">
                  <div className="px-6 pt-6 pb-5 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center">
                        <HiExclamationCircle className="size-10 text-amber-600 dark:text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Dialog.Title className="text-2xl font-bold leading-tight text-amber-800 dark:text-amber-200">
                          Deactivate member
                        </Dialog.Title>
                      </div>
                      <Dialog.Close asChild>
                        <button type="button" className="flex-shrink-0 p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-700/60 transition-all" aria-label="Close" disabled={saving}>
                          <HiX className="w-5 h-5" />
                        </button>
                      </Dialog.Close>
                    </div>
                  </div>
                  <div className="px-6 py-6 bg-white dark:bg-gray-800">
                    <Dialog.Description className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                    {memberToDelete
                      ? `${memberToDelete.name} will be deactivated. They will be hidden from the team page. You can reactivate or permanently delete them later from Deactivated Members.`
                      : ''}
                  </Dialog.Description>
                  <div className="mb-6">
                    <InputField
                      id="deactivate-dialog-confirm"
                      label="Type CONFIRM to enable Deactivate or Delete forever"
                      type="text"
                      value={deactivateDialogConfirmWord}
                      onChange={(e) => setDeactivateDialogConfirmWord(e.target.value)}
                      placeholder="CONFIRM"
                      disabled={saving}
                      variant="light"
                      autoComplete="off"
                      inputProps={{ autoCapitalize: 'off', 'data-testid': 'deactivate-dialog-confirm-input' }}
                    />
                  </div>
                    <div className="flex justify-between items-center gap-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                      <DangerButton
                        type="button"
                        onClick={handleDeleteFromDeactivateDialog}
                        disabled={saving || !deactivateDialogConfirmed}
                        className="flex-shrink-0"
                      >
                        {saving ? 'Processing...' : 'Delete forever'}
                      </DangerButton>
                      <div className="flex gap-3 ml-auto">
                        <SecondaryButton type="button" onClick={handleRemoveCancel} disabled={saving}>
                          Cancel
                        </SecondaryButton>
                        <PrimaryButton
                          type="button"
                          onClick={handleDeactivateConfirm}
                          disabled={saving || !deactivateDialogConfirmed}
                          className="bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600"
                        >
                          {saving ? 'Processing...' : 'Deactivate'}
                        </PrimaryButton>
                      </div>
                    </div>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>

            <Dialog.Root open={inviteDialogOpen} onOpenChange={(open) => !open && closeInviteDialog()}>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200]" />
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-[201] w-full max-w-md p-6 focus:outline-none border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-white">
                      Invite to join
                    </Dialog.Title>
                    <Dialog.Close asChild>
                      <button type="button" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Close">
                        <HiX className="w-5 h-5" />
                      </button>
                    </Dialog.Close>
                  </div>
                  <Dialog.Description className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {inviteDialogMember?.name ? `Send an invite to ${inviteDialogMember.name}.` : 'Enter the email address to send an invite.'}
                  </Dialog.Description>
                  <InputField
                    id="invite-email"
                    label="Email"
                    type="email"
                    value={inviteDialogEmail}
                    onChange={(e) => setInviteDialogEmail(e.target.value)}
                    placeholder="email@example.com"
                    variant="light"
                  />
                  <div className="flex gap-3 mt-6 justify-end">
                    <SecondaryButton type="button" onClick={closeInviteDialog}>
                      Cancel
                    </SecondaryButton>
                    <PrimaryButton type="button" onClick={handleInviteFromDialog} disabled={saving}>
                      {saving ? 'Sending…' : 'Invite to join'}
                    </PrimaryButton>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>

            <ConfirmationDialog
              isOpen={revokeDialogOpen}
              onClose={() => { setRevokeDialogOpen(false); setMemberToRevoke(null); }}
              onConfirm={handleRevokeConfirm}
              title="Revoke access"
              message={memberToRevoke?.member ? `Revoke access for ${memberToRevoke.member.name}? They will be removed from the organization, signed out, and will no longer be able to sign in or use any invite link. An email will be sent to them.` : 'Revoke this member\'s access? They will not be able to sign in or use invite links. An email will be sent to them.'}
              confirmText="Revoke access"
              cancelText="Cancel"
              confirmationWord="REVOKE"
              confirmationLabel="Type REVOKE to confirm"
              variant="danger"
            />

            <TeamFilter
              teamMembers={team}
              filters={filters}
              onFiltersChange={setFilters}
            />

            {team.length === 0 ? (
              <EmptyState
                type="team"
                action={
                  <Link href="/dashboard/team/new">
                    <PrimaryButton type="button" className="gap-2">
                      <HiPlus className="w-5 h-5" />
                      Add your first team member
                    </PrimaryButton>
                  </Link>
                }
              />
            ) : filteredTeam.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="flex flex-col items-center justify-center py-12 px-6">
                  <p className="text-gray-500 text-lg">No team members match the selected filters</p>
                  <p className="text-gray-400 text-sm mt-2">Try adjusting your filter criteria</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sortTeamMembersPinned(filteredTeam).map((member) => {
                  const memberEmail = (member.email || '').toLowerCase().trim();
                  const hasAccessByEmail = !!memberEmailToUserId[memberEmail];
                  const hasAccessByUserId = !!(member.userId && orgMemberUserIds.has(member.userId));
                  const hasAccess = hasAccessByEmail || hasAccessByUserId;
                  const revokeUserId = memberEmailToUserId[memberEmail] || (hasAccessByUserId ? member.userId : null);
                  const hasPendingInvite = memberEmail && (pendingInviteEmails.has(memberEmail) || !!member.invitedAt);
                  const isCurrentUser = currentUser?.email && (currentUser.email.toLowerCase().trim() === memberEmail);
                  const { showInvite, showRevoke } = getInviteAvailability(member, {
                    hasAccess,
                    hasPendingInvite,
                    isCurrentUser,
                    currentUserIsOrgAdmin,
                  });
                  const orgRole =
                    memberUserIdToOrgRole[member.userId] ?? memberEmailToOrgRole[memberEmail];
                  const isSuperAdmin = orgRole === ORG_ROLE.SUPERADMIN;
                  const isAdmin = isSuperAdmin || orgRole === ORG_ROLE.ADMIN || orgRole === ORG_ROLE.DEVELOPER;
                  const subtitle =
                    orgRole === ORG_ROLE.SUPERADMIN
                      ? 'Super Admin'
                      : orgRole === ORG_ROLE.ADMIN
                      ? 'Admin'
                      : orgRole === ORG_ROLE.DEVELOPER
                      ? 'Developer'
                      : member.role || '—';
                  return (
                    <PersonCard
                      key={member.id}
                      name={member.name}
                      subtitle={subtitle}
                      src={member.pictureUrl}
                      onClick={() => router.push(`/dashboard/team/${member.id}/edit`)}
                      onRemove={() => handleRemoveClick(member.id)}
                      onInvite={showInvite ? () => openInviteDialog(member) : undefined}
                      onRevoke={showRevoke ? () => openRevokeDialog(member, revokeUserId || null) : undefined}
                      isAdmin={isAdmin}
                      isSuperAdmin={isSuperAdmin}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

export default function TeamPage() {
  return (
    <TeamContent />
  );
}
