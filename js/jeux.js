/**
 * Plateforme Z — Logique de la page Jeux (jeux.html)
 * Gère les 5 mini-jeux interactifs jouables, les défis quotidiens, l'XP et les classements locaux.
 */

import { initSharedHeader, auth, showToast } from './auth.js';

let gamesData = null;
let activeGame = 'game-reflex';
let activeCategoryFilter = 'Tous';

// State for Mini-games
let reflexState = 'idle'; // 'idle', 'waiting', 'ready', 'result'
let reflexStartTime = 0;
let reflexTimer = null;
let reflexBest = localStorage.getItem('z_best_reflex') ? parseInt(localStorage.getItem('z_best_reflex'), 10) : null;

// Memory State
let memoryCards = [];
let memoryFlipped = [];
let memoryMatchedCount = 0;
let memoryMoves = 0;

// Quiz State
let quizIndex = 0;
let quizScore = 0;
const quizQuestions = [
  { q: "Pourquoi le ciel est-il bleu en plein jour ?", a: ["La diffusion de Rayleigh", "Le reflet de l'océan", "La couche d'ozone", "La réfraction lunaire"], c: 0, exp: "Les molécules de l'air diffusent plus fortement les courtes longueurs d'onde bleues de la lumière solaire." },
  { q: "Combien d'années la lumière du Soleil met-elle pour atteindre la Terre ?", a: ["8 minutes et 20 secondes", "1 seconde", "1 heure", "24 heures"], c: 0, exp: "À 300 000 km/s, la lumière parcourt les 150 millions de kilomètres en environ 500 secondes." },
  { q: "Quel organe consomme environ 20% de l'énergie totale du corps humain ?", a: ["Le foie", "Le cerveau", "Le cœur", "Les muscles squelettiques"], c: 1, exp: "Le cerveau humain, bien qu'il ne pèse que 2% du poids du corps, est un gouffre énergétique !" },
  { q: "Quel est le seul mammifère capable d'un vol battu soutenu ?", a: ["L'écureuil volant", "La chauve-souris", "Le lémurien", "L'ornithorynque"], c: 1, exp: "Les chauves-souris possèdent de vraies ailes membraneuses articulées pour battre des ailes." },
  { q: "Quel métal est liquide à température ambiante normale ?", a: ["Le mercure", "Le plomb", "Le zinc", "Le cuivre"], c: 0, exp: "Le mercure fond à -38,8°C et reste liquide à température ambiante." }
];

// Slide Puzzle State
let slideBoard = [];

// Dual Tap State
let p1Score = 0;
let p2Score = 0;
let isAiMode = false;
let aiInterval = null;

document.addEventListener('DOMContentLoaded', async () => {
  initSharedHeader('jeux');
  await loadGamesData();
  setupFilterTabs();
  renderShowcaseCards();
  setupMiniGameSelector();
  launchMiniGame(activeGame);
  setupDailyChallenge();
});

async function loadGamesData() {
  try {
    const res = await fetch('/data/games/games.json');
    if (res.ok) {
      gamesData = await res.json();
    }
  } catch (err) {
    console.warn('Erreur chargement catalogue jeux:', err);
  }
}

function setupDailyChallenge() {
  const challengeBtn = document.getElementById('btn-challenge-play');
  challengeBtn?.addEventListener('click', () => {
    launchMiniGame('game-reflex');
    showToast('Défi quotidien activé : Obtenez moins de 250 ms ! ⚡', 'accent');
  });
}

function setupMiniGameSelector() {
  const selectorBtns = document.querySelectorAll('.game-select-tab');
  selectorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      selectorBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const gameId = btn.getAttribute('data-game-id');
      if (gameId) launchMiniGame(gameId);
    });
  });
}

function launchMiniGame(gameId) {
  activeGame = gameId;
  const stage = document.getElementById('game-stage');
  if (!stage) return;

  // Cleanup any running AI
  if (aiInterval) clearInterval(aiInterval);

  if (gameId === 'game-reflex') {
    initReflexGame(stage);
  } else if (gameId === 'game-memory') {
    initMemoryGame(stage);
  } else if (gameId === 'game-quiz') {
    initQuizGame(stage);
  } else if (gameId === 'game-slide') {
    initSlideGame(stage);
  } else if (gameId === 'game-duo') {
    initDualTapGame(stage);
  }
}

/* ==============================================================
   1. MINI-JEU : CHRONO REFLEX
   ============================================================== */
