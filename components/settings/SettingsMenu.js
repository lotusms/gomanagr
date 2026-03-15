import { HiOfficeBuilding, HiColorSwatch, HiShieldCheck, HiCreditCard, HiCog, HiUserGroup, HiPuzzle } from 'react-icons/hi';
import { SidebarNav } from '@/components/ui';

const SETTINGS_SECTIONS = [
  { id: 'general', label: 'General', icon: HiCog },
  { id: 'organization', label: 'Organization', icon: HiOfficeBuilding },
  { id: 'team-access', label: 'Team Access', icon: HiUserGroup },
  { id: 'theme', label: 'Theme', icon: HiColorSwatch },
  { id: 'security', label: 'Security', icon: HiShieldCheck },
  { id: 'integrations', label: 'Integrations', icon: HiPuzzle },
  { id: 'billing', label: 'Billing', icon: HiCreditCard },
];

export default function SettingsMenu({ activeSection, onSectionChange, hiddenSections = [], sectionLabelOverrides = {} }) {
  const visibleSections = SETTINGS_SECTIONS.filter((s) => !hiddenSections.includes(s.id));
  return (
    <SidebarNav
      items={visibleSections}
      activeId={activeSection}
      onSelect={onSectionChange}
      ariaLabel="Settings sections"
      labelOverrides={sectionLabelOverrides}
    />
  );
}
