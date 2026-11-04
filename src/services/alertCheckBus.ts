// src/services/alertCheckBus.ts
// Lets the Settings screen trigger a check without React context —
// AlertEngine registers its check function here on mount. The engine owns
// the live position, so the screen can't call runAlertCheck itself.
type TriggerFn = () => Promise<void>;

let triggerFn: TriggerFn | null = null;

export const registerAlertCheckTrigger = (fn: TriggerFn) => {
  triggerFn = fn;
};

export const runAlertCheckNow = async (): Promise<boolean> => {
  if (!triggerFn) {
    console.log('Alert engine not ready yet');
    return false;
  }
  await triggerFn();
  return true;
};
