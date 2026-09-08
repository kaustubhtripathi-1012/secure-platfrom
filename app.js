/* app.js - CipherVault Core Controller */

// Global App State
const state = {
    isAuthenticated: false,
    is2faCompleted: false,
    currentUser: null,
    activePassphrase: null, // Keep passphrase/keys in memory only
    derivedMasterKey: null,
    history: [],
    settings: {
        biometrics: false,
        cloudSync: false,
        twoFactorStatus: true
    }
};

// Router Configurations
const routes = {
    login: 'login-view',
    '2fa-setup': '2fa-setup-view',
    dashboard: 'dashboard-view',
    encrypt: 'encrypt-view',
    decrypt: 'decrypt-view',
    'key-gen': 'key-gen-view',
    history: 'history-view',
    settings: 'settings-view',
    export: 'export-view'
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // Load Settings and History metadata from localStorage
    loadHistoryFromStorage();
    loadSettingsFromStorage();

    // Hash change listener for client-side routing
    window.addEventListener('hashchange', handleRouting);

    // Bind UI actions
    setupEventHandlers();

    // Initial routing
    handleRouting();
}

// Router Implementation
function handleRouting() {
    let hash = window.location.hash.substring(1);
    if (!hash) {
        hash = 'login';
    }

    // Authentication Guard
    if (!state.isAuthenticated && hash !== 'login' && hash !== '2fa-setup') {
        window.location.hash = '#login';
        return;
    }

    // 2FA Flow Guard
    if (state.isAuthenticated && !state.is2faCompleted && hash !== '2fa-setup' && hash !== 'login') {
        window.location.hash = '#2fa-setup';
        return;
    }

    // Toggle Navigation Shell elements based on active view state
    const authViews = ['dashboard', 'encrypt', 'decrypt', 'key-gen', 'history', 'settings', 'export'];
    const showShell = state.isAuthenticated && state.is2faCompleted && authViews.includes(hash);

    const shellHeader = document.getElementById('shell-header');
    const shellSidebar = document.getElementById('shell-sidebar');
    const shellBottomNav = document.getElementById('shell-bottom-nav');
    const mainContainer = document.getElementById('main-container');
    const desktopStatus = document.getElementById('desktop-status-bar');

    // Auto-close mobile drawer on route change
    closeMobileDrawer();

    if (showShell) {
        if (shellHeader) shellHeader.classList.remove('hidden');
        if (shellSidebar) shellSidebar.classList.remove('hidden');
        if (shellBottomNav) shellBottomNav.classList.remove('hidden');
        if (desktopStatus) desktopStatus.style.display = '';

        if (mainContainer) {
            mainContainer.className = "flex-grow pt-20 pb-28 md:pt-24 md:pb-16 md:pl-64 w-full max-w-container-max mx-auto px-4 sm:px-6 md:px-8 z-10 flex flex-col items-center justify-start transition-all duration-300";
        }
    } else {
        if (shellHeader) shellHeader.classList.add('hidden');
        if (shellSidebar) shellSidebar.classList.add('hidden');
        if (shellBottomNav) shellBottomNav.classList.add('hidden');
        if (desktopStatus) desktopStatus.style.display = 'none';

        if (mainContainer) {
            mainContainer.className = "flex-grow flex items-center justify-center w-full min-h-[calc(100vh-64px)] px-4 z-10 transition-all duration-300";
        }
    }

    // Toggle Views
    Object.keys(routes).forEach(route => {
        const viewId = routes[route];
        const element = document.getElementById(viewId);
        if (element) {
            if (route === hash) {
                element.classList.remove('view-hidden');
                element.classList.add('view-visible');
            } else {
                element.classList.remove('view-visible');
                element.classList.add('view-hidden');
            }
        }
    });

    // Update Navigation highlights
    updateNavSelection(hash);

    // Perform view-specific setup
    onViewActivated(hash);
}

function updateNavSelection(hash) {
    // Desktop & Mobile Drawer Sidebar Nav selection
    const sidebarLinks = document.querySelectorAll('#shell-sidebar nav a');
    sidebarLinks.forEach(link => {
        const linkHash = link.getAttribute('href').substring(1);
        const indicator = link.querySelector('.nav-indicator');
        if (linkHash === hash) {
            link.classList.remove('text-on-surface-variant', 'hover:bg-surface-variant/50');
            link.classList.add('text-primary', 'bg-primary-container/20', 'font-medium');
            if (indicator) indicator.classList.remove('hidden');
        } else {
            link.classList.add('text-on-surface-variant', 'hover:bg-surface-variant/50');
            link.classList.remove('text-primary', 'bg-primary-container/20', 'font-medium');
            if (indicator) indicator.classList.add('hidden');
        }
    });

    // Mobile Bottom Nav selection
    const bottomLinks = document.querySelectorAll('#shell-bottom-nav a');
    bottomLinks.forEach(link => {
        const linkHash = link.getAttribute('href').substring(1);
        if (linkHash === hash) {
            link.classList.add('bg-primary-container/20', 'text-primary', 'opacity-100');
            link.classList.remove('text-on-surface-variant', 'opacity-70');
        } else {
            link.classList.remove('bg-primary-container/20', 'text-primary', 'opacity-100');
            link.classList.add('text-on-surface-variant', 'opacity-70');
        }
    });
}

