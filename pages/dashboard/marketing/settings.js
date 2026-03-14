import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

/**
 * Marketing provider configuration has moved to Settings > API.
 * Redirect so bookmarks and old links still work.
 */
export default function MarketingSettingsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/settings?section=api');
  }, [router]);

  return (
    <>
      <Head>
        <title>Marketing Providers | GoManagr</title>
      </Head>
      <div className="space-y-6">
        <p className="text-gray-500 dark:text-gray-400">Redirecting to Settings…</p>
      </div>
    </>
  );
}
