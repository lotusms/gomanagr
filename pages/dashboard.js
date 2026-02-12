import Head from 'next/head';
import { useAuth } from '@/client/lib/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layouts/DashboardLayout';

function DashboardContent() {
  const { currentUser } = useAuth();

  return (
    <>
      <Head>
        <title>Dashboard - GoManagr</title>
        <meta name="description" content="Your dashboard" />
      </Head>

      <div className="space-y-6">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back{currentUser?.email ? `, ${currentUser.email.split('@')[0]}` : ''}!
          </h1>
          <p className="text-gray-600">
            Here's what's happening with your account today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: 'Total Projects', value: '12', change: '+2', color: 'bg-blue-500' },
            { title: 'Active Tasks', value: '8', change: '+3', color: 'bg-green-500' },
            { title: 'Team Members', value: '24', change: '+1', color: 'bg-purple-500' },
            { title: 'Completed', value: '156', change: '+12', color: 'bg-orange-500' },
          ].map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl`}>
                  📊
                </div>
              </div>
              <p className="text-sm text-green-600 mt-4">{stat.change} from last month</p>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {[
                { action: 'Created new project', time: '2 hours ago', user: 'You' },
                { action: 'Updated team settings', time: '5 hours ago', user: 'Admin' },
                { action: 'Completed task', time: '1 day ago', user: 'You' },
                { action: 'Added new team member', time: '2 days ago', user: 'Admin' },
              ].map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-gray-900 font-medium">{activity.action}</p>
                    <p className="text-sm text-gray-500">{activity.user} • {activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* User Info Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span className="font-medium text-gray-900">{currentUser?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">User ID:</span>
              <span className="font-mono text-sm text-gray-900">{currentUser?.uid}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <DashboardContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
