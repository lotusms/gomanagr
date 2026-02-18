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
  // Initialize with Basic Information (or first section) open by default for accordion view
  const defaultOpenSection = defaultTab || sections[0]?.value || 'basic';
  const [openSections, setOpenSections] = useState({
    [defaultOpenSection]: true,
  });
  
  const toggleSection = (value) => {
    setOpenSections(prev => {
      // If clicking the already open section, close it
      if (prev[value]) {
        return { [defaultOpenSection]: false };
      }
      // Otherwise, open only this section (close all others)
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
