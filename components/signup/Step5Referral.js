import { ChipsSingle } from '@/components/ui';

const REFERRAL_OPTIONS = [
  'Social network',
  'Google',
  'Referral',
  'We Reached Out',
  'Other',
];

export default function Step5Referral({ data, updateData, errors }) {
  const handleReferralChange = (source) => {
    updateData({ referralSource: source });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">How did you hear about us?</h2>
        <p className="text-primary-200">Help us understand how you found GoManagr</p>
      </div>

      <ChipsSingle
        id="referralSource"
        label="Referral Source"
        options={REFERRAL_OPTIONS}
        value={data.referralSource}
        onValueChange={handleReferralChange}
        error={errors.referralSource}
        layout="vertical"
      />
    </div>
  );
}
