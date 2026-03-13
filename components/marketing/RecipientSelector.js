'use client';

import Dropdown from '@/components/ui/Dropdown';
import SearchableMultiselect from '@/components/ui/SearchableMultiselect';
import { getLabelClasses } from '@/components/ui/formControlStyles';
import { RECIPIENT_GROUPS, AUDIENCE_MODES } from '@/lib/marketingTypes';

const RECIPIENT_GROUP_OPTIONS = [
  { value: RECIPIENT_GROUPS.CLIENTS, label: 'Clients' },
  { value: RECIPIENT_GROUPS.TEAM, label: 'Team Members' },
];

const AUDIENCE_OPTIONS = [
  { value: AUDIENCE_MODES.ALL, label: 'All' },
  { value: AUDIENCE_MODES.SELECTED, label: 'Selected' },
];

/**
 * Recipient type + audience mode + optional searchable multi-select for "Selected".
 * @param {{
 *   recipientGroup: string,
 *   onRecipientGroupChange: (v: string) => void,
 *   audienceMode: string,
 *   onAudienceModeChange: (v: string) => void,
 *   recipientOptions: Array<{ value: string, label: string }>,
 *   selectedIds: string[],
 *   onSelectedIdsChange: (ids: string[]) => void,
 *   disabled?: boolean,
 *   recipientGroupLabel?: string,
 *   audienceLabel?: string,
 * }} props
 */
export default function RecipientSelector({
  recipientGroup,
  onRecipientGroupChange,
  audienceMode,
  onAudienceModeChange,
  recipientOptions,
  selectedIds,
  onSelectedIdsChange,
  disabled = false,
  recipientGroupLabel = 'Recipient type',
  audienceLabel = 'Audience',
}) {
  const showSelectedList = audienceMode === AUDIENCE_MODES.SELECTED;
  const allCount = recipientOptions.length;
  const selectedCount = selectedIds.length;

  const labelClass = getLabelClasses('light');

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Dropdown
          id="marketing-recipient-type"
          label={recipientGroupLabel}
          value={recipientGroup}
          onChange={(e) => onRecipientGroupChange(e.target.value)}
          options={RECIPIENT_GROUP_OPTIONS}
          placeholder="Select..."
          disabled={disabled}
          searchable={false}
        />
        <Dropdown
          id="marketing-audience"
          label={audienceLabel}
          value={audienceMode}
          onChange={(e) => onAudienceModeChange(e.target.value)}
          options={AUDIENCE_OPTIONS}
          placeholder="Select..."
          disabled={disabled}
          searchable={false}
        />
      </div>

      {showSelectedList && (
        <div>
          <label className={labelClass}>
            Select recipients
            {selectedCount > 0 && (
              <span className="ml-2 text-gray-500 dark:text-gray-400 font-normal">
                ({selectedCount} selected)
              </span>
            )}
          </label>
          <SearchableMultiselect
            id="marketing-recipients"
            options={recipientOptions}
            value={selectedIds}
            onChange={onSelectedIdsChange}
            placeholder={`Search ${recipientGroup === RECIPIENT_GROUPS.CLIENTS ? 'clients' : 'team members'}...`}
            disabled={disabled}
          />
          {selectedCount === 0 && (
            <p className="mt-1.5 text-sm text-amber-600 dark:text-amber-400">
              Select at least one recipient to continue.
            </p>
          )}
        </div>
      )}

      {audienceMode === AUDIENCE_MODES.ALL && allCount > 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          All {allCount} {recipientGroup === RECIPIENT_GROUPS.CLIENTS ? 'clients' : 'team members'} will receive this campaign.
        </p>
      )}
    </div>
  );
}
