import { useEffect } from 'react';
import { useRouter } from 'next/router';

/**
 * Legacy route: redirect to main Marketing Campaigns page (email is the default view).
 */
export default function EmailMarketingPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/marketing');
  }, [router]);

  return null;
}
