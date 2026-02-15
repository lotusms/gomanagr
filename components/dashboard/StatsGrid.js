import {
  HiFolder,
  HiClipboardList,
  HiUsers,
  HiCheckCircle,
} from 'react-icons/hi';

const STATS = [
  { title: 'Total Projects', value: '12', change: '+2', color: 'bg-blue-500', Icon: HiFolder },
  { title: 'Active Tasks', value: '8', change: '+3', color: 'bg-green-500', Icon: HiClipboardList },
  { title: 'Team Members', value: '24', change: '+1', color: 'bg-primary-500', Icon: HiUsers },
  { title: 'Completed', value: '156', change: '+12', color: 'bg-orange-500', Icon: HiCheckCircle },
];

const StatCard = ({ title, value, change, color, Icon }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div
          className={`${color} w-12 h-12 rounded-lg flex items-center justify-center text-white`}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <p className="text-sm text-green-600 mt-4">{change} from last month</p>
    </div>
);

export default function StatsGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {STATS.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
}