// Mobile Navigation Drawer Helpers
function openMobileDrawer() {
    const sidebar = document.getElementById('shell-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) {
        sidebar.classList.remove('-translate-x-full');
        sidebar.classList.add('translate-x-0');
    }
    if (backdrop) {
        backdrop.classList.remove('hidden');
        requestAnimationFrame(() => {
            backdrop.classList.remove('opacity-0');
            backdrop.classList.add('opacity-100');
        });
    }
}

function closeMobileDrawer() {
    const sidebar = document.getElementById('shell-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) {
        sidebar.classList.add('-translate-x-full');
        sidebar.classList.remove('translate-x-0');
    }
    if (backdrop) {
        backdrop.classList.remove('opacity-100');
        backdrop.classList.add('opacity-0');
        setTimeout(() => {
            backdrop.classList.add('hidden');
        }, 300);
    }
}

function toggleMobileDrawer() {
    const sidebar = document.getElementById('shell-sidebar');
    if (sidebar && sidebar.classList.contains('translate-x-0')) {
        closeMobileDrawer();
    } else {
        openMobileDrawer();
    }
}

function onViewActivated(hash) {
    if (hash === 'dashboard') {
        renderDashboard();
    } else if (hash === 'history') {
        renderHistory();
    } else if (hash === 'export') {
        updateExportStats();
    }
}

// LocalStorage Persistence
function loadHistoryFromStorage() {
    const raw = localStorage.getItem('ciphervault_history');
    if (raw) {
        state.history = JSON.parse(raw);
    } else {
        // Pre-populate with realistic mock records if completely empty
        state.history = getMockHistory();
        saveHistoryToStorage();
    }
}

// Fixed serialization formatting in saving history
function saveHistoryToStorage() {
    localStorage.setItem('ciphervault_history', JSON.stringify(state.history));
}

function loadSettingsFromStorage() {
    const raw = localStorage.getItem('ciphervault_settings');
    if (raw) {
        state.settings = JSON.parse(raw);
    }
}

function saveSettingsToStorage() {
    localStorage.setItem('ciphervault_settings', JSON.stringify(state.settings));
}

// Cryptographic Engine using Web Crypto API
async function deriveKey(passphrase, saltBytes) {
    const encoder = new TextEncoder();
    const passphraseKey = await window.crypto.subtle.importKey(
        'raw',
        encoder.encode(passphrase),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    );

    return window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: saltBytes,
            iterations: 100000,
            hash: 'SHA-256'
        },
        passphraseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

async function encryptPayload(plaintext, passphrase, customSaltHex = '') {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // Generate salt
    let saltBytes;
    if (customSaltHex) {
        saltBytes = hexToBytes(customSaltHex);
    } else {
        saltBytes = window.crypto.getRandomValues(new Uint8Array(16)); // 128-bit salt
    }

    // Generate derived AES-GCM Key
    const key = await deriveKey(passphrase, saltBytes);

    // Generate 12-byte IV (nonce)
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // Encrypt
    const ciphertextBuffer = await window.crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: iv,
            tagLength: 128
        },
        key,
        data
    );

    // Format JSON output payload
    const payload = {
        v: 1,
        algo: 'AES-256-GCM',
        salt: bytesToBase64(saltBytes),
        iv: bytesToBase64(iv),
        ct: arrayBufferToBase64(ciphertextBuffer)
    };

    return {
        serialized: btoa(JSON.stringify(payload)), // Package as Base64 string
        saltHex: bytesToHex(saltBytes),
        ivHex: bytesToHex(iv)
    };
}

async function decryptPayload(serializedPayload, passphrase) {
    try {
        const decodedString = atob(serializedPayload);
        const payload = JSON.parse(decodedString);

        if (payload.algo !== 'AES-256-GCM') {
            throw new Error('Unsupported algorithm protocol.');
        }

        const saltBytes = base64ToBytes(payload.salt);
        const ivBytes = base64ToBytes(payload.iv);
        const ciphertextBytes = base64ToBytes(payload.ct);

        // Derive key
        const key = await deriveKey(passphrase, saltBytes);

        // Decrypt
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: ivBytes,
                tagLength: 128
            },
            key,
            ciphertextBytes
        );

        const decoder = new TextDecoder();
        return decoder.decode(decryptedBuffer);
    } catch (e) {
        console.error('Decryption failed:', e);
        throw new Error('Decryption failed. Please verify the ciphertext and password.');
    }
}

// Binary / Encoding Utilities
function bytesToBase64(bytes) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToBytes(base64) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

function arrayBufferToBase64(buffer) {
    return bytesToBase64(new Uint8Array(buffer));
}

