'use client';

import { useMemo } from 'react';
import Table from '@/components/ui/Table';
import { EmptyState } from '@/components/ui';
import { HiSpeakerphone } from 'react-icons/hi';
import { formatDate } from '@/utils/dateTimeFormatters';

const STATUS_STYLES = {
  draft: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  sent: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  failed: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
};

/**
 * Campaign history table for SMS or Email (columns vary by channel).
 * @param {{
 *   campaigns: Array<{ id: string, name: string, subject?: string, recipientGroup: string, audienceSize?: number, status: string, createdAt?: string, sentAt?: string }>,
 *   channel: 'sms' | 'email',
 *   emptyTitle?: string,
 *   emptyDescription?: string,
 * }} props
 */
export default function CampaignHistoryTable({
  campaigns,
  channel,
  emptyTitle = 'No campaigns yet',
  emptyDescription = 'Create your first campaign to see it here.',
}) {
  const columns = useMemo(() => {
    const base = [
      { key: 'name', label: 'Campaign name', widthClass: 'w-[20%]' },
      ...(channel === 'email' ? [{ key: 'subject', label: 'Subject', widthClass: 'w-[18%]' }] : []),
      { key: 'recipientGroup', label: 'Recipient type', widthClass: 'w-[14%]', render: (row) => row.recipientGroup === 'team' ? 'Team Members' : 'Clients' },
      { key: 'audienceSize', label: 'Audience size', align: 'right', widthClass: 'w-[12%]', render: (row) => row.audienceSize ?? '—' },
      { key: 'status', label: 'Status', widthClass: 'w-[14%]', render: (row) => (
        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_STYLES[row.status] || STATUS_STYLES.draft}`}>
          {row.status}
        </span>
      ) },
      { key: 'sentAt', label: 'Sent date', align: 'right', widthClass: 'w-[18%]', render: (row) => {
        const iso = row.sentAt || row.createdAt;
        if (!iso) return '—';
        const datePart = String(iso).slice(0, 10);
        return formatDate(datePart, 'DD MMM YYYY');
      } },
    ];
    return base;
  }, [channel]);

  if (!campaigns || campaigns.length === 0) {
    return (
      <EmptyState
        type="custom"
        title={emptyTitle}
        description={emptyDescription}
        icon={HiSpeakerphone}
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <Table
        columns={columns}
        data={campaigns}
        getRowKey={(row) => row.id}
        ariaLabel={`${channel === 'email' ? 'Email' : 'SMS'} campaign history`}
      />
    </div>
  );
}
