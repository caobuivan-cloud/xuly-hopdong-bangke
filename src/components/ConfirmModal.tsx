import React from 'react';
import { AlertTriangle, HelpCircle, Info, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  type = 'info',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-amber-600" />;
      case 'danger':
        return <AlertTriangle className="h-6 w-6 text-rose-600" />;
      default:
        return <HelpCircle className="h-6 w-6 text-indigo-600" />;
    }
  };

  const getIconBg = () => {
    switch (type) {
      case 'warning':
        return 'bg-amber-50';
      case 'danger':
        return 'bg-rose-50';
      default:
        return 'bg-indigo-50';
    }
  };

  const getConfirmButtonClass = () => {
    switch (type) {
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500';
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500';
      default:
        return 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop overlay */}
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
          aria-hidden="true"
          onClick={onCancel}
        ></div>

        {/* Trick to center modal content */}
        <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>

        <div className="relative inline-block transform overflow-hidden rounded-2xl bg-white text-left align-bottom shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle border border-slate-100">
          <div className="bg-white px-6 pt-6 pb-4">
            <div className="sm:flex sm:items-start">
              <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10 ${getIconBg()}`}>
                {getIcon()}
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-base font-bold text-slate-950" id="modal-title">
                  {title}
                </h3>
                <div className="mt-2.5">
                  <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                    {message}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-50 px-6 py-4 flex flex-row-reverse gap-2 rounded-b-2xl">
            <button
              type="button"
              onClick={onConfirm}
              className={`inline-flex w-auto justify-center rounded-lg px-4 py-2 text-xs font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all ${getConfirmButtonClass()}`}
            >
              {confirmText}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex w-auto justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all"
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
