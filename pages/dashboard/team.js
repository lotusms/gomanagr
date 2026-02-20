import Head from 'next/head';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount, updateTeamMembers, updateServices, uploadFile } from '@/services/userService';
import { DEFAULT_TEAM_MEMBERS } from '@/config/defaultTeamAndClients';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import PersonCard from '@/components/dashboard/PersonCard';
import AddTeamMemberForm from '@/components/dashboard/AddTeamMemberForm';
import { PageHeader, TeamFilter, ConfirmationDialog, EmptyState } from '@/components/ui';
import Drawer from '@/components/ui/Drawer';
import { PrimaryButton } from '@/components/ui/buttons';
import { HiPlus } from 'react-icons/hi';

const TEAM_PHOTOS_BUCKET = 'team-photos';

function generateId() {
  return `tm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function TeamContent() {
  const { currentUser } = useAuth();
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

  const handleRemoveConfirm = async () => {
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
      alert('Failed to deactivate team member. Please try again.');
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
    
    // Get all team members (including inactive) when editing to preserve inactive members
    let allTeamMembers = team;
    if (isEdit && currentUser?.uid) {
      try {
        const account = await getUserAccount(currentUser.uid);
        allTeamMembers = account?.teamMembers || team;
      } catch (err) {
        console.error('Failed to fetch all team members:', err);
      }
    }
    
    let pictureUrl = isEdit ? allTeamMembers.find((m) => m.id === editingId)?.pictureUrl ?? '' : '';
    if (pictureFile && currentUser?.uid) {
      try {
        const path = `${currentUser.uid}/${memberId}/${pictureFile.name}`;
        pictureUrl = await uploadFile(TEAM_PHOTOS_BUCKET, path, pictureFile);
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
      status: isEdit ? (allTeamMembers.find((m) => m.id === editingId)?.status || 'active') : 'active', // Default to 'active' for new members, preserve existing status for edits
    });
    
    // Update all team members (including inactive) when editing, or add new member
    const nextAllMembers = isEdit
      ? allTeamMembers.map((m) => (m.id === editingId ? updatedMember : m))
      : [...allTeamMembers, updatedMember];
    
    // Update local team display based on showInactive setting
    const filteredList = showInactive 
      ? nextAllMembers // Show all members including inactive
      : nextAllMembers.filter((m) => (m.status || 'active') !== 'inactive'); // Show only active
    setTeam(filteredList);
    
    // Save all team members (including inactive)
    saveTeam(nextAllMembers);

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
                onServiceCreated={async (updatedServices) => {
                  // Save the new service to Supabase
                  if (currentUser?.uid) {
                    try {
                      console.log('Saving services to Supabase:', updatedServices);
                      await updateServices(currentUser.uid, updatedServices);
                      setUserAccount((prev) => (prev ? { ...prev, services: updatedServices } : null));
                      console.log('Services saved successfully');
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
              onConfirm={handleRemoveConfirm}
              title="Deactivate Team Member"
              message={`Are you sure you want to deactivate ${memberToDelete?.name || 'this team member'}? The team member will be removed from your active team list, but their information will be retained for future reference.`}
              confirmText="Deactivate"
              cancelText="Cancel"
              confirmationWord="deactivate"
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
