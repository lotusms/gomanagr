import { useState, useMemo } from 'react';
import { ChipsMulti, Checkbox } from '@/components/ui';

const SECTIONS_OPTIONS = [
  'Client management',
  'Lead Tracking',
  'Onboarding',
  'Messaging',
  'File sharing',
  'Scheduling',
  'Invoicing / payments',
  'Staff Management',
  'Portfolio / Project Management',
  'Task Management',
  'Requests & Approvals',
  'Resources Management',
];

export default function Step5Sections({ data, updateData, errors }) {
  // Use null check - don't default to [] to avoid validation issues
  const selectedSections = data.sectionsToTrack !== null && data.sectionsToTrack !== undefined 
    ? data.sectionsToTrack 
    : [];

  const handleSectionsChange = (newSections) => {
    updateData({ sectionsToTrack: newSections });
  };

  const allSelected = useMemo(() => {
    return selectedSections.length === SECTIONS_OPTIONS.length;
  }, [selectedSections]);

  const handleSelectAll = (checked) => {
    if (checked) {
      updateData({ sectionsToTrack: [...SECTIONS_OPTIONS] });
    } else {
      updateData({ sectionsToTrack: [] });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">What sections are you looking to track or manage?</h2>
        <p className="text-primary-200">Select all that apply - more can be added later</p>
      </div>

      <div className="pb-2 border-b border-white/20">
        <Checkbox
          id="selectAllSections"
          checked={allSelected}
          onCheckedChange={handleSelectAll}
        >
          <span className="text-white font-medium">Select All</span>
        </Checkbox>
      </div>

      <ChipsMulti
        id="sectionsToTrack"
        label="Sections to Track"
        options={SECTIONS_OPTIONS}
        value={selectedSections}
        onValueChange={handleSectionsChange}
        error={errors.sectionsToTrack}
        required
        layout="grid"
      />
    </div>
  );
}
