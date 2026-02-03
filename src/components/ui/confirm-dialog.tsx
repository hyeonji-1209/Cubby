"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return context;
}

interface ConfirmProviderProps {
  children: ReactNode;
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
  resolve: ((value: boolean) => void) | null;
}

export function ConfirmProvider({ children }: ConfirmProviderProps) {
  const [state, setState] = useState<ConfirmState>({
    isOpen: false,
    message: "",
    resolve: null,
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        ...options,
        resolve,
      });
    });
  }, []);

  const handleConfirm = () => {
    state.resolve?.(true);
    setState((prev) => ({ ...prev, isOpen: false, resolve: null }));
  };

  const handleCancel = () => {
    state.resolve?.(false);
    setState((prev) => ({ ...prev, isOpen: false, resolve: null }));
  };

  const isDestructive = state.variant === "destructive";

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {/* Confirm Dialog */}
      {state.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={handleCancel}
          />

          {/* Dialog */}
          <div className="relative bg-background rounded-lg shadow-xl w-full max-w-sm mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              {/* Icon */}
              <div
                className={cn(
                  "w-12 h-12 rounded-md flex items-center justify-center mx-auto mb-4",
                  isDestructive
                    ? "bg-red-100 dark:bg-red-950/50"
                    : "bg-amber-100 dark:bg-amber-950/50"
                )}
              >
                <AlertTriangle
                  className={cn(
                    "h-6 w-6",
                    isDestructive
                      ? "text-red-600 dark:text-red-400"
                      : "text-amber-600 dark:text-amber-400"
                  )}
                />
              </div>

              {/* Title */}
              {state.title && (
                <h3 className="text-lg font-semibold text-center mb-2">
                  {state.title}
                </h3>
              )}

              {/* Message */}
              <p className="text-sm text-muted-foreground text-center whitespace-pre-line">
                {state.message}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 p-4 pt-0">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCancel}
              >
                {state.cancelText || "취소"}
              </Button>
              <Button
                variant={isDestructive ? "destructive" : "default"}
                className="flex-1"
                onClick={handleConfirm}
              >
                {state.confirmText || "확인"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
