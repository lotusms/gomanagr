import { ChipsMulti } from '@/components/ui';

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

export default function Step4Sections({ data, updateData, errors }) {
  const selectedSections = data.sectionsToTrack || [];

  const handleSectionsChange = (newSections) => {
    updateData({ sectionsToTrack: newSections });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">What sections are you looking to track or manage?</h2>
        <p className="text-primary-200">Select all that apply - more can be added later</p>
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