function bytesToHex(bytes) {
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function hexToBytes(hex) {
    const cleanHex = hex.replace(/\s+/g, '');
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
        bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
    }
    return bytes;
}

// Setup Event Handlers
function setupEventHandlers() {
    // General settings/logout triggers
    const settingsBtns = document.querySelectorAll('[data-action="goto-settings"]');
    settingsBtns.forEach(btn => {
        btn.addEventListener('click', () => { window.location.hash = '#settings'; });
    });

    // Login Submit
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Password visibility toggle
    const pswToggle = document.getElementById('password-toggle');
    if (pswToggle) {
        pswToggle.addEventListener('click', () => {
            const input = document.getElementById('login-password');
            const icon = pswToggle.querySelector('span');
            if (input.type === 'password') {
                input.type = 'text';
                icon.textContent = 'visibility_off';
            } else {
                input.type = 'password';
                icon.textContent = 'visibility';
            }
        });
    }

    // 2FA Setup Flow Continue
    const continueBtn = document.getElementById('continue-btn');
    if (continueBtn) {
        // Trigger simulated scan countdown
        setTimeout(() => {
            continueBtn.classList.remove('bg-surface-variant', 'text-on-surface-variant', 'cursor-not-allowed', 'border-outline-variant/30');
            continueBtn.classList.add('bg-primary', 'text-on-primary', 'border-transparent', 'hover:bg-primary-fixed', 'shadow-[inset_0_0_10px_rgba(255,255,255,0.2)]', 'cursor-pointer');
            continueBtn.disabled = false;
        }, 3000);

        continueBtn.addEventListener('click', () => {
            state.is2faCompleted = true;
            window.location.hash = '#dashboard';
        });
    }

    // Password Strength Meter in Encrypt View
    const plaintextTextarea = document.getElementById('plaintext');
    if (plaintextTextarea) {
        plaintextTextarea.addEventListener('input', e => {
            const count = e.target.value.length;
            document.getElementById('char-counter').textContent = count + ' / 4096';
        });
    }

    const encryptPswInput = document.getElementById('encrypt-password');
    if (encryptPswInput) {
        encryptPswInput.addEventListener('input', e => {
            updateEncryptionPasswordStrength(e.target.value);
        });
    }

    // Encryption visibility toggle
    const encPswToggle = document.getElementById('enc-psw-toggle');
    if (encPswToggle) {
        encPswToggle.addEventListener('click', () => {
            const input = document.getElementById('encrypt-password');
            const icon = encPswToggle.querySelector('span');
            if (input.type === 'password') {
                input.type = 'text';
                icon.textContent = 'visibility_off';
            } else {
                input.type = 'password';
                icon.textContent = 'visibility';
            }
        });
    }

    // Salt generator
    const genSaltBtn = document.getElementById('btn-generate-salt');
    if (genSaltBtn) {
        genSaltBtn.addEventListener('click', () => {
            const saltBytes = window.crypto.getRandomValues(new Uint8Array(16));
            const saltHex = bytesToHex(saltBytes);
            const saltInput = document.getElementById('salt-key');
            saltInput.value = saltHex;
            saltInput.classList.remove('opacity-50', 'text-outline');
            saltInput.classList.add('text-primary-fixed-dim');
        });
    }

    // Secure Encrypt Action
    const encryptBtn = document.getElementById('btn-encrypt');
    if (encryptBtn) {
        encryptBtn.addEventListener('click', triggerEncryption);
    }

    // Encrypt view actions
    document.getElementById('btn-reset').addEventListener('click', resetEncryptView);
    document.getElementById('btn-copy-cipher').addEventListener('click', copyCiphertextToClipboard);
    document.getElementById('btn-save-vault').addEventListener('click', saveCiphertextToVaultHistory);

    // Decrypt Action
    const decryptBtn = document.getElementById('btn-decrypt');
    if (decryptBtn) {
        decryptBtn.addEventListener('click', triggerDecryption);
    }
    document.getElementById('btn-clear-decrypt').addEventListener('click', resetDecryptView);
    document.getElementById('btn-copy-plain').addEventListener('click', copyDecryptedPlaintext);

    // Master Key Generator View triggers
    const btnGenerateKey = document.getElementById('btn-generate-key');
    if (btnGenerateKey) {
        btnGenerateKey.addEventListener('click', generateCryptographicKeys);
    }
    document.getElementById('btn-copy-keygen').addEventListener('click', copyGeneratedKey);

    // Security Settings Switches
    const twoFactorToggle = document.getElementById('toggle-2fa');
    if (twoFactorToggle) {
        twoFactorToggle.addEventListener('change', e => {
            state.settings.twoFactorStatus = e.target.checked;
            saveSettingsToStorage();
        });
    }
    const biometricsToggle = document.getElementById('toggle-biometrics');
    if (biometricsToggle) {
        biometricsToggle.addEventListener('change', e => {
            state.settings.biometrics = e.target.checked;
            saveSettingsToStorage();
        });
    }
    const cloudSyncToggle = document.getElementById('toggle-cloud-sync');
    if (cloudSyncToggle) {
        cloudSyncToggle.addEventListener('change', e => {
            state.settings.cloudSync = e.target.checked;
            saveSettingsToStorage();
        });
    }

    // Destroy Session
    const destroySessionBtns = document.querySelectorAll('[data-action="destroy-session"]');
    destroySessionBtns.forEach(btn => {
        btn.addEventListener('click', handleLogout);
    });

    // Database Exporter pass visibility and strength
    const exportPassInput = document.getElementById('export_passphrase');
    if (exportPassInput) {
        exportPassInput.addEventListener('input', e => {
            updateExportPasswordStrength(e.target.value);
        });
    }
    document.getElementById('export-psw-toggle').addEventListener('click', () => {
        const input = document.getElementById('export_passphrase');
        const icon = document.getElementById('export-visibility-icon');
        if (input.type === 'password') {
            input.type = 'text';
            icon.textContent = 'visibility';
        } else {
            input.type = 'password';
            icon.textContent = 'visibility_off';
        }
    });

    // Radio button update for protocols
    const radioInputs = document.querySelectorAll('input[name="format"]');
    radioInputs.forEach(input => {
        input.addEventListener('change', () => {
            updateRadioSelection(input);
        });
    });

    // Download Backup Trigger
    const btnBackup = document.getElementById('btn-download-backup');
    if (btnBackup) {
        btnBackup.addEventListener('click', handleDatabaseBackup);
    }

    // Mobile Navigation Drawer Handlers
    const btnMobileMenu = document.getElementById('btn-mobile-menu');
    if (btnMobileMenu) {
        btnMobileMenu.addEventListener('click', openMobileDrawer);
    }
    const btnCloseSidebar = document.getElementById('btn-close-sidebar');
    if (btnCloseSidebar) {
        btnCloseSidebar.addEventListener('click', closeMobileDrawer);
    }
    const sidebarBackdrop = document.getElementById('sidebar-backdrop');
    if (sidebarBackdrop) {
        sidebarBackdrop.addEventListener('click', closeMobileDrawer);
    }
    const btnBottomMenu = document.getElementById('btn-bottom-menu');
    if (btnBottomMenu) {
        btnBottomMenu.addEventListener('click', toggleMobileDrawer);
    }
    const sidebarNavLinks = document.querySelectorAll('#shell-sidebar nav a');
    sidebarNavLinks.forEach(link => {
        link.addEventListener('click', () => {
            closeMobileDrawer();
        });
    });
}

