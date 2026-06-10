/**
 * Enhances the hosted unlock page when opened from email (Outlook app, mobile).
 */
(function () {
  const host = location.hostname;
  const onHostedUnlock =
    host === 'goldspire-global.github.io' && location.pathname.includes('unlock')
    || location.protocol === 'chrome-extension:' && location.pathname.includes('unlock');

  if (!onHostedUnlock) return;

  const secretInput = document.getElementById('secret');
  const form = document.getElementById('unlock-form');
  const result = document.getElementById('result');
  if (!secretInput || !form) return;

  document.body.classList.add('gst-unlock-host');

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'btn btn--ghost gst-save-op';
  saveBtn.textContent = 'Save to 1Password';
  saveBtn.hidden = true;

  const copyBtn = document.getElementById('copy-result');
  copyBtn?.parentElement?.appendChild(saveBtn);

  let lastUnlocked = '';

  const observer = new MutationObserver(() => {
    if (!result?.hidden) {
      lastUnlocked = document.getElementById('result-value')?.textContent?.trim() || '';
      saveBtn.hidden = !lastUnlocked;
    }
  });
  if (result) observer.observe(result, { attributes: true, attributeFilter: ['hidden'] });

  saveBtn.addEventListener('click', async () => {
    if (!lastUnlocked || !globalThis.GoldspireOnePassword) return;
    saveBtn.disabled = true;
    const outcome = await GoldspireOnePassword.savePasswordItem({
      title: 'Unlocked [redacted] secret',
      password: lastUnlocked,
      notes: `Unlocked from ${location.href.split('#')[0]}`,
    });
    saveBtn.disabled = false;
    saveBtn.textContent = outcome.ok ? 'Saved to 1Password' : '1Password save unavailable';
    if (!outcome.ok) saveBtn.title = outcome.reason || '';
  });
})();
