import PublicLayout from '@/components/layouts/PublicLayout';
import { PrimaryButton } from '@/components/ui/buttons';
import { FaCalendarAlt, FaBriefcase, FaChartBar } from 'react-icons/fa';
import { MdAutoAwesome } from 'react-icons/md';
import { HiLightningBolt } from 'react-icons/hi';

const SOLUTION_ITEMS = [
  {
    title: 'Operations Hub',
    description:
      'Coordinate clients, projects, proposals, invoices, and execution workflows in one place with role-aware access.',
    icon: FaBriefcase,
  },
  {
    title: 'Scheduling',
    description:
      'Build team schedules, prevent conflicts, and keep everyone aligned with shared visibility across shifts and meetings.',
    icon: FaCalendarAlt,
  },
  {
    title: 'Hermes AI Agent',
    description:
      'Ask operational questions in plain language and get practical recommendations informed by your business context.',
    icon: MdAutoAwesome,
  },
  {
    title: 'Automation',
    description:
      'Reduce manual busywork with repeatable invoicing and workflow automations that keep your team moving.',
    icon: HiLightningBolt,
  },
  {
    title: 'Insights',
    description:
      'Track performance with actionable metrics and trends so leaders can make faster, more confident decisions.',
    icon: FaChartBar,
  },
];

export default function SolutionsPage() {
  return (
    <PublicLayout title="Solutions | GoManagr">
      <section className="pt-20 pb-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white">Solutions for Service Teams</h1>
          <p className="mt-4 text-lg text-primary-100 max-w-3xl mx-auto">
            GoManagr brings operations, scheduling, communication, billing, and AI assistance together so teams can
            execute with less friction and more clarity.
          </p>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 pb-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {SOLUTION_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-2xl bg-white/95 dark:bg-gray-900/90 border border-white/20 shadow-xl p-6"
              >
                <div className="w-11 h-11 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center">
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
        <div className="max-w-6xl mx-auto rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm p-8 text-center">
          <h3 className="text-2xl font-bold text-white">See how GoManagr fits your workflow</h3>
          <p className="mt-2 text-primary-100">
            Start free and adapt features to your process as your team grows.
          </p>
          <div className="mt-6">
            <PrimaryButton href="/signup">Start free trial</PrimaryButton>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
