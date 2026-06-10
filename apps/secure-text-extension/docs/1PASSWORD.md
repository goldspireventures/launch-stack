# 1Password integration

## Create the team Login item (required for autofill)

1Password autofill needs a **Login** item (not a Secure Note) with a **username + password** pair and matching **websites**.

| Field | Value |
|-------|--------|
| **Type** | Login |
| **Title** | `Goldspire Team Passphrase` |
| **Username** | `goldspire-team` (must match exactly) |
| **Password** | Your shared team passphrase |
| **Websites** | Add all of these: |

- `https://mail.google.com`
- `https://outlook.live.com`
- `https://outlook.office.com`
- `https://goldspire-global.github.io`

Share this item in your **team vault** so everyone can fill it.

## Using autofill

When the unlock popup or hosted unlock page opens:

1. Click inside the **Passphrase** field
2. Click the **1Password icon** in the field, **or** press **Ctrl+\\** (Windows) / **Cmd+\\** (Mac)
3. Select **Goldspire Team Passphrase**

The form shows **Account: goldspire-team** so 1Password matches the correct Login item.

## Extension settings (v0.7+)

- **Team passphrase lives in 1Password** is **on by default** — recommended for all team installs
- Use a **20+ character** generated password in the shared vault item (organization profile enforces 16+ minimum)
- One-click secure is disabled in 1Password-only mode — fill from 1Password when securing/unlocking

## Save to 1Password button

Programmatic save uses the [1Password extension-messaging API](https://github.com/1Password/extension-messaging). Email **support+partnerships@1password.com** to allowlist this extension before Save works in production. Autofill does **not** require allowlisting.

### Partnership email template

```text
To: support+partnerships@1password.com
Subject: Extension allowlist — Goldspire Secure Text

Hi 1Password partnerships team,

We'd like to allowlist our browser extension for the extension-messaging Save API.

Extension name: Goldspire Secure Text
Chrome ID: [fill after first Chrome Web Store publish or unpacked ID]
Firefox ID: goldspire-secure-text@studio.goldspire
Use case: Save generated passwords and one-time unlock codes to shared vaults.

Thank you,
[Your name / org]
```
