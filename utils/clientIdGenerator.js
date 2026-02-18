/**
 * Generate a robust, unique client ID
 * Format: CL-YYYYMMDD-XXXXXX (e.g., CL-20260217-A3B9C2)
 * 
 * @param {Array<string>} existingIds - Array of existing client IDs to check for uniqueness
 * @returns {string} A unique client ID
 */
export function generateClientId(existingIds = []) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const datePrefix = `${year}${month}${day}`;
  
  // Generate a 6-character alphanumeric suffix (uppercase letters and numbers)
  // Excluding ambiguous characters: 0, O, I, 1
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  let newId = `CL-${datePrefix}-${suffix}`;
  
  // Ensure uniqueness by checking against existing IDs
  // If collision, keep appending random characters until unique
  let attempts = 0;
  while (existingIds.includes(newId) && attempts < 10) {
    newId += chars.charAt(Math.floor(Math.random() * chars.length));
    attempts++;
  }
  
  // If still not unique after 10 attempts, add timestamp milliseconds
  if (existingIds.includes(newId)) {
    const ms = String(Date.now()).slice(-4);
    newId = `CL-${datePrefix}-${suffix}${ms}`;
  }
  
  return newId;
}
