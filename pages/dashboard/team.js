import Head from 'next/head';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount, updateTeamMembers, updateServices, uploadTeamPhoto } from '@/services/userService';
import { getUserOrganization } from '@/services/organizationService';
import { DEFAULT_TEAM_MEMBERS } from '@/config/defaultTeamAndClients';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import PersonCard from '@/components/dashboard/PersonCard';
import AddTeamMemberForm from '@/components/dashboard/AddTeamMemberForm';
import { PageHeader, TeamFilter, ConfirmationDialog, EmptyState } from '@/components/ui';
import Drawer from '@/components/ui/Drawer';
import { PrimaryButton } from '@/components/ui/buttons';
import { useToast } from '@/components/ui/Toast';
import { HiPlus } from 'react-icons/hi';

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
      ...(isEdit && existingMember?.invitedAt && { invitedAt: existingMember.invitedAt }),
      ...(isEdit && existingMember?.userId && { userId: existingMember.userId }),
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
                }).map((member) => (
                  <PersonCard
                    key={member.id}
                    name={member.name}
                    subtitle={member.role}
                    src={member.pictureUrl}
                    onClick={() => openDrawerForEdit(member)}
                    onRemove={() => handleRemoveClick(member.id)}
                    isAdmin={member.isAdmin === true}
                  />
                ))}
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
    <ProtectedRoute>
      <DashboardLayout>
        <TeamContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
