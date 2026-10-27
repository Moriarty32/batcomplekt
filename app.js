'use strict';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
if (!reducedMotion.matches && 'IntersectionObserver' in window) {
  document.documentElement.classList.add('motion-ready');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        if (entry.target.classList.contains('category')) {
          window.setTimeout(() => entry.target.classList.add('settled'), 1300);
        }
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px 25px 0px' });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  document.querySelectorAll('.category-grid, .audience-grid, .delivery-grid').forEach(group => {
    [...group.children].forEach((el, index) => el.style.setProperty('--delay', `${(index % 3) * 75}ms`));
  });
}

const toggle = document.querySelector('.mobile-toggle');
const nav = document.querySelector('#navigation');
function closeNavigation() {
  nav.classList.remove('is-open');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Открыть меню');
}
toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  nav.classList.toggle('is-open', open);
});
nav.addEventListener('click', event => { if (event.target.closest('a')) closeNavigation(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeNavigation(); });

document.querySelectorAll('[data-request]').forEach(link => {
  link.addEventListener('click', () => {
    const textarea = document.querySelector('#products');
    if (!textarea.value.trim()) textarea.value = `${link.dataset.request}\nГород: \nТовары и количество: `;
  });
});

const form = document.querySelector('#quote-form');
const contact = form.elements.contact;
const attachment = document.querySelector('#attachment');
const error = document.querySelector('#form-error');
const dialog = document.querySelector('#request-dialog');
let requestText = '';
contact.addEventListener('input', () => contact.setCustomValidity(''));
attachment.addEventListener('change', () => {
  const file = attachment.files[0];
  const note = document.querySelector('#file-note');
  const allowed = /\.(pdf|xlsx?|csv|docx?|txt|png|jpe?g)$/i;
  error.textContent = '';
  if (file && (!allowed.test(file.name) || file.size > 10 * 1024 * 1024)) {
    error.textContent = 'Выберите документ или изображение размером до 10 МБ.';
    attachment.value = '';
  }
  const selected = attachment.files[0];
  document.querySelector('#file-label').textContent = selected ? selected.name : 'Прикрепить список товаров';
  note.hidden = !selected;
  note.textContent = selected ? 'Добавьте выбранный файл к письму в почтовой программе.' : '';
});

form.addEventListener('submit', event => {
  event.preventDefault();
  const value = contact.value.trim();
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const validPhone = /^[+\d\s()\-]+$/.test(value) && value.replace(/\D/g, '').length >= 10 && value.replace(/\D/g, '').length <= 15;
  if (!validEmail && !validPhone) {
    contact.setCustomValidity('Укажите телефон с кодом города или корректный e-mail.');
    contact.reportValidity();
    return;
  }
  const file = attachment.files[0];
  requestText = `Здравствуйте! Прошу рассчитать закупку.\n\nИмя: ${form.elements.name.value.trim()}\nТелефон или e-mail: ${value}\n\n${form.elements.products.value.trim()}${file ? `\n\nСписок товаров: ${file.name} (приложу к письму)` : ''}`;
  document.querySelector('#open-mail').href = `mailto:internet@batkomplekt.ru?subject=${encodeURIComponent('Запрос на закупку — Баткомплект')}&body=${encodeURIComponent(requestText)}`;
  const fileMessage = document.querySelector('#dialog-attachment');
  fileMessage.hidden = !file;
  fileMessage.textContent = file ? `Не забудьте прикрепить к письму файл «${file.name}».` : '';
  document.querySelector('.copy-status').textContent = '';
  dialog.showModal();
});
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  const rect = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
});
document.querySelector('.copy-request').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(requestText);
    document.querySelector('.copy-status').textContent = 'Текст скопирован. Вставьте его в письмо менеджеру.';
  } catch {
    document.querySelector('.copy-status').textContent = 'Не удалось скопировать. Нажмите «Открыть почту».';
  }
});

