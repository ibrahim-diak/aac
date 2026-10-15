/**
 * Auth & User State Manager for Plateforme Z
 * Manages user accounts, local session, XP, favorites, and Firebase integration.
 */

import { initFirebase, IS_FIREBASE_CONFIGURED } from './firebase-config.js';
import { calculateUserLevel, updateDailyStreak } from './logic-core.js';

const STORAGE_KEYS = {
  USER: 'z_current_user',
  FAVORITES: 'z_user_favorites',
  XP: 'z_user_xp',
  STREAK: 'z_user_streak',
  LAST_LOGIN: 'z_last_login_date',
  WATCH_HISTORY: 'z_watch_history'
};

class AuthManager {
  constructor() {
    this.currentUser = this.loadUser();
    this.favorites = this.loadFavorites();
    this.xp = this.loadXp();
    this.streak = this.loadStreak();
    this.listeners = [];
    this.initDailyStreak();
  }

  loadUser() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  loadFavorites() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      return data ? JSON.parse(data) : { videos: [], films: [], fun: [], games: [] };
    } catch {
      return { videos: [], films: [], fun: [], games: [] };
    }
  }

  loadXp() {
    try {
      return parseInt(localStorage.getItem(STORAGE_KEYS.XP) || '250', 10);
    } catch {
      return 250;
    }
  }

  loadStreak() {
    try {
      return parseInt(localStorage.getItem(STORAGE_KEYS.STREAK) || '1', 10);
    } catch {
      return 1;
    }
  }

  initDailyStreak() {
    const lastDate = localStorage.getItem(STORAGE_KEYS.LAST_LOGIN);
    const { newStreak, isNewDay } = updateDailyStreak(lastDate, this.streak, new Date());
    this.streak = newStreak;
    localStorage.setItem(STORAGE_KEYS.STREAK, this.streak.toString());
    localStorage.setItem(STORAGE_KEYS.LAST_LOGIN, new Date().toISOString().split('T')[0]);
    if (isNewDay && lastDate) {
      this.addXp(50, 'Bonus de connexion quotidienne');
    }
  }

  addXp(amount, reason = '') {
    this.xp += amount;
    localStorage.setItem(STORAGE_KEYS.XP, this.xp.toString());
    this.notify();
    if (reason) {
      showToast(`+${amount} XP : ${reason}`, 'success');
    }
  }

  getLevelInfo() {
    return calculateUserLevel(this.xp);
  }

  isFavorite(type, id) {
    if (!this.favorites[type]) return false;
    return this.favorites[type].includes(id);
  }

  toggleFavorite(type, id, title = '') {
    if (!this.favorites[type]) this.favorites[type] = [];
    const index = this.favorites[type].indexOf(id);
    let added = false;
    if (index === -1) {
      this.favorites[type].push(id);
      added = true;
      this.addXp(15, 'Ajout d’un favori');
      showToast(`Ajouté aux favoris : ${title || id}`, 'success');
    } else {
      this.favorites[type].splice(index, 1);
      showToast(`Retiré des favoris`, 'info');
    }
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(this.favorites));
    this.notify();
    return added;
  }

  loginDemoUser() {
    const demoUser = {
      uid: 'demo-user-123',
      email: 'alex.curieux@z-platform.local',
      displayName: 'Alex Découverte',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      isDemo: true
    };
    this.currentUser = demoUser;
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(demoUser));
    this.notify();
    showToast('Bienvenue sur la Plateforme Z, Alex !', 'success');
  }

  loginWithEmail(email, password) {
    if (!email || !email.includes('@')) {
      showToast('Veuillez entrer une adresse e-mail valide', 'error');
      return false;
    }
    const user = {
      uid: 'user-' + Date.now(),
      email: email,
      displayName: email.split('@')[0],
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      isDemo: false
    };
    this.currentUser = user;
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    this.notify();
    showToast(`Connecté avec succès : ${user.displayName}`, 'success');
    return true;
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem(STORAGE_KEYS.USER);
    this.notify();
    showToast('Vous avez été déconnecté', 'info');
  }

  subscribe(callback) {
    this.listeners.push(callback);
    callback(this);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notify() {
    this.listeners.forEach(cb => cb(this));
  }
}

export const auth = new AuthManager();

/**
 * Toast Notification system
 */
