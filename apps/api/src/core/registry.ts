// PLAT-007 — typed service registry and domain event bus.
//
// Modules declare the services and events they provide by augmenting these maps in
// their public.ts:
//
//   declare module '../../core/registry.js' {
//     interface ServiceMap { 'payments.checkout': CheckoutService }
//     interface EventMap { 'payment.succeeded': { bookingId: string; paymentId: string } }
//   }
import type { FastifyBaseLogger } from 'fastify';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ServiceMap {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface EventMap {}

export type ServiceKey = keyof ServiceMap & string;
export type EventType = keyof EventMap & string;

export class ServiceRegistry {
  private readonly services = new Map<string, unknown>();
  private readonly overridden = new Set<string>();

  /** Overrides (test fakes) win over what modules provide later. */
  constructor(overrides: Partial<ServiceMap> = {}) {
    for (const [key, impl] of Object.entries(overrides)) {
      this.services.set(key, impl);
      this.overridden.add(key);
    }
  }

  provide<K extends ServiceKey>(key: K, impl: ServiceMap[K]): void {
    if (this.overridden.has(key)) return;
    if (this.services.has(key)) throw new Error(`Service "${key}" is already provided`);
    this.services.set(key, impl);
  }

  /** Call at request time for ports implemented by modules registered later. */
  require<K extends ServiceKey>(key: K): ServiceMap[K] {
    if (!this.services.has(key)) {
      throw new Error(
        `Service "${key}" is not provided. Is its module loaded, or did the test forget a fake?`,
      );
    }
    return this.services.get(key) as ServiceMap[K];
  }

  has(key: string): boolean {
    return this.services.has(key);
  }
}

type Handler<T extends EventType> = (payload: EventMap[T]) => unknown | Promise<unknown>;

export class EventBus {
  private readonly handlers = new Map<string, Handler<EventType>[]>();

  constructor(private readonly log?: FastifyBaseLogger) {}

  subscribe<T extends EventType>(type: T, handler: Handler<T>): void {
    const list = this.handlers.get(type) ?? [];
    list.push(handler as Handler<EventType>);
    this.handlers.set(type, list);
  }

  /**
   * Runs every handler. A failing handler is logged and does not fail the publisher or
   * the other handlers. Publish only after your transaction has committed.
   */
  async publish<T extends EventType>(type: T, payload: EventMap[T]): Promise<void> {
    const list = this.handlers.get(type) ?? [];
    const results = await Promise.allSettled(list.map(async (h) => h(payload)));
    for (const r of results) {
      if (r.status === 'rejected')
        this.log?.error({ err: r.reason, event: type }, 'event handler failed');
    }
  }
}
