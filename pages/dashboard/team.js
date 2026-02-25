import Head from 'next/head';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount, updateTeamMembers, updateServices, uploadTeamPhoto } from '@/services/userService';
import { getUserOrganization } from '@/services/organizationService';
import { supabase } from '@/lib/supabase';
import PersonCard from '@/components/dashboard/PersonCard';
import AddTeamMemberForm from '@/components/dashboard/AddTeamMemberForm';
import { PageHeader, TeamFilter, ConfirmationDialog, ConfirmDialog, EmptyState, InputField, Table } from '@/components/ui';
import Drawer from '@/components/ui/Drawer';
import { IconButton, PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import { useToast } from '@/components/ui/Toast';
import * as Dialog from '@radix-ui/react-dialog';
import { HiPlus, HiRefresh, HiTrash, HiX } from 'react-icons/hi';
import { isOwnerRole, isAdminRole, ORG_ROLE } from '@/config/rolePermissions';
import { sortTeamMembersPinned } from '@/lib/teamMemberSort';
import { getInviteAvailability } from '@/lib/teamInviteUtils';

const REALTIME_TEAM_EVENT = 'team-updated';
const REALTIME_USER_KICKED_EVENT = 'user-kicked';

function generateId() {
  return `tm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function TeamContent() {
  const { currentUser } = useAuth();
  const toast = useToast();
  const [userAccount, setUserAccount] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [team, setTeam] = useState([]);
  const [saving, setSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
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

  const cleanTeamMember = (member) => {
    const cleaned = {};
    Object.keys(member).forEach(key => {
      if (member[key] !== undefined) {
        if (typeof member[key] === 'object' && member[key] !== null && !Array.isArray(member[key])) {
          const cleanedObj = {};
          Object.keys(member[key]).forEach(objKey => {
            if (member[key][objKey] !== undefined) {
              cleanedObj[objKey] = member[key][objKey];
            }
          });
          if (Object.keys(cleanedObj).length > 0) {
            cleaned[key] = cleanedObj;
          }
        } else {
          cleaned[key] = member[key];
        }
      }
    });
    return cleaned;
  };

  const saveTeam = async (cleanedTeam) => {
    const list = Array.isArray(cleanedTeam) ? cleanedTeam.map(cleanTeamMember) : [];
    if (ownerUserId && organization?.id) {
      const res = await fetch('/api/update-org-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization.id,
          callerUserId: currentUser.uid,
          teamMembers: list,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to update team');
      }
      setOwnerTeamMembers(list);
      const filteredList = showInactive ? list : list.filter((m) => (m.status || 'active') !== 'inactive');
      setTeam(filteredList);
      broadcastTeamUpdated();
    } else {
      await updateTeamMembers(currentUser.uid, list);
      setUserAccount((prev) => (prev ? { ...prev, teamMembers: list } : null));
      const filteredList = showInactive ? list : list.filter((m) => (m.status || 'active') !== 'inactive');
      setTeam(filteredList);
      broadcastTeamUpdated();
    }
  };

  const handleRemoveClick = (id) => {
    const member = team.find((m) => m.id === id);
    setMemberToDelete(member);
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
      toast.success(shouldRevokeFirst ? 'Member deactivated. They no longer have access to your org.' : 'Member deactivated.');
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

  const handleSaveMember = async (data, pictureFile, editingId) => {
    const isEdit = !!editingId;
    const memberId = isEdit ? editingId : generateId();

    let allTeamMembers = ownerUserId ? ownerTeamMembers : team;
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
    const removeUndefined = (obj) => {
      const cleaned = {};
      Object.keys(obj).forEach(key => {
        if (obj[key] !== undefined) {
          cleaned[key] = obj[key];
        }
      });
      return cleaned;
    };

    const existingMember = isEdit ? allTeamMembers.find((m) => m.id === editingId) : null;
    const isAdmin = isEdit
      ? (data.isAdmin !== undefined ? data.isAdmin : (existingMember?.isAdmin ?? false))
      : false;
    const isOwner = isEdit ? (existingMember?.isOwner ?? false) : false;
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
      isOwner,
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
          if (emailData.sent) {
            toast.success(`Invite email sent to ${(data.email || '').trim()}`);
          } else if (emailData.inviteLink) {
            try {
              await navigator.clipboard.writeText(emailData.inviteLink);
              toast.info('Invite link copied to clipboard. Paste it into an email or message and send it to the team member.');
            } catch {
              toast.info(`No email was sent. Copy this link and send it to ${(data.email || '').trim()}: ${emailData.inviteLink}`);
            }
          }
        }
      } catch (err) {
        console.error('Failed to create/send invite:', err);
        toast.warning('Member saved, but the invite could not be sent. You can invite them later from the edit drawer.');
      }
    }

    const nextAllMembers = isEdit
      ? allTeamMembers.map((m) => (m.id === editingId ? finalMember : m))
      : [...allTeamMembers, finalMember];

    await saveTeam(nextAllMembers);

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

    // Only update org role when the member already has an account (userId). New invites don't have a user yet.
    if (data.isAdmin !== undefined && organization?.id && currentUser?.uid && finalMember.userId) {
      const rolePayload = {
        organizationId: organization.id,
        callerUserId: currentUser.uid,
        targetUserId: finalMember.userId,
        role: finalMember.isAdmin ? 'admin' : 'member',
      };
      fetch('/api/update-org-member-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rolePayload),
      })
        .then((res) => res.json().then((body) => ({ ok: res.ok, status: res.status, body })))
        .then(({ ok, body }) => {
          if (!ok) {
            const msg = body?.error || body?.message || 'Failed to update org role';
            toast.error(msg);
          }
        })
        .catch((err) => {
          console.error('Failed to sync org role:', err);
          toast.error('Failed to update org role. Please try again.');
        });
    }

    if (data.selectedServiceIds !== undefined && userAccount?.services) {
      const currentServices = [...(userAccount.services || [])];
      const selectedServiceIds = Array.isArray(data.selectedServiceIds) ? data.selectedServiceIds : [];

      const previousServiceIds = isEdit && editingId
        ? currentServices
            .filter(service => 
              service.assignedTeamMemberIds && 
              Array.isArray(service.assignedTeamMemberIds) &&
              service.assignedTeamMemberIds.includes(editingId)
            )
            .map(service => service.id)
            .filter(Boolean)
        : [];

      const updatedServices = currentServices.map(service => {
        const shouldBeAssigned = selectedServiceIds.includes(service.id);
        let assignedIds = [...(service.assignedTeamMemberIds || [])];
        if (shouldBeAssigned && !assignedIds.includes(memberId)) {
          assignedIds.push(memberId);
        } else if (!shouldBeAssigned && assignedIds.includes(memberId)) {
          assignedIds = assignedIds.filter(id => id !== memberId);
        }
        
        return {
          ...service,
          assignedTeamMemberIds: assignedIds,
        };
      });

      if (currentUser?.uid) {
        updateServices(currentUser.uid, updatedServices)
          .then(() => {
            setUserAccount((prev) => (prev ? { ...prev, services: updatedServices } : null));
          })
          .catch((err) => {
            console.error('Failed to update services:', err);
          });
      }
    }

    setDrawerOpen(false);
    setEditingMember(null);
  };

  const openDrawerForAdd = () => {
    setEditingMember(null);
    setDrawerOpen(true);
  };

  const openDrawerForEdit = (member) => {
    setEditingMember(member);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingMember(null);
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

  const drawerInviteRevoke = useMemo(() => {
    if (!editingMember) return { showInvite: false, showRevoke: false, revokeUserId: null };
    const memberEmail = (editingMember.email || '').toLowerCase().trim();
    const hasAccessByEmail = !!memberEmailToUserId[memberEmail];
    const hasAccessByUserId = !!(editingMember.userId && orgMemberUserIds.has(editingMember.userId));
    const hasAccess = hasAccessByEmail || hasAccessByUserId;
    const hasPendingInvite = memberEmail && (pendingInviteEmails.has(memberEmail) || !!editingMember.invitedAt);
    const isCurrentUser = currentUser?.email && (currentUser.email.toLowerCase().trim() === memberEmail);
    const { showInvite, showRevoke } = getInviteAvailability(editingMember, {
      hasAccess,
      hasPendingInvite,
      isCurrentUser,
      currentUserIsOrgAdmin,
    });
    const revokeUserId = memberEmailToUserId[memberEmail] || (hasAccessByUserId ? editingMember.userId : null);
    return { showInvite, showRevoke, revokeUserId };
  }, [editingMember, memberEmailToUserId, orgMemberUserIds, pendingInviteEmails, currentUser?.email, currentUserIsOrgAdmin]);

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
              <PrimaryButton type="button" onClick={openDrawerForAdd} className="gap-2">
                <HiPlus className="w-5 h-5" />
                Add member
              </PrimaryButton>
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

            <Drawer
              isOpen={drawerOpen}
              onClose={closeDrawer}
              title={editingMember ? `Edit ${editingMember.name}` : 'Add team member'}
              width="75vw"
            >
              <AddTeamMemberForm
                initialMember={editingMember}
                onSubmit={handleSaveMember}
                onCancel={closeDrawer}
                saving={saving}
                locations={userAccount?.locations || []}
                organizationCountry={userAccount?.organizationCountry || ''}
                services={userAccount?.services || []}
                teamMembers={team}
                onInviteToLogin={handleInviteToLogin}
                canPromoteToAdmin={currentUserIsOwner}
                showInviteInDrawer={drawerInviteRevoke.showInvite}
                showRevokeInDrawer={drawerInviteRevoke.showRevoke}
                onRevokeAccess={
                  drawerInviteRevoke.showRevoke
                    ? () => {
                        closeDrawer();
                        openRevokeDialog(editingMember, drawerInviteRevoke.revokeUserId);
                      }
                    : undefined
                }
                onServiceCreated={async (updatedServices) => {
                  if (currentUser?.uid) {
                    try {
                      await updateServices(currentUser.uid, updatedServices);
                      setUserAccount((prev) => (prev ? { ...prev, services: updatedServices } : null));
                    } catch (error) {
                      console.error('Error saving services:', error);
                      throw error;
                    }
                  } else {
                    throw new Error('User not authenticated');
                  }
                }}
              />
            </Drawer>

            <ConfirmDialog
              isOpen={deleteDialogOpen}
              onClose={handleRemoveCancel}
              onConfirm={handleDeactivateConfirm}
              title="Deactivate member"
              message={
                memberToDelete
                  ? `${memberToDelete.name} will be deactivated. They will be hidden from the team page. You can reactivate or permanently delete them later from Deactivated Members.`
                  : ''
              }
              confirmText="Deactivate"
              cancelText="Cancel"
              variant="warning"
              loading={saving}
            />

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
                  <PrimaryButton type="button" onClick={openDrawerForAdd} className="gap-2">
                    <HiPlus className="w-5 h-5" />
                    Add your first team member
                  </PrimaryButton>
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
                      onClick={() => openDrawerForEdit(member)}
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
