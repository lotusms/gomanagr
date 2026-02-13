import { useState, useRef } from 'react';
import { InputField, ChipsSingle } from '@/components/ui';

const TEAM_SIZE_OPTIONS = ['Myself', '2-5', '6-10', '11-25', '26+'];
const COMPANY_SIZE_OPTIONS = ['Myself', '2-5', '6-10', '11-25', '26-50', '51-100', '101+'];
const COMPANY_LOCATIONS_OPTIONS = ['1', '2-5', '6-10', '11-20', '21-50', '51+'];

export default function Step3CompanyInfo({ data, updateData, errors }) {
  const [companyName, setCompanyName] = useState(data.companyName || '');
  const [logoPreview, setLogoPreview] = useState(data.logoPreview || null);
  const fileInputRef = useRef(null);

  const handleCompanyNameChange = (e) => {
    const value = e.target.value;
    setCompanyName(value);
    updateData({ companyName: value });
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const preview = reader.result;
        setLogoPreview(preview);
        updateData({ logoPreview: preview, logoFile: file });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    updateData({ logoPreview: null, logoFile: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTeamSizeChange = (size) => {
    updateData({ teamSize: size });
  };

  const handleCompanySizeChange = (size) => {
    updateData({ companySize: size });
  };

  const handleLocationsChange = (locations) => {
    updateData({ companyLocations: locations });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Company Information</h2>
        <p className="text-primary-200">Tell us about your organization</p>
      </div>

      <InputField
        id="companyName"
        type="text"
        label="Company Name"
        value={companyName}
        onChange={handleCompanyNameChange}
        placeholder="Acme Inc."
        required
        error={errors.companyName}
      />

      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Company Logo (Optional)
        </label>
        <div className="space-y-3">
          {logoPreview ? (
            <div className="relative inline-block">
              <img
                src={logoPreview}
                alt="Logo preview"
                className="w-24 h-24 object-contain bg-white rounded-lg p-2"
              />
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-3 border-2 border-dashed border-white/30 bg-white/5 rounded-lg text-white hover:bg-white/10 transition"
            >
              + Upload Logo
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoChange}
            className="hidden"
          />
          <p className="text-xs text-primary-200">You can add this later</p>
        </div>
      </div>

      <ChipsSingle
        id="teamSize"
        label="Team Size"
        options={TEAM_SIZE_OPTIONS}
        value={data.teamSize}
        onValueChange={handleTeamSizeChange}
        error={errors.teamSize}
        required
      />

      <ChipsSingle
        id="companySize"
        label="Company Size"
        options={COMPANY_SIZE_OPTIONS}
        value={data.companySize}
        onValueChange={handleCompanySizeChange}
        error={errors.companySize}
        required
      />

      <ChipsSingle
        id="companyLocations"
        label="Company Locations"
        options={COMPANY_LOCATIONS_OPTIONS}
        value={data.companyLocations}
        onValueChange={handleLocationsChange}
        error={errors.companyLocations}
        required
      />
    </div>
  );
}
