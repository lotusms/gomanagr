import Head from 'next/head';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount, updateTeamMembers } from '@/services/userService';
import { DEFAULT_TEAM_MEMBERS } from '@/config/defaultTeamAndClients';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import PersonCard from '@/components/dashboard/PersonCard';
import AddTeamMemberForm from '@/components/dashboard/AddTeamMemberForm';
import { PageHeader, TeamFilter, ConfirmationDialog } from '@/components/ui';
import Drawer from '@/components/ui/Drawer';
import { PrimaryButton } from '@/components/ui/buttons';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { HiPlus } from 'react-icons/hi';

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

  useEffect(() => {
    if (!currentUser?.uid) return;
    setLoaded(false);
    getUserAccount(currentUser.uid)
      .then((data) => {
        setUserAccount(data || null);
        const list = (data?.teamMembers && data.teamMembers.length > 0)
          ? data.teamMembers
          : DEFAULT_TEAM_MEMBERS;
        setTeam(list);
      })
      .catch(() => setTeam(DEFAULT_TEAM_MEMBERS))
      .finally(() => setLoaded(true));
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
        setTeam(cleanedTeam);
      })
      .catch((err) => console.error('Failed to save team:', err))
      .finally(() => setSaving(false));
  };

  const handleRemoveClick = (id) => {
    const member = team.find((m) => m.id === id);
    setMemberToDelete(member);
    setDeleteDialogOpen(true);
  };

  const handleRemoveConfirm = () => {
    if (memberToDelete) {
      const next = team.filter((m) => m.id !== memberToDelete.id);
      saveTeam(next);
      setDeleteDialogOpen(false);
      setMemberToDelete(null);
    }
  };

  const handleRemoveCancel = () => {
    setDeleteDialogOpen(false);
    setMemberToDelete(null);
  };

  const handleSaveMember = async (data, pictureFile, editingId) => {
    const isEdit = !!editingId;
    const memberId = isEdit ? editingId : generateId();
    let pictureUrl = isEdit ? team.find((m) => m.id === editingId)?.pictureUrl ?? '' : '';
    if (pictureFile && currentUser?.uid) {
      try {
        const photoRef = ref(storage, `team-photos/${currentUser.uid}/${memberId}/${pictureFile.name}`);
        await uploadBytes(photoRef, pictureFile);
        pictureUrl = await getDownloadURL(photoRef);
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
    });
    const next = isEdit
      ? team.map((m) => (m.id === editingId ? updatedMember : m))
      : [...team, updatedMember];
    setTeam(next);
    saveTeam(next);
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

      // Service filter
      if (filters.services.length > 0) {
        const memberServices = member.services || [];
        const hasMatchingService = filters.services.some((service) =>
          memberServices.includes(service)
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
  }, [team, filters]);

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
              />
            </Drawer>

            <ConfirmationDialog
              isOpen={deleteDialogOpen}
              onClose={handleRemoveCancel}
              onConfirm={handleRemoveConfirm}
              title="Delete Team Member"
              message={`Are you sure you want to delete ${memberToDelete?.name || 'this team member'}? This action cannot be undone and will remove all associated data.`}
              confirmText="Delete"
              cancelText="Cancel"
              confirmationWord="delete"
              variant="danger"
            />

            <TeamFilter
              teamMembers={team}
              filters={filters}
              onFiltersChange={setFilters}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTeam.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-500 text-lg">No team members match the selected filters</p>
                  <p className="text-gray-400 text-sm mt-2">Try adjusting your filter criteria</p>
                </div>
              ) : (
                [...filteredTeam].sort((a, b) => {
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
                />
                ))
              )}
            </div>
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