// Authentication Logic
function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    // Mock Login check
    if (email === 'admin@ciphervault.local' && password === 'admin123') {
        state.isAuthenticated = true;
        state.currentUser = email;
        state.activePassphrase = password;

        // Derived active session key material in memory
        deriveKey(password, new Uint8Array(16)).then(key => {
            state.derivedMasterKey = key;
        });

        // Clear error
        const errMsg = document.getElementById('login-error');
        if (errMsg) errMsg.classList.add('hidden');

        // Route to next onboarding view
        if (state.settings.twoFactorStatus) {
            window.location.hash = '#2fa-setup';
        } else {
            state.is2faCompleted = true;
            window.location.hash = '#dashboard';
        }
    } else {
        const errMsg = document.getElementById('login-error');
        if (errMsg) {
            errMsg.textContent = 'INVALID CREDENTIALS. SESSION TIMED OUT.';
            errMsg.classList.remove('hidden');
        }
    }
}

function handleLogout() {
    state.isAuthenticated = false;
    state.is2faCompleted = false;
    state.currentUser = null;
    state.activePassphrase = null;
    state.derivedMasterKey = null;

    // Reset login forms
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.reset();

    const errMsg = document.getElementById('login-error');
    if (errMsg) errMsg.classList.add('hidden');

    window.location.hash = '#login';
}

// Encrypt Business Logic
function updateEncryptionPasswordStrength(val) {
    const bars = [
        document.getElementById('enc-strength-1'),
        document.getElementById('enc-strength-2'),
        document.getElementById('enc-strength-3'),
        document.getElementById('enc-strength-4')
    ];

    // Reset classes
    bars.forEach(el => {
        if (el) {
            el.className = el.className.replace(/bg-\w+(-\w+)?(\/\d+)?/g, 'bg-surface-variant');
        }
    });

    const len = val.length;
    if (len === 0) return;

    if (len < 6) {
        bars[0].classList.replace('bg-surface-variant', 'bg-error');
    } else if (len < 10) {
        bars[0].classList.replace('bg-surface-variant', 'bg-tertiary');
        bars[1].classList.replace('bg-surface-variant', 'bg-tertiary');
    } else if (len < 14) {
        bars[0].classList.replace('bg-surface-variant', 'bg-secondary');
        bars[1].classList.replace('bg-surface-variant', 'bg-secondary');
        bars[2].classList.replace('bg-surface-variant', 'bg-secondary');
    } else {
        bars[0].classList.replace('bg-surface-variant', 'bg-secondary');
        bars[1].classList.replace('bg-surface-variant', 'bg-secondary');
        bars[2].classList.replace('bg-surface-variant', 'bg-secondary');
        bars[3].classList.replace('bg-surface-variant', 'bg-secondary');
    }
}

