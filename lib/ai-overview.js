(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZenAi = factory();
})(typeof self !== 'undefined' ? self : globalThis, function () {
  const LABEL = 'ai overview';
  const CLIMB = 3; // ancestors to climb from a heading to reach the module container

  function norm(s) {
    return (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function climb(el, levels) {
    let c = el;
    for (let i = 0; i < levels && c.parentElement && c.parentElement.tagName !== 'BODY'; i++) {
      c = c.parentElement;
    }
    return c;
  }

  function findAiOverviewNodes(doc) {
    const found = new Set();

    doc.querySelectorAll('[aria-label]').forEach((el) => {
      if (norm(el.getAttribute('aria-label')) === LABEL) found.add(el);
    });

    doc.querySelectorAll('h1, h2, h3, [role="heading"]').forEach((h) => {
      if (norm(h.textContent) === LABEL) found.add(climb(h, CLIMB));
    });

    return Array.from(found);
  }

  return { findAiOverviewNodes, _norm: norm };
});