function initReflexGame(stage) {
  reflexState = 'idle';
  stage.innerHTML = `
    <div class="reflex-zone idle" id="reflex-click-area">
      <div class="reflex-instruction" id="reflex-main-text">⚡ Test de Réflexes Z</div>
      <div class="reflex-subtext" id="reflex-sub-text">Cliquez n'importe où pour démarrer</div>
      <div style="margin-top:14px; font-size:12px; color:#cbd5e1;">
        Record personnel : <strong>${reflexBest ? reflexBest + ' ms' : 'Aucun'}</strong>
      </div>
    </div>
  `;

  const area = document.getElementById('reflex-click-area');
  const mainText = document.getElementById('reflex-main-text');
  const subText = document.getElementById('reflex-sub-text');

  area?.addEventListener('click', () => {
    if (reflexState === 'idle') {
      reflexState = 'waiting';
      area.className = 'reflex-zone waiting';
      mainText.textContent = "ATTENDEZ LE VERT...";
      subText.textContent = "Ne cliquez pas trop tôt !";

      const delay = 1500 + Math.random() * 2500;
      reflexTimer = setTimeout(() => {
        reflexState = 'ready';
        reflexStartTime = performance.now();
        area.className = 'reflex-zone ready';
        mainText.textContent = "CLIQUEZ MAINTENANT !";
        subText.textContent = "Vite !";
      }, delay);

    } else if (reflexState === 'waiting') {
      // Faux départ
      clearTimeout(reflexTimer);
      reflexState = 'idle';
      area.className = 'reflex-zone idle';
      mainText.textContent = "❌ Trop tôt ! Faux départ";
      subText.textContent = "Cliquez pour réessayer.";

    } else if (reflexState === 'ready') {
      const elapsed = Math.round(performance.now() - reflexStartTime);
      reflexState = 'idle';
      area.className = 'reflex-zone idle';
      mainText.textContent = `⚡ ${elapsed} ms !`;

      let rank = "Bon réflexe !";
      if (elapsed < 200) rank = "LÉGENDAIRE ! Réflexes surhumains ! 🏆";
      else if (elapsed < 250) rank = "EXCELLENT ! Vitesse de champion ⚡";
      else if (elapsed < 350) rank = "Très bon temps !";

      subText.textContent = `${rank} — Cliquez pour rejouer.`;

      if (!reflexBest || elapsed < reflexBest) {
        reflexBest = elapsed;
        localStorage.setItem('z_best_reflex', elapsed.toString());
        showToast(`Nouveau record personnel : ${elapsed} ms !`, 'success');
      }

      if (elapsed <= 250) {
        auth.addXp(100, 'Défi réflexe inférieur à 250 ms validé !');
      } else {
        auth.addXp(20, 'Partie de Chrono Reflex terminée');
      }
    }
  });
}

/* ==============================================================
   2. MINI-JEU : MEMORY DES ÉTOILES
   ============================================================== */
function initMemoryGame(stage) {
  const icons = ['🌟', '🚀', '⚡', '🎬', '💡', '🎮', '🧠', '🔥'];
  const deck = [...icons, ...icons].sort(() => Math.random() - 0.5);
  memoryCards = deck;
  memoryFlipped = [];
  memoryMatchedCount = 0;
  memoryMoves = 0;

  stage.innerHTML = `
    <div style="display:flex; justify-content:space-between; width:100%; max-width:360px; margin-bottom:12px; font-size:13px; font-weight:700;">
      <span>Coups : <span id="mem-moves">0</span></span>
      <span>Paires : <span id="mem-pairs">0/8</span></span>
      <button id="mem-restart" style="background:none; border:none; color:#f472b6; cursor:pointer;">Recommencer ↺</button>
    </div>
    <div class="memory-grid" id="mem-grid"></div>
  `;

  document.getElementById('mem-restart')?.addEventListener('click', () => initMemoryGame(stage));

  const grid = document.getElementById('mem-grid');
  deck.forEach((icon, index) => {
    const card = document.createElement('div');
    card.className = 'memory-card';
    card.setAttribute('data-index', index);
    card.textContent = '❓';

    card.addEventListener('click', () => {
      if (card.classList.contains('revealed') || card.classList.contains('matched') || memoryFlipped.length >= 2) {
        return;
      }

      card.classList.add('revealed');
      card.textContent = icon;
      memoryFlipped.push({ card, icon, index });

      if (memoryFlipped.length === 2) {
        memoryMoves++;
        document.getElementById('mem-moves').textContent = memoryMoves;

        const [c1, c2] = memoryFlipped;
        if (c1.icon === c2.icon) {
          c1.card.classList.add('matched');
          c2.card.classList.add('matched');
          memoryMatchedCount++;
          document.getElementById('mem-pairs').textContent = `${memoryMatchedCount}/8`;
          memoryFlipped = [];

          if (memoryMatchedCount === 8) {
            auth.addXp(120, 'Z-Memory complété avec succès !');
            showToast(`Victoire en ${memoryMoves} coups ! 🧠`, 'success');
          }
        } else {
          setTimeout(() => {
            c1.card.classList.remove('revealed');
            c1.card.textContent = '❓';
            c2.card.classList.remove('revealed');
            c2.card.textContent = '❓';
            memoryFlipped = [];
          }, 800);
        }
      }
    });

    grid.appendChild(card);
  });
}

