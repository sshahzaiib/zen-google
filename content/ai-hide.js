(function () {
  const ai = self.ZenAi;
  if (!ai) return;

  function hide() {
    for (const node of ai.findAiOverviewNodes(document)) {
      if (node && node.style && node.dataset.zenHidden !== '1') {
        node.style.setProperty('display', 'none', 'important');
        node.dataset.zenHidden = '1';
      }
    }
  }

  hide();

  // AI Overview loads asynchronously; re-check on DOM changes, debounced.
  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      hide();
    }, 200);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
