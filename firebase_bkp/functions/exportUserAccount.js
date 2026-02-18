/**
 * Export user account data as a downloadable JSON file.
 * 
 * @param {Object} userAccount - The user account data object to export
 * @param {string} [filename] - Optional custom filename (default: "useraccount-{timestamp}.json")
 * @returns {void}
 */
export function exportUserAccountToJSON(userAccount, filename) {
  if (!userAccount) {
    console.error('No user account data provided');
    return;
  }

  try {
    // Convert user account to JSON string with pretty formatting
    const jsonString = JSON.stringify(userAccount, null, 2);
    
    // Create a Blob with the JSON content
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // Create a temporary URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Generate filename if not provided
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const defaultFilename = `useraccount-${timestamp}.json`;
    const finalFilename = filename || defaultFilename;
    
    // Create a temporary anchor element and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;
    link.style.display = 'none';
    
    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object after a short delay
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error('Error exporting user account:', error);
    throw new Error('Failed to export user account: ' + error.message);
  }
}