// A restrained pointer response keeps the product composition readable.
const hero = document.querySelector('.hero');
const heroImage = document.querySelector('.hero-art img');
let pointerFrame;
hero.addEventListener('pointermove', event => {
  if (reducedMotion.matches || event.pointerType !== 'mouse' || window.innerWidth < 900) return;
  cancelAnimationFrame(pointerFrame);
  pointerFrame = requestAnimationFrame(() => {
    const rect = hero.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - .5) * 7;
    const y = ((event.clientY - rect.top) / rect.height - .5) * 5;
    heroImage.style.transform = `translate(${x}px, ${y}px)`;
  });
});
hero.addEventListener('pointerleave', () => {
  cancelAnimationFrame(pointerFrame);
  heroImage.style.transform = '';
});
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) {
    cancelAnimationFrame(pointerFrame);
    heroImage.style.transform = '';
    document.documentElement.classList.remove('motion-ready');
  }
});

// Native disclosures with cancellable height animation, including rapid clicks.
const faqItems = [...document.querySelectorAll('.faq-item')];
const disclosureState = new Map();
function setDisclosure(item, expanded) {
  const currentHeight = item.getBoundingClientRect().height;
  const previous = disclosureState.get(item);
  previous?.animation?.cancel();
  item.classList.toggle('is-closing', !expanded);
  const state = { expanded, animation: null };
  disclosureState.set(item, state);
  if (reducedMotion.matches || typeof item.animate !== 'function') {
    item.open = expanded;
    item.classList.remove('is-closing');
    item.style.overflow = '';
    return;
  }
  item.open = true;
  const targetHeight = expanded ? item.getBoundingClientRect().height : item.querySelector('summary').getBoundingClientRect().height + 2;
  item.style.overflow = 'hidden';
  const animation = item.animate(
    [{ height: `${currentHeight}px` }, { height: `${targetHeight}px` }],
    { duration: 420, easing: 'cubic-bezier(.22, 1, .36, 1)' }
  );
  state.animation = animation;
  animation.onfinish = () => {
    if (disclosureState.get(item) !== state) return;
    item.open = expanded;
    item.classList.remove('is-closing');
    item.style.overflow = '';
    state.animation = null;
  };
}
faqItems.forEach(item => {
  item.querySelector('summary').addEventListener('click', event => {
    event.preventDefault();
    const expanded = !(disclosureState.get(item)?.expanded ?? item.open);
    if (expanded) {
      faqItems.forEach(other => {
        if (other !== item && (disclosureState.get(other)?.expanded ?? other.open)) setDisclosure(other, false);
      });
    }
    setDisclosure(item, expanded);
  });
});

const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const cardMotion = new Map();
document.querySelectorAll('.category').forEach(card => {
  let frame;
  const reset = () => {
    cancelAnimationFrame(frame);
    ['--tilt-x', '--tilt-y', '--image-x', '--image-y', '--pointer-x', '--pointer-y'].forEach(property => card.style.removeProperty(property));
  };
  cardMotion.set(card, reset);
  card.addEventListener('pointermove', event => {
    if (reducedMotion.matches || !finePointer.matches || event.pointerType !== 'mouse') return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const box = card.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width;
      const y = (event.clientY - box.top) / box.height;
      card.style.setProperty('--pointer-x', `${x * 100}%`);
      card.style.setProperty('--pointer-y', `${y * 100}%`);
      card.style.setProperty('--tilt-x', `${(0.5 - y) * 3}deg`);
      card.style.setProperty('--tilt-y', `${(x - 0.5) * 3}deg`);
      card.style.setProperty('--image-x', `${(x - 0.5) * 7}px`);
      card.style.setProperty('--image-y', `${(y - 0.5) * 5 - 4}px`);
    });
  });
  card.addEventListener('pointerleave', reset);
});
reducedMotion.addEventListener('change', () => {
  if (!reducedMotion.matches) return;
  cardMotion.forEach(reset => reset());
  disclosureState.forEach((state, item) => {
    state.animation?.cancel();
    item.open = state.expanded;
    item.style.overflow = '';
    item.classList.remove('is-closing');
    state.animation = null;
  });
});
