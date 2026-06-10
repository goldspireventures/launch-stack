(function () {
  if (window.__goldspireSecureTextLoaded) return;
  window.__goldspireSecureTextLoaded = true;

  const DEFAULT_SETTINGS = GoldspireSettings.DEFAULT_SETTINGS;
  const runtimeApi = () => globalThis.chrome?.runtime || globalThis.browser?.runtime;
  const browserApi = () => globalThis.GoldspireBrowser;
  const isInvalidatedError = (error) => browserApi()?.isInvalidatedError?.(error) ?? false;

  let detectorController = null;
  let contextDead = false;
  let staleWarningShown = false;

  function safeToast(message, type = 'info') {
    try {
      globalThis.GoldspireSecureUI?.showToast?.(message, type);
    } catch {
      // UI unavailable in this frame.
    }
  }

  function markContextDead() {
    if (contextDead) return;
    contextDead = true;
    try {
      detectorController?.observer?.disconnect();
    } catch {
      // ignore
    }
  }

  function warnStaleContext() {
    markContextDead();
    if (!staleWarningShown) {
      staleWarningShown = true;
      safeToast('Extension was updated — refresh this page (F5), then try again.', 'error');
    }
  }

  function runSafe(task) {
    Promise.resolve(task).catch((error) => {
      if (isInvalidatedError(error)) {
        warnStaleContext();
        return;
      }
      console.warn('[Goldspire Secure Text]', error);
      safeToast('Something went wrong — refresh the page and try again.', 'error');
    });
  }

  function extensionReachable() {
    if (contextDead) return false;
    try {
      if (browserApi()?.isValid?.()) return true;
      return Boolean(runtimeApi()?.id);
    } catch (error) {
      if (isInvalidatedError(error)) markContextDead();
      return false;
    }
  }

  function ensureExtensionReady() {
    if (extensionReachable()) return true;
    warnStaleContext();
    return false;
  }

  async function getSettings() {
    if (contextDead) return { ...DEFAULT_SETTINGS, passphrase: '' };

    try {
      if (browserApi()?.isValid?.()) {
        return await GoldspireSettings.load();
      }
    } catch (error) {
      if (isInvalidatedError(error)) {
        warnStaleContext();
        return { ...DEFAULT_SETTINGS, passphrase: '' };
      }
    }

    const response = await browserApi()?.sendMessage?.({ type: 'GET_SETTINGS' });
    if (response?.settings) return response.settings;
    return { ...DEFAULT_SETTINGS, passphrase: '' };
  }

  function getProfile(settings) {
    return settings.securityProfile === 'organization' ? 'organization' : 'personal';
  }

  async function copyWithAutoClear(text, settings) {
    await navigator.clipboard.writeText(text);
    const seconds = Number(settings.clipboardClearSeconds) || 0;
    if (seconds > 0) {
      window.setTimeout(() => navigator.clipboard.writeText('').catch(() => {}), seconds * 1000);
    }
  }

  async function offerSaveTo1Password(title, secret, notes = '') {
    if (!secret?.trim() || !globalThis.GoldspireOnePassword) return;
    const outcome = await GoldspireOnePassword.savePasswordItem({ title, password: secret, notes });
    if (outcome.ok) {
      safeToast('Saved to 1Password.', 'success');
      return;
    }
    safeToast(outcome.reason || '1Password save unavailable.', 'info');
  }

  function build1PasswordSaveAction(secret, title, notes) {
    return {
      id: 'save-1password',
      label: 'Save to 1Password',
      onClick: () => offerSaveTo1Password(title, secret, notes),
    };
  }

  function resolveContext(context) {
    if (!context) return null;
    if (context.kind !== 'fallback') return context;

    const text = context.selectedText;
    const active = document.activeElement;

    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
      const index = active.value.indexOf(text);
      if (index >= 0) {
        active.focus();
        active.setSelectionRange(index, index + text.length);
        return { kind: 'input', element: active, start: index, end: index + text.length, selectedText: text };
      }
    }

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const index = node.nodeValue?.indexOf(text) ?? -1;
      if (index < 0) continue;
      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + text.length);
      return { kind: 'range', selectedText: text, range, selection: window.getSelection() };
    }

    return null;
  }

  function getSelectionContext(message = {}) {
    GoldspireSelection.captureSelection();
    return resolveContext(
      GoldspireSelection.getActiveSelection({
        fallbackText: message.selectionText,
      }),
    );
  }

  function replaceSelection(context, replacement) {
    const resolved = resolveContext(context);
    if (!resolved) return null;

    if (resolved.kind === 'input') {
      const { element, start, end } = resolved;
      const before = element.value.slice(0, start);
      const after = element.value.slice(end);
      element.value = `${before}${replacement}${after}`;
      const cursor = before.length + replacement.length;
      element.focus();
      element.setSelectionRange(cursor, cursor);
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return { kind: 'input', element, start: before.length, length: replacement.length };
    }

    const range = resolved.range.cloneRange();
    const selection = resolved.selection || window.getSelection();
    range.deleteContents();
    const node = document.createTextNode(replacement);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    node.parentElement?.closest('[contenteditable=""], [contenteditable="true"]')?.dispatchEvent(new Event('input', { bubbles: true }));
    return { kind: 'node', node };
  }

  function replaceRedactedWithPlaintext(context, marker, plaintext) {
    const token = marker.plainToken || GoldspireRedacted.formatPlain(marker.fullMarker || marker.full);

    if (context?.kind === 'input') {
      const { element } = context;
      const start = element.value.indexOf(token);
      if (start === -1) throw new Error('Could not find [redacted] in this field.');
      element.value = `${element.value.slice(0, start)}${plaintext}${element.value.slice(start + token.length)}`;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      return { kind: 'input', element, start, plaintext };
    }

    return replaceSelection(context, context.selectedText.replace(GoldspireRedacted.LABEL, plaintext));
  }

  function insertAtCursor(text) {
    const context = getSelectionContext();
    if (context?.selectedText) {
      replaceSelection(context, text);
      return true;
    }

    const active = document.activeElement;
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
      const start = active.selectionStart ?? active.value.length;
      const end = active.selectionEnd ?? start;
      active.value = `${active.value.slice(0, start)}${text}${active.value.slice(end)}`;
      active.setSelectionRange(start + text.length, start + text.length);
      active.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }

    return false;
  }

  function refreshSelectionUi() {
    const preview = GoldspireSelection.getLivePreview();

    const pill = document.getElementById('goldspire-selection-status');
    if (pill) {
      if (!preview) {
        pill.classList.remove('gst-selection-status--visible');
      } else {
        const secured = GoldspireRedacted.isRedactedToken(preview);
        pill.textContent = secured
          ? 'Secured [redacted] selected'
          : `Ready to secure: "${preview.slice(0, 24)}${preview.length > 24 ? '…' : ''}"`;
        pill.classList.add('gst-selection-status--visible');
      }
    }

    const wrap = document.getElementById('goldspire-secure-text-fabs');
    if (wrap) {
      const secured = preview ? GoldspireRedacted.isRedactedToken(preview) : false;
      wrap.querySelector('#goldspire-secure-fab')?.classList.toggle('gst-fab--visible', Boolean(preview && !secured));
      wrap.querySelector('#goldspire-unlock-fab')?.classList.toggle(
        'gst-fab--visible',
        Boolean(secured || preview === GoldspireRedacted.LABEL),
      );
    }
  }

  function ensureSelectionStatus() {
    if (document.getElementById('goldspire-selection-status')) return;
    const pill = document.createElement('div');
    pill.id = 'goldspire-selection-status';
    pill.className = 'gst-selection-status';
    document.documentElement.appendChild(pill);
    document.addEventListener('selectionchange', refreshSelectionUi);
    document.addEventListener('mouseup', () => window.setTimeout(refreshSelectionUi, 0));
    document.addEventListener('keyup', refreshSelectionUi);
    document.addEventListener('focusin', () => window.setTimeout(refreshSelectionUi, 0));
    document.addEventListener('mousedown', () => window.setTimeout(refreshSelectionUi, 0));
  }

  async function recordHistory(entry) {
    try {
      const gst = browserApi();
      if (!gst?.storageGet) return;
      const { secureHistory = [] } = await gst.storageGet('local', { secureHistory: [] });
      gst.storage?.local?.set?.({
        secureHistory: [
          {
            at: Date.now(),
            mode: entry.mode || '',
            host: location.hostname || '',
          },
          ...secureHistory,
        ].slice(0, 8),
      });
    } catch {
      // Non-critical; ignore if extension context was invalidated.
    }
  }

  async function auditEvent(action, settings, mode) {
    try {
      await globalThis.GoldspireAudit?.log?.({
        action,
        host: location.hostname || '',
        mode: mode || '',
        profile: getProfile(settings),
      });
    } catch {
      // Non-critical.
    }
  }

  function maybeScheduleResecure({ settings, marker, secret, plaintext, target }) {
    if (!settings.resecureAfterUnlock || !target) return;
    const profile = getProfile(settings);
    const delaySeconds = Number(settings.resecureDelaySeconds) || (profile === 'organization' ? 45 : 60);

    GoldspireResecure.scheduleResecure({
      target,
      marker,
      secret,
      plaintext,
      delaySeconds,
      profile,
      unlockBaseUrl: GoldspireRedacted.getUnlockBaseUrl(settings, {
        forEmail: GoldspireRedacted.isEmailCompose(),
      }),
      onResecured: () => detectorController?.scheduleScan(),
    });
  }

  async function executeSecure(context, settings, { mode, unlockSecret, copyLink }) {
    const profile = getProfile(settings);
    const isOneTime = mode === 'one-time';
    const version = isOneTime ? '2' : '1';
    const plaintext = context.selectedText;

    if (!isOneTime && settings.enforceStrongPassphrase !== false) {
      GoldspirePassphrasePolicy?.assertPassphrase?.(unlockSecret, profile, { mode });
    } else if (!isOneTime) {
      GoldspireSecureCrypto.validatePassphrase(unlockSecret, profile, { mode });
    }

    const oneTimeTtl = GoldspireConstants.ONE_TIME_TTL_MS || 72 * 60 * 60 * 1000;
    const payload = await GoldspireSecureCrypto.encryptText(plaintext, unlockSecret, {
      mode: isOneTime ? 'one-time' : mode,
      profile,
      expiresAt: isOneTime ? Date.now() + oneTimeTtl : null,
      burnAfterRead: isOneTime,
    });
    const fullMarker = GoldspireSecureMarker.wrapSecured(payload, '', version);

    await GoldspireRedacted.insertRedacted(context, fullMarker, settings);

    await recordHistory({ mode: isOneTime ? 'one-time' : mode });
    await auditEvent('secure', settings, isOneTime ? 'one-time' : mode);

    if (isOneTime) {
      const unlockLink = GoldspireSecureMarker.buildUnlockLink(fullMarker);
      if (settings.copyOneTimeCodeAutomatically) await copyWithAutoClear(unlockSecret, settings);

      GoldspireSecureUI.showResultDialog({
        title: 'Secured with one-time code',
        lines: [
          { label: 'Share this code separately (not in the message)', value: unlockSecret },
          ...(unlockLink ? [{ label: 'Backup unlock link', value: unlockLink }] : []),
        ],
        copyItems: [
          { label: 'Copy code', value: unlockSecret },
          ...(unlockLink ? [{ label: 'Copy link', value: unlockLink }] : []),
        ],
      });

      if (copyLink && unlockLink) await copyWithAutoClear(unlockLink, settings);
    } else {
      GoldspireSecureUI.showToast('Secured as [redacted]. Send as normal.', 'success');
    }

    if (!isOneTime && mode === 'team' && settings.passphraseIn1Password) {
      await GoldspireSecrets.cacheSessionTeamPassphrase?.(unlockSecret);
    }

    GoldspireSecrets.clearMemoryString(unlockSecret);
    refreshSelectionUi();
    detectorController?.scheduleScan();
  }

  async function unlockMarker(marker, options = {}) {
    const settings = await getSettings();
    const profile = getProfile(settings);
    const isOneTime = marker.mode === 'one-time' || marker.version === '2';
    const prefill =
      !settings.passphraseIn1Password
      && !isOneTime
      && settings.useSavedPassphrase
      && profile === 'personal'
        ? settings.passphrase
        : '';

    return new Promise((resolve) => {
      GoldspireSecureUI.showPrompt({
        title: 'Unlock [redacted]',
        submitLabel: 'Unlock',
        fields: [
          {
            name: 'passphrase',
            label: isOneTime ? 'One-time code' : 'Passphrase',
            type: 'password',
            placeholder: isOneTime ? 'Code from sender' : 'Team passphrase',
            value: prefill,
            required: true,
          },
        ],
        onSubmit: async ({ passphrase }) => {
          const secret = passphrase?.trim();
          if (!secret) throw new Error('Passphrase is required.');

          const fullMarker = marker.fullMarker || marker.full || '';
          if (await GoldspireBurnList?.isBurned?.(fullMarker)) {
            throw new Error('This one-time message was already unlocked and cannot be read again.');
          }

          const rateLimit = await GoldspireBurnList?.checkRateLimit?.(fullMarker);
          if (rateLimit && !rateLimit.allowed) {
            throw new Error(rateLimit.message);
          }

          let plaintext;
          let envelopeMeta;
          try {
            const result = await GoldspireSecureCrypto.decryptEnvelope(marker.payload, secret, {
              profile,
              mode: isOneTime ? 'one-time' : 'team',
            });
            plaintext = result.text;
            envelopeMeta = result.envelope;
            await GoldspireBurnList?.clearFailures?.(fullMarker);
          } catch (error) {
            await GoldspireBurnList?.recordFailure?.(fullMarker);
            throw new Error(
              error instanceof Error && (
                error.message.includes('at least')
                || error.message.includes('expired')
                || error.message.includes('already unlocked')
              )
                ? error.message
                : 'Wrong passphrase or corrupted text.',
            );
          }

          if (isOneTime || envelopeMeta?.burn) {
            await GoldspireBurnList?.burn?.(fullMarker);
          }

          await auditEvent('unlock', settings, isOneTime ? 'one-time' : marker.mode || 'team');

          if (!isOneTime && settings.passphraseIn1Password) {
            await GoldspireSecrets.cacheSessionTeamPassphrase?.(secret);
          }

          let resecureTarget = null;

          if (options.replaceNode) {
            const textNode = document.createTextNode(plaintext);
            options.replaceNode.replaceWith(textNode);
            resecureTarget = { kind: 'node', node: textNode };
          } else if (options.context) {
            resecureTarget = replaceRedactedWithPlaintext(options.context, marker, plaintext);
          }

          maybeScheduleResecure({ settings, marker, secret, plaintext, target: resecureTarget });

          if (options.copyResult !== false) {
            await copyWithAutoClear(plaintext, settings);
            GoldspireSecureUI.showResultDialog({
              title: 'Unlocked',
              lines: [{ label: 'Secret', value: plaintext }],
              copyItems: [{ label: 'Copy', value: plaintext }],
              extraActions: [build1PasswordSaveAction(plaintext, 'Unlocked [redacted] secret')],
            });
          } else {
            GoldspireSecureUI.showToast('Unlocked on this page.', 'success');
          }

          refreshSelectionUi();
          resolve(plaintext);
        },
      });
    });
  }

  async function secureSelection(message = {}) {
    if (!ensureExtensionReady()) return;

    const context = getSelectionContext(message);
    if (!context?.selectedText?.trim()) {
      GoldspireSecureUI.showToast('Highlight text first, then Ctrl+Shift+S or right-click.', 'error');
      return;
    }

    if (GoldspireRedacted.isRedactedToken(context.selectedText.trim())) {
      GoldspireSecureUI.showToast('Already secured as [redacted].', 'error');
      return;
    }

    const settings = await getSettings();
    const profile = getProfile(settings);

    const teamPassphrase = settings.passphraseIn1Password
      ? (await GoldspireSecrets.loadSessionTeamPassphrase?.()) || ''
      : settings.passphrase?.trim() || '';

    const canQuickSecure =
      !message.showOptions &&
      settings.defaultSecureMode === 'team' &&
      settings.useSavedPassphrase !== false &&
      teamPassphrase;

    if (canQuickSecure) {
      await executeSecure(context, settings, {
        mode: 'team',
        unlockSecret: teamPassphrase,
        copyLink: false,
      });
      return;
    }

    const use1PasswordTeamFlow =
      !message.showOptions &&
      settings.passphraseIn1Password &&
      settings.defaultSecureMode === 'team';

    if (use1PasswordTeamFlow) {
      GoldspireSecureUI.showPrompt({
        title: 'Secure selection',
        submitLabel: 'Secure as [redacted]',
        fields: [
          {
            type: 'note',
            label: 'Fill from 1Password (Ctrl+\\), then click Secure. After that, highlight + Ctrl+Shift+S is one-click for this browser session.',
          },
          {
            name: 'passphrase',
            label: 'Team passphrase',
            type: 'password',
            placeholder: 'Click here, then fill from 1Password',
            required: true,
            autocomplete: 'current-password',
          },
        ],
        onSubmit: async ({ passphrase }) => {
          const unlockSecret = passphrase?.trim();
          if (!unlockSecret) throw new Error('Passphrase is required.');
          await executeSecure(context, settings, {
            mode: 'team',
            unlockSecret,
            copyLink: false,
          });
        },
      });
      return;
    }

    GoldspireSecureUI.showPrompt({
      title: 'Secure selection',
      submitLabel: 'Secure as [redacted]',
      fields: [
        {
          type: 'radio-group',
          name: 'mode',
          label: 'Protection',
          options: [
            { value: 'team', label: 'Team passphrase', checked: settings.defaultSecureMode === 'team' },
            { value: 'one-time', label: 'One-time code (share separately)', checked: settings.defaultSecureMode === 'one-time' },
            { value: 'custom', label: 'Custom passphrase (this message only)', checked: settings.defaultSecureMode === 'custom' },
          ],
        },
        {
          name: 'passphrase',
          label: 'Team passphrase',
          type: 'password',
          value: settings.passphraseIn1Password ? '' : settings.useSavedPassphrase ? settings.passphrase : '',
        },
        {
          name: 'customPassphrase',
          label: 'Custom passphrase',
          type: 'password',
        },
        {
          type: 'checkbox',
          name: 'copyLink',
          label: 'Copy backup unlock link (one-time mode)',
          checked: false,
        },
      ],
      onSubmit: async ({ mode, passphrase, customPassphrase, copyLink }) => {
        const isOneTime = mode === 'one-time';
        const unlockSecret = isOneTime
          ? GoldspireSecureCrypto.generateOneTimeCode(16)
          : mode === 'custom'
            ? customPassphrase?.trim()
            : passphrase?.trim() || teamPassphrase;

        if (!unlockSecret) throw new Error('Passphrase is required.');

        if (!isOneTime && settings.enforceStrongPassphrase !== false && mode !== 'custom') {
          GoldspirePassphrasePolicy?.assertPassphrase?.(unlockSecret, profile, { mode });
        }

        await executeSecure(context, settings, {
          mode: isOneTime ? 'one-time' : mode,
          unlockSecret,
          copyLink,
        });
      },
    });
  }

  async function unlockSelection(message = {}) {
    if (!ensureExtensionReady()) return;

    const context = getSelectionContext(message);
    if (!context?.selectedText) {
      GoldspireSecureUI.showToast('Click or highlight [redacted] to unlock.', 'error');
      return;
    }

    const marker = GoldspireRedacted.resolveSelection(context, context.selectedText);
    if (!marker) {
      GoldspireSecureUI.showToast('No [redacted] text found here.', 'error');
      return;
    }

    await unlockMarker(marker, { context, copyResult: false });
  }

  async function insertGeneratedPassword() {
    const settings = await getSettings();
    const password = GoldspirePassword.generatePassword({
      length: settings.passwordLength,
      lowercase: settings.passwordLowercase,
      uppercase: settings.passwordUppercase,
      digits: settings.passwordDigits,
      symbols: settings.passwordSymbols,
    });

    if (!insertAtCursor(password)) {
      await copyWithAutoClear(password, settings);
      GoldspireSecureUI.showToast('Password copied to clipboard.', 'info');
      return;
    }

    GoldspireSecureUI.showResultDialog({
      title: 'Password generated',
      lines: [{ label: 'Password', value: password }],
      copyItems: [{ label: 'Copy', value: password }],
      extraActions: [build1PasswordSaveAction(password, 'Generated password', 'Created with Goldspire Secure Text.')],
    });
    refreshSelectionUi();
  }

  async function handleCommand(message = {}) {
    try {
      const handlers = {
        SECURE_SELECTION: () => secureSelection(message),
        SECURE_WITH_OPTIONS: () => secureSelection({ ...message, showOptions: true }),
        UNLOCK_SELECTION: () => unlockSelection(message),
        INSERT_GENERATED_PASSWORD: insertGeneratedPassword,
        INSERT_TEXT: async () => {
          if (!message.text) return;
          if (!insertAtCursor(message.text)) {
            await copyWithAutoClear(message.text, await getSettings());
            GoldspireSecureUI.showToast('Copied to clipboard.', 'info');
          }
        },
        GET_SELECTION_STATUS: async () => ({ preview: GoldspireSelection.getCachedPreview() }),
      };

      const handler = handlers[message?.type];
      if (!handler) return { ok: false };
      await handler();
      return { ok: true, preview: GoldspireSelection.getCachedPreview() };
    } catch (error) {
      if (isInvalidatedError(error)) {
        warnStaleContext();
        return { ok: false };
      }
      console.warn('[Goldspire Secure Text]', error);
      safeToast('Something went wrong — refresh the page and try again.', 'error');
      return { ok: false };
    }
  }

  window.__goldspireHandleCommand = handleCommand;

  function ensureFloatingButtons() {
    if (document.getElementById('goldspire-secure-text-fabs')) return;

    getSettings().then((settings) => {
      if (!settings.showFloatingButton) return;

      const wrap = document.createElement('div');
      wrap.id = 'goldspire-secure-text-fabs';
      wrap.className = 'gst-fabs';
      wrap.innerHTML = `
        <button type="button" id="goldspire-secure-fab" class="gst-fab">Secure</button>
        <button type="button" id="goldspire-unlock-fab" class="gst-fab gst-fab--unlock">Unlock</button>
      `;
      document.documentElement.appendChild(wrap);

      wrap.querySelector('#goldspire-secure-fab')?.addEventListener('click', () => runSafe(secureSelection()));
      wrap.querySelector('#goldspire-unlock-fab')?.addEventListener('click', () => runSafe(unlockSelection()));
      refreshSelectionUi();
    }).catch(() => {});
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window || event.data?.source !== 'goldspire-secure-text-extension') return;
    runSafe(handleCommand(event.data));
  });

  GoldspireSelection.initSelectionTracking();
  ensureSelectionStatus();
  detectorController = GoldspireSecureDetector.initDetector(getSettings, (marker, node) => {
    runSafe(unlockMarker(marker, { replaceNode: node, copyResult: true }));
  });

  try {
    runtimeApi()?.onMessage?.addListener((message, _sender, sendResponse) => {
      runSafe(
        handleCommand(message).then((result) => {
          try {
            sendResponse(result || { ok: true });
          } catch {
            // Extension context may already be gone.
          }
        }),
      );
      return true;
    });
  } catch (error) {
    if (isInvalidatedError(error)) markContextDead();
  }

  ensureFloatingButtons();
})();
