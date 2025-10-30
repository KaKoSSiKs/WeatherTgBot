import React from 'react';

export function App() {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h2>Добро пожаловать! Настройте уведомления о погоде под себя.</h2>

      <section style={{ border: '1px solid #eee', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h3>Текущая погода</h3>
        <div>📍 Москва</div>
        <div>☀️ +15°C</div>
        <div>Ясно, ощущается как +14°C</div>
        <div>🧥 Легкая куртка или худи. Идеально для прогулок!</div>
      </section>

      <section style={{ border: '1px solid #eee', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h3>Активные уведомления</h3>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>⏰ Ежедневно в 07:30 (Москва)</li>
          <li>❄️ Уведомление о заморозках (Включено)</li>
        </ul>
        <div style={{ color: '#777', marginTop: 8 }}>
          У вас пока нет активных уведомлений. Нажмите «Добавить», чтобы создать первое!
        </div>
      </section>

      <div style={{ display: 'flex', gap: 8 }}>
        <button style={{ flex: 1, padding: 12, background: '#2b7cff', color: '#fff', border: 0, borderRadius: 10 }}>➕ Добавить уведомление</button>
        <button style={{ padding: 12, border: '1px solid #ddd', background: '#fff', borderRadius: 10 }}>⚙️ Настройки</button>
      </div>
    </div>
  );
}
