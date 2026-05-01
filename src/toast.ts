import { useState, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

let _id = 0;
let _items: ToastItem[] = [];
const _listeners = new Set<(items: ToastItem[]) => void>();

function _notify() {
  _listeners.forEach((l) => l([..._items]));
}

export function toast(message: string, type: ToastType = 'info', duration = 3500) {
  const id = ++_id;
  _items = [..._items, { id, message, type }];
  _notify();
  setTimeout(() => {
    _items = _items.filter((t) => t.id !== id);
    _notify();
  }, duration);
}

export function useToasts(): ToastItem[] {
  const [items, setItems] = useState<ToastItem[]>([..._items]);
  useEffect(() => {
    _listeners.add(setItems);
    return () => {
      _listeners.delete(setItems);
    };
  }, []);
  return items;
}