async function triggerEncryption() {
    const plaintext = document.getElementById('plaintext').value;
    const password = document.getElementById('encrypt-password').value;
    const saltHex = document.getElementById('salt-key').value;

    if (!plaintext) {
        alert('Please provide a plain text message.');
        return;
    }

    if (!password) {
        alert('Password is required for encryption.');
        return;
    }

    // Show Processing Overlay
    const overlay = document.getElementById('processing-overlay');
    overlay.style.display = 'flex';

    try {
        const result = await encryptPayload(plaintext, password, saltHex);

        // Wait 1200ms to simulate cyber operations shimmer
        setTimeout(() => {
            overlay.style.display = 'none';
            document.getElementById('encrypt-input-state').style.display = 'none';
            document.getElementById('encrypt-success-state').style.display = 'flex';

            // Format output base64 ciphertext
            const outputArea = document.getElementById('encrypted-output-code');
            outputArea.textContent = result.serialized;

            // Keep derived output in memory for optional history save
            state.lastEncryptedPayload = result.serialized;
            state.lastEncryptedMessage = plaintext;
        }, 1200);
    } catch (e) {
        overlay.style.display = 'none';
        alert('Encryption failed: ' + e.message);
    }
}

function resetEncryptView() {
    document.getElementById('encrypt-success-state').style.display = 'none';
    document.getElementById('encrypt-input-state').style.display = 'flex';
    document.getElementById('plaintext').value = '';
    document.getElementById('encrypt-password').value = '';
    document.getElementById('salt-key').value = '';
    document.getElementById('salt-key').classList.add('opacity-50', 'text-outline');
    document.getElementById('char-counter').textContent = '0 / 4096';
    updateEncryptionPasswordStrength('');

    state.lastEncryptedPayload = null;
    state.lastEncryptedMessage = null;
}

function copyCiphertextToClipboard() {
    const ciphertext = document.getElementById('encrypted-output-code').textContent;
    navigator.clipboard.writeText(ciphertext).then(() => {
        const copyLabel = document.getElementById('copy-cipher-label');
        copyLabel.textContent = 'COPIED!';
        setTimeout(() => {
            copyLabel.textContent = 'COPY';
        }, 2000);
    });
}

function saveCiphertextToVaultHistory() {
    if (!state.lastEncryptedPayload) return;

    const title = prompt('Define a title index reference for this vault payload:', 'Archived Payload');
    if (title === null) return; // cancelled

    const cleanTitle = title.trim() || 'Untitled secure transmission';

    const newRecord = {
        id: '0x' + bytesToHex(window.crypto.getRandomValues(new Uint8Array(4))),
        title: cleanTitle,
        algo: 'AES-256-GCM',
        digest: 'NONCE_VALID',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' UTC',
        payload: state.lastEncryptedPayload,
        sizeBytes: state.lastEncryptedMessage.length
    };

    state.history.unshift(newRecord);
    saveHistoryToStorage();

    alert('Payload securely indexed in browser vault memory storage archive.');
    window.location.hash = '#history';
}

// Decrypt Business Logic
async function triggerDecryption() {
    const ciphertext = document.getElementById('decrypt-ciphertext').value.trim();
    const password = document.getElementById('decrypt-password').value;

    if (!ciphertext) {
        alert('Please input a secure base64 payload.');
        return;
    }

    if (!password) {
        alert('Please input the decryption key phrase.');
        return;
    }

    const overlay = document.getElementById('decrypt-processing-overlay');
    overlay.style.display = 'flex';

    try {
        const plaintext = await decryptPayload(ciphertext, password);

        setTimeout(() => {
            overlay.style.display = 'none';
            document.getElementById('decrypt-input-state').style.display = 'none';
            document.getElementById('decrypt-success-state').style.display = 'flex';

            document.getElementById('decrypted-output-code').value = plaintext;
        }, 1200);
    } catch (e) {
        overlay.style.display = 'none';
        alert('Decryption failed: ' + e.message);
    }
}

function resetDecryptView() {
    document.getElementById('decrypt-success-state').style.display = 'none';
    document.getElementById('decrypt-input-state').style.display = 'flex';
    document.getElementById('decrypt-ciphertext').value = '';
    document.getElementById('decrypt-password').value = '';
    document.getElementById('decrypted-output-code').value = '';
}

function copyDecryptedPlaintext() {
    const text = document.getElementById('decrypted-output-code').value;
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('btn-copy-plain');
        const icon = btn.querySelector('span');
        icon.textContent = 'done';
        setTimeout(() => {
            icon.textContent = 'content_copy';
        }, 2000);
    });
}

