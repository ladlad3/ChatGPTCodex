"use client";

import { startTransition } from "react";

type DeleteButtonProps = {
  onConfirm: () => Promise<void>;
  label?: string;
};

export function DeleteButton({ onConfirm, label = "削除" }: DeleteButtonProps) {
  return (
    <button
      type="button"
      className="text-sm text-red-600 hover:text-red-700"
      onClick={() => {
        if (confirm("削除してよろしいですか？")) {
          startTransition(() => {
            void onConfirm();
          });
        }
      }}
    >
      {label}
    </button>
  );
}
