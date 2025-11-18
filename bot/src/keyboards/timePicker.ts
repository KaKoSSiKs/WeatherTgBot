import { InlineKeyboard } from 'grammy';

const DEFAULT_TIMES = ['06:00', '09:00', '12:00', '18:00', '21:00'];

export function timePickerKeyboard(times: string[] = DEFAULT_TIMES): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  times.forEach((time, index) => {
    keyboard.text(time, `setup:time:${time}`);
    if ((index + 1) % 3 === 0 && index !== times.length - 1) {
      keyboard.row();
    }
  });
  keyboard.row().text('Изменить позже', 'setup:time:later');
  keyboard.row().text('Назад', 'setup:back:preferences').text('Отмена', 'setup:cancel');
  return keyboard;
}

