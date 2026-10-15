/**
 * Plateforme Z — Logique de la page Fun (fun.html)
 * Vulgarisation scientifique et curiosités du monde dans l'esprit de "C'est pas sorcier"
 * Questions fascinantes, explications pédagogiques, synthèse vocale et favoris.
 */

import { initSharedHeader, auth, showToast } from './auth.js';

let allQuestions = [];
let funManifest = null;
let activeCategory = 'Tous';
let activeSeries = 'Tous';
let searchQuery = '';

document.addEventListener('DOMContentLoaded', async () => {
  initSharedHeader('fun');
  await loadFunManifest();
  await loadFunBatches();
  setupFilterControls();
  renderQuestionsGrid();
});

async function loadFunManifest() {
  try {
    const res = await fetch('/data/fun/manifest.json');
    if (res.ok) {
      funManifest = await res.json();
    }
  } catch (err) {
    console.warn('Erreur chargement manifeste fun:', err);
  }
}

async function loadFunBatches() {
  const batches = funManifest?.batches || [{ file: 'fun-001.json' }, { file: 'fun-002.json' }];
  for (const b of batches) {
    try {
      const res = await fetch(`/data/fun/${b.file}`);
      if (res.ok) {
        const data = await res.json();
        allQuestions = [...allQuestions, ...data];
      }
    } catch (err) {
      console.warn(`Erreur lors du chargement du lot ${b.file}:`, err);
    }
  }
}

function setupFilterControls() {
  // Category Pills
  const catBtns = document.querySelectorAll('.fun-cat-btn');
  catBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      catBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.getAttribute('data-cat') || 'Tous';
      renderQuestionsGrid();
    });
  });

  // Thematic Series chips
  const seriesBtns = document.querySelectorAll('.series-chip-btn');
  seriesBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const series = btn.getAttribute('data-series');
      if (activeSeries === series) {
        activeSeries = 'Tous';
        btn.style.borderColor = '';
        btn.style.background = '';
      } else {
        seriesBtns.forEach(b => {
          b.style.borderColor = '';
          b.style.background = '';
        });
        activeSeries = series;
        btn.style.borderColor = 'var(--u-accent-amber)';
        btn.style.background = 'rgba(245, 158, 11, 0.2)';
      }
      renderQuestionsGrid();
    });
  });

  // Search input
  const searchInput = document.getElementById('fun-search');
  searchInput?.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderQuestionsGrid();
  });
}

function getFilteredQuestions() {
  let list = allQuestions;

  if (activeCategory !== 'Tous') {
    list = list.filter(q => q.category === activeCategory);
  }

  if (activeSeries !== 'Tous') {
    list = list.filter(q => q.series === activeSeries);
  }

  if (searchQuery) {
    list = list.filter(q =>
      q.question.toLowerCase().includes(searchQuery) ||
      q.teaser.toLowerCase().includes(searchQuery) ||
      q.explanation.toLowerCase().includes(searchQuery) ||
      q.category.toLowerCase().includes(searchQuery)
    );
  }

  return list;
}

