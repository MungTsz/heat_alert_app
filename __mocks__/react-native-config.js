// react-native-config contains native code and can't run under Jest.
// Per the library's documented Jest setup, this mock lets any code that
// reads Config.FOO_BAR (praiseConfig.ts, hkoConfig.ts, ...) load under test
// with empty/default values instead of crashing on the native import.
export default {};
