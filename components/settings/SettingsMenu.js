import { HiOfficeBuilding, HiColorSwatch, HiShieldCheck, HiCode, HiCreditCard, HiCog } from 'react-icons/hi';

const SETTINGS_SECTIONS = [
  { id: 'general', label: 'General', icon: HiCog },
  { id: 'organization', label: 'Organization', icon: HiOfficeBuilding },
  { id: 'theme', label: 'Theme', icon: HiColorSwatch },
  { id: 'security', label: 'Security', icon: HiShieldCheck },
  { id: 'api', label: 'API', icon: HiCode },
  { id: 'billing', label: 'Billing', icon: HiCreditCard },
];

export default function SettingsMenu({ activeSection, onSectionChange }) {
  return (
    <nav className="flex-shrink-0 w-full lg:w-56">
      <ul className="space-y-1 bg-white rounded-lg shadow p-2">
        {SETTINGS_SECTIONS.map(({ id, label, icon: Icon }) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => onSectionChange(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left font-medium transition-colors ${
                activeSection === id
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