function renderQuestionsGrid() {
  const container = document.getElementById('fun-grid-container');
  if (!container) return;

  const list = getFilteredQuestions();

  const countBadge = document.getElementById('fun-count-badge');
  if (countBadge) {
    countBadge.textContent = `${list.length} énigmes et découvertes`;
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px; color: #94a3b8;">
        <p style="font-size: 18px; margin-bottom: 8px;">Aucune découverte trouvée pour ce filtre.</p>
        <p style="font-size: 13px;">Sélectionnez une autre catégorie ou réinitialisez la recherche.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(q => {
    const isFav = auth.isFavorite('fun', q.id);
    return `
      <div class="question-card" data-q-id="${q.id}">
        <div class="card-top-meta">
          <span class="q-category-tag">${q.category}</span>
          <span class="q-read-time">⏱ ${q.readingTime || '2 min'}</span>
        </div>
        <h3 class="q-hook-title">${q.question}</h3>
        <p class="q-teaser-text">${q.teaser}</p>
        <div class="q-card-footer">
          <button class="btn-open-explanation" data-open-id="${q.id}">
            <span>Découvrir l'explication</span> ➔
          </button>
          <button class="btn-q-fav ${isFav ? 'active' : ''}" data-fav-id="${q.id}" data-fav-title="${escapeHtml(q.question)}" aria-label="Favori">
            ${isFav ? '★' : '☆'}
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Event handlers
  container.querySelectorAll('.btn-open-explanation').forEach(btn => {
    btn.addEventListener('click', () => {
      const qId = btn.getAttribute('data-open-id');
      const item = allQuestions.find(x => x.id === qId);
      if (item) openExplanationReader(item);
    });
  });

  container.querySelectorAll('.btn-q-fav').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-fav-id');
      const title = btn.getAttribute('data-fav-title');
      const added = auth.toggleFavorite('fun', id, title);
      btn.classList.toggle('active', added);
      btn.textContent = added ? '★' : '☆';
    });
  });
}

function openExplanationReader(item) {
  let modal = document.getElementById('fun-reader-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'fun-reader-modal';
    modal.className = 'modal-backdrop';
    document.body.appendChild(modal);
  }

  const factsHtml = (item.complementaryFacts || []).map(f => `<li>${f}</li>`).join('');

  modal.innerHTML = `
    <div class="reader-dialog" role="dialog" aria-modal="true">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
        <span class="reader-category">${item.category} • ${item.series || 'Curiosité Z'}</span>
        <button class="btn-close-modal" id="close-reader-modal">✕</button>
      </div>
      <h2 class="reader-title">${item.question}</h2>

      <div class="reader-audio-bar">
        <button class="btn-audio-speak" id="btn-speak-text">
          <span>🔊 Écouter l'explication</span>
        </button>
        <span style="font-size:12px; color:#94a3b8;">Lecture vocale intégrée</span>
      </div>

      <div class="reader-explanation-text">
        ${item.explanation}
      </div>

      ${factsHtml ? `
        <div class="reader-facts-box">
          <h4>💡 Le saviez-vous ? (Faits complémentaires)</h4>
          <ul>${factsHtml}</ul>
        </div>
      ` : ''}

      <div class="reader-source-bar">
        <span>Source scientifique vérifiée : <strong>${item.source || 'CNRS / Cité des Sciences'}</strong></span>
        <button class="btn-open-explanation" id="btn-share-question" style="padding:4px 12px; font-size:11px;">Partager 🔗</button>
      </div>
    </div>
  `;

  modal.classList.add('visible');
  auth.addXp(25, 'Découverte scientifique lue avec attention');

  // Close handlers
  document.getElementById('close-reader-modal')?.addEventListener('click', () => {
    stopSpeech();
    modal.classList.remove('visible');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      stopSpeech();
      modal.classList.remove('visible');
    }
  });

  // Speech Synthesis
  let isSpeaking = false;
  const speakBtn = document.getElementById('btn-speak-text');
  speakBtn?.addEventListener('click', () => {
    if (!('speechSynthesis' in window)) {
      showToast('Synthèse vocale non supportée par votre navigateur', 'error');
      return;
    }

    if (isSpeaking) {
      stopSpeech();
      speakBtn.innerHTML = '<span>🔊 Écouter l\'explication</span>';
      isSpeaking = false;
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(item.explanation);
      utterance.lang = 'fr-FR';
      utterance.rate = 1.0;
      utterance.onend = () => {
        isSpeaking = false;
        speakBtn.innerHTML = '<span>🔊 Écouter l\'explication</span>';
      };
      window.speechSynthesis.speak(utterance);
      isSpeaking = true;
      speakBtn.innerHTML = '<span>⏹ Arrêter la lecture</span>';
    }
  });

  // Share handler
  document.getElementById('btn-share-question')?.addEventListener('click', async () => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(`${item.question} - Découvre la réponse sur la Plateforme Z !`);
      showToast('Lien de la question copié !', 'success');
    }
  });
}

function stopSpeech() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
