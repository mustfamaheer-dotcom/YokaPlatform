import { App } from 'antd';

let messageInstance = null;
let notificationInstance = null;
let modalInstance = null;

/**
 * AntdAppBridge must be rendered once inside <AntApp> provider
 * to capture context-aware message, notification, and modal instances.
 */
export const AntdAppBridge = () => {
  const { message, notification, modal } = App.useApp();
  messageInstance = message;
  notificationInstance = notification;
  modalInstance = modal;
  return null;
};

export const antMessage = {
  success: (content, duration, onClose) =>
    messageInstance ? messageInstance.success(content, duration, onClose) : console.log('[Message Success]:', content),
  error: (content, duration, onClose) =>
    messageInstance ? messageInstance.error(content, duration, onClose) : console.error('[Message Error]:', content),
  info: (content, duration, onClose) =>
    messageInstance ? messageInstance.info(content, duration, onClose) : console.info('[Message Info]:', content),
  warning: (content, duration, onClose) =>
    messageInstance ? messageInstance.warning(content, duration, onClose) : console.warn('[Message Warning]:', content),
  loading: (content, duration, onClose) =>
    messageInstance ? messageInstance.loading(content, duration, onClose) : console.log('[Message Loading]:', content),
  open: (config) =>
    messageInstance ? messageInstance.open(config) : console.log('[Message Open]:', config),
  destroy: (key) =>
    messageInstance && messageInstance.destroy(key)
};

export const antNotification = {
  success: (config) => notificationInstance && notificationInstance.success(config),
  error: (config) => notificationInstance && notificationInstance.error(config),
  info: (config) => notificationInstance && notificationInstance.info(config),
  warning: (config) => notificationInstance && notificationInstance.warning(config),
  open: (config) => notificationInstance && notificationInstance.open(config)
};

export const antModal = {
  confirm: (config) => modalInstance && modalInstance.confirm(config),
  info: (config) => modalInstance && modalInstance.info(config),
  success: (config) => modalInstance && modalInstance.success(config),
  error: (config) => modalInstance && modalInstance.error(config),
  warning: (config) => modalInstance && modalInstance.warning(config)
};

export default antMessage;
