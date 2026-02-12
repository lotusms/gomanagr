/**
 * UserAccount Model
 * 
 * This file documents the structure of documents in the 'useraccount' Firestore collection.
 * Each document uses the Firebase Auth user ID as its document ID for easy matching.
 * 
 * Collection: useraccount
 * Document ID: {firebaseAuthUserId}
 */

export const UserAccountSchema = {
  // Authentication & Basic Info
  userId: {
    type: 'string',
    required: true,
    description: 'Firebase Auth user ID (same as document ID)',
    example: 'abc123xyz789',
  },
  email: {
    type: 'string',
    required: true,
    description: 'User email address',
    example: 'john.doe@example.com',
  },
  trial: {
    type: 'boolean',
    required: true,
    default: true,
    description: 'Whether user is on free trial',
    example: true,
  },

  // Personal Information (Step 2)
  firstName: {
    type: 'string',
    required: true,
    description: 'User first name',
    example: 'John',
  },
  lastName: {
    type: 'string',
    required: true,
    description: 'User last name',
    example: 'Doe',
  },
  purpose: {
    type: 'string',
    required: true,
    enum: ['Work', 'Personal', 'School', 'Nonprofit'],
    description: 'What brings the user to the platform',
    example: 'Work',
  },
  role: {
    type: 'string',
    required: true,
    enum: [
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
    ],
    description: 'User role in their organization',
    example: 'Owner',
  },

  // Company Information (Step 3)
  companyName: {
    type: 'string',
    required: true,
    description: 'Company or organization name',
    example: 'Acme Inc.',
  },
  companyLogo: {
    type: 'string',
    required: false,
    description: 'URL to company logo (Firebase Storage URL) or empty string if not provided',
    example: 'https://firebasestorage.googleapis.com/...' || '',
  },
  teamSize: {
    type: 'string',
    required: true,
    enum: ['Myself', '2-5', '6-10', '11-25', '26+'],
    description: 'Size of the user\'s team',
    example: '2-5',
  },
  companySize: {
    type: 'string',
    required: true,
    enum: ['Myself', '2-5', '6-10', '11-25', '26-50', '51-100', '101+'],
    description: 'Total size of the company',
    example: '11-25',
  },
  companyLocations: {
    type: 'string',
    required: true,
    enum: ['1', '2-5', '6-10', '11-20', '21-50', '51+'],
    description: 'Number of company locations',
    example: '1',
  },

  // Sections to Track (Step 4)
  sectionsToTrack: {
    type: 'array',
    required: true,
    items: {
      type: 'string',
      enum: [
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
      ],
    },
    description: 'Array of sections the user wants to track/manage',
    example: ['Client management', 'Task Management', 'Messaging'],
    minItems: 1,
  },

  // Referral Information (Step 5)
  referralSource: {
    type: 'string',
    required: true,
    enum: ['Social network', 'Google', 'Referral', 'We Reached Out', 'Other'],
    description: 'How the user heard about the platform',
    example: 'Google',
  },

  // Timestamps
  createdAt: {
    type: 'string',
    required: true,
    format: 'ISO 8601',
    description: 'When the account was created',
    example: '2026-02-12T14:30:00.000Z',
  },
  updatedAt: {
    type: 'string',
    required: true,
    format: 'ISO 8601',
    description: 'When the account was last updated',
    example: '2026-02-12T14:30:00.000Z',
  },
};

/**
 * Example UserAccount Document
 * 
 * This is what a complete document looks like in Firestore:
 */
export const ExampleUserAccount = {
  userId: 'abc123xyz789',
  email: 'john.doe@example.com',
  trial: true,
  firstName: 'John',
  lastName: 'Doe',
  purpose: 'Work',
  role: 'Owner',
  companyName: 'Acme Inc.',
  companyLogo: 'https://firebasestorage.googleapis.com/v0/b/gomanagr-845b4.firebasestorage.app/o/company-logos%2Fabc123xyz789%2Flogo.png?alt=media&token=...',
  teamSize: '2-5',
  companySize: '11-25',
  companyLocations: '1',
  sectionsToTrack: [
    'Client management',
    'Task Management',
    'Messaging',
    'File sharing',
  ],
  referralSource: 'Google',
  createdAt: '2026-02-12T14:30:00.000Z',
  updatedAt: '2026-02-12T14:30:00.000Z',
};

