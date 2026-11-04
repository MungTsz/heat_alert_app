// src/services/alertCheckBus.ts
// Module-level registries (not React context), so screens, the root and
// headless background tasks can talk without prop drilling:
// - the check trigger: AlertEngine registers its check, Settings' dev
//   button runs it (the engine owns the live position)
// - "check finished": Home / Community badges refresh their active alerts
// - "open alert detail": a tapped notification or card badge asks the root
//   to show that message's detail sheet
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

const subscribe = <T>(listeners: Set<(value: T) => void>, listener: (value: T) => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const checkDoneListeners = new Set<(value: void) => void>();

export const onAlertCheckDone = (listener: () => void) => subscribe(checkDoneListeners, listener);

export const notifyAlertCheckDone = () => checkDoneListeners.forEach(listener => listener());

const openDetailListeners = new Set<(messageId: string) => void>();

export const onOpenAlertDetail = (listener: (messageId: string) => void) =>
  subscribe(openDetailListeners, listener);

export const openAlertDetail = (messageId: string) =>
  openDetailListeners.forEach(listener => listener(messageId));
