import InputField from '@/components/ui/InputField';
import PhoneNumberInput from '@/components/ui/PhoneNumberInput';
import * as Label from '@radix-ui/react-label';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { getLabelClasses, FORM_CONTROL_HEIGHT } from '@/components/ui/formControlStyles';

export default function BasicInfoSection({
  firstName,
  lastName,
  clientId,
  status,
  phone,
  email,
  preferredCommunication,
  errors,
  onFirstNameChange,
  onLastNameChange,
  onPhoneChange,
  onEmailChange,
  onStatusChange,
  onPreferredCommunicationChange,
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            id="firstName"
            label="First Name"
            value={firstName}
            onChange={onFirstNameChange}
            required
            error={errors.firstName}
            variant="light"
          />
          <InputField
            id="lastName"
            label="Last Name"
            value={lastName}
            onChange={onLastNameChange}
            required
            error={errors.lastName}
            variant="light"
          />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            id="clientId"
            label="Client ID"
            value={clientId}
            onChange={() => {}}
            placeholder="Auto-generated"
            disabled
            variant="light"
          />
          <div>
            <Label.Root htmlFor="status" className={`${getLabelClasses('light')} mb-2 block`}>
              Status
            </Label.Root>
            <ToggleGroup.Root
              id="status"
              type="single"
              value={status || 'active'}
              onValueChange={(value) => {
                if (value) onStatusChange(value);
              }}
              className={`inline-flex rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-0.5 ${FORM_CONTROL_HEIGHT}`}
            >
              <ToggleGroup.Item
                value="active"
                className={`
                  px-3 py-1.5 text-sm font-medium rounded transition-all h-full
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
                  ${
                    status === 'active'
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }
                `}
              >
                Active
              </ToggleGroup.Item>
              <ToggleGroup.Item
                value="inactive"
                className={`
                  px-3 py-1.5 text-sm font-medium rounded transition-all h-full
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
                  ${
                    status === 'inactive'
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }
                `}
              >
                Inactive
              </ToggleGroup.Item>
            </ToggleGroup.Root>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          <PhoneNumberInput
            id="phone"
            label="Phone"
            value={phone}
            onChange={onPhoneChange}
            placeholder="(717) 123-4567"
            variant="light"
          />
          <InputField
            id="email"
            label="Email"
            sublabel="Email must be entered for invoicing purposes."
            type="email"
            value={email}
            onChange={onEmailChange}
            placeholder="email@example.com"
            variant="light"
          />
          <div>
            <Label.Root htmlFor="preferredCommunication" className={`${getLabelClasses('light')} mb-2 block`}>
              Preferred Communication Method
            </Label.Root>
            <ToggleGroup.Root
              id="preferredCommunication"
              type="single"
              value={preferredCommunication || 'email'}
              onValueChange={(value) => {
                if (value) onPreferredCommunicationChange(value);
              }}
              className={`inline-flex rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-0.5 ${FORM_CONTROL_HEIGHT}`}
            >
              <ToggleGroup.Item
                value="email"
                className={`
                  px-3 py-1.5 text-sm font-medium rounded transition-all h-full
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
                  ${
                    preferredCommunication === 'email'
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }
                `}
              >
                Email
              </ToggleGroup.Item>
              <ToggleGroup.Item
                value="phone"
                className={`
                  px-3 py-1.5 text-sm font-medium rounded transition-all h-full
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
                  ${
                    preferredCommunication === 'phone'
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }
                `}
              >
                Phone
              </ToggleGroup.Item>
              <ToggleGroup.Item
                value="sms"
                className={`
                  px-3 py-1.5 text-sm font-medium rounded transition-all h-full
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
                  ${
                    preferredCommunication === 'sms'
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }
                `}
              >
                SMS
              </ToggleGroup.Item>
            </ToggleGroup.Root>
          </div>
        </div>
      </div>
    </div>
  );
}
