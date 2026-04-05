import Head from 'next/head';
import TimesheetsPageContent from '@/components/timesheets/TimesheetsPageContent';

export default function TimesheetsPage() {
  return (
    <>
      <Head>
        <title>Time tracking | GoManagr</title>
        <meta
          name="description"
          content="Track time for payroll, billing, and job costing—flexible modes and industry-aware defaults."
        />
      </Head>
      <TimesheetsPageContent />
    </>
  );
}
