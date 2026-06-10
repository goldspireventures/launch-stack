const api = typeof browser !== 'undefined' ? browser : chrome;

const builtInUnlockUrl = GoldspireConstants.BUILT_IN_PUBLIC_UNLOCK_URL;
const opItemTitle = GoldspireConstants.ONEPASSWORD_TEAM_ITEM_TITLE;

const defaults = {
  useSavedPassphrase: true,
  showFloatingButton: true,
  autoDetectRedacted: true,
  defaultSecureMode: 'team',
  copyOneTimeCodeAutomatically: true,
  clipboardClearSeconds: 30,
  passwordLength: 16,
  passwordLowercase: true,
  passwordUppercase: true,
  passwordDigits: true,
  passwordSymbols: true,
  securityProfile: 'personal',
  resecureAfterUnlock: true,
  resecureDelaySeconds: 60,
  publicUnlockUrl: '',
  passphraseIn1Password: true,
  enforceStrongPassphrase: true,
};

const form = document.getElementById('settings-form');
const status = document.getElementById('status');
const generatedPassword = document.getElementById('generated-password');
const passphraseField = document.getElementById('passphrase-field');
const passphraseInput = document.getElementById('passphrase');
const useSavedPassphraseInput = document.getElementById('useSavedPassphrase');
const passphraseIn1PasswordInput = document.getElementById('passphraseIn1Password');
const passphraseStrength = document.getElementById('passphrase-strength');
const securityProfileInput = document.getElementById('securityProfile');
const resecureDelayInput = document.getElementById('resecureDelaySeconds');
const SETTINGS_KEYS = [
  'securityProfile',
  'publicUnlockUrl',
  'defaultSecureMode',
  'useSavedPassphrase',
  'autoDetectRedacted',
  'resecureAfterUnlock',
  'resecureDelaySeconds',
  'passphraseIn1Password',
  'showFloatingButton',
  'copyOneTimeCodeAutomatically',
  'clipboardClearSeconds',
  'passwordLength',
  'enforceStrongPassphrase',
];
let passphraseDirty = false;
let hasStoredPassphrase = false;

function parseDelaySeconds(value, fallback = 60) {
  const parsed = parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(600, Math.max(5, parsed));
}

function readSyncSettings() {
  return new Promise((resolve) => {
    api.storage.sync.get(SETTINGS_KEYS, (result) => {
      if (api.runtime.lastError) {
        resolve({ ...defaults });
        return;
      }
      resolve({ ...defaults, ...(result || {}) });
    });
  });
}

