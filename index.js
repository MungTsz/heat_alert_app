/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { registerAlertBackgroundHandlers } from './src/services/backgroundAlertService';

// Background alert checks and notification taps can start the JS runtime
// with no UI, so their handlers are registered here, outside the app tree.
registerAlertBackgroundHandlers();

AppRegistry.registerComponent(appName, () => App);