// Master Key Generator View
function generateCryptographicKeys() {
    const type = document.getElementById('keygen-type').value;
    let byteLen = 32; // Default 256-bit
    if (type === 'aes-128') byteLen = 16;
    else if (type === 'aes-256') byteLen = 32;
    else if (type === 'pbkdf2-salt') byteLen = 16;

    const randomBytes = window.crypto.getRandomValues(new Uint8Array(byteLen));
    const hex = bytesToHex(randomBytes);

    const codeArea = document.getElementById('keygen-output-code');
    codeArea.innerHTML = `<code class="text-code-sm font-code-sm leading-relaxed tracking-widest break-all select-all">${hex}</code>`;

    state.lastGeneratedKey = hex;
}

function copyGeneratedKey() {
    if (!state.lastGeneratedKey) return;
    navigator.clipboard.writeText(state.lastGeneratedKey).then(() => {
        const label = document.getElementById('copy-keygen-label');
        label.textContent = 'COPIED!';
        setTimeout(() => {
            label.textContent = 'COPY';
        }, 2000);
    });
}

// History View Logic
function toggleActions(id) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.classList.contains('hidden')) {
        // Close others
        document.querySelectorAll('[id^="actions-"]').forEach(n => {
            if (n.id !== id) n.classList.add('hidden');
        });
        el.classList.remove('hidden');
    } else {
        el.classList.add('hidden');
    }
}

function deleteHistoryRecord(recordId, e) {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to permanently delete this archived transmission payload from device memory?')) return;

    state.history = state.history.filter(item => item.id !== recordId);
    saveHistoryToStorage();
    renderHistory();

    // Also update dashboard activity list if needed
    renderDashboard();
}

function triggerHistoryDecryption(recordId, e) {
    if (e) e.stopPropagation();
    const item = state.history.find(r => r.id === recordId);
    if (!item) return;

    const psw = prompt('Enter encryption passphrase key for: ' + item.title + ':');
    if (psw === null) return;

    decryptPayload(item.payload, psw).then(plain => {
        alert('Decrypted Contents:\n\n' + plain);
    }).catch(err => {
        alert(err.message);
    });
}

// Render Templates
function renderDashboard() {
    // Render Stats
    const totalEntries = state.history.length;
    document.getElementById('dashboard-entry-count').textContent = totalEntries.toLocaleString();

    // Storage status bar (mock usage out of 5MB default local storage quota)
    const rawStorageSize = localStorage.getItem('ciphervault_history')?.length || 0;
    const usagePercent = Math.min(Math.round((rawStorageSize / (1024 * 1024 * 5)) * 100) || 1, 100);
    document.getElementById('storage-bar').style.width = usagePercent + '%';
    document.getElementById('storage-percentage-text').textContent = usagePercent + '%';

    // Recent Activity list (latest 3 items)
    const recentActivity = state.history.slice(0, 3);
    const container = document.getElementById('dashboard-recent-activity');
    container.innerHTML = '';

    if (recentActivity.length === 0) {
        container.innerHTML = `
            <div class="text-center p-6 text-on-surface-variant opacity-50">
                No active records. Create or decrypt records to begin.
            </div>
        `;
        return;
    }

    recentActivity.forEach(item => {
        const sizeText = item.sizeBytes ? item.sizeBytes + ' B' : '[REDACTED]';
        const dateText = item.date ? item.date + ' ' + item.time : 'Undefined date';

        const div = document.createElement('div');
        div.className = "group flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 p-3.5 sm:p-4 bg-surface-container-low border border-outline-variant/10 rounded-lg hover:border-outline-variant/40 transition-colors cursor-pointer";
        div.onclick = () => {
            window.location.hash = '#history';
        };
        div.innerHTML = `
            <div class="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary border border-secondary/20 shrink-0">
                    <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">lock</span>
                </div>
                <div class="min-w-0 flex-1">
                    <h4 class="text-body-md font-body-md text-on-surface mb-0.5 truncate">${escapeHTML(item.title)}</h4>
                    <p class="text-code-sm font-code-sm text-on-surface-variant flex items-center gap-2 truncate">
                        <span class="w-1.5 h-1.5 rounded-full bg-secondary inline-block shrink-0"></span>
                        <span class="truncate">ID: ${item.id} | Size: ${sizeText}</span>
                    </p>
                </div>
            </div>
            <div class="text-left sm:text-right shrink-0 pl-12 sm:pl-0">
                <span class="text-code-sm font-code-sm text-outline">${dateText}</span>
            </div>
        `;
        container.appendChild(div);
    });
}

