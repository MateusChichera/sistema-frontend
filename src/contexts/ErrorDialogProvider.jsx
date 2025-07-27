import React, { useState, useCallback, useEffect } from 'react';
import ErrorDialog from '../components/common/ErrorDialog';
import { setGlobalErrorHandler } from '../lib/errorHandler';

const ErrorDialogProvider = ({ children }) => {
  const [message, setMessage] = useState(null);
  const [open, setOpen] = useState(false);

  const showError = useCallback((msg) => {
    setMessage(msg);
    setOpen(true);
  }, []);

  useEffect(() => {
    // registra handler global
    setGlobalErrorHandler(showError);
  }, [showError]);

  return (
    <>
      {message && (
        <ErrorDialog
          open={open}
          onOpenChange={(o) => {
            if (!o) {
              setOpen(false);
              setMessage(null);
            }
          }}
          message={message}
        />
      )}
      {children}
    </>
  );
};

export default ErrorDialogProvider; 