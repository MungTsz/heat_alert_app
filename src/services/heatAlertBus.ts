// Lets the Settings screen manually trigger a check without needing React
// context — HeatAlertEngine registers its check function here on mount.
type TriggerFn = () => Promise<void>;

let triggerFn: TriggerFn | null = null;

export const registerHeatAlertTrigger = (fn: TriggerFn) => {
  triggerFn = fn;
};

export const runHeatAlertCheckNow = async (): Promise<boolean> => {
  if (!triggerFn) {
    console.log('Heat alert engine not ready yet');
    return false;
  }
  await triggerFn();
  return true;
};