function renderHistory() {
    const container = document.getElementById('history-records-container');
    container.innerHTML = '';

    if (state.history.length === 0) {
        container.innerHTML = `
            <div class="text-center p-12 text-on-surface-variant card-bg rounded-xl">
                <span class="material-symbols-outlined text-4xl mb-2 opacity-55">drafts</span>
                <p class="text-body-lg font-body-lg">Vault Archive Empty</p>
                <p class="text-body-sm font-body-sm opacity-50 mt-1">Encrypt messages to store secure payloads on this device.</p>
            </div>
        `;
        return;
    }

    state.history.forEach((item, index) => {
        const sizeText = item.sizeBytes ? item.sizeBytes + ' B' : '[REDACTED]';
        const actionsId = 'actions-' + index;

        const div = document.createElement('div');
        div.className = "card-bg rounded-xl p-4 sm:p-5 relative overflow-hidden group cursor-pointer hover:border-primary/50 transition-colors";
        div.onclick = () => toggleActions(actionsId);

        div.innerHTML = `
            <div class="flex justify-between items-start gap-2 mb-3">
                <div class="flex items-center gap-2 min-w-0 flex-1">
                    <span class="material-symbols-outlined text-secondary shrink-0" style="font-variation-settings: 'FILL' 1;">shield</span>
                    <h3 class="text-base sm:text-headline-sm font-headline-sm text-on-surface truncate">${escapeHTML(item.title)}</h3>
                </div>
                <span class="bg-secondary/10 text-secondary text-[11px] font-label-caps px-2 py-0.5 sm:py-1 rounded-full border border-secondary/20 shrink-0">ENCRYPTED</span>
            </div>
            <div class="font-code-sm text-code-sm text-on-surface-variant opacity-70 mb-4 truncate">
                ${item.id} : ${item.algo} : SIZE: ${sizeText}
            </div>
            <div class="flex justify-between items-center text-xs sm:text-body-sm font-body-sm text-outline">
                <span>${item.date}</span>
                <span>${item.time}</span>
            </div>
            
            <!-- Actions Drawer -->
            <div class="hidden mt-4 pt-4 border-t border-outline-variant/30 flex flex-col sm:flex-row justify-end gap-2.5 sm:gap-3" id="${actionsId}">
                <button class="bg-transparent border border-outline-variant text-on-surface hover:bg-surface-variant/50 px-4 py-2 rounded-lg text-body-sm font-body-sm font-medium transition-colors w-full sm:w-auto text-center" 
                        onclick="deleteHistoryRecord('${item.id}', event)">
                    Delete
                </button>
                <button class="bg-[#6366F1] text-white hover:shadow-[inset_0_0_10px_rgba(255,255,255,0.3)] px-5 py-2 rounded-lg text-body-sm font-body-sm font-medium flex items-center justify-center gap-2 transition-all w-full sm:w-auto text-center"
                        onclick="triggerHistoryDecryption('${item.id}', event)">
                    <span class="material-symbols-outlined text-[18px]">lock_open</span>
                    Decrypt
                </button>
            </div>
        `;

        container.appendChild(div);
    });
}

// Database Export Calculations
function updateExportStats() {
    const rawStorageSize = localStorage.getItem('ciphervault_history')?.length || 0;
    const recordsCount = state.history.length;
    const sizeKB = (rawStorageSize / 1024).toFixed(1);

    document.getElementById('export-records-count').textContent = recordsCount;
    document.getElementById('export-volume-text').textContent = sizeKB + ' KB';
}

function updateRadioSelection(selectedInput) {
    const cards = document.querySelectorAll('.radio-card');
    cards.forEach(card => {
        card.classList.remove('border-primary', 'bg-primary/5', 'border-2');
        card.classList.add('border-outline-variant/50', 'bg-surface-container', 'border');

        const indicator = card.querySelector('.radio-indicator');
        indicator.classList.remove('border-primary', 'bg-primary');
        indicator.classList.add('border-outline-variant');
        indicator.innerHTML = '';

        const icon = card.querySelector('.material-symbols-outlined');
        icon.classList.remove('text-primary');
        icon.classList.add('text-on-surface-variant');
    });

    const activeCard = selectedInput.closest('.radio-card');
    activeCard.classList.remove('border-outline-variant/50', 'bg-surface-container', 'border');
    activeCard.classList.add('border-primary', 'bg-primary/5', 'border-2');

    const activeIndicator = activeCard.querySelector('.radio-indicator');
    activeIndicator.classList.remove('border-outline-variant');
    activeIndicator.classList.add('border-primary', 'bg-primary');
    activeIndicator.innerHTML = '<div class="w-2 h-2 rounded-full bg-background indicator-inner"></div>';

    const activeIcon = activeCard.querySelector('.material-symbols-outlined');
    activeIcon.classList.remove('text-on-surface-variant');
    activeIcon.classList.add('text-primary');
}

