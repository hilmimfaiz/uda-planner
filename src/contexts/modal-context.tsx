'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Trash2, X, Info } from 'lucide-react';

interface ConfirmModalOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  icon?: 'trash' | 'warning' | 'info';
  onConfirm: () => Promise<void> | void;
}

interface SuccessModalOptions {
  title: string;
  message: string;
  buttonText?: string;
  onClose?: () => void;
}

interface ModalContextType {
  confirmDelete: (options: Omit<ConfirmModalOptions, 'danger' | 'icon'>) => void;
  confirmAction: (options: ConfirmModalOptions) => void;
  showSuccess: (title: string, message?: string, onClose?: () => void) => void;
  showError: (title: string, message?: string) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  // Confirm Modal State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmModalOptions | null;
    isBusy: boolean;
  }>({
    isOpen: false,
    options: null,
    isBusy: false,
  });

  // Success / Feedback Modal State
  const [feedbackState, setFeedbackState] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
    buttonText: string;
    onClose?: () => void;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
    buttonText: 'OK, Selesai',
  });

  const confirmAction = (options: ConfirmModalOptions) => {
    setConfirmState({
      isOpen: true,
      options,
      isBusy: false,
    });
  };

  const confirmDelete = (options: Omit<ConfirmModalOptions, 'danger' | 'icon'>) => {
    confirmAction({
      ...options,
      danger: true,
      icon: 'trash',
      confirmText: options.confirmText || 'Ya, Hapus',
      cancelText: options.cancelText || 'Batal',
    });
  };

  const showSuccess = (title: string, message?: string, onClose?: () => void) => {
    setFeedbackState({
      isOpen: true,
      type: 'success',
      title,
      message: message || '',
      buttonText: 'OK, Selesai',
      onClose,
    });
  };

  const showError = (title: string, message?: string) => {
    setFeedbackState({
      isOpen: true,
      type: 'error',
      title,
      message: message || '',
      buttonText: 'Tutup',
    });
  };

  const handleConfirmSubmit = async () => {
    if (!confirmState.options) return;
    setConfirmState((prev) => ({ ...prev, isBusy: true }));
    try {
      await confirmState.options.onConfirm();
    } finally {
      setConfirmState({ isOpen: false, options: null, isBusy: false });
    }
  };

  const closeFeedback = () => {
    if (feedbackState.onClose) {
      feedbackState.onClose();
    }
    setFeedbackState((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <ModalContext.Provider value={{ confirmDelete, confirmAction, showSuccess, showError }}>
      {children}

      {/* MODAL KONFIRMASI (Contoh: Konfirmasi Hapus) */}
      {confirmState.isOpen && confirmState.options && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: 16,
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              maxWidth: 440,
              width: '100%',
              padding: 24,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              textAlign: 'center',
              animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: confirmState.options.danger ? '#fef2f2' : '#eff6ff',
                color: confirmState.options.danger ? '#ef4444' : '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                boxShadow: confirmState.options.danger ? '0 0 0 6px #fee2e2' : '0 0 0 6px #dbeafe',
              }}
            >
              {confirmState.options.icon === 'trash' ? (
                <Trash2 size={26} />
              ) : confirmState.options.icon === 'warning' ? (
                <AlertTriangle size={26} />
              ) : (
                <Info size={26} />
              )}
            </div>

            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
                {confirmState.options.title}
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5 }}>
                {confirmState.options.message}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                className="btn-uda btn-uda-secondary"
                disabled={confirmState.isBusy}
                onClick={() => setConfirmState({ isOpen: false, options: null, isBusy: false })}
                style={{ flex: 1, padding: '10px 16px', borderRadius: 8, fontSize: '0.9rem', fontWeight: 700 }}
              >
                {confirmState.options.cancelText || 'Batal'}
              </button>
              <button
                type="button"
                disabled={confirmState.isBusy}
                onClick={handleConfirmSubmit}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 8,
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: confirmState.isBusy ? 'not-allowed' : 'pointer',
                  background: confirmState.options.danger ? '#ef4444' : '#16a34a',
                  color: '#ffffff',
                  boxShadow: confirmState.options.danger
                    ? '0 4px 12px rgba(239, 68, 68, 0.3)'
                    : '0 4px 12px rgba(22, 163, 74, 0.3)',
                }}
              >
                {confirmState.isBusy ? 'Memproses...' : confirmState.options.confirmText || 'Lanjutkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOTIFIKASI SUKSES / BERHASIL (Berhasil Tambah, Berhasil Edit, dll.) */}
      {feedbackState.isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: 16,
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              maxWidth: 420,
              width: '100%',
              padding: 24,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              textAlign: 'center',
              animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative',
            }}
          >
            <button
              onClick={closeFeedback}
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
              }}
            >
              <X size={18} />
            </button>

            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: feedbackState.type === 'success' ? '#f0fdf4' : '#fef2f2',
                color: feedbackState.type === 'success' ? '#16a34a' : '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                boxShadow:
                  feedbackState.type === 'success'
                    ? '0 0 0 6px #dcfce7'
                    : '0 0 0 6px #fee2e2',
              }}
            >
              {feedbackState.type === 'success' ? (
                <CheckCircle2 size={32} />
              ) : (
                <AlertTriangle size={32} />
              )}
            </div>

            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
                {feedbackState.title}
              </h3>
              {feedbackState.message && (
                <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5 }}>
                  {feedbackState.message}
                </p>
              )}
            </div>

            <button
              type="button"
              className="btn-uda btn-uda-primary"
              onClick={closeFeedback}
              style={{
                width: '100%',
                padding: '11px 16px',
                borderRadius: 8,
                fontSize: '0.92rem',
                fontWeight: 700,
                justifyContent: 'center',
              }}
            >
              {feedbackState.buttonText}
            </button>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}
