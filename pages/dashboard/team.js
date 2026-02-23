import Head from 'next/head';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount, updateTeamMembers, updateServices, uploadTeamPhoto } from '@/services/userService';
import { getUserOrganization } from '@/services/organizationService';
import PersonCard from '@/components/dashboard/PersonCard';
import AddTeamMemberForm from '@/components/dashboard/AddTeamMemberForm';
import { PageHeader, TeamFilter, ConfirmationDialog, EmptyState, InputField } from '@/components/ui';
import Drawer from '@/components/ui/Drawer';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import { useToast } from '@/components/ui/Toast';
import * as Dialog from '@radix-ui/react-dialog';
import { HiPlus, HiX } from 'react-icons/hi';
import { isOwnerRole, isAdminRole, ORG_ROLE } from '@/config/rolePermissions';

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

  useEffect(() => {
    if (!currentUser?.uid) return;
    setLoaded(false);
    getUserAccount(currentUser.uid)
      .then((data) => {
        setUserAccount(data || null);
        // Only use teamMembers from account, no default fallback
        // Empty array means no team members yet (only account owner should exist)
        const list = data?.teamMembers ?? [];
        // Filter team members based on showInactive setting
        // Default to 'active' if status is not set
        const filteredList = showInactive 
          ? list // Show all members including inactive
          : list.filter((m) => (m.status || 'active') !== 'inactive'); // Show only active
        setTeam(filteredList);
      })
      .catch(() => {
        // On error, show empty team (no defaults)
        setTeam([]);
      })
      .finally(() => setLoaded(true));
  }, [currentUser?.uid, showInactive]);

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

  // Helper function to clean team member objects by removing undefined values
  const cleanTeamMember = (member) => {
    const cleaned = {};
    Object.keys(member).forEach(key => {
      if (member[key] !== undefined) {
        // If it's an object, recursively clean it
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

  const saveTeam = (nextTeam) => {
    if (!currentUser?.uid) return;
    setSaving(true);
    // Clean all team members to remove undefined values before saving
    const cleanedTeam = nextTeam.map(cleanTeamMember);
    updateTeamMembers(currentUser.uid, cleanedTeam)
      .then(() => {
        setUserAccount((prev) => (prev ? { ...prev, teamMembers: cleanedTeam } : null));
        // Filter team members based on showInactive setting
        const filteredList = showInactive 
          ? cleanedTeam // Show all members including inactive
          : cleanedTeam.filter((m) => (m.status || 'active') !== 'inactive'); // Show only active
        setTeam(filteredList);
      })
      .catch((err) => console.error('Failed to save team:', err))
      .finally(() => setSaving(false));
  };

  const handleRemoveClick = (id) => {
    const member = team.find((m) => m.id === id);
    setMemberToDelete(member);
    setDeleteDialogOpen(true);
  };

  // Soft delete: Deactivate team member (sets status to 'inactive')
  const handleDeactivateConfirm = async () => {
    if (!memberToDelete || !currentUser?.uid) return;
    
    setSaving(true);
    try {
      // Get all team members (including inactive ones)
      const account = await getUserAccount(currentUser.uid);
      const allTeamMembers = account?.teamMembers || [];
      
      // Update the team member's status to 'inactive' instead of removing
      const updatedTeamMembers = allTeamMembers.map((m) =>
        m.id === memberToDelete.id ? { ...m, status: 'inactive' } : m
      );
      
      // Clean all team members to remove undefined values before saving
      const cleanedTeam = updatedTeamMembers.map(cleanTeamMember);
      
      // Save updated team members
      await updateTeamMembers(currentUser.uid, cleanedTeam);
      
      // Update local state - filter based on showInactive setting
      const filteredList = showInactive 
        ? cleanedTeam // Show all members including inactive
        : cleanedTeam.filter((m) => (m.status || 'active') !== 'inactive'); // Show only active
      setTeam(filteredList);
      setUserAccount((prev) => (prev ? { ...prev, teamMembers: cleanedTeam } : null));
      
      setDeleteDialogOpen(false);
      setMemberToDelete(null);
    } catch (err) {
      console.error('Failed to deactivate team member:', err);
      toast.error('Failed to deactivate team member. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Hard delete: Permanently remove team member from array
  const handleDeleteConfirm = async () => {
    if (!memberToDelete || !currentUser?.uid) return;
    
    setSaving(true);
    try {
      // Get all team members (including inactive ones)
      const account = await getUserAccount(currentUser.uid);
      const allTeamMembers = account?.teamMembers || [];
      
      // Permanently remove the team member from the array
      const updatedTeamMembers = allTeamMembers.filter((m) => m.id !== memberToDelete.id);
      
      // Clean all team members to remove undefined values before saving
      const cleanedTeam = updatedTeamMembers.map(cleanTeamMember);
      
      // Save updated team members
      await updateTeamMembers(currentUser.uid, cleanedTeam);
      
      // Update local state - filter based on showInactive setting
      const filteredList = showInactive 
        ? cleanedTeam // Show all members including inactive
        : cleanedTeam.filter((m) => (m.status || 'active') !== 'inactive'); // Show only active
      setTeam(filteredList);
      setUserAccount((prev) => (prev ? { ...prev, teamMembers: cleanedTeam } : null));
      
      setDeleteDialogOpen(false);
      setMemberToDelete(null);
    } catch (err) {
      console.error('Failed to delete team member:', err);
      toast.error('Failed to delete team member. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCancel = () => {
    setDeleteDialogOpen(false);
    setMemberToDelete(null);
  };

  const handleSaveMember = async (data, pictureFile, editingId) => {
    const isEdit = !!editingId;
    const memberId = isEdit ? editingId : generateId();

    // Get full team list (including inactive) so we never overwrite with a filtered list
    let allTeamMembers = team;
    if (currentUser?.uid) {
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
    // Helper function to remove undefined values from an object
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

    // Update all team members (including inactive) when editing, or add new member
    const nextAllMembers = isEdit
      ? allTeamMembers.map((m) => (m.id === editingId ? finalMember : m))
      : [...allTeamMembers, finalMember];

    // Update local team display based on showInactive setting
    const filteredList = showInactive
      ? nextAllMembers
      : nextAllMembers.filter((m) => (m.status || 'active') !== 'inactive');
    setTeam(filteredList);

    // Save all team members (including inactive)
    saveTeam(nextAllMembers);

    // If this member has an account in the org (signed in with invite), sync their user profile so they see admin updates
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

    if (data.isAdmin !== undefined && organization?.id && currentUser?.uid && (finalMember.userId || (finalMember.email || '').trim())) {
      const rolePayload = {
        organizationId: organization.id,
        callerUserId: currentUser.uid,
        ...(finalMember.userId ? { targetUserId: finalMember.userId } : { targetEmail: (finalMember.email || '').trim() }),
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

    // Update services to reflect team member assignments
    if (data.selectedServiceIds !== undefined && userAccount?.services) {
      const currentServices = [...(userAccount.services || [])];
      const selectedServiceIds = Array.isArray(data.selectedServiceIds) ? data.selectedServiceIds : [];
      
      // Get previously assigned service IDs (for editing)
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

      // Update each service's assignedTeamMemberIds
      const updatedServices = currentServices.map(service => {
        const wasAssigned = previousServiceIds.includes(service.id);
        const shouldBeAssigned = selectedServiceIds.includes(service.id);
        
        let assignedIds = [...(service.assignedTeamMemberIds || [])];
        
        if (shouldBeAssigned && !assignedIds.includes(memberId)) {
          // Add member to this service
          assignedIds.push(memberId);
        } else if (!shouldBeAssigned && assignedIds.includes(memberId)) {
          // Remove member from this service
          assignedIds = assignedIds.filter(id => id !== memberId);
        }
        
        return {
          ...service,
          assignedTeamMemberIds: assignedIds,
        };
      });

      // Save updated services
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
      toast.success('Access revoked. They have been signed out and cannot use invite links or sign in again.');
      const revokedUserId = memberToRevoke.userId;
      setRevokeDialogOpen(false);
      setMemberToRevoke(null);
      const emailNorm = email.toLowerCase().trim();

      // Optimistically update UI so the card switches to Invite immediately
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

      // Clear invitedAt and userId on the revoked member so the card shows Invite (re-invite) again
      const account = await getUserAccount(currentUser.uid);
      const allTeamMembers = account?.teamMembers ?? [];
      const nextAllMembers = allTeamMembers.map((m) => {
        const em = (m.email || '').toLowerCase().trim();
        if (em !== emailNorm) return m;
        const { invitedAt, userId: _uid, ...rest } = m;
        return rest;
      });
      const cleanedTeam = nextAllMembers.map(cleanTeamMember);
      await updateTeamMembers(currentUser.uid, cleanedTeam);
      setUserAccount((prev) => (prev ? { ...prev, teamMembers: cleanedTeam } : null));
      const filteredList = showInactive ? cleanedTeam : cleanedTeam.filter((m) => (m.status || 'active') !== 'inactive');
      setTeam(filteredList);
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
      const account = await getUserAccount(currentUser.uid);
      const allTeamMembers = account?.teamMembers ?? team;
      const nextAllMembers = allTeamMembers.map((m) => (m.id === member.id ? updatedMember : m));
      await updateTeamMembers(currentUser.uid, nextAllMembers.map(cleanTeamMember));
      setUserAccount((prev) => (prev ? { ...prev, teamMembers: nextAllMembers } : null));
      const filteredList = showInactive ? nextAllMembers : nextAllMembers.filter((m) => (m.status || 'active') !== 'inactive');
      setTeam(filteredList);
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

  // Map team member email -> org member user_id (for Revoke; exclude current user and admins)
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

  // Set of user_ids in the org (non-admin, not self) — so we can show Revoke by userId when email doesn't match profile
  const orgMemberUserIds = useMemo(() => {
    const set = new Set();
    (orgMembers || []).forEach((om) => {
      if (om.user_id === currentUser?.uid) return;
      if (isOwnerRole(om.role) || om.role === ORG_ROLE.ADMIN) return;
      set.add(om.user_id);
    });
    return set;
  }, [orgMembers, currentUser?.uid]);

  // Emails that have a pending invite (not yet accepted) — show Revoke instead of Invite
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
    const allTeamMembers = userAccount?.teamMembers ?? [];
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
    const cleanedTeam = nextAllMembers.map(cleanTeamMember);
    updateTeamMembers(currentUser.uid, cleanedTeam)
      .then(() => {
        setUserAccount((prev) => (prev ? { ...prev, teamMembers: cleanedTeam } : null));
        const filteredList = showInactive ? cleanedTeam : cleanedTeam.filter((m) => (m.status || 'active') !== 'inactive');
        setTeam(filteredList);
      })
      .catch((err) => console.error('[team] sync revoked members', err));
  }, [currentUser?.uid, userAccount?.teamMembers, orgMembers, pendingInvites, saving, showInactive, orgAndInvitesLoaded]);

  // Filter team members based on selected filters
  const filteredTeam = useMemo(() => {
    return team.filter((member) => {
      // Role filter
      if (filters.roles.length > 0 && !filters.roles.includes(member.role)) {
        return false;
      }

      // Service filter - check services assigned to this team member from userAccount.services
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
        
        // Also check legacy member.services for backward compatibility
        const legacyMemberServices = member.services || [];
        const allMemberServices = [...new Set([...memberServiceNames, ...legacyMemberServices])];
        
        const hasMatchingService = filters.services.some((service) =>
          allMemberServices.includes(service)
        );
        if (!hasMatchingService) {
          return false;
        }
      }

      // Gender filter
      if (filters.genders.length > 0 && !filters.genders.includes(member.gender)) {
        return false;
      }

      // Personality trait filter
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
                onServiceCreated={async (updatedServices) => {
                  // Save the new service to Supabase
                  if (currentUser?.uid) {
                    try {
                      await updateServices(currentUser.uid, updatedServices);
                      setUserAccount((prev) => (prev ? { ...prev, services: updatedServices } : null));
                    } catch (error) {
                      console.error('Error saving services:', error);
                      throw error; // Re-throw to be caught by handleCreateService
                    }
                  } else {
                    throw new Error('User not authenticated');
                  }
                }}
              />
            </Drawer>

            <ConfirmationDialog
              isOpen={deleteDialogOpen}
              onClose={handleRemoveCancel}
              onSecondaryConfirm={handleDeactivateConfirm}
              onConfirm={handleDeleteConfirm}
              title="Remove Team Member"
              message={`What would you like to do with ${memberToDelete?.name || 'this team member'}? You can deactivate them (soft delete) to keep their information for future reference, or permanently delete them from your team.`}
              secondaryConfirmText="Deactivate"
              confirmText="Delete Permanently"
              cancelText="Cancel"
              confirmationWord="delete"
              variant="danger"
            />

            {/* Invite to join dialog */}
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
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {inviteDialogMember?.name ? `Send an invite to ${inviteDialogMember.name}.` : 'Enter the email address to send an invite.'}
                  </p>
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
                {[...filteredTeam].sort((a, b) => {
                  // Pin admins at the beginning
                  const aIsAdmin = a.isAdmin === true;
                  const bIsAdmin = b.isAdmin === true;
                  if (aIsAdmin && !bIsAdmin) return -1;
                  if (!aIsAdmin && bIsAdmin) return 1;
                  
                  // Sort alphabetically for both admins and non-admins
                  const nameA = (a.name || '').toLowerCase();
                  const nameB = (b.name || '').toLowerCase();
                  return nameA.localeCompare(nameB);
                }).map((member) => {
                  const memberEmail = (member.email || '').toLowerCase().trim();
                  const hasAccessByEmail = !!memberEmailToUserId[memberEmail];
                  const hasAccessByUserId = !!(member.userId && orgMemberUserIds.has(member.userId));
                  const hasAccess = hasAccessByEmail || hasAccessByUserId;
                  const revokeUserId = memberEmailToUserId[memberEmail] || (hasAccessByUserId ? member.userId : null);
                  // Show Revoke when: in org, or has pending invite from API, or was ever invited (invitedAt)
                  const hasPendingInvite = memberEmail && (pendingInviteEmails.has(memberEmail) || !!member.invitedAt);
                  const isCurrentUser = currentUser?.email && (currentUser.email.toLowerCase().trim() === memberEmail);
                  const showRevokeOnly = (hasAccess || hasPendingInvite) && !isCurrentUser && member.isAdmin !== true;
                  const showInvite = currentUserIsOrgAdmin && !showRevokeOnly && member.isAdmin !== true;
                  const showRevoke = currentUserIsOrgAdmin && showRevokeOnly;
                  return (
                    <PersonCard
                      key={member.id}
                      name={member.name}
                      subtitle={member.isOwner === true ? 'Super Admin' : member.role}
                      src={member.pictureUrl}
                      onClick={() => openDrawerForEdit(member)}
                      onRemove={() => handleRemoveClick(member.id)}
                      onInvite={showInvite ? () => openInviteDialog(member) : undefined}
                      onRevoke={showRevoke ? () => openRevokeDialog(member, revokeUserId || null) : undefined}
                      isAdmin={member.isAdmin === true}
                      isSuperAdmin={member.isOwner === true}
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
