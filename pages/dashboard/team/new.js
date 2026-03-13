import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useUserAccount } from '@/lib/UserAccountContext';
import { getUserAccount, updateServices, uploadTeamPhoto } from '@/services/userService';
import { getUserOrganization } from '@/services/organizationService';
import { persistTeam, generateId } from '@/lib/teamMemberSave';
import AddTeamMemberForm from '@/components/dashboard/AddTeamMemberForm';
import { PageHeader } from '@/components/ui';
import { SecondaryButton } from '@/components/ui/buttons';
import { useToast } from '@/components/ui/Toast';
import { isOwnerRole, isAdminRole, isOwnerOrDeveloperRole } from '@/config/rolePermissions';
import { getTermForIndustry, getTermSingular } from '@/components/clients/clientProfileConstants';
import Link from 'next/link';
import { HiArrowLeft } from 'react-icons/hi';

function removeUndefined(obj) {
  const cleaned = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) cleaned[key] = obj[key];
  });
  return cleaned;
}

export default function NewTeamMemberPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { account: userAccount, setAccount, refetch: refetchAccount } = useUserAccount();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [organization, setOrganization] = useState(null);
  const [ownerUserId, setOwnerUserId] = useState(null);
  const [ownerTeamMembers, setOwnerTeamMembers] = useState([]);
  const [orgTeamLoaded, setOrgTeamLoaded] = useState(false);

  const isAdminNonOwner = useMemo(
    () =>
      organization?.membership?.role != null &&
      isAdminRole(organization.membership.role) &&
      !isOwnerOrDeveloperRole(organization.membership.role),
    [organization?.membership?.role]
  );

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserOrganization(currentUser.uid).then((org) => setOrganization(org || null)).catch(() => setOrganization(null));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (router.isReady && currentUser?.uid) {
      refetchAccount();
    }
  }, [router.isReady, currentUser?.uid, refetchAccount]);

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

  const team = ownerUserId ? ownerTeamMembers : (userAccount?.teamMembers ?? []);
  const industry = organization?.industry ?? userAccount?.industry;
  const teamTerm = getTermForIndustry(industry, 'team');
  const teamMemberTerm = getTermForIndustry(industry, 'teamMember');
  const teamMemberSingular = getTermSingular(teamMemberTerm);
  const teamMemberSingularLower = teamMemberSingular.toLowerCase();
  const teamTermLower = teamTerm.toLowerCase();
  const currentUserIsOwner = useMemo(
    () => isOwnerOrDeveloperRole(organization?.membership?.role) || team.some((m) => m.id === `owner-${currentUser?.uid}`),
    [organization?.membership?.role, team, currentUser?.uid]
  );

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
    const isOwner = isEdit ? (existingMember?.isOwner ?? false) : false;
    const memberEmailNorm = (data.email || existingMember?.email || '').trim().toLowerCase();
    const memberEmailToUserId = {};
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
              toast.info(`Invite link copied to clipboard. Paste it into an email or message and send it to the ${teamMemberSingularLower}.`);
            } catch {
              toast.info(`No email was sent. Copy this link and send it to ${(data.email || '').trim()}: ${emailData.inviteLink}`);
            }
          }
        }
      } catch (err) {
        console.error('Failed to create/send invite:', err);
        toast.warning('Member saved, but the invite could not be sent. You can invite them later from the edit page.');
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

    if (
      data.isAdmin !== undefined &&
      organization?.id &&
      currentUser?.uid &&
      (finalMember.userId || (finalMember.email && finalMember.email.trim()))
    ) {
      fetch('/api/update-org-member-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization.id,
          callerUserId: currentUser.uid,
          ...(finalMember.userId ? { targetUserId: finalMember.userId } : { targetEmail: finalMember.email.trim() }),
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

    toast.success(`${teamMemberSingular} added.`);
    router.push('/dashboard/team');
  };

  const dataReady = !isAdminNonOwner ? userAccount != null : (organization != null && orgTeamLoaded);

  const handleCancel = () => {
    router.push('/dashboard/team');
  };

  if (!dataReady) {
    return (
      <>
        <Head><title>Add {teamMemberSingularLower} - GoManagr</title></Head>
        <p className="text-gray-500">Loading…</p>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Add {teamMemberSingularLower} - GoManagr</title>
        <meta name="description" content={`Add a new ${teamMemberSingularLower}`} />
      </Head>
      <div className="space-y-6">
        <PageHeader
          title={`Add ${teamMemberSingularLower}`}
          description={`Add a new ${teamMemberSingularLower} to your ${teamTermLower}.`}
          actions={
            <Link href="/dashboard/team">
              <SecondaryButton type="button" className="gap-2">
                <HiArrowLeft className="w-5 h-5" />
                Back to {teamTermLower}
              </SecondaryButton>
            </Link>
          }
        />
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <AddTeamMemberForm
            initialMember={null}
            onSubmit={handleSaveMember}
            onCancel={handleCancel}
            saving={saving}
            industry={industry}
            locations={userAccount?.locations || []}
            organizationCountry={userAccount?.organizationCountry || ''}
            services={userAccount?.services || []}
            teamMembers={team}
            canPromoteToAdmin={currentUserIsOwner}
            showInviteInDrawer={false}
            showRevokeInDrawer={false}
            onServiceCreated={async (updatedServices) => {
              if (currentUser?.uid) {
                await updateServices(currentUser.uid, updatedServices);
                setAccount((prev) => (prev ? { ...prev, services: updatedServices } : null));
              }
            }}
          />
        </div>
      </div>
    </>
  );
}
