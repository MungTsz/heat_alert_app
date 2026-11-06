/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { registerAlertBackgroundHandlers } from './src/services/backgroundAlertService';
import { registerTrackingHeadlessTask } from './src/services/deviceTrackingService';

// Background alert checks, notification taps and location heartbeats can
// start the JS runtime with no UI, so their handlers are registered here,
// outside the app tree.
registerAlertBackgroundHandlers();
registerTrackingHeadlessTask();

AppRegistry.registerComponent(appName, () => App);
