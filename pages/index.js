import PublicLayout from '@/components/layouts/PublicLayout';
import { useAuth } from '@/lib/AuthContext';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';
import { useEffect, useState } from 'react';
import { FaCalendarAlt, FaBriefcase } from 'react-icons/fa';
import { MdAutoAwesome } from 'react-icons/md';
import { HiLightningBolt } from 'react-icons/hi';
import { FaChartBar } from 'react-icons/fa';

const FEATURE_DEMOS = [
  {
    key: 'operations',
    name: 'Operations Hub',
    icon: FaBriefcase,
    image: '/images/dashboard1.png',
    demoIdea: 'Manage clients, projects, and daily operations from one centralized workspace designed for team visibility and execution.',
  },
  {
    key: 'scheduling',
    name: 'Scheduling',
    icon: FaCalendarAlt,
    image: '/images/schedule.png',
    demoIdea: 'Plan shifts with confidence using real-time availability, conflict prevention, and schedule visibility across your team.',
  },
  {
    key: 'ai-agent',
    name: 'AI Agent',
    icon: MdAutoAwesome,
    image: '/images/hermes.png',
    demoIdea: 'Leverage AI-assisted workflows directly in the dashboard to streamline decisions, prioritization, and task execution.',
  },
  {
    key: 'automation',
    name: 'Automation',
    icon: HiLightningBolt,
    image: '/images/invoices.png',
    demoIdea: 'Automate invoicing and recurring processes to reduce manual follow-up, improve consistency, and save operational time.',
  },
  {
    key: 'insights',
    name: 'Insights',
    icon: FaChartBar,
    image: '/images/insights.png',
    demoIdea: 'Monitor business performance with live metrics, trend analysis, and decision-ready insights in one place.',
  },
];

export default function LandingPage() {
  const { currentUser, loading } = useAuth();
  const [activeDemoKey, setActiveDemoKey] = useState(FEATURE_DEMOS[0].key);
  const activeDemo = FEATURE_DEMOS.find((item) => item.key === activeDemoKey) || FEATURE_DEMOS[0];

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveDemoKey((currentKey) => {
        const currentIndex = FEATURE_DEMOS.findIndex((item) => item.key === currentKey);
        const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % FEATURE_DEMOS.length : 0;
        return FEATURE_DEMOS[nextIndex].key;
      });
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, []);

  if (loading) {
    return (
      <PublicLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            <p className="mt-4 text-white">Loading...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout title="GoManagr - A complete Business Management Suite">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
           Business Management Suite
            <br />
            <span className="text-primary-200">for modern organizations.</span>
          </h1>
          <p className="text-xl md:text-2xl text-primary-100 mb-10 max-w-3xl mx-auto">
            GoManagr unifies client management, staff coordination, project tracking, scheduling, and more in one platform, with the flexibility to adapt to most industries.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <PrimaryButton asChild>
              <a href="mailto:support@gomanagr.com">Request a demo</a>
            </PrimaryButton>
            <SecondaryButton href="/signup">
              Start free trial
            </SecondaryButton>
          </div>
        </div>
      </section>

      {/* Feature Highlight Section */}
      <section id="features" className="relative -mt-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              {FEATURE_DEMOS.map((feature) => {
                const IconComponent = feature.icon;
                const isActive = activeDemoKey === feature.key;
                return (
                  <button
                    key={feature.name}
                    type="button"
                    onClick={() => setActiveDemoKey(feature.key)}
                    className={`text-center cursor-pointer group rounded-xl p-2 transition-all ${
                      isActive ? 'bg-white/10 ring-1 ring-white/30' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="text-4xl mb-2 group-hover:scale-110 transition-transform flex items-center justify-center text-white">
                      <IconComponent />
                    </div>
                    <div className="text-white font-medium mb-2">{feature.name}</div>
                    <div className={`h-1 rounded-full mx-auto transition-all opacity-90 ${
                      isActive ? 'bg-secondary-500 w-16' : 'bg-secondary-500/80 w-12 group-hover:w-16'
                    }`}></div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Product Mockup Section */}
      <section className="mt-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/95 dark:bg-gray-900/90 rounded-2xl shadow-2xl overflow-hidden border border-white/20">
            <div className="px-6 py-5 border-b border-gray-200/70 dark:border-gray-700/70 bg-gray-50/70 dark:bg-gray-800/60">
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100">
                {activeDemo.name} Demo
              </h3>
              <p className="mt-1 text-sm md:text-base text-gray-600 dark:text-gray-300">
                {activeDemo.demoIdea}
              </p>
            </div>
            <div className="p-4 md:p-6 bg-slate-100 dark:bg-slate-900">
              <img
                src={activeDemo.image}
                alt={`${activeDemo.name} feature demo`}
                className="w-full h-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Additional CTA Section */}
      <section className="mt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to transform your customer service?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join thousands of companies delivering exceptional customer experiences.
          </p>
          <PrimaryButton href="/signup">
            Start your free trial
          </PrimaryButton>
        </div>
      </section>
    </PublicLayout>
  );
}
