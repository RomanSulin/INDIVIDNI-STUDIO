const cursor = document.getElementById('custom-cursor');

document.addEventListener('mousemove', e => {
  cursor.style.top = e.clientY + 'px';
  cursor.style.left = e.clientX + 'px';
});

const hoverElements = document.querySelectorAll('a, button');

hoverElements.forEach(el => {
  el.addEventListener('mouseenter', () => {
    document.body.classList.add('hovered');
  });
  el.addEventListener('mouseleave', () => {
    document.body.classList.remove('hovered');
  });
});
