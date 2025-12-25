export const loadInitData = (): string | null => {
  if (typeof window === 'undefined') return null;
  const tg = (window as any).Telegram?.WebApp;
  if (!tg) return null;
  tg.ready?.();
  return tg.initData || null;
};

export const sendActionToBot = async (action: string, payload: unknown, initData?: string | null) => {
  try {
    await fetch('/api/bot/sendAction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload, initData }),
    });
  } catch (e) {
    console.warn('sendActionToBot error', e);
  }
};

