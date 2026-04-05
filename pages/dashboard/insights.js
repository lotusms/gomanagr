import Head from 'next/head';
import dynamic from 'next/dynamic';

const InsightsPageContent = dynamic(
  () => import('@/components/insights/InsightsPageContent'),
  {
    ssr: false,
    loading: () => (
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6 animate-pulse">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-48" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 max-w-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mt-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-72 rounded-2xl bg-gray-200/80 dark:bg-gray-800/80" />
          ))}
        </div>
      </div>
    ),
  }
);

export default function InsightsPage() {
  return (
    <>
      <Head>
        <title>Insights | GoManagr</title>
        <meta name="description" content="Reports, analytics, and visual insights for your business." />
      </Head>
      <InsightsPageContent />
    </>
  );
}
