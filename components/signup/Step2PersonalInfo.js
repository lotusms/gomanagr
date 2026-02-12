import { useState } from 'react';
import { InputField, ChipsSingle } from '@/components/ui';

const PURPOSE_OPTIONS = ['Work', 'Personal', 'School', 'Nonprofit'];
const ROLE_OPTIONS = [
  'Owner',
  'C-level',
  'Director',
  'President',
  'VP',
  'Team Leader',
  'Team Member',
  'Freelancer',
  'Student',
  'Researcher',
];

export default function Step2PersonalInfo({ data, updateData, errors }) {
  const [firstName, setFirstName] = useState(data.firstName || '');
  const [lastName, setLastName] = useState(data.lastName || '');

  const handleFirstNameChange = (e) => {
    const value = e.target.value;
    setFirstName(value);
    updateData({ firstName: value });
  };

  const handleLastNameChange = (e) => {
    const value = e.target.value;
    setLastName(value);
    updateData({ lastName: value });
  };

  const handlePurposeChange = (purpose) => {
    updateData({ purpose });
  };

  const handleRoleChange = (role) => {
    updateData({ role });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Tell us about yourself</h2>
        <p className="text-purple-200">Help us personalize your experience</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <InputField
          id="firstName"
          type="text"
          label="First Name"
          value={firstName}
          onChange={handleFirstNameChange}
          placeholder="John"
          required
          error={errors.firstName}
        />

        <InputField
          id="lastName"
          type="text"
          label="Last Name"
          value={lastName}
          onChange={handleLastNameChange}
          placeholder="Doe"
          required
          error={errors.lastName}
        />
      </div>

      <ChipsSingle
        id="purpose"
        label="What brings you here today?"
        options={PURPOSE_OPTIONS}
        value={data.purpose}
        onValueChange={handlePurposeChange}
        error={errors.purpose}
        required
      />

      <ChipsSingle
        id="role"
        label="What is your role?"
        options={ROLE_OPTIONS}
        value={data.role}
        onValueChange={handleRoleChange}
        error={errors.role}
        required
      />
    </div>
  );
}
