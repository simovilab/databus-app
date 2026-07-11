import { registerPlugin } from '@capacitor/core';

import type { DatabusTelemetryPlugin } from './definitions';

// Side-effect import: loads the `PluginsConfig` module augmentation so app
// consumers get typed `plugins.DatabusTelemetry` config in capacitor.config.ts.
import './config';

const DatabusTelemetry = registerPlugin<DatabusTelemetryPlugin>(
  'DatabusTelemetry',
  {
    web: () => import('./web').then((m) => new m.DatabusTelemetryWeb()),
  },
);

export * from './definitions';
export { DatabusTelemetry };
