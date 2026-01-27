import { useState, useCallback } from 'react';

interface UseListManagerOptions {
  maxLength?: number;
  minLength?: number;
}

interface UseListManagerReturn<T> {
  items: T[];
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  add: (item: T) => boolean;
  remove: (index: number) => boolean;
  update: (index: number, item: T) => void;
  clear: () => void;
  reset: (initialItems: T[]) => void;
  canAdd: boolean;
  canRemove: boolean;
}

/**
 * 배열 상태 관리를 위한 커스텀 훅
 * - add, remove, update 기능 제공
 * - maxLength, minLength 검증 지원
 */
export const useListManager = <T>(
  initialItems: T[] = [],
  options: UseListManagerOptions = {}
): UseListManagerReturn<T> => {
  const { maxLength = 10, minLength = 1 } = options;
  const [items, setItems] = useState<T[]>(initialItems);

  const canAdd = items.length < maxLength;
  const canRemove = items.length > minLength;

  const add = useCallback(
    (item: T): boolean => {
      if (items.length >= maxLength) return false;
      setItems((prev) => [...prev, item]);
      return true;
    },
    [items.length, maxLength]
  );

  const remove = useCallback(
    (index: number): boolean => {
      if (items.length <= minLength) return false;
      setItems((prev) => prev.filter((_, i) => i !== index));
      return true;
    },
    [items.length, minLength]
  );

  const update = useCallback((index: number, item: T): void => {
    setItems((prev) => {
      const newItems = [...prev];
      newItems[index] = item;
      return newItems;
    });
  }, []);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  const reset = useCallback((newItems: T[]) => {
    setItems(newItems);
  }, []);

  return {
    items,
    setItems,
    add,
    remove,
    update,
    clear,
    reset,
    canAdd,
    canRemove,
  };
};

export default useListManager;