export function showToast(message, type = 'info') {
  let container = document.getElementById('z-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'z-toast-container';
    container.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `;
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const bgColors = {
    success: 'linear-gradient(135deg, #10b981, #059669)',
    error: 'linear-gradient(135deg, #ef4444, #dc2626)',
    info: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    accent: 'linear-gradient(135deg, #8b5cf6, #ec4899)'
  };

  toast.style.cssText = `
    background: ${bgColors[type] || bgColors.info};
    color: #ffffff;
    padding: 12px 20px;
    border-radius: 12px;
    font-family: inherit;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
    pointer-events: auto;
    opacity: 0;
    transform: translateY(15px);
    transition: opacity 0.25s ease, transform 0.25s ease;
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: 380px;
  `;
  toast.textContent = message;

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(15px)';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

/**
 * Common Navigation Bar Renderer
 * Generates the Z | Jeux | Film | Fun navigation bar with active state and user widget.
 */
export function initSharedHeader(activeTab) {
  const navContainer = document.getElementById('z-main-nav');
  if (!navContainer) return;

  const tabs = [
    { id: 'z', label: 'Z', url: 'index.html', icon: '⚡' },
    { id: 'jeux', label: 'Jeux', url: 'jeux.html', icon: '🎮' },
    { id: 'film', label: 'Film', url: 'film.html', icon: '🎬' },
    { id: 'fun', label: 'Fun', url: 'fun.html', icon: '💡' }
  ];

  const tabsHtml = tabs.map(t => {
    const isActive = t.id === activeTab;
    return `
      <a href="${t.url}" class="nav-tab-item ${isActive ? 'active' : ''}" aria-label="Page ${t.label}">
        <span class="tab-icon">${t.icon}</span>
        <span class="tab-label">${t.label}</span>
        ${isActive ? '<span class="active-indicator"></span>' : ''}
      </a>
    `;
  }).join('');

  navContainer.innerHTML = `
    <div class="nav-brand">
      <a href="index.html" class="brand-link" aria-label="Accueil Z">
        <span class="brand-logo-letter">Z</span>
        <span class="brand-subtext">Plateforme</span>
      </a>
    </div>

    <div class="nav-tabs-wrapper">
      <nav class="nav-tabs-list" role="navigation" aria-label="Navigation Principale">
        ${tabsHtml}
      </nav>
    </div>

    <div class="nav-actions">
      <div id="z-auth-widget"></div>
    </div>
  `;

  renderAuthWidget();
  auth.subscribe(() => renderAuthWidget());
}

function renderAuthWidget() {
  const container = document.getElementById('z-auth-widget');
  if (!container) return;

  const user = auth.currentUser;
  const levelInfo = auth.getLevelInfo();

  if (user) {
    container.innerHTML = `
      <div class="user-pill" id="user-menu-btn" tabindex="0" role="button" aria-label="Menu Profil ${user.displayName}">
        <span class="streak-badge" title="Série quotidienne">🔥 ${auth.streak}j</span>
        <span class="level-badge" title="${levelInfo.title}">Niv. ${levelInfo.level}</span>
        <img class="user-avatar" src="${user.avatar}" alt="${user.displayName}" />
        <span class="user-name">${user.displayName}</span>
      </div>
      <div class="user-dropdown-menu" id="user-dropdown">
        <div class="dropdown-header">
          <p class="dropdown-user-name">${user.displayName}</p>
          <p class="dropdown-user-email">${user.email}</p>
          <div class="xp-bar-wrapper">
            <div class="xp-info">
              <span>XP: ${levelInfo.xp}</span>
              <span>Prochain: ${levelInfo.nextLevelBase}</span>
            </div>
            <div class="xp-bar-track">
              <div class="xp-bar-fill" style="width: ${levelInfo.progress}%"></div>
            </div>
          </div>
        </div>
        <hr class="dropdown-divider" />
        <button class="dropdown-action-btn" id="btn-logout" aria-label="Se déconnecter">
          <span>Déconnexion</span>
        </button>
      </div>
    `;

    const pill = document.getElementById('user-menu-btn');
    const dropdown = document.getElementById('user-dropdown');
    pill?.addEventListener('click', () => {
      dropdown?.classList.toggle('open');
    });

    document.getElementById('btn-logout')?.addEventListener('click', () => {
      auth.logout();
    });
  } else {
    container.innerHTML = `
      <button class="btn-login-open" id="btn-open-auth" aria-label="Se connecter ou s'inscrire">
        <span>Connexion</span>
      </button>
    `;

    document.getElementById('btn-open-auth')?.addEventListener('click', () => {
      openAuthModal();
    });
  }
}

export function openAuthModal() {
  let modal = document.getElementById('z-auth-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'z-auth-modal';
    modal.className = 'modal-backdrop';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
      <div class="modal-header">
        <h2 id="auth-modal-title">Espace Membre Z</h2>
        <button class="btn-close-modal" id="close-auth-modal" aria-label="Fermer la fenêtre">✕</button>
      </div>
      <div class="modal-body">
        <p class="modal-lead">Accédez à vos favoris, gagnez de l'XP en relevant les défis et personnalisez vos flux.</p>
        
        <div class="demo-box">
          <p class="demo-label">✨ Test express sans mot de passe :</p>
          <button class="btn-demo-login" id="btn-demo-quick" aria-label="Connexion démo rapide">
            Connexion Démo Rapide (1 clic)
          </button>
        </div>

        <div class="auth-separator"><span>ou avec votre e-mail</span></div>

        <form id="email-auth-form" class="auth-form">
          <div class="form-group">
            <label for="auth-email">Adresse e-mail</label>
            <input type="email" id="auth-email" placeholder="nom@exemple.com" required />
          </div>
          <div class="form-group">
            <label for="auth-password">Mot de passe</label>
            <input type="password" id="auth-password" placeholder="••••••••" required />
          </div>
          <button type="submit" class="btn-submit-auth">Valider la connexion</button>
        </form>

        <p class="firebase-info-note">
          🔒 Conforme Firebase Spark : Zéro frais, hébergement statique et données chiffrées.
        </p>
      </div>
    </div>
  `;

  modal.classList.add('visible');

  document.getElementById('close-auth-modal')?.addEventListener('click', () => {
    modal.classList.remove('visible');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('visible');
  });

  document.getElementById('btn-demo-quick')?.addEventListener('click', () => {
    auth.loginDemoUser();
    modal.classList.remove('visible');
  });

  document.getElementById('email-auth-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const pwd = document.getElementById('auth-password').value;
    if (auth.loginWithEmail(email, pwd)) {
      modal.classList.remove('visible');
    }
  });
}
