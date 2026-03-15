import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

/**
 * Marketing provider configuration lives on the Marketing page.
 * Redirect so bookmarks and old links still work.
 */
export default function MarketingSettingsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/marketing');
  }, [router]);

  return (
    <>
      <Head>
        <title>Marketing Providers | GoManagr</title>
      </Head>
      <div className="space-y-6">
        <p className="text-gray-500 dark:text-gray-400">Redirecting to Marketing…</p>
      </div>
    </>
  );
}
