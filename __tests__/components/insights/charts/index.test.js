/**
 * Barrel re-exports for insights charts — one import exercises `index.js` coverage.
 */

import * as Charts from '@/components/insights/charts';

describe('components/insights/charts index', () => {
  it('re-exports chart components and shared utilities', () => {
    const names = [
      'ChartCard',
      'chartPalette',
      'containerVariants',
      'itemVariants',
      'LivePulse',
      'AnimatedProgressBar',
      'AnimatedRing',
      'MatrixHeat',
      'LiveWeatherStreamCard',
      'RevenueMixCard',
      'TeamRadarCard',
      'ConversionFunnelCard',
      'RadialKpisCard',
      'ResourceTreemapCard',
      'CorrelationCloudCard',
      'RegionalSunburstCard',
      'StackedPerformanceCard',
      'RevenueVsGoalCard',
      'CategoryLeaderboardCard',
      'ActivityMatrixCard',
      'GoalProgressCard',
      'CircularTargetsCard',
      'SparkTrendCard',
    ];

    for (const name of names) {
      expect(Charts).toHaveProperty(name);
      expect(Charts[name]).toBeTruthy();
    }
  });
});
