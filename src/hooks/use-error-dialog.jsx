import { useState, useCallback } from 'react';
import ErrorDialog from '../components/common/ErrorDialog';

export const useErrorDialog = () => {
  const [errorMsg, setErrorMsg] = useState(null);
  const [open, setOpen] = useState(false);

  const showError = useCallback((msg) => {
    setErrorMsg(msg);
    setOpen(true);
  }, []);

  const ErrorDialogElement = errorMsg ? (
    <ErrorDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setOpen(false);
          setErrorMsg(null);
        } else {
          setOpen(true);
        }
      }}
      message={errorMsg}
    />
  ) : null;

  return { showError, ErrorDialogElement };
}; 