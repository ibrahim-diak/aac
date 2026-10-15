/**
 * Plateforme Z — Logique de la page Film (film.html)
 * Gère les 100 fiches de films et séries, les filtres par genre, la recherche en direct,
 * et le deuxième sous-onglet pour les communautés cinéma vérifiées sur Telegram.
 */

import { initSharedHeader, auth, showToast } from './auth.js';

let filmsData = null;
let activeSubtab = 'movies'; // 'movies' ou 'telegram'
let activeGenre = 'Tous';
let searchQuery = '';

document.addEventListener('DOMContentLoaded', async () => {
  initSharedHeader('film');
  await loadFilmsData();
  setupSubtabs();
  setupSearchAndFilters();
  renderContent();
});

async function loadFilmsData() {
  try {
    const res = await fetch('/data/films/films.json');
    if (res.ok) {
      filmsData = await res.json();
    }
  } catch (err) {
    console.warn('Erreur chargement films.json:', err);
  }
}

function setupSubtabs() {
  const btnMovies = document.getElementById('subtab-movies');
  const btnTelegram = document.getElementById('subtab-telegram');

  btnMovies?.addEventListener('click', () => {
    activeSubtab = 'movies';
    btnMovies.classList.add('active');
    btnTelegram?.classList.remove('active');
    document.getElementById('movies-section').style.display = 'block';
    document.getElementById('telegram-section').style.display = 'none';
    renderContent();
  });

  btnTelegram?.addEventListener('click', () => {
    activeSubtab = 'telegram';
    btnTelegram.classList.add('active');
    btnMovies?.classList.remove('active');
    document.getElementById('movies-section').style.display = 'none';
    document.getElementById('telegram-section').style.display = 'block';
    renderContent();
  });
}

function setupSearchAndFilters() {
  const searchInput = document.getElementById('film-search');
  searchInput?.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderContent();
  });

  const genreBtns = document.querySelectorAll('.genre-filter-btn');
  genreBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      genreBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeGenre = btn.getAttribute('data-genre') || 'Tous';
      renderContent();
    });
  });
}

function renderContent() {
  if (activeSubtab === 'movies') {
    renderMoviesGrid();
  } else {
    renderTelegramSection();
  }
}

function renderMoviesGrid() {
  const container = document.getElementById('films-grid-container');
  if (!container || !filmsData) return;

  let list = filmsData.films || [];

  // Filter by genre
  if (activeGenre !== 'Tous') {
    list = list.filter(m => m.genre.toLowerCase().includes(activeGenre.toLowerCase()));
  }

  // Filter by search query
  if (searchQuery) {
    list = list.filter(m => 
      m.title.toLowerCase().includes(searchQuery) ||
      m.director.toLowerCase().includes(searchQuery) ||
      m.synopsis.toLowerCase().includes(searchQuery) ||
      m.genre.toLowerCase().includes(searchQuery)
    );
  }

  const countBadge = document.getElementById('films-count-badge');
  if (countBadge) {
    countBadge.textContent = `${list.length} films et séries trouvés`;
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px; color: #94a3b8;">
        <p style="font-size: 18px; margin-bottom: 8px;">Aucune œuvre ne correspond à votre recherche.</p>
        <p style="font-size: 13px;">Essayez d'autres mots-clés ou sélectionnez 'Tous' les genres.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(film => {
    const isFav = auth.isFavorite('films', film.id);
    return `
      <div class="film-card" data-film-id="${film.id}">
        <div class="film-poster-box">
          <img class="film-poster-img" src="${film.poster}" alt="Affiche ${film.title}" loading="lazy" />
          <div class="film-rating-badge">★ ${film.rating}</div>
          <button class="film-fav-btn ${isFav ? 'active' : ''}" data-fav-id="${film.id}" data-fav-title="${escapeHtml(film.title)}" aria-label="Favori">
            ${isFav ? '★' : '☆'}
          </button>
        </div>
        <div class="film-info-body">
          <h3 class="film-title">${film.title}</h3>
          <div class="film-meta-row">
            <span>${film.year}</span>
            <span class="film-genre-tag">${film.genre}</span>
          </div>
          <p class="film-synopsis-snippet">${film.synopsis}</p>
          <div class="film-card-actions">
            <button class="btn-film-discover" data-details-id="${film.id}">
              Découvrir la fiche ➔
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach event handlers
  container.querySelectorAll('.btn-film-discover').forEach(btn => {
    btn.addEventListener('click', () => {
      const filmId = btn.getAttribute('data-details-id');
      const film = list.find(f => f.id === filmId);
      if (film) openFilmModal(film);
    });
  });

  container.querySelectorAll('.film-fav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-fav-id');
      const title = btn.getAttribute('data-fav-title');
      const added = auth.toggleFavorite('films', id, title);
      btn.classList.toggle('active', added);
      btn.textContent = added ? '★' : '☆';
    });
  });
}

function openFilmModal(film) {
  let modal = document.getElementById('film-details-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'film-details-modal';
    modal.className = 'modal-backdrop';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-dialog" role="dialog" aria-modal="true" style="max-width: 620px;">
      <div class="modal-header">
        <h2>${film.title} (${film.year})</h2>
        <button class="btn-close-modal" id="close-film-modal">✕</button>
      </div>
      <div class="modal-body">
        <div style="display:flex; gap:18px; margin-bottom:16px;">
          <img src="${film.poster}" alt="${film.title}" style="width:130px; height:190px; object-fit:cover; border-radius:8px;" />
          <div style="flex:1;">
            <p style="font-size:13px; color:#94a3b8; margin-bottom:6px;"><strong>Réalisateur / Créateur :</strong> ${film.director}</p>
            <p style="font-size:13px; color:#94a3b8; margin-bottom:6px;"><strong>Genre :</strong> ${film.genre}</p>
            <p style="font-size:13px; color:#94a3b8; margin-bottom:6px;"><strong>Durée :</strong> ${film.duration}</p>
            <p style="font-size:13px; color:#facc15;"><strong>Note moyenne :</strong> ★ ${film.rating} / 10</p>
          </div>
        </div>
        <p style="font-size:14px; line-height:1.6; color:#e2e8f0; margin-bottom:20px;">
          ${film.synopsis}
        </p>
        <div style="display:flex; gap:12px; justify-content:flex-end;">
          <a href="${film.legitLink}" target="_blank" rel="noopener noreferrer" class="btn-submit-auth" style="display:inline-block; text-align:center; text-decoration:none;">
            Consulter la fiche officielle sur Allociné ↗
          </a>
        </div>
      </div>
    </div>
  `;

  modal.classList.add('visible');

  document.getElementById('close-film-modal')?.addEventListener('click', () => {
    modal.classList.remove('visible');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('visible');
  });
}

function renderTelegramSection() {
  const container = document.getElementById('telegram-grid-container');
  if (!container || !filmsData) return;

  const communities = filmsData.telegramCommunities || [];

  container.innerHTML = communities.map(tg => `
    <div class="telegram-channel-card">
      <div class="tg-header-row">
        <h3 class="tg-name-title">${tg.name}</h3>
        <span class="tg-verified-tag">✓ Vérifié</span>
      </div>
      <span class="tg-handle">${tg.handle}</span>
      <p class="tg-description">${tg.description}</p>
      <div class="tg-rules-box">
        <strong>Règles de la communauté :</strong> ${tg.rules}
      </div>
      <div class="tg-footer-row">
        <span class="tg-members-count">👥 ${tg.members}</span>
        <a href="${tg.url}" target="_blank" rel="noopener noreferrer" class="btn-open-telegram">
          Rejoindre le canal ↗
        </a>
      </div>
    </div>
  `).join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
