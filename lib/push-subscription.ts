const pending = new WeakMap<PushManager, Promise<PushSubscription | null>>();

// Only renew an existing opt-in automatically. New opt-ins require the user's
// explicit activation button; concurrent startup and button calls are serialized.
export function ensurePushSubscription(
  registration: ServiceWorkerRegistration,
  publicKey: string,
  allowCreate = false,
): Promise<PushSubscription | null> {
  const manager = registration.pushManager;
  const task = (pending.get(manager) || Promise.resolve(null))
    .catch(() => null)
    .then(async () => {
      const raw = Uint8Array.from(atob(publicKey.replace(/-/g, '+').replace(/_/g, '/')), (c) =>
        c.charCodeAt(0),
      );
      if (raw.length !== 65 || raw[0] !== 4)
        throw Error('Chave de notificações inválida. Tente novamente em instantes.');
      const existing = await manager.getSubscription();
      if (!existing && !allowCreate) return null;
      if (existing) {
        const previous = existing.options.applicationServerKey;
        if (
          !previous ||
          (new Uint8Array(previous).length === raw.length &&
            new Uint8Array(previous).every((byte, i) => byte === raw[i]))
        )
          return existing;
        if (!(await existing.unsubscribe()))
          throw Error('Não foi possível renovar a inscrição deste aparelho. Tente novamente.');
      }
      return manager.subscribe({ userVisibleOnly: true, applicationServerKey: raw });
    });
  pending.set(manager, task);
  return task;
}
