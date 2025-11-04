// 🌙 Toggle mode clair/sombre
const toggleMode = document.getElementById('toggleMode');
toggleMode.addEventListener('click', () => {
  document.body.classList.toggle('light');
  toggleMode.textContent = document.body.classList.contains('light') ? '☀️' : '🌙';
});

// 🍔 Menu burger
const burgerBtn = document.getElementById('burgerBtn');
const navMenu = document.getElementById('navMenu');

burgerBtn.addEventListener('click', () => {
  navMenu.querySelector('.nav-links').classList.toggle('active');
});
