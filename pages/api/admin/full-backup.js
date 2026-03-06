/**
 * Deprecated: use POST /api/admin/org-backup (org-scoped, Bearer auth) or
 * POST /api/platform/master-backup (platform operators only) instead.
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  return res.status(410).json({
    error: 'Gone',
    message: 'Use /api/admin/org-backup with Authorization: Bearer <token> and body { organizationId } for org backup, or /api/platform/master-backup for full system (platform operators only).',
  });
}
