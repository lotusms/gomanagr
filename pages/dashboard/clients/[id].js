import { useEffect } from 'react';
import { useRouter } from 'next/router';

/**
 * Legacy client URL handler. Redirects to the correct page:
 * - /dashboard/clients/new -> /dashboard/clients/new (new.js)
 * - /dashboard/clients/[id] -> /dashboard/clients/[id]/edit (edit page)
 */
export default function ClientIdRedirect() {
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    if (id === undefined) return;
    if (id === 'new') {
      router.replace('/dashboard/clients/new');
      return;
    }
    router.replace(`/dashboard/clients/${id}/edit`);
  }, [id, router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        <p className="mt-4 text-gray-600 dark:text-gray-400">Redirecting...</p>
      </div>
    </div>
  );
}