/* ==============================================================
   3. MINI-JEU : QUIZ CULTURE & SCIENCES
   ============================================================== */
function initQuizGame(stage) {
  quizIndex = 0;
  quizScore = 0;
  renderQuizStep(stage);
}

function renderQuizStep(stage) {
  if (quizIndex >= quizQuestions.length) {
    const percent = Math.round((quizScore / quizQuestions.length) * 100);
    stage.innerHTML = `
      <div style="text-align:center; padding:30px;">
        <div style="font-size:48px; margin-bottom:12px;">🏆</div>
        <h3 style="font-size:22px; font-weight:800; margin-bottom:8px;">Quiz Terminé !</h3>
        <p style="font-size:16px; color:#cbd5e1; margin-bottom:20px;">Votre score : <strong>${quizScore} / ${quizQuestions.length}</strong> (${percent}%)</p>
        <button id="quiz-replay-btn" class="btn-launch-challenge" style="margin: 0 auto;">Rejouer le quiz</button>
      </div>
    `;
    auth.addXp(quizScore * 25, `Résultat Z-Quiz (${quizScore}/${quizQuestions.length})`);
    document.getElementById('quiz-replay-btn')?.addEventListener('click', () => initQuizGame(stage));
    return;
  }

  const q = quizQuestions[quizIndex];
  stage.innerHTML = `
    <div class="quiz-box">
      <div style="display:flex; justify-content:space-between; font-size:12px; color:#94a3b8; margin-bottom:12px;">
        <span>Question ${quizIndex + 1} sur ${quizQuestions.length}</span>
        <span>Score actuel : ${quizScore}</span>
      </div>
      <div class="quiz-question">${q.q}</div>
      <div class="quiz-answers-grid">
        ${q.a.map((ans, idx) => `
          <button class="quiz-ans-btn" data-ans-idx="${idx}">
            <span style="color:#f472b6; margin-right:6px;">${idx + 1}.</span> ${ans}
          </button>
        `).join('')}
      </div>
      <div id="quiz-feedback" style="margin-top:16px; font-size:13px; min-height:24px; text-align:center;"></div>
    </div>
  `;

  const btns = stage.querySelectorAll('.quiz-ans-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.disabled = true);
      const chosen = parseInt(btn.getAttribute('data-ans-idx'), 10);
      const feedback = document.getElementById('quiz-feedback');

      if (chosen === q.c) {
        btn.classList.add('correct');
        feedback.innerHTML = `<span style="color:#10b981; font-weight:700;">✓ Exact !</span> ${q.exp}`;
        quizScore++;
      } else {
        btn.classList.add('wrong');
        btns[q.c].classList.add('correct');
        feedback.innerHTML = `<span style="color:#ef4444; font-weight:700;">✗ Oups !</span> ${q.exp}`;
      }

      setTimeout(() => {
        quizIndex++;
        renderQuizStep(stage);
      }, 2200);
    });
  });
}

/* ==============================================================
   4. MINI-JEU : SLIDE 15 PUZZLE
   ============================================================== */
