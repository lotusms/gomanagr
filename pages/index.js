import PublicLayout from '@/components/layouts/PublicLayout';
import { useAuth } from '@/client/lib/AuthContext';
import { PrimaryButton, SecondaryButton } from '@/components/buttons';
import { FaCalendarAlt, FaFolderOpen } from 'react-icons/fa';
import { MdAutoAwesome } from 'react-icons/md';
import { HiLightningBolt } from 'react-icons/hi';
import { FaChartBar } from 'react-icons/fa';

export default function LandingPage() {
  const { currentUser, loading } = useAuth();

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
            GoManagr unifies client management, staff coordination, project tracking, and scheduling, and more in one platform.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <PrimaryButton href="/signup">
              Request a demo
            </PrimaryButton>
            <SecondaryButton href="/signup">
              Start free trial
            </SecondaryButton>
          </div>
        </div>
      </section>

      {/* Feature Highlight Section */}
      <section className="relative -mt-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              {[
                { name: 'Organization', icon: FaFolderOpen },
                { name: 'Scheduling', icon: FaCalendarAlt },
                { name: 'AI Agent', icon: MdAutoAwesome },
                { name: 'Automation', icon: HiLightningBolt },
                { name: 'Insights', icon: FaChartBar },
              ].map((feature, index) => {
                const IconComponent = feature.icon;
                return (
                  <div
                    key={feature.name}
                    className="text-center cursor-pointer group"
                  >
                    <div className="text-4xl mb-2 group-hover:scale-110 transition-transform flex items-center justify-center text-white">
                      <IconComponent />
                    </div>
                    <div className="text-white font-medium mb-2">{feature.name}</div>
                    <div className="h-1 bg-secondary-500 rounded-full mx-auto w-12 group-hover:w-16 transition-all opacity-90"></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Product Mockup Section */}
      <section className="mt-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Mock Dashboard Interface */}
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-gray-700 font-semibold">Open</span>
                <div className="flex space-x-2">
                  <button className="p-1 text-gray-500 hover:text-gray-700">🔽</button>
                  <button className="p-1 text-gray-500 hover:text-gray-700">🔍</button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
              {/* Left Panel - Conversation List */}
              <div className="bg-white border-r border-gray-200 p-4">
                <div className="space-y-3">
                  {[
                    {
                      name: 'Kim Thompson',
                      subject: 'Loyalty Discount?',
                      preview: 'Hi there, I was wondering if...',
                      tag: 'VIP',
                      tagColor: 'bg-green-100 text-green-800',
                      time: 'NOW',
                    },
                    {
                      name: 'Lance Hodge',
                      subject: 'Change of address for order',
                      preview: 'Hi, I realized I accidentally...',
                      tag: 'Urgent',
                      tagColor: 'bg-amber-100 text-amber-800',
                      time: '3h',
                    },
                    {
                      name: 'Clara Baker',
                      subject: "Can't pair to app",
                      preview: '',
                      tag: null,
                      time: '5h',
                    },
                  ].map((conversation, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg cursor-pointer transition ${
                        index === 0 ? 'bg-primary-50 border-2 border-primary-200' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-primary-200 rounded-full flex items-center justify-center text-primary-800 font-semibold text-sm">
                            {conversation.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 text-sm">
                              {conversation.name}
                            </div>
                            <div className="text-xs text-gray-500">{conversation.time}</div>
                          </div>
                        </div>
                      </div>
                      <div className="font-medium text-gray-900 text-sm mb-1">
                        {conversation.subject}
                      </div>
                      {conversation.preview && (
                        <div className="text-xs text-gray-600 mb-2">{conversation.preview}</div>
                      )}
                      {conversation.tag && (
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${conversation.tagColor}`}
                        >
                          {conversation.tag}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Panel - Conversation Detail */}
              <div className="lg:col-span-2 bg-white p-6">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Loyalty Discount?</h2>
                    <div className="flex space-x-2">
                      <SecondaryButton className="!rounded-lg text-sm min-w-0 px-4 py-2">
                        Assign
                      </SecondaryButton>
                      <PrimaryButton className="!rounded-lg text-sm min-w-0 px-4 py-2">
                        Open
                      </PrimaryButton>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>Support Tier 1</span>
                    <span>•</span>
                    <span>SU-2132</span>
                    <span>•</span>
                    <span>1</span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                      VIP
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-start space-x-4 mb-4">
                    <div className="w-12 h-12 bg-primary-200 rounded-full flex items-center justify-center text-primary-800 font-semibold">
                      KT
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-semibold text-gray-900">Kim Thompson</span>
                        <span className="text-gray-500 text-sm">&lt;kim.thompson@gmail.com&gt;</span>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">To: GoManagr Customer Support</div>
                      <div className="text-gray-700 leading-relaxed">
                        Hi there, I was wondering if there was any long-time customer discount? I wanted to order another bike and was just curious if there was anything you could do. Huge fan and have told tons of friends about you guys.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
