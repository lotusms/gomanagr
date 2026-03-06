import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/AuthContext';
import { useEffect, useState } from 'react';
import { getUserOrganization } from '@/services/organizationService';
import { getUserAccount, getOrgServices, updateServices, updateOrgServices } from '@/services/userService';
import { isOwnerRole } from '@/config/rolePermissions';
import { PageHeader } from '@/components/ui';
import AddServiceForm from '@/components/services/AddServiceForm';
import { SecondaryButton } from '@/components/ui/buttons';
import Link from 'next/link';
import { HiArrowLeft } from 'react-icons/hi';

export default function NewServicePage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [organization, setOrganization] = useState(null);
  const [services, setServices] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [ownerUserId, setOwnerUserId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);

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
          setServices(account?.services || []);
          setTeamMembers(account?.teamMembers || []);
          setOwnerUserId(null);
        })
        .catch(() => {})
        .finally(() => setReady(true));
    }
  }, [currentUser?.uid, organization]);

  const handleSubmit = (serviceData) => {
    if (!currentUser?.uid) return;
    setSaving(true);
    const nextServices = [...services, serviceData];
    const doSave = () => {
      if (ownerUserId && organization?.id) {
        return updateOrgServices(organization.id, currentUser.uid, nextServices);
      }
      return updateServices(currentUser.uid, nextServices);
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

  return (
    <>
      <Head>
        <title>Add service - GoManagr</title>
        <meta name="description" content="Add a new service" />
      </Head>
      <div className="space-y-6">
        <PageHeader
          title="Add service"
          description="Create a new service and assign it to team members."
          actions={
            <Link href={backUrl}>
              <SecondaryButton type="button" className="gap-2">
                <HiArrowLeft className="w-5 h-5" />
                Back to services
              </SecondaryButton>
            </Link>
          }
        />
        <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/40 p-6 shadow-sm">
          <AddServiceForm
            mode="page"
            teamMembers={teamMembers}
            existingServices={services}
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
