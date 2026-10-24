# 🔐 CipherVault — Secure Relational Message Vault

[![Live Demo](https://img.shields.io/badge/🌐_LIVE_WEBSITE-CLICK_HERE_TO_LAUNCH-success?style=for-the-badge&logo=googlechrome&logoColor=white)](https://kaustubhtripathi-1012.github.io/secure-platfrom/)
[![GitHub Pages Deployment](https://img.shields.io/badge/GitHub_Pages-Active_&_Online-blue?style=for-the-badge&logo=github)](https://kaustubhtripathi-1012.github.io/secure-platfrom/)
[![Security](https://img.shields.io/badge/Encryption-AES--GCM--256-blueviolet?style=for-the-badge&logo=shield)](https://kaustubhtripathi-1012.github.io/secure-platfrom/)

---

### 🚀 **Live Working Website**:
👉 **[https://kaustubhtripathi-1012.github.io/secure-platfrom/](https://kaustubhtripathi-1012.github.io/secure-platfrom/)** 👈

> 💡 **Notice**:
> - **`github.com/kaustubhtripathi-1012/secure-platfrom`** is the **source code repository** (which displays this README file).
> - **`kaustubhtripathi-1012.github.io/secure-platfrom/`** is the **hosted live website** running the interactive WebCrypto application!

---

## ⚡ Quick Demo Access

When you launch the website:
- **1-Click Access**: Click the **⚡ 1-Click Instant Demo Access** button to jump directly into the dashboard.
- **Or Manual Login**:
  - **Email**: `admin@ciphervault.local`
  - **Passphrase**: `admin123` (or enter any custom passphrase to derive unique cryptographic keys)

---

## ✨ Features & Architecture

CipherVault is a client-side zero-knowledge encryption vault built with standard browser cryptographic primitives (**WebCrypto API**):

1. **🔐 AES-GCM 256-bit Encryption & Decryption**:
   - Client-side message encryption with authenticated tags (GMAC).
   - Dynamic salt generation and PBKDF2 (100,000 iterations) key derivation.
   - Real-time password strength analyzer and character counters.

2. **🔑 Automated Cryptographic Key Generation**:
   - Generate secure 256-bit AES master keys and salts on demand.
   - Copy-to-clipboard functionality with instant visual feedback.

3. **📊 Relational Message Vault & History**:
   - Store encrypted payloads, recipient tags, timestamps, and initialization vectors (IV).
   - Filter and search past encrypted payloads.

4. **💾 Multi-Format Database Export & Backup**:
   - **Encrypted SQL**: Relational database dump compatible with PostgreSQL/MySQL.
   - **JSON Data**: Portable standard format for cloud backups.
   - **Raw CSV**: Tabular spreadsheet format for auditing.

5. **🛡️ Multi-Factor & Biometric Security Simulation**:
   - Two-Factor Authentication (2FA) with authenticator app QR code simulation.
   - Biometric unlock and hardware authentication simulation.
   - Encrypted cloud sync toggle in security settings.

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, Vanilla JavaScript (ES6+), Modern Responsive Layouts
- **Styling**: Tailwind CSS & Glassmorphic Dark UI Theme
- **Cryptography**: Native Browser `window.crypto.subtle` (AES-GCM, PBKDF2, SHA-256)
- **Deployment**: GitHub Pages via GitHub Actions (Zero Ruby/Jekyll dependencies)

---

## 💻 Running Locally

To run this project locally on your computer:
1. Clone the repository:
   ```bash
   git clone https://github.com/kaustubhtripathi-1012/secure-platfrom.git
   ```
2. Open `index.html` in any modern web browser (Google Chrome, Firefox, Edge, Safari).
3. No build tools or Node.js required!