function initSlideGame(stage) {
  // Numbers 1 to 15 + 0 for empty slot
  slideBoard = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 0, 15]; // solvable layout
  let moves = 0;

  stage.innerHTML = `
    <div style="display:flex; justify-content:space-between; width:280px; margin-bottom:12px; font-size:13px; font-weight:700;">
      <span>Mouvements : <span id="slide-moves">0</span></span>
      <button id="slide-shuffle" style="background:none; border:none; color:#f472b6; cursor:pointer;">Mélanger ↺</button>
    </div>
    <div class="slide-grid" id="slide-grid-box"></div>
  `;

  document.getElementById('slide-shuffle')?.addEventListener('click', () => {
    // Perform random valid moves
    for (let i = 0; i < 30; i++) {
      const emptyIdx = slideBoard.indexOf(0);
      const neighbors = getValidSlideNeighbors(emptyIdx);
      const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
      [slideBoard[emptyIdx], slideBoard[randomNeighbor]] = [slideBoard[randomNeighbor], slideBoard[emptyIdx]];
    }
    moves = 0;
    document.getElementById('slide-moves').textContent = '0';
    renderSlideBoard();
  });

  function renderSlideBoard() {
    const grid = document.getElementById('slide-grid-box');
    if (!grid) return;
    grid.innerHTML = '';

    slideBoard.forEach((val, idx) => {
      const tile = document.createElement('div');
      tile.className = val === 0 ? 'slide-tile empty' : 'slide-tile';
      tile.textContent = val === 0 ? '' : val;

      tile.addEventListener('click', () => {
        const emptyIdx = slideBoard.indexOf(0);
        const neighbors = getValidSlideNeighbors(emptyIdx);
        if (neighbors.includes(idx)) {
          [slideBoard[emptyIdx], slideBoard[idx]] = [slideBoard[idx], slideBoard[emptyIdx]];
          moves++;
          document.getElementById('slide-moves').textContent = moves;
          renderSlideBoard();
          checkSlideWin();
        }
      });

      grid.appendChild(tile);
    });
  }

  function getValidSlideNeighbors(emptyIdx) {
    const neighbors = [];
    const row = Math.floor(emptyIdx / 4);
    const col = emptyIdx % 4;
    if (row > 0) neighbors.push(emptyIdx - 4);
    if (row < 3) neighbors.push(emptyIdx + 4);
    if (col > 0) neighbors.push(emptyIdx - 1);
    if (col < 3) neighbors.push(emptyIdx + 1);
    return neighbors;
  }

  function checkSlideWin() {
    const isWin = slideBoard.every((val, idx) => {
      if (idx === 15) return val === 0;
      return val === idx + 1;
    });
    if (isWin) {
      auth.addXp(150, 'Z-Slide 15 résolu !');
      showToast('Bravo ! Taquin résolu avec succès ! 🧩', 'success');
    }
  }

  renderSlideBoard();
}

/* ==============================================================
   5. MINI-JEU : DUAL TAP (2 JOUEURS SUR LE MÊME ÉCRAN)
   ============================================================== */
function initDualTapGame(stage) {
  p1Score = 15;
  p2Score = 15;
  const targetWin = 30;

  stage.innerHTML = `
    <div style="display:flex; justify-content:space-between; width:100%; max-width:500px; margin-bottom:8px; font-size:12px;">
      <span><strong>Joueur 1 (Violet)</strong> : Touche A / Taper en haut</span>
      <button id="toggle-ai-btn" style="background:none; border:1px solid #64748b; color:#cbd5e1; padding:2px 8px; border-radius:12px; cursor:pointer;">
        Mode : 2 Humains
      </button>
      <span><strong>Joueur 2 (Rose)</strong> : Touche L / Taper en bas</span>
    </div>
    <div class="dual-arena">
      <div class="dual-half p1" id="dual-p1">
        <span>JOUEUR 1 (TAP !)</span>
        <div style="font-size:28px;" id="p1-display">${p1Score}</div>
      </div>
      <div class="dual-score-bar">
        <div class="dual-score-fill-p1" id="p1-fill" style="width:50%;"></div>
        <div class="dual-score-fill-p2" id="p2-fill" style="width:50%;"></div>
      </div>
      <div class="dual-half p2" id="dual-p2">
        <span>JOUEUR 2 (TAP !)</span>
        <div style="font-size:28px;" id="p2-display">${p2Score}</div>
      </div>
    </div>
  `;

  const p1Btn = document.getElementById('dual-p1');
  const p2Btn = document.getElementById('dual-p2');
  const toggleAi = document.getElementById('toggle-ai-btn');

  function tapP1() {
    p1Score++;
    p2Score = Math.max(0, p2Score - 1);
    updateDualState();
  }

  function tapP2() {
    p2Score++;
    p1Score = Math.max(0, p1Score - 1);
    updateDualState();
  }

  function updateDualState() {
    const total = p1Score + p2Score;
    const p1Pct = total > 0 ? (p1Score / total) * 100 : 50;
    const p2Pct = 100 - p1Pct;

    document.getElementById('p1-display').textContent = p1Score;
    document.getElementById('p2-display').textContent = p2Score;
    document.getElementById('p1-fill').style.width = `${p1Pct}%`;
    document.getElementById('p2-fill').style.width = `${p2Pct}%`;

    if (p1Score >= targetWin) {
      showToast('Victoire du Joueur 1 (Violet) ! 🏆', 'accent');
      auth.addXp(50, 'Victoire au Duel Z-Tap');
      p1Score = 15;
      p2Score = 15;
    } else if (p2Score >= targetWin) {
      showToast('Victoire du Joueur 2 (Rose) ! 🏆', 'accent');
      auth.addXp(50, 'Victoire au Duel Z-Tap');
      p1Score = 15;
      p2Score = 15;
    }
  }

  p1Btn?.addEventListener('click', tapP1);
  p2Btn?.addEventListener('click', tapP2);

  window.addEventListener('keydown', (e) => {
    if (activeGame !== 'game-duo') return;
    if (e.key === 'a' || e.key === 'A') tapP1();
    if (e.key === 'l' || e.key === 'L') tapP2();
  });

  toggleAi?.addEventListener('click', () => {
    isAiMode = !isAiMode;
    toggleAi.textContent = isAiMode ? 'Mode : Joueur 1 vs Ordinateur (IA)' : 'Mode : 2 Humains';
    if (isAiMode) {
      aiInterval = setInterval(() => {
        if (activeGame === 'game-duo' && isAiMode) {
          tapP2();
        }
      }, 350 + Math.random() * 250);
    } else {
      clearInterval(aiInterval);
    }
  });
}

