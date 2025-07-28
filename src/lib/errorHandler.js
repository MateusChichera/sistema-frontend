export let globalErrorHandler = null;

export const setGlobalErrorHandler = (fn) => {
  globalErrorHandler = fn;
};
 
export const notifyGlobalError = (message) => {
  if (globalErrorHandler && message) {
    globalErrorHandler(message);
  }
}; 