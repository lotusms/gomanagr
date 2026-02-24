import { useState } from 'react';
import TabsComponent from '@/components/ui/Tabs';
import CollapsibleSection from './CollapsibleSection';

/**
 * Responsive wrapper that shows tabs on md+ screens and accordion on mobile
 * 
 * @param {Object} props
 * @param {Array<{value: string, label: string, content: React.ReactNode}>} props.sections - Array of section items
 * @param {string} props.defaultTab - Default selected tab value
 */
export default function ResponsiveSectionWrapper({ sections = [], defaultTab }) {
  const defaultOpenSection = defaultTab || sections[0]?.value || 'basic';
  const [openSections, setOpenSections] = useState({
    [defaultOpenSection]: true,
  });
  
  const toggleSection = (value) => {
    setOpenSections(prev => {
      if (prev[value]) {
        return { [defaultOpenSection]: false };
      }
      return { [value]: true };
    });
  };

  return (
    <>
      {/* Mobile/Tablet: Accordion view */}
      <div className="lg:hidden space-y-4">
        {sections.map((section) => (
          <CollapsibleSection
            key={section.value}
            title={section.label}
            isOpen={openSections[section.value] || false}
            onToggle={() => toggleSection(section.value)}
          >
            {section.content}
          </CollapsibleSection>
        ))}
      </div>
      
      {/* Desktop: Tabs view */}
      <div className="hidden lg:block">
        <TabsComponent
          items={sections}
          defaultValue={defaultTab || sections[0]?.value}
          variant="light"
        />
      </div>
    </>
  );
}
