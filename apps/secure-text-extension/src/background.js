importScripts('constants.js', 'browser.js', 'crypto.js', 'secrets.js', 'settings.js');

const MENU_ROOT = 'goldspire-root';
const MENU_SECURE = 'goldspire-secure-selection';
const MENU_SECURE_OPTIONS = 'goldspire-secure-options';
const MENU_UNLOCK = 'goldspire-unlock-selection';
const MENU_GENERATE = 'goldspire-generate-password';

const CONTENT_FILES = [
  'src/constants.js',
  'src/passphrase-policy.js',
  'src/burn-list.js',
  'src/audit.js',
  'src/browser.js',
  'src/crypto.js',
  'src/marker.js',
  'src/redacted.js',
  'src/password.js',
  'src/selection.js',
  'src/secrets.js',
  'src/settings.js',
  'src/resecure.js',
  'src/ui.js',
  'src/onepassword.js',
  'src/detector.js',
  'src/content.js',
  'src/unlock-host.js',
];

const api = GoldspireBrowser.api;

function createMenus() {
  api.contextMenus.removeAll(() => {
    if (api.runtime.lastError) {
      console.warn('Goldspire Secure Text: context menu reset failed', api.runtime.lastError);
    }

    api.contextMenus.create({
      id: MENU_ROOT,
      title: 'Goldspire Secure Text',
      contexts: ['selection', 'editable'],
    });

    api.contextMenus.create({
      id: MENU_SECURE,
      parentId: MENU_ROOT,
      title: 'Secure selection',
      contexts: ['selection', 'editable'],
    });

    api.contextMenus.create({
      id: MENU_SECURE_OPTIONS,
      parentId: MENU_ROOT,
      title: 'Secure with options…',
      contexts: ['selection', 'editable'],
    });

    api.contextMenus.create({
      id: MENU_UNLOCK,
      parentId: MENU_ROOT,
      title: 'Unlock secured text',
      contexts: ['selection', 'editable'],
    });

    api.contextMenus.create({
      id: MENU_GENERATE,
      parentId: MENU_ROOT,
      title: 'Generate & insert password',
      contexts: ['editable'],
    });
  });
}

async function ensureContentScript(tabId) {
  try {
    await api.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: CONTENT_FILES,
    });
  } catch (error) {
    console.warn('Goldspire Secure Text: could not inject content script', error);
  }
}

async function dispatchToTab(tabId, frameId, message, retried = false) {
  const deliver = (targetFrameId) =>
    new Promise((resolve) => {
      const options = targetFrameId != null ? { frameId: targetFrameId } : undefined;
      api.tabs.sendMessage(tabId, message, options, (response) => {
        if (api.runtime.lastError) {
          resolve(null);
          return;
        }
        resolve(response);
      });
    });

  if (frameId != null) {
    const direct = await deliver(frameId);
    if (direct) return direct;
  }

  const main = await deliver(undefined);
  if (main) return main;

  try {
    const results = await api.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: (payload) => {
        if (typeof window.__goldspireHandleCommand === 'function') {
          return window.__goldspireHandleCommand(payload);
        }
        window.postMessage({ ...payload, source: 'goldspire-secure-text-extension' }, '*');
        return { ok: true, relayed: true };
      },
      args: [message],
    });

    for (const result of results || []) {
      if (result?.result?.preview || result?.result?.ok) return result.result;
    }
  } catch {
    if (!retried) {
      await ensureContentScript(tabId);
      return dispatchToTab(tabId, frameId, message, true);
    }
  }

  return { ok: false };
}

function sendToActiveTab(type, payload = {}, frameId = null) {
  api.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const tab = tabs[0];
    if (!tab?.id) return;
    await dispatchToTab(tab.id, frameId, { type, ...payload });
  });
}

api.runtime.onInstalled.addListener(() => {
  createMenus();
});

api.runtime.onStartup.addListener(() => {
  createMenus();
});

createMenus();

api.contextMenus.onClicked.addListener((info, tab) => {
  const frameId = info.frameId;
  const selectionText = info.selectionText || '';

  if (info.menuItemId === MENU_SECURE) {
    sendToActiveTab('SECURE_SELECTION', { selectionText }, frameId);
  }

  if (info.menuItemId === MENU_SECURE_OPTIONS) {
    sendToActiveTab('SECURE_WITH_OPTIONS', { selectionText }, frameId);
  }

  if (info.menuItemId === MENU_UNLOCK) {
    sendToActiveTab('UNLOCK_SELECTION', { selectionText }, frameId);
  }

  if (info.menuItemId === MENU_GENERATE) {
    sendToActiveTab('INSERT_GENERATED_PASSWORD', {}, frameId);
  }
});

api.commands.onCommand.addListener((command) => {
  if (command === 'secure-selection') sendToActiveTab('SECURE_SELECTION');
  if (command === 'unlock-selection') sendToActiveTab('UNLOCK_SELECTION');
  if (command === 'generate-password') sendToActiveTab('INSERT_GENERATED_PASSWORD');
});

api.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'SEND_TO_ACTIVE_TAB') {
    sendToActiveTab(message.action, message.payload || {});
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === 'GET_SETTINGS') {
    GoldspireSettings.load()
      .then((settings) => sendResponse({ settings }))
      .catch(() => sendResponse({ settings: { ...GoldspireSettings.DEFAULT_SETTINGS, passphrase: '' } }));
    return true;
  }

  if (message?.type === 'GET_SELECTION_STATUS') {
    api.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) {
        sendResponse({ preview: '' });
        return;
      }
      const result = await dispatchToTab(tab.id, null, { type: 'GET_SELECTION_STATUS' });
      sendResponse({ preview: result?.preview || '' });
    });
    return true;
  }

  return false;
});