function writeSyncSettings(patch) {
  return new Promise((resolve, reject) => {
    api.storage.sync.set(patch, () => {
      if (api.runtime.lastError) {
        reject(new Error(api.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

function refreshPassphraseStrength() {
  if (!passphraseStrength || !GoldspirePassphrasePolicy) return;
  const in1Password = passphraseIn1PasswordInput.checked;
  const profile = securityProfileInput?.value || 'personal';
  if (in1Password || !passphraseInput.value) {
    passphraseStrength.textContent = in1Password
      ? 'Passphrase stays in 1Password — recommended for teams.'
      : '';
    return;
  }
  const assessment = GoldspirePassphrasePolicy.assessPassphrase(passphraseInput.value, profile);
  passphraseStrength.textContent = assessment.ok
    ? `Strength: ${assessment.label}`
    : assessment.message;
  passphraseStrength.classList.toggle('hint--warn', !assessment.ok);
}

function showStatus(message) {
  status.hidden = false;
  status.textContent = message;
  window.setTimeout(() => { status.hidden = true; }, 2200);
}

function sendToActiveTab(action, payload = {}) {
  api.runtime.sendMessage({ type: 'SEND_TO_ACTIVE_TAB', action, payload });
}

function generateLocalPassword() {
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const symbols = '!@#$%&*-_+=?';
  const all = lower + upper + digits + symbols;
  const bytes = crypto.getRandomValues(new Uint32Array(16));
  return Array.from(bytes, (b) => all[b % all.length]).join('');
}

function refreshPassphraseUi() {
  const in1Password = passphraseIn1PasswordInput.checked;
  passphraseInput.disabled = in1Password;
  if (in1Password) {
    passphraseInput.placeholder = 'Passphrase stays in 1Password — use autofill when securing/unlocking';
  } else if (hasStoredPassphrase && !passphraseDirty) {
    passphraseInput.placeholder = 'Saved — leave blank to keep, or type to replace';
  } else {
    passphraseInput.placeholder = 'Or fill from 1Password…';
  }
  useSavedPassphraseInput.disabled = in1Password;
}

function applySettingsToForm(settings) {
  const profile = settings.securityProfile || 'personal';
  const in1Password = settings.passphraseIn1Password !== false;

  securityProfileInput.value = profile;
  const customUrl = settings.publicUnlockUrl?.trim() || '';
  document.getElementById('publicUnlockUrl').value = customUrl && customUrl !== builtInUnlockUrl ? customUrl : '';
  document.getElementById('defaultSecureMode').value = settings.defaultSecureMode || defaults.defaultSecureMode;
  useSavedPassphraseInput.checked = settings.useSavedPassphrase !== false;
  document.getElementById('autoDetectRedacted').checked = settings.autoDetectRedacted !== false;
  document.getElementById('resecureAfterUnlock').checked = settings.resecureAfterUnlock !== false;
  resecureDelayInput.value = String(parseDelaySeconds(settings.resecureDelaySeconds));
  passphraseIn1PasswordInput.checked = in1Password;

  return { profile, in1Password };
}

async function loadSettings() {
  const settings = await readSyncSettings();
  const { profile, in1Password } = applySettingsToForm(settings);

  if (in1Password) {
    hasStoredPassphrase = false;
    passphraseInput.value = '';
  } else {
    const stored = await GoldspireSecrets.loadPassphrase(profile);
    hasStoredPassphrase = Boolean(stored?.trim());
    passphraseInput.value = stored || '';
  }

  passphraseDirty = false;
  refreshPassphraseUi();
  refreshPassphraseStrength();
}

function refreshSelectionPreview() {
  const preview = document.getElementById('selection-preview');
  api.runtime.sendMessage({ type: 'GET_SELECTION_STATUS' }, (response) => {
    const text = response?.preview?.trim() || '';
    preview.textContent = text
      ? `On page: "${text.slice(0, 40)}${text.length > 40 ? '…' : ''}"`
      : 'Highlight text on the page, then secure it.';
  });
}

function setupBookmarklet() {
  const link = document.getElementById('bookmarklet-link');
  const url = api.runtime.getURL('bookmarklet/run.js');
  link.href = `javascript:(function(){var s=document.createElement('script');s.src='${url}';document.head.appendChild(s);})();`;
  link.addEventListener('click', (event) => {
    event.preventDefault();
    navigator.clipboard.writeText(link.href);
    showStatus('Bookmarklet code copied — create a bookmark and paste as the URL.');
  });
}

document.querySelectorAll('.tabs__btn').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.tabs__btn').forEach((b) => b.classList.remove('tabs__btn--active'));
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('tab--active'));
    button.classList.add('tabs__btn--active');
    document.getElementById(`tab-${button.dataset.tab}`).classList.add('tab--active');
  });
});

document.getElementById('generate-password').addEventListener('click', () => {
  generatedPassword.textContent = generateLocalPassword();
});

document.getElementById('copy-password').addEventListener('click', async () => {
  const value = generatedPassword.textContent === '—' ? generateLocalPassword() : generatedPassword.textContent;
  generatedPassword.textContent = value;
  await navigator.clipboard.writeText(value);
  showStatus('Copied.');
});

document.getElementById('insert-password').addEventListener('click', () => {
  const value = generatedPassword.textContent === '—' ? generateLocalPassword() : generatedPassword.textContent;
  generatedPassword.textContent = value;
  sendToActiveTab('INSERT_TEXT', { text: value });
  showStatus('Inserted.');
});

document.getElementById('save-password-1p').addEventListener('click', async () => {
  const value = generatedPassword.textContent === '—' ? generateLocalPassword() : generatedPassword.textContent;
  generatedPassword.textContent = value;
  const outcome = await GoldspireOnePassword.savePasswordItem({
    title: 'Generated password',
    password: value,
    notes: 'Created with Goldspire Secure Text.',
  });
  showStatus(outcome.ok ? 'Opened 1Password save dialog.' : outcome.reason || '1Password unavailable.');
});

document.getElementById('action-secure').addEventListener('click', () => sendToActiveTab('SECURE_SELECTION'));
document.getElementById('action-unlock').addEventListener('click', () => sendToActiveTab('UNLOCK_SELECTION'));

passphraseIn1PasswordInput.addEventListener('change', () => {
  if (passphraseIn1PasswordInput.checked) {
    useSavedPassphraseInput.checked = false;
    passphraseInput.value = '';
    passphraseDirty = false;
    hasStoredPassphrase = false;
  }
  refreshPassphraseUi();
  refreshPassphraseStrength();
});
passphraseInput.addEventListener('input', () => {
  passphraseDirty = true;
  refreshPassphraseUi();
  refreshPassphraseStrength();
});
securityProfileInput?.addEventListener('change', async () => {
  if (!passphraseIn1PasswordInput.checked) {
    const stored = await GoldspireSecrets.loadPassphrase(securityProfileInput.value);
    hasStoredPassphrase = Boolean(stored?.trim());
    if (!passphraseDirty) {
      passphraseInput.value = stored || '';
    }
  }
  refreshPassphraseUi();
  refreshPassphraseStrength();
});

document.getElementById('op-item-title').textContent = opItemTitle;

loadSettings().catch(() => showStatus('Could not load settings.'));

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const profile = securityProfileInput.value;
  const in1Password = passphraseIn1PasswordInput.checked;
  const newPassphrase = passphraseInput.value.trim();
  const resecureDelaySeconds = parseDelaySeconds(resecureDelayInput.value);

  if (!in1Password && newPassphrase) {
    const assessment = GoldspirePassphrasePolicy?.assessPassphrase?.(newPassphrase, profile);
    if (assessment && !assessment.ok) {
      showStatus(assessment.message);
      return;
    }
  }

  if (in1Password) {
    await GoldspireSecrets.savePassphrase('', profile);
    await GoldspireSecrets.clearSessionTeamPassphrase?.();
  } else if (passphraseDirty || newPassphrase) {
    await GoldspireSecrets.savePassphrase(newPassphrase, profile);
  }

  const savedSettings = {
    securityProfile: profile,
    publicUnlockUrl: document.getElementById('publicUnlockUrl').value.trim(),
    defaultSecureMode: document.getElementById('defaultSecureMode').value,
    useSavedPassphrase: in1Password ? false : useSavedPassphraseInput.checked,
    autoDetectRedacted: document.getElementById('autoDetectRedacted').checked,
    resecureAfterUnlock: document.getElementById('resecureAfterUnlock').checked,
    resecureDelaySeconds,
    passphraseIn1Password: in1Password,
  };

  try {
    const current = await readSyncSettings();
    await writeSyncSettings({ ...current, ...savedSettings });
    applySettingsToForm({ ...current, ...savedSettings });
    resecureDelayInput.value = String(resecureDelaySeconds);
    passphraseDirty = false;
    if (!in1Password) {
      const stored = await GoldspireSecrets.loadPassphrase(profile);
      hasStoredPassphrase = Boolean(stored?.trim());
      if (stored) passphraseInput.value = stored;
    }
    refreshPassphraseUi();
    refreshPassphraseStrength();
    showStatus(`Settings saved (re-lock: ${resecureDelaySeconds}s).`);
  } catch (error) {
    showStatus(error?.message || 'Could not save settings.');
  }
});

setupBookmarklet();
refreshSelectionPreview();
