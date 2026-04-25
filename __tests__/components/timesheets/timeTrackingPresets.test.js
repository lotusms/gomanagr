import {
  getFeatureFlagsForGroup,
  getMemberTimeLogLabels,
  getMemberTimeTrackingMode,
  getTimeTrackingGroup,
} from '@/components/timesheets/timeTrackingPresets';

describe('timeTrackingPresets', () => {
  it('maps industry to a configured group', () => {
    expect(getTimeTrackingGroup('Marketing')).toBe('professional');
    expect(getTimeTrackingGroup('Construction')).toBe('field');
  });

  it('falls back to generic group when industry is unknown', () => {
    expect(getTimeTrackingGroup('Unknown Industry')).toBe('generic');
    expect(getTimeTrackingGroup(undefined)).toBe('generic');
  });

  it('returns feature flags for compliance group', () => {
    const flags = getFeatureFlagsForGroup('compliance');
    expect(flags.showGrantProgram).toBe(true);
    expect(flags.showStrictApprovals).toBe(true);
    expect(flags.showShiftAttendance).toBe(false);
  });

  it('returns hourly mode for shift/field/appointment groups', () => {
    expect(getMemberTimeTrackingMode('shift')).toEqual({ mode: 'hourly' });
    expect(getMemberTimeTrackingMode('field')).toEqual({ mode: 'hourly' });
    expect(getMemberTimeTrackingMode('appointment')).toEqual({ mode: 'hourly' });
  });

  it('returns project mode for professional and generic groups', () => {
    expect(getMemberTimeTrackingMode('professional')).toEqual({ mode: 'project' });
    expect(getMemberTimeTrackingMode('generic')).toEqual({ mode: 'project' });
  });

  it('builds hourly labels without linked context', () => {
    const labels = getMemberTimeLogLabels('hourly', 'Jobs');
    expect(labels.hoursKpiTitle).toMatch(/hours this week/i);
    expect(labels.showLinkedContext).toBe(false);
  });

  it('builds project labels with term-aware copy', () => {
    const labels = getMemberTimeLogLabels('project', 'Cases');
    expect(labels.hoursKpiTitle).toMatch(/project & task time/i);
    expect(labels.weekPanelHint).toMatch(/cases/i);
    expect(labels.showLinkedContext).toBe(true);
  });
});
