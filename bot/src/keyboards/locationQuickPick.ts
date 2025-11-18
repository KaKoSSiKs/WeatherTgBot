import { InlineKeyboard, Keyboard } from 'grammy';
import { getQuickPickCities } from '../utils/geocoding';

export function locationQuickPickKeyboard(): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  const cities = getQuickPickCities();
  cities.forEach((city, index) => {
    keyboard.text(city.name, `setup:city:${city.aliases[0]}`);
    if ((index + 1) % 2 === 0) {
      keyboard.row();
    }
  });
  keyboard.row().text('Отмена', 'setup:cancel');
  return keyboard;
}

export function locationShareKeyboard(): Keyboard {
  return new Keyboard()
    .requestLocation('📍 Отправить геопозицию')
    .text('❌ Отмена')
    .resized();
}

