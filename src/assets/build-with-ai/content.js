(() => {
  const counters = Array.from(document.querySelectorAll('[data-counter]'));

  counters.forEach((node, index) => {
    const rawValue = node.getAttribute('data-counter') || '0';
    const numeric = Number.parseFloat(rawValue.replace('+', ''));
    if (!Number.isFinite(numeric)) {
      return;
    }

    const duration = 900 + index * 180;
    const startedAt = performance.now();
    const hasDecimal = rawValue.includes('.');
    const hasPlus = rawValue.includes('+');

    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = numeric * eased;

      if (hasDecimal) {
        node.textContent = value.toFixed(1);
      } else {
        node.textContent = String(Math.round(value));
      }

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else if (hasPlus) {
        node.textContent = `${Math.round(numeric)}+`;
      }
    };

    requestAnimationFrame(tick);
  });
})();
