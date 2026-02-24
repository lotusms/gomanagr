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
  
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  let newId = `CL-${datePrefix}-${suffix}`;
  
  let attempts = 0;
  while (existingIds.includes(newId) && attempts < 10) {
    newId += chars.charAt(Math.floor(Math.random() * chars.length));
    attempts++;
  }
  
  if (existingIds.includes(newId)) {
    const ms = String(Date.now()).slice(-4);
    newId = `CL-${datePrefix}-${suffix}${ms}`;
  }
  
  return newId;
}