function updateExportPasswordStrength(val) {
    const s1 = document.getElementById('export-strength-1');
    const s2 = document.getElementById('export-strength-2');
    const s3 = document.getElementById('export-strength-3');
    const s4 = document.getElementById('export-strength-4');
    const text = document.getElementById('export-strength-text');

    const len = val.length;

    // Reset colors
    [s1, s2, s3, s4].forEach(el => {
        if (el) el.className = el.className.replace(/bg-\w+(-\w+)?(\/\d+)?/g, 'bg-surface-variant');
    });
    if (text) text.className = text.className.replace(/text-\w+(-\w+)?/g, 'text-outline-variant');

    if (len === 0) {
        if (text) text.textContent = 'Awaiting input';
        return;
    }

    if (len < 8) {
        if (s1) s1.classList.replace('bg-surface-variant', 'bg-error');
        if (text) {
            text.textContent = 'Too short';
            text.classList.replace('text-outline-variant', 'text-error');
        }
    } else if (len < 12) {
        if (s1) s1.classList.replace('bg-surface-variant', 'bg-tertiary');
        if (s2) s2.classList.replace('bg-surface-variant', 'bg-tertiary');
        if (text) {
            text.textContent = 'Weak';
            text.classList.replace('text-outline-variant', 'text-tertiary');
        }
    } else if (len < 16) {
        if (s1) s1.classList.replace('bg-surface-variant', 'bg-secondary');
        if (s2) s2.classList.replace('bg-surface-variant', 'bg-secondary');
        if (s3) s3.classList.replace('bg-surface-variant', 'bg-secondary');
        if (text) {
            text.textContent = 'Good';
            text.classList.replace('text-outline-variant', 'text-secondary');
        }
    } else {
        if (s1) s1.classList.replace('bg-surface-variant', 'bg-secondary');
        if (s2) s2.classList.replace('bg-surface-variant', 'bg-secondary');
        if (s3) s3.classList.replace('bg-surface-variant', 'bg-secondary');
        if (s4) s4.classList.replace('bg-surface-variant', 'bg-secondary');
        if (text) {
            text.textContent = 'Optimal configuration';
            text.classList.replace('text-outline-variant', 'text-secondary');
        }
    }
}

async function handleDatabaseBackup() {
    const selectedFormat = document.querySelector('input[name="format"]:checked').value;
    const passphrase = document.getElementById('export_passphrase').value;

    if (passphrase && passphrase.length < 16) {
        alert('Nested Archive Encryption key requires a minimum of 16 characters for GCM packaging.');
        return;
    }

    // Generate Export Data
    let exportData = '';
    let filename = 'ciphervault_backup_' + new Date().toISOString().slice(0, 10);

    if (selectedFormat === 'json') {
        exportData = JSON.stringify(state.history, null, 2);
        filename += '.json';
    } else if (selectedFormat === 'csv') {
        exportData = generateCSVData();
        filename += '.csv';
    } else if (selectedFormat === 'sql') {
        exportData = generateSQLData();
        filename += '.sql';
    }

    // Nested Archive Encryption (optional, highly recommended warning)
    if (passphrase) {
        try {
            const encrypted = await encryptPayload(exportData, passphrase);
            exportData = encrypted.serialized;
            filename += '.enc'; // Add encrypted archive extension
        } catch (e) {
            alert('Failed to encrypt backup archive: ' + e.message);
            return;
        }
    }

    // Download File
    const blob = new Blob([exportData], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function generateCSVData() {
    const headers = ['ID', 'Title', 'Algorithm', 'Size (Bytes)', 'Created Date', 'Created Time', 'Payload'];
    const rows = state.history.map(item => [
        item.id,
        '"' + item.title.replace(/"/g, '""') + '"',
        item.algo,
        item.sizeBytes,
        item.date,
        item.time,
        item.payload
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

function generateSQLData() {
    let sql = `
-- CipherVault Backup Archive SQL Dump
-- Generated: ${new Date().toISOString()}
-- Database Schema: Relational Vault Indexes

CREATE TABLE IF NOT EXISTS secure_transmissions (
    id VARCHAR(32) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    algo VARCHAR(64) DEFAULT 'AES-256-GCM',
    digest VARCHAR(64),
    created_date VARCHAR(64),
    created_time VARCHAR(64),
    payload TEXT NOT NULL,
    size_bytes INT
);

`;

    state.history.forEach(item => {
        const titleSafe = item.title.replace(/'/g, "''");
        sql += "INSERT INTO secure_transmissions (id, title, algo, digest, created_date, created_time, payload, size_bytes) VALUES ('" + item.id + "', '" + titleSafe + "', '" + item.algo + "', '" + item.digest + "', '" + item.date + "', '" + item.time + "', '" + item.payload + "', " + item.sizeBytes + ");\n";
    });

    return sql;
}

// Mock Data Generators for demonstration
function getMockHistory() {
    return [
        {
            id: '0x8A7B4F92',
            title: 'Project Archon Strategic Briefing',
            algo: 'AES-256-GCM',
            digest: 'NONCE_VALID',
            date: 'Oct 24, 2023',
            time: '14:32 UTC',
            payload: 'eyJ2IjoxLCJhbGdvIjoiQUVTLTI1Ni1HQ00iLCJzYWx0IjoiTDRtOWRWMWZaSEJ2TFZka2EyST0iLCJpdiI6IkpCU1dZM0RQRUhQSzNQXFAiLCJjdCI6IlEyOWhjRzVsZENCdlpHVnlkR2x2Ym5NdVlXUnRhVzQ5UGc9PSJ9',
            sizeBytes: 156
        },

    ];
}

// Helpers
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}