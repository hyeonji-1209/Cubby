import { useState, useCallback, useMemo } from 'react';

/**
 * 단일 모달 상태 관리 훅
 */
export const useModal = <T = undefined>(initialOpen = false) => {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [data, setData] = useState<T | undefined>(undefined);

  const open = useCallback((initialData?: T) => {
    setData(initialData);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const reset = useCallback(() => {
    setIsOpen(false);
    setData(undefined);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return useMemo(
    () => ({
      isOpen,
      data,
      open,
      close,
      reset,
      toggle,
      setData,
    }),
    [isOpen, data, open, close, reset, toggle]
  );
};

/**
 * 여러 모달을 한번에 관리하는 훅
 */
export const useModals = <K extends string>() => {
  const [openModals, setOpenModals] = useState<Set<K>>(new Set());

  const isOpen = useCallback((key: K) => openModals.has(key), [openModals]);

  const open = useCallback((key: K) => {
    setOpenModals((prev) => new Set(prev).add(key));
  }, []);

  const close = useCallback((key: K) => {
    setOpenModals((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const toggle = useCallback((key: K) => {
    setOpenModals((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const closeAll = useCallback(() => {
    setOpenModals(new Set());
  }, []);

  return useMemo(
    () => ({
      isOpen,
      open,
      close,
      toggle,
      closeAll,
    }),
    [isOpen, open, close, toggle, closeAll]
  );
};

/**
 * 확인(Confirm) 모달을 위한 훅
 */
export interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
  onConfirm?: () => void | Promise<void>;
}

export const useConfirmModal = () => {
  const [state, setState] = useState<ConfirmModalState>({
    isOpen: false,
    title: '',
    message: '',
  });

  const confirm = useCallback(
    (options: Omit<ConfirmModalState, 'isOpen'>): Promise<boolean> => {
      return new Promise((resolve) => {
        setState({
          ...options,
          isOpen: true,
          onConfirm: async () => {
            if (options.onConfirm) {
              await options.onConfirm();
            }
            resolve(true);
            setState((prev) => ({ ...prev, isOpen: false }));
          },
        });
      });
    },
    []
  );

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return useMemo(
    () => ({
      ...state,
      confirm,
      close,
    }),
    [state, confirm, close]
  );
};

export type ModalState<T = undefined> = ReturnType<typeof useModal<T>>;
export type ModalsState<K extends string> = ReturnType<typeof useModals<K>>;
