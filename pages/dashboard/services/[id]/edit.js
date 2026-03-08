import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { useEffect, useState } from 'react';
import { getUserOrganization } from '@/services/organizationService';
import { getUserAccount, getOrgServices, updateServices, updateOrgServices, updateTeamMembers } from '@/services/userService';
import { isOwnerRole } from '@/config/rolePermissions';
import { PageHeader } from '@/components/ui';
import AddServiceForm from '@/components/services/AddServiceForm';
import { SecondaryButton } from '@/components/ui/buttons';
import Link from 'next/link';
import { HiArrowLeft } from 'react-icons/hi';
import { getTermForIndustry, getTermSingular } from '@/components/clients/clientProfileConstants';

export default function EditServicePage() {
  const router = useRouter();
  const { id: serviceId } = router.query;
  const { currentUser } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [userAccount, setUserAccount] = useState(null);
  const [services, setServices] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [ownerUserId, setOwnerUserId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);

  const service = serviceId ? services.find((s) => s.id === serviceId) : null;
  const industry = organization?.industry ?? userAccount?.industry ?? null;
  const serviceTerm = getTermForIndustry(industry, 'services');
  const serviceTermSingular = getTermSingular(serviceTerm) || 'Service';
  const serviceTermSingularLower = serviceTermSingular.toLowerCase();
  const serviceTermLower = serviceTerm.toLowerCase();

  useEffect(() => {
    if (!currentUser?.uid) return;
    getUserOrganization(currentUser.uid).then((o) => setOrganization(o || null)).catch(() => setOrganization(null));
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    const org = organization;
    if (org?.id && !isOwnerRole(org?.membership?.role)) {
      getOrgServices(org.id, currentUser.uid)
        .then((data) => {
          setServices(data.services || []);
          setTeamMembers(data.teamMembers || []);
          setOwnerUserId(data.ownerUserId || null);
        })
        .catch(() => {
          setServices([]);
          setTeamMembers([]);
          setOwnerUserId(null);
        })
        .finally(() => setReady(true));
    } else {
      getUserAccount(currentUser.uid)
        .then((account) => {
          setUserAccount(account || null);
          setServices(account?.services || []);
          setTeamMembers(account?.teamMembers || []);
          setOwnerUserId(null);
        })
        .catch(() => {
          setServices([]);
          setTeamMembers([]);
        })
        .finally(() => setReady(true));
    }
  }, [currentUser?.uid, organization?.id, organization?.membership?.role]);

  useEffect(() => {
    if (currentUser?.uid && organization && !organization?.id) {
      getUserAccount(currentUser.uid)
        .then((account) => {
          setUserAccount(account || null);
          setServices(account?.services || []);
          setTeamMembers(account?.teamMembers || []);
          setOwnerUserId(null);
        })
        .catch(() => {})
        .finally(() => setReady(true));
    }
  }, [currentUser?.uid, organization]);

  const handleSubmit = (serviceData) => {
    if (!currentUser?.uid || !serviceId) return;
    setSaving(true);
    const nextServices = services.map((s) => (s.id === serviceId ? { ...s, ...serviceData, id: serviceId } : s));
    const currentTeamMembers = teamMembers;
    const updatedTeamMembers = currentTeamMembers.map((member) => {
      const oldService = services.find((s) => s.id === serviceId);
      const oldName = oldService?.name;
      const newName = serviceData.name;
      if (member.services && Array.isArray(member.services)) {
        let arr = [...member.services];
        if (oldName && oldName !== newName) {
          arr = arr.map((svc) => (svc === oldName ? newName : svc));
        }
        return { ...member, services: arr };
      }
      return member;
    });
    const teamMembersChanged = JSON.stringify(currentTeamMembers) !== JSON.stringify(updatedTeamMembers);

    const doSave = () => {
      if (ownerUserId && organization?.id) {
        return updateOrgServices(
          organization.id,
          currentUser.uid,
          nextServices,
          teamMembersChanged ? updatedTeamMembers : undefined
        );
      }
      const p = updateServices(currentUser.uid, nextServices);
      if (teamMembersChanged && updatedTeamMembers.length > 0) {
        return p.then(() => updateTeamMembers(currentUser.uid, updatedTeamMembers));
      }
      return p;
    };

    doSave()
      .then(() => router.push('/dashboard/services'))
      .catch((err) => {
        console.error(err);
        setSaving(false);
      });
  };

  const backUrl = '/dashboard/services';
  if (!ready || !currentUser?.uid) return null;
  if (router.isReady && serviceId && !service) {
    return (
      <>
        <Head><title>{serviceTermSingular} not found - GoManagr</title></Head>
        <div className="space-y-6">
          <p className="text-gray-600 dark:text-gray-400">{serviceTermSingular} not found.</p>
          <Link href={backUrl}>
            <SecondaryButton type="button" className="gap-2">
              <HiArrowLeft className="w-5 h-5" />
              Back to {serviceTermLower}
            </SecondaryButton>
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Edit {serviceTermSingularLower} - GoManagr</title>
        <meta name="description" content={`Edit ${serviceTermSingularLower}`} />
      </Head>
      <div className="space-y-6">
        <PageHeader
          title={`Edit ${serviceTermSingular}`}
          description={`Update the ${serviceTermSingularLower} and assignments.`}
          actions={
            <Link href={backUrl}>
              <SecondaryButton type="button" className="gap-2">
                <HiArrowLeft className="w-5 h-5" />
                Back to {serviceTermLower}
              </SecondaryButton>
            </Link>
          }
        />
        <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/40 p-6 shadow-sm">
          <AddServiceForm
            mode="page"
            teamMembers={teamMembers}
            existingServices={services}
            initialService={service || null}
            industry={industry}
            onSubmit={handleSubmit}
            onCancel={() => router.push(backUrl)}
            saving={saving}
            userId={currentUser.uid}
            organizationId={organization?.id ?? null}
            defaultCurrency="USD"
          />
        </div>
      </div>
    </>
  );
}
