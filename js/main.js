const cursor = document.getElementById('custom-cursor');

// Двигаем курсор за мышью
document.addEventListener('mousemove', (e) => {
  cursor.style.top = e.clientY + 'px';
  cursor.style.left = e.clientX + 'px';
});

// Включение “записи” при наведении на интерактивные элементы
const hoverElements = document.querySelectorAll('a, button'); // меню, кнопки и т.д.

hoverElements.forEach(el => {
  el.addEventListener('mouseenter', () => {
    document.body.classList.add('hovered');
  });
  el.addEventListener('mouseleave', () => {
    document.body.classList.remove('hovered');
  });
});
