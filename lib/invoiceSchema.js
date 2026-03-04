/**
 * Canonical invoice field names (snake_case) for client_invoices.
 * Aligns: ClientInvoiceForm payload, create/update-client-invoice API, get-invoices response, Supabase client_invoices table.
 * When adding or renaming a field, update here, form payload, API parseBody, and migrations as needed.
 */
export const INVOICE_DB_FIELDS = [
  'client_id',
  'user_id',
  'organization_id',
  'invoice_number',
  'invoice_title',
  'amount',
  'tax',
  'discount',
  'total',
  'date_issued',
  'due_date',
  'paid_date',
  'status',
  'payment_method',
  'outstanding_balance',
  'file_url',
  'file_urls',
  'related_proposal_id',
  'related_project',
  'linked_contract_id',
  'notes',
  'line_items',
];

/** Fields the form sends in the API payload (camelCase for clientId, etc. are mapped by API to snake_case) */
export const INVOICE_PAYLOAD_KEYS = [
  'invoice_number',
  'invoice_title',
  'amount',
  'tax',
  'discount',
  'total',
  'date_issued',
  'due_date',
  'paid_date',
  'status',
  'payment_method',
  'outstanding_balance',
  'file_urls',
  'related_proposal_id',
  'related_project',
  'linked_contract_id',
  'notes',
  'line_items',
];

/** Fields used to initialize the form from API response (snake_case from get-invoices / get-client-invoices) */
export const INVOICE_INITIAL_KEYS = [
  'client_id',
  'invoice_number',
  'invoice_title',
  'status',
  'amount',
  'tax',
  'discount',
  'date_issued',
  'due_date',
  'paid_date',
  'payment_method',
  'outstanding_balance',
  'file_urls',
  'file_url',
  'related_proposal_id',
  'related_project',
  'linked_contract_id',
  'notes',
  'line_items',
];
