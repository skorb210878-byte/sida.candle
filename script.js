// ============================================================================
// 1. Плавное появление секций при прокрутке — так же, как на других сайтах
// ============================================================================

const sections = document.querySelectorAll('.section');

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { rootMargin: '0px 0px -10% 0px', threshold: 0.1 }
);

sections.forEach((section) => revealObserver.observe(section));

// ============================================================================
// 2. Мини-галерея в карточке товара — точки под фото и стрелочки по бокам
// переключают кадр
// ----------------------------------------------------------------------------
// Количество точек строим автоматически по числу фото в карточке — так
// добавить/убрать фото в HTML можно будет без правок в этом файле.
// ============================================================================

document.querySelectorAll('.product__gallery').forEach((gallery) => {
  const slides = [...gallery.querySelectorAll('.product__slide')];
  const dotsWrap = gallery.querySelector('.product__dots');
  const prevBtn = gallery.querySelector('.product__arrow--prev');
  const nextBtn = gallery.querySelector('.product__arrow--next');

  if (slides.length <= 1) {
    // Одно фото — ни точки, ни стрелочки не нужны, листать нечего
    if (prevBtn) prevBtn.style.display = 'none';
    if (nextBtn) nextBtn.style.display = 'none';
    return;
  }

  let current = 0;
  const dots = [];

  slides.forEach((slide, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Фото ${i + 1}`);
    if (i === 0) dot.classList.add('is-active');
    dot.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(dot);
    dots.push(dot);
  });

  function goTo(index) {
    // Зацикливаем — после последнего фото "следующее" снова ведёт к первому
    current = (index + slides.length) % slides.length;
    slides.forEach((s) => s.classList.remove('is-active'));
    dots.forEach((d) => d.classList.remove('is-active'));
    slides[current].classList.add('is-active');
    dots[current].classList.add('is-active');
  }

  if (prevBtn) prevBtn.addEventListener('click', () => goTo(current - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => goTo(current + 1));
});

// ============================================================================
// 3. Итоговый текст заказа — собирается из двух частей: "базового" текста
// (какая свеча и почём — его меняет переключатель варианта, если он есть
// у карточки) и выбранного запаха (если покупатель его выбрал). Это общая
// функция, её вызывают и переключатель варианта, и выбор запаха — каждый
// раз пересобирает строку заново, чтобы в Telegram улетело именно то,
// что выбрано на этот момент.
// ============================================================================

function updateOrderText(product) {
  const base = product.dataset.baseOrder || '';
  const scent = product.dataset.scent;
  product.dataset.orderText = scent ? `${base} с запахом «${scent}»` : base;
}

// Выставляем стартовый текст заказа всем карточкам сразу при загрузке —
// до этого момента data-order-text ещё не существовал, был только
// data-base-order
document.querySelectorAll('.product').forEach((product) => updateOrderText(product));

// ============================================================================
// 4. Переключатель варианта (пока только у "Любовь с первого взгляда" —
// шкатулка/свеча): меняет цену на карточке, базовый текст заказа, и
// показывает/прячет выбор запаха — у шкатулки его нет, запах есть только
// у свечи (это задаётся атрибутом data-has-scent на самой кнопке варианта)
// ============================================================================

document.querySelectorAll('.product').forEach((product) => {
  const variants = product.querySelectorAll('.variant');
  if (!variants.length) return;

  const priceEl = product.querySelector('.product__price');
  const scentBlock = product.querySelector('.product__scent');

  // Начальное состояние при загрузке страницы — смотрим, какой вариант
  // уже отмечен как активный в HTML (class="variant is-active"), и сразу
  // прячем запах, если это вариант без него
  if (scentBlock) {
    const initialVariant = product.querySelector('.variant.is-active') || variants[0];
    scentBlock.style.display = initialVariant.dataset.hasScent === 'true' ? '' : 'none';
  }

  variants.forEach((variant) => {
    variant.addEventListener('click', () => {
      variants.forEach((v) => v.classList.remove('is-active'));
      variant.classList.add('is-active');
      priceEl.textContent = variant.dataset.price;
      product.dataset.baseOrder = variant.dataset.order;

      if (scentBlock) {
        const hasScent = variant.dataset.hasScent === 'true';
        scentBlock.style.display = hasScent ? '' : 'none';
        if (!hasScent) {
          // У шкатулки запаха нет — сбрасываем то, что успели выбрать
          // на свече, иначе оно бы незаметно осталось в заказе
          delete product.dataset.scent;
          const toggle = scentBlock.querySelector('.product__scent-toggle');
          if (toggle) toggle.textContent = 'Выбрать запах';
          scentBlock.querySelectorAll('.scent-option').forEach((o) => o.classList.remove('is-active'));
          scentBlock.classList.remove('is-open');
        }
      }
      updateOrderText(product);
    });
  });
});

// ============================================================================
// 5. Выбор запаха — кнопка "Выбрать запах" раскрывает список, выбранный
// запах подставляется в текст кнопки и добавляется в сообщение заказа
// ============================================================================

document.querySelectorAll('.product__scent').forEach((scentBlock) => {
  const product = scentBlock.closest('.product');
  const toggle = scentBlock.querySelector('.product__scent-toggle');
  const list = scentBlock.querySelector('.product__scent-list');
  const options = scentBlock.querySelectorAll('.scent-option');

  function openList() {
    // Если снизу не хватает места под список — раскрываем его вверх
    const spaceBelow = window.innerHeight - toggle.getBoundingClientRect().bottom;
    list.classList.toggle('is-up', list.offsetHeight + 16 > spaceBelow);
    scentBlock.classList.add('is-open');
    product.classList.add('has-open-scent');
  }

  function closeList() {
    scentBlock.classList.remove('is-open');
    product.classList.remove('has-open-scent');
  }

  toggle.addEventListener('click', () => {
    if (scentBlock.classList.contains('is-open')) {
      closeList();
    } else {
      openList();
    }
  });

  options.forEach((option) => {
    option.addEventListener('click', () => {
      const scent = option.dataset.scent;
      options.forEach((o) => o.classList.remove('is-active'));
      option.classList.add('is-active');
      toggle.textContent = `Запах: ${scent}`;
      product.dataset.scent = scent;
      updateOrderText(product);
      closeList(); // список закрывается сам после выбора
    });
  });

  // Клик мимо списка — закрываем, если он открыт
  document.addEventListener('click', (event) => {
    if (!scentBlock.contains(event.target)) {
      closeList();
    }
  });

  // Esc — закрываем открытый список
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeList();
    }
  });
});

// ============================================================================
// 6. Кнопка "Заказать" — открывает личные сообщения в Telegram с уже
// готовым текстом (какую свечу и с каким запахом хотят купить), чтобы
// покупателю не нужно было печатать это самому
// ============================================================================

document.querySelectorAll('.product__buy').forEach((btn) => {
  btn.addEventListener('click', () => {
    const product = btn.closest('.product');
    const text = encodeURIComponent(product.dataset.orderText || '');
    window.open(`https://t.me/anastexxx?text=${text}`, '_blank', 'noopener');
  });
});
