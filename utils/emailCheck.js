/**
 * Check if an email already exists in Firebase Auth
 * Uses server-side API route for faster, more reliable checking
 * @param {string} email - Email address to check
 * @returns {Promise<{exists: boolean, methods: string[], error?: string}>}
 */
export async function checkEmailExists(email) {
  try {
    if (!email || !email.includes('@')) {
      return { exists: false, methods: [] };
    }

    const response = await fetch('/api/check-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response from /api/check-email:', text.substring(0, 200));
      return {
        exists: false,
        methods: [],
        error: 'api-error',
        message: 'Email verification service is unavailable. Please try again later.',
      };
    }

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 429 || data.error === 'quota-exceeded') {
        return {
          exists: false,
          methods: [],
          error: 'quota-exceeded',
          message: data.message || 'Email verification quota exceeded. Please try again in a moment.',
        };
      }
      
      if (response.status === 500) {
        return {
          exists: false,
          methods: [],
          error: 'server-error',
          message: data.message || 'Unable to verify email availability. Please try again.',
        };
      }
      
      return {
        exists: false,
        methods: [],
        error: 'api-error',
        message: data.message || 'Unable to verify email.',
      };
    }

    return {
      exists: data.exists || false,
      methods: data.methods || [],
    };
  } catch (error) {
    console.error('Error checking email:', error);
    return {
      exists: false,
      methods: [],
      error: 'network-error',
      message: 'Network error. Please check your connection and try again.',
    };
  }
}
