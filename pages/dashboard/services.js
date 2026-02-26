import Head from 'next/head';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserAccount, updateServices, updateTeamMembers, getOrgServices, updateOrgServices } from '@/services/userService';
import { getUserOrganization } from '@/services/organizationService';
import { isOwnerRole } from '@/config/rolePermissions';
import { PageHeader, Drawer, EmptyState, ConfirmationDialog, Paginator } from '@/components/ui';
import AddServiceForm from '@/components/services/AddServiceForm';
import { HiPlus, HiX, HiPencil, HiTrash, HiClipboardList, HiUserGroup } from 'react-icons/hi';
import { PrimaryButton } from '@/components/ui/buttons';

function ServicesContent() {
  const { currentUser } = useAuth();
  const [userAccount, setUserAccount] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [ownerUserId, setOwnerUserId] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [services, setServices] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  const teamMembers = userAccount?.teamMembers || [];

  const paginatedServices = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return services.slice(startIndex, endIndex);
  }, [services, currentPage, itemsPerPage]);

  useEffect(() => {
    const totalPages = Math.ceil(services.length / itemsPerPage);
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [services.length, itemsPerPage, currentPage]);

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  useEffect(() => {
    if (!currentUser?.uid) return;
    setLoaded(false);
    Promise.all([
      getUserOrganization(currentUser.uid),
      getUserAccount(currentUser.uid),
    ])
      .then(([org, account]) => {
        setOrganization(org || null);
        const role = org?.membership?.role;
        if (isOwnerRole(role)) {
          setOwnerUserId(null);
          setUserAccount(account || null);
          setServices(account?.services || []);
          setLoaded(true);
        } else if (org?.id) {
          getOrgServices(org.id, currentUser.uid)
            .then((data) => {
              setOwnerUserId(data.ownerUserId || null);
              setUserAccount({
                teamMembers: data.teamMembers || [],
                services: data.services || [],
              });
              setServices(data.services || []);
            })
            .catch(() => {
              setOwnerUserId(null);
              setUserAccount(account || null);
              setServices(account?.services || []);
            })
            .finally(() => setLoaded(true));
        } else {
          setOwnerUserId(null);
          setUserAccount(account || null);
          setServices(account?.services || []);
          setLoaded(true);
        }
      })
      .catch(() => {
        setServices([]);
        setLoaded(true);
      });
  }, [currentUser?.uid]);

  const saveServices = (nextServices) => {
    if (!currentUser?.uid) return;
    setSaving(true);
    const done = () => {
      setUserAccount((prev) => (prev ? { ...prev, services: nextServices } : null));
      setServices(nextServices);
      setSaving(false);
    };
    if (ownerUserId && organization?.id) {
      updateOrgServices(organization.id, currentUser.uid, nextServices)
        .then(done)
        .catch((err) => {
          console.error('Failed to save services:', err);
          setSaving(false);
        });
    } else {
      updateServices(currentUser.uid, nextServices)
        .then(done)
        .catch((err) => {
          console.error('Failed to save services:', err);
          setSaving(false);
        });
    }
  };

  const handleRemoveClick = (service) => {
    setServiceToDelete(service);
    setDeleteDialogOpen(true);
  };

  const handleRemoveConfirm = async () => {
    if (!serviceToDelete || !currentUser?.uid) return;

    try {
      setSaving(true);

      const updatedServices = services.filter((s) => s.id !== serviceToDelete.id);

      const currentTeamMembers = userAccount?.teamMembers || [];
      const updatedTeamMembers = currentTeamMembers.map((member) => {
        if (member.services && Array.isArray(member.services)) {
          const updatedMemberServices = member.services.filter(
            (serviceName) => serviceName !== serviceToDelete.name
          );
          if (updatedMemberServices.length !== member.services.length) {
            return {
              ...member,
              services: updatedMemberServices.length > 0 ? updatedMemberServices : undefined,
            };
          }
        }
        return member;
      });

      const teamMembersChanged = JSON.stringify(currentTeamMembers) !== JSON.stringify(updatedTeamMembers);

      if (ownerUserId && organization?.id) {
        await updateOrgServices(
          organization.id,
          currentUser.uid,
          updatedServices,
          teamMembersChanged ? updatedTeamMembers : undefined
        );
      } else {
        await updateServices(currentUser.uid, updatedServices);
        if (teamMembersChanged && updatedTeamMembers.length > 0) {
          await updateTeamMembers(currentUser.uid, updatedTeamMembers);
        }
      }

      setUserAccount((prev) =>
        prev
          ? {
              ...prev,
              services: updatedServices,
              teamMembers: teamMembersChanged ? updatedTeamMembers : prev.teamMembers,
            }
          : null
      );
      setServices(updatedServices);

      setDeleteDialogOpen(false);
      setServiceToDelete(null);
    } catch (err) {
      console.error('Failed to delete service:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        serviceToDelete: serviceToDelete?.id,
        userId: currentUser?.uid,
      });
      alert(`Failed to delete service: ${err.message || 'Unknown error'}. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCancel = () => {
    setDeleteDialogOpen(false);
    setServiceToDelete(null);
  };

  const handleEdit = (service) => {
    setEditingService(service);
    setShowDrawer(true);
  };

  const handleServiceSubmit = (serviceData) => {
    let next;
    if (editingService) {
      next = services.map((s) => (s.id === editingService.id ? serviceData : s));
    } else {
      next = [...services, serviceData];
    }
    setServices(next);
    saveServices(next);
    setShowDrawer(false);
    setEditingService(null);
  };

  const handleCancel = () => {
    setShowDrawer(false);
    setEditingService(null);
  };

  return (
    <>
      <Head>
        <title>Services - GoManagr</title>
        <meta name="description" content="Manage your services" />
      </Head>

      <div className="space-y-6">
        <PageHeader
          title="Services"
          description="Manage your services and assign them to team members. Services can be selected when creating appointments."
          actions={
            <>
              <PrimaryButton 
                type="button" 
                onClick={() => {
                  setEditingService(null);
                  setShowDrawer(true);
                }} 
                className="gap-2">
                <HiPlus className="w-5 h-5" />
                Add service
              </PrimaryButton>
              {saving && <span className="text-sm text-gray-500 dark:text-gray-400">Saving…</span>}
            </>
          }
        />

        {!loaded ? (
          <p className="text-gray-500 dark:text-gray-400">Loading…</p>
        ) : (
          <>
            <Drawer
              isOpen={showDrawer}
              onClose={handleCancel}
              title={editingService ? 'Edit Service' : 'Add Service'}
            >
              <AddServiceForm
                teamMembers={teamMembers}
                existingServices={services}
                initialService={editingService}
                onSubmit={handleServiceSubmit}
                onCancel={handleCancel}
                saving={saving}
              />
            </Drawer>

            <ConfirmationDialog
              isOpen={deleteDialogOpen}
              onClose={handleRemoveCancel}
              onConfirm={handleRemoveConfirm}
              title="Delete Service"
              message={`Are you sure you want to delete "${serviceToDelete?.name || 'this service'}"? This action cannot be undone and will remove all assignments to team members.`}
              confirmText="Delete"
              cancelText="Cancel"
              confirmationWord="delete"
              variant="danger"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedServices.map((service) => {
                const assignedMembers = service.assignedTeamMemberIds
                  ?.map((id) => {
                    const member = teamMembers.find((m) => m.id === id);
                    return member?.name;
                  })
                  .filter(Boolean) || [];

                return (
                  <div
                    key={service.id}
                    className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg hover:border-primary-200 dark:hover:border-primary-600 transition-all duration-300 flex flex-col"
                  >
                    {/* Header with gradient background */}
                    <div className="relative bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 px-5 py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <HiClipboardList className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-white truncate">{service.name}</h3>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(service);
                            }}
                            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
                            title="Edit service"
                          >
                            <HiPencil className="size-5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveClick(service);
                            }}
                            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
                            title="Delete service"
                            disabled={saving}
                          >
                            <HiTrash className="size-5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Content area */}
                    <div className="p-5 flex-1 flex flex-col">
                      {/* Description */}
                      {service.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2 leading-relaxed">
                          {service.description}
                        </p>
                      )}

                      {/* Assigned team members */}
                      {assignedMembers.length > 0 ? (
                        <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                          <div className="flex items-center gap-2 mb-2">
                            <HiUserGroup className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              Assigned to {assignedMembers.length} {assignedMembers.length === 1 ? 'member' : 'members'}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {assignedMembers.slice(0, 5).map((name) => (
                              <span
                                key={name}
                                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-100 dark:border-primary-800"
                              >
                                {name}
                              </span>
                            ))}
                            {assignedMembers.length > 5 && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                                +{assignedMembers.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                          <p className="text-xs text-gray-400 dark:text-gray-500 italic">No team members assigned</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {services.length > 0 && (
              <Paginator
                currentPage={currentPage}
                totalItems={services.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={handleItemsPerPageChange}
                itemsPerPageOptions={[6, 12, 24, 48, 96]}
                showItemsPerPage={true}
                maxVisiblePages={5}
                showInfo={false}
                showFirstLast={false}
                className="mt-6"
              />
            )}

            {services.length === 0 && (
              <EmptyState
                type="services"
                action={
                  <PrimaryButton
                    type="button"
                    onClick={() => {
                      setEditingService(null);
                      setShowDrawer(true);
                    }}
                    className="gap-2"
                  >
                    <HiPlus className="w-5 h-5" />
                    Add your first service
                  </PrimaryButton>
                }
              />
            )}
          </>
        )}
      </div>
    </>
  );
}

export default function ServicesPage() {
  return (
    <ServicesContent />
  );
}
