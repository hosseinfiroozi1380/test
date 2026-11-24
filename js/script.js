const intro = document.getElementById('intro');
const brand = document.getElementById('brand');
const loader = document.getElementById('loader');
const page = document.getElementById('page');

// انیمیشن صفحه شروع
setTimeout(() => brand.classList.add('show'), 2000);
setTimeout(() => loader.classList.add('show'), 3000);

setTimeout(() => {
  intro.classList.add('is-hidden');
  page.classList.add('show');
}, 6000);

// فرم ورود
const identity = document.getElementById('identity');
const message = document.getElementById('message');
const loginForm = document.getElementById('loginForm');
const submitButton = loginForm.querySelector('.submit');

identity.addEventListener('input', () => {
  identity.classList.remove('input-error');
  if (message.classList.contains('error')) {
    message.className = 'message';
    message.textContent = '';
  }
});

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (submitButton.disabled) return;

  const value = identity.value.trim();
  const validPhone = /^09\d{9}$/.test(value);

  if (!validPhone) {
    identity.classList.add('input-error');
    identity.focus();
    message.className = 'message error show';
    message.textContent = 'شماره موبایل واردشده معتبر نیست؛ لطفاً یک شماره ۱۱ رقمی که با 09 شروع می‌شود وارد کنید.';
    return;
  }

  identity.classList.remove('input-error');
  message.className = 'message success show';
  message.textContent = 'ورود موفقیت‌آمیز بود. تا لحظاتی دیگر وارد داشبورد می‌شوید...';

  sessionStorage.setItem('userPhone', value);
  submitButton.disabled = true;
  submitButton.textContent = 'در حال ورود...';

  // انتقال به داشبورد دقیقاً پس از ۲ ثانیه
  setTimeout(() => {
    window.location.href = './dashboard.html';
  }, 3000);
});