/**
 * Shared settings loader for content scripts and the service worker.
 */
(function (global) {
  const DEFAULT_SETTINGS = {
    defaultHint: '',
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

  async function load() {
    try {
      const gst = global.GoldspireBrowser;
      const settings = gst?.storageGet
        ? await gst.storageGet('sync', DEFAULT_SETTINGS)
        : { ...DEFAULT_SETTINGS };

      if (settings.passphraseIn1Password) {
        settings.passphrase = '';
      } else {
        try {
          settings.passphrase = await global.GoldspireSecrets?.loadPassphrase?.(
            settings.securityProfile || 'personal',
          );
        } catch {
          settings.passphrase = '';
        }
      }

      if (typeof settings.passphrase !== 'string') settings.passphrase = '';
      return settings;
    } catch {
      return { ...DEFAULT_SETTINGS, passphrase: '' };
    }
  }

  global.GoldspireSettings = { DEFAULT_SETTINGS, load };
})(typeof globalThis !== 'undefined' ? globalThis : self);
