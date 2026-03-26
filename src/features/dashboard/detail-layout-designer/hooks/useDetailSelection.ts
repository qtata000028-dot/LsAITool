import { useCallback, useEffect, useMemo, useState } from 'react';

import type { DetailLayoutItem, DetailLayoutSelectionState } from '../types';

export function useDetailSelection(items: DetailLayoutItem[], initialSelectedId: string | null = null) {
  const [selection, setSelection] = useState<DetailLayoutSelectionState>({
    selectedId: initialSelectedId,
  });

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selection.selectedId) ?? null,
    [items, selection.selectedId],
  );

  useEffect(() => {
    if (!selection.selectedId) {
      return;
    }

    const stillExists = items.some((item) => item.id === selection.selectedId);
    if (!stillExists) {
      setSelection({ selectedId: null });
    }
  }, [items, selection.selectedId]);

  const selectItem = useCallback((itemId: string | null) => {
    setSelection({ selectedId: itemId });
  }, []);

  const clearSelection = useCallback(() => {
    setSelection({ selectedId: null });
  }, []);

  return {
    selectedId: selection.selectedId,
    selectedItem,
    clearSelection,
    selectItem,
  };
}
