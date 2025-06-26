import React from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  isDestructive?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  isDestructive = false,
}: ModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onClose();
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}>
      <div className="bg-white rounded-lg max-w-md w-full border border-[#EEEEEE] shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-[#EEEEEE]">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-gray-700 text-sm leading-relaxed mb-6">{children}</div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            <button
              onClick={handleCancel}
              className="flex-1 px-4 py-3 bg-gray-300 text-gray-700 hover:bg-gray-400 transition-colors text-sm font-semibold"
              style={{ borderRadius: "30px" }}>
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              className={`flex-1 px-4 py-3 text-white transition-colors text-sm font-semibold ${
                isDestructive ? "bg-red-600 hover:bg-red-700" : "bg-gray-900 hover:bg-gray-800"
              }`}
              style={{ borderRadius: "30px" }}>
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