/* ==============================================================
   SHOWCASE CARDS RENDERER (Online, Downloadable, Premium)
   ============================================================== */
function setupFilterTabs() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategoryFilter = btn.getAttribute('data-filter') || 'Tous';
      renderShowcaseCards();
    });
  });
}

function renderShowcaseCards() {
  const container = document.getElementById('games-showcase-grid');
  if (!container || !gamesData) return;

  let cards = [];

  // Playable native games
  if (activeCategoryFilter === 'Tous' || activeCategoryFilter === 'gratuit' || activeCategoryFilter === 'reflexion') {
    gamesData.interactiveGames.forEach(g => {
      cards.push({
        title: g.title,
        badge: g.category,
        desc: g.description,
        icon: g.icon,
        actionLabel: "Jouer directement",
        isPlayable: true,
        gameId: g.id
      });
    });
  }

  // Multiplayer
  if (activeCategoryFilter === 'Tous' || activeCategoryFilter === 'multijoueur') {
    gamesData.curatedShowcase?.multiplayerOnline?.forEach(m => {
      cards.push({
        title: m.title,
        badge: m.genre,
        desc: m.description,
        icon: '🌐',
        link: m.url,
        actionLabel: 'Accéder au jeu en ligne',
        isPlayable: false
      });
    });
  }

  // Downloadable
  if (activeCategoryFilter === 'Tous' || activeCategoryFilter === 'telecharger') {
    gamesData.curatedShowcase?.downloadableLegit?.forEach(d => {
      cards.push({
        title: d.title,
        badge: d.platforms,
        desc: d.description,
        icon: '💾',
        link: d.officialUrl,
        actionLabel: 'Site officiel / Téléchargement',
        isPlayable: false
      });
    });
  }

  // Premium
  if (activeCategoryFilter === 'Tous' || activeCategoryFilter === 'premium') {
    gamesData.curatedShowcase?.premiumOfficial?.forEach(p => {
      cards.push({
        title: p.title,
        badge: `Éditeur : ${p.publisher}`,
        desc: `Jeu vidéo acclamé par la critique mondiale. Disponible sur les boutiques officielles partenaires.`,
        icon: '💎',
        link: p.officialUrl,
        actionLabel: 'Fiche boutique officielle',
        isPlayable: false
      });
    });
  }

  container.innerHTML = cards.map((c, idx) => `
    <div class="game-card-item">
      <div class="game-card-top">
        <div class="game-icon-box">${c.icon}</div>
        <span class="game-badge-tag">${c.badge}</span>
      </div>
      <h3 class="game-title">${c.title}</h3>
      <p class="game-description">${c.desc}</p>
      <div class="game-card-footer">
        ${c.isPlayable ? `
          <button class="game-link-btn" onclick="document.querySelector('.playable-arena-box').scrollIntoView({behavior: 'smooth'})">
            <span>${c.actionLabel}</span> ➔
          </button>
        ` : `
          <a class="game-link-btn" href="${c.link}" target="_blank" rel="noopener noreferrer">
            <span>${c.actionLabel}</span> ↗
          </a>
        `}
        <button class="btn-game-fav ${auth.isFavorite('games', c.title) ? 'active' : ''}" data-game-title="${c.title}" aria-label="Ajouter aux favoris">
          ★
        </button>
      </div>
    </div>
  `).join('');

  // Attach favorite event handlers
  container.querySelectorAll('.btn-game-fav').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const title = btn.getAttribute('data-game-title');
      const added = auth.toggleFavorite('games', title, title);
      btn.classList.toggle('active', added);
    });
  });
}