/**
 * Example UserAccount Document (with optional fields empty)
 * 
 * When optional fields are not provided, they are saved as empty strings:
 */
export const ExampleUserAccountMinimal = {
  userId: 'def456uvw012',
  email: 'jane.smith@example.com',
  trial: true,
  firstName: 'Jane',
  lastName: 'Smith',
  purpose: 'Personal',
  role: 'Freelancer',
  companyName: 'Jane Smith Consulting',
  companyLogo: '', // Empty string when logo not provided
  teamSize: 'Myself',
  companySize: 'Myself',
  companyLocations: '1',
  sectionsToTrack: [
    'Task Management',
  ],
  referralSource: 'Social network',
  createdAt: '2026-02-12T15:00:00.000Z',
  updatedAt: '2026-02-12T15:00:00.000Z',
};

/**
 * Field Validation Rules
 */
export const ValidationRules = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Must be a valid email address',
  },
  firstName: {
    minLength: 1,
    maxLength: 50,
    message: 'First name is required',
  },
  lastName: {
    minLength: 1,
    maxLength: 50,
    message: 'Last name is required',
  },
  companyName: {
    minLength: 1,
    maxLength: 100,
    message: 'Company name is required',
  },
  sectionsToTrack: {
    minItems: 1,
    message: 'At least one section must be selected',
  },
};

/**
 * Helper function to get all required fields
 */
export function getRequiredFields() {
  return Object.keys(UserAccountSchema).filter(
    (key) => UserAccountSchema[key].required !== false
  );
}

/**
 * Helper function to get all optional fields
 */
export function getOptionalFields() {
  return Object.keys(UserAccountSchema).filter(
    (key) => UserAccountSchema[key].required === false
  );
}

/**
 * Helper function to validate a user account object
 * @param {object} data - User account data to validate
 * @returns {object} - { valid: boolean, errors: array }
 */
export function validateUserAccount(data) {
  const errors = [];
  const requiredFields = getRequiredFields();

  // Check required fields
  requiredFields.forEach((field) => {
    if (field === 'sectionsToTrack') {
      if (!data[field] || !Array.isArray(data[field]) || data[field].length === 0) {
        errors.push(`${field} is required and must have at least one item`);
      }
    } else if (data[field] === undefined || data[field] === null || data[field] === '') {
      errors.push(`${field} is required`);
    }
  });

  // Validate email format
  if (data.email && !ValidationRules.email.pattern.test(data.email)) {
    errors.push(ValidationRules.email.message);
  }

  // Validate enum values
  if (data.purpose && !UserAccountSchema.purpose.enum.includes(data.purpose)) {
    errors.push(`purpose must be one of: ${UserAccountSchema.purpose.enum.join(', ')}`);
  }

  if (data.role && !UserAccountSchema.role.enum.includes(data.role)) {
    errors.push(`role must be one of: ${UserAccountSchema.role.enum.join(', ')}`);
  }

  if (data.teamSize && !UserAccountSchema.teamSize.enum.includes(data.teamSize)) {
    errors.push(`teamSize must be one of: ${UserAccountSchema.teamSize.enum.join(', ')}`);
  }

  if (data.companySize && !UserAccountSchema.companySize.enum.includes(data.companySize)) {
    errors.push(`companySize must be one of: ${UserAccountSchema.companySize.enum.join(', ')}`);
  }

  if (data.companyLocations && !UserAccountSchema.companyLocations.enum.includes(data.companyLocations)) {
    errors.push(`companyLocations must be one of: ${UserAccountSchema.companyLocations.join(', ')}`);
  }

  if (data.referralSource && !UserAccountSchema.referralSource.enum.includes(data.referralSource)) {
    errors.push(`referralSource must be one of: ${UserAccountSchema.referralSource.enum.join(', ')}`);
  }

  // Validate sectionsToTrack items
  if (data.sectionsToTrack && Array.isArray(data.sectionsToTrack)) {
    data.sectionsToTrack.forEach((section) => {
      if (!UserAccountSchema.sectionsToTrack.items.enum.includes(section)) {
        errors.push(`Invalid section: ${section}`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
