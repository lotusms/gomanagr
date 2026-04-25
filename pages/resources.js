import PublicLayout from '@/components/layouts/PublicLayout';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import { HiBookOpen, HiDocumentText, HiPlay } from 'react-icons/hi';

const RESOURCE_ITEMS = [
  {
    title: 'Implementation Guides',
    description: 'Practical rollout checklists for onboarding your team, clients, and internal workflows.',
    icon: HiBookOpen,
  },
  {
    title: 'Templates and Playbooks',
    description: 'Reusable process templates for proposals, client communications, scheduling, and invoicing.',
    icon: HiDocumentText,
  },
  {
    title: 'Product Walkthroughs',
    description: 'Short training paths to help teams quickly adopt GoManagr features with confidence.',
    icon: HiPlay,
  },
];

export default function ResourcesPage() {
  return (
    <PublicLayout title="Resources | GoManagr">
      <section className="pt-20 pb-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white">Resources</h1>
          <p className="mt-4 text-lg text-primary-100 max-w-3xl mx-auto">
            Access practical guidance to onboard teams faster, standardize execution, and get more value from GoManagr.
          </p>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 pb-10">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {RESOURCE_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-2xl bg-white/95 dark:bg-gray-900/90 border border-white/20 shadow-xl p-6"
              >
                <div className="w-11 h-11 rounded-xl bg-secondary-100 text-secondary-700 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-gray-100">{item.title}</h2>
                <p className="mt-2 text-gray-600 dark:text-gray-300">{item.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-4xl mx-auto rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm p-8 text-center">
          <h3 className="text-2xl font-bold text-white">Need help choosing the right setup?</h3>
          <p className="mt-2 text-primary-100">
            Request a guided walkthrough and we will help map GoManagr to your current operations.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <PrimaryButton asChild>
              <a href="mailto:support@gomanagr.com">Request a demo</a>
            </PrimaryButton>
            <SecondaryButton href="/pricing" variant="light">
              View pricing
            </SecondaryButton>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
