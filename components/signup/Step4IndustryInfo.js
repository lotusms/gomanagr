import { ChipsSingle } from '@/components/ui';
import { INDUSTRIES } from '@/components/clients/clientProfileConstants';

export default function Step4IndustryInfo({ data, updateData, errors }) {
  const selectedIndustry = data.industry || '';

  const handleIndustryChange = (industry) => {
    updateData({ industry });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Industry Information</h2>
        <p className="text-primary-200">Select your industry - this can be changed later</p>
      </div>

      <ChipsSingle
        id="industry"
        label="Industry"
        options={INDUSTRIES}
        value={selectedIndustry}
        onValueChange={handleIndustryChange}
        error={errors.industry}
        required
        layout="grid"
      />
    </div>
  );
}
