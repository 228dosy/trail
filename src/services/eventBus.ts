import type { VarchasEventMap } from '../types/varchas';

type Handler<T> = (payload: T) => void;

class EventBus {
  private listeners = new Map<keyof VarchasEventMap, Set<Handler<never>>>();

  on<K extends keyof VarchasEventMap>(event: K, handler: Handler<VarchasEventMap[K]>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler as Handler<never>);
    return () => this.off(event, handler);
  }

  off<K extends keyof VarchasEventMap>(event: K, handler: Handler<VarchasEventMap[K]>): void {
    this.listeners.get(event)?.delete(handler as Handler<never>);
  }

  emit<K extends keyof VarchasEventMap>(event: K, payload: VarchasEventMap[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    set.forEach((fn) => {
      try {
        (fn as Handler<VarchasEventMap[K]>)(payload);
      } catch (err) {
        console.error(`[VARCHAS Bus] Error in "${String(event)}" listener`, err);
      }
    });
  }
}

export const varchasBus = new EventBus();

// Expose clean integration seam for future VARCHAS SHIELD, VEDH, and FUTURE modules
declare global {
  interface Window {
    __VARCHAS_BUS__?: EventBus;
  }
}

if (typeof window !== 'undefined') {
  window.__VARCHAS_BUS__ = varchasBus;
}
