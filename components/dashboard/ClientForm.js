import { useState, useEffect } from 'react';
import InputField from '@/components/ui/InputField';
import { PrimaryButton, SecondaryButton } from '@/components/ui/buttons';

/**
 * Client Form Component
 * @param {Object} props
 * @param {Object} props.initialClient - Existing client to edit (optional)
 * @param {Function} props.onSubmit - Callback when form is submitted (receives { name, company })
 * @param {Function} props.onCancel - Callback when form is cancelled
 * @param {boolean} props.saving - Whether form is saving
 */
export default function ClientForm({
  initialClient = null,
  onSubmit,
  onCancel,
  saving = false,
}) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [errors, setErrors] = useState({});

  // Initialize form from initialClient if editing
  useEffect(() => {
    if (initialClient) {
      setName(initialClient.name || '');
      setCompany(initialClient.company || '');
    } else {
      setName('');
      setCompany('');
    }
    setErrors({});
  }, [initialClient]);

  const validate = () => {
    const newErrors = {};

    if (!name || name.trim() === '') {
      newErrors.name = 'Please enter a client name';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      name: name.trim(),
      company: company.trim() || '',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6">
      <div>
        <InputField
          id="clientName"
          type="text"
          label="Client Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErrors((prev) => ({ ...prev, name: '' }));
          }}
          placeholder="Enter client name"
          required
          error={errors.name}
          variant="light"
          autoFocus
        />
      </div>

      <div>
        <InputField
          id="clientCompany"
          type="text"
          label="Company (Optional)"
          value={company}
          onChange={(e) => {
            setCompany(e.target.value);
            setErrors((prev) => ({ ...prev, company: '' }));
          }}
          placeholder="Enter company name"
          variant="light"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <SecondaryButton type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={saving}>
          {saving ? 'Saving...' : initialClient ? 'Update Client' : 'Add Client'}
        </PrimaryButton>
      </div>
    </form>
  );
}
