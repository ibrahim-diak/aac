/**
 * Plateforme Z — Logique de la page Z (index.html)
 * Flux vidéo vertical inspiré de TikTok, vidéos courtes et amusantes centrées sur les personnes.
 * Chargement progressif par lots (125 lots / 10 000 vidéos prévues) et recommandations personnalisées.
 */

import { initSharedHeader, auth, showToast } from './auth.js';
import { rankVideos } from './logic-core.js';

let allVideos = [];
let currentIndex = 0;
let currentBatchIndex = 1;
let videoManifest = null;
let activeCategory = 'Tous';
let isMuted = true;
let isRecommendationEnabled = true;

// DOM references
let playerContainer;
let videoTitleEl;
let creatorHandleEl;
let categoryBadgeEl;
let likeBtnEl;
let likeCountEl;
let commentBtnEl;
let commentCountEl;
let shareBtnEl;
let favBtnEl;
let muteToggleBtnEl;
let commentsDrawerEl;
let commentsListEl;

document.addEventListener('DOMContentLoaded', async () => {
  initSharedHeader('z');
  initDomElements();
  setupEventListeners();
  await loadVideoManifest();
  await loadVideoBatch(1);
  renderCurrentVideo();
});

function initDomElements() {
  playerContainer = document.getElementById('player-container');
  videoTitleEl = document.getElementById('video-title');
  creatorHandleEl = document.getElementById('creator-handle');
  categoryBadgeEl = document.getElementById('category-badge');
  likeBtnEl = document.getElementById('btn-like');
  likeCountEl = document.getElementById('like-count');
  commentBtnEl = document.getElementById('btn-comment');
  commentCountEl = document.getElementById('comment-count');
  shareBtnEl = document.getElementById('btn-share');
  favBtnEl = document.getElementById('btn-fav');
  muteToggleBtnEl = document.getElementById('btn-mute-toggle');
  commentsDrawerEl = document.getElementById('comments-drawer');
  commentsListEl = document.getElementById('comments-list');
}

async function loadVideoManifest() {
  try {
    const res = await fetch('/data/videos/manifest.json');
    if (res.ok) {
      videoManifest = await res.json();
    }
  } catch (err) {
    console.warn('Impossible de charger le manifeste des vidéos, utilisation du lot par défaut.', err);
  }
}

async function loadVideoBatch(batchNum) {
  const batchId = String(batchNum).padStart(3, '0');
  try {
    const res = await fetch(`/data/videos/videos-${batchId}.json`);
    if (res.ok) {
      const batchData = await res.json();
      allVideos = [...allVideos, ...batchData];
      currentBatchIndex = batchNum;
    }
  } catch (err) {
    console.warn(`Erreur lors du chargement du lot ${batchId}:`, err);
  }
}

function getFilteredVideos() {
  let list = allVideos;
  if (activeCategory !== 'Tous') {
    list = list.filter(v => v.category === activeCategory);
  }

  if (isRecommendationEnabled && auth.currentUser) {
    const profile = {
      likedCategories: getCategoryAffinities(),
      favoriteIds: auth.favorites.videos || [],
      skippedIds: getSkippedIds()
    };
    list = rankVideos(list, profile, 100);
  }

  return list.length ? list : allVideos;
}

function getCategoryAffinities() {
  try {
    const data = localStorage.getItem('z_cat_affinities');
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function recordCategoryAffinity(category) {
  if (!category) return;
  const affinities = getCategoryAffinities();
  affinities[category] = (affinities[category] || 0) + 1;
  localStorage.setItem('z_cat_affinities', JSON.stringify(affinities));
}

function getSkippedIds() {
  try {
    const data = localStorage.getItem('z_skipped_videos');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function renderCurrentVideo() {
  const list = getFilteredVideos();
  if (!list.length) return;

  if (currentIndex >= list.length) {
    currentIndex = 0;
  }
  if (currentIndex < 0) {
    currentIndex = list.length - 1;
  }

  const video = list[currentIndex];

  // Update text & creator info
  if (videoTitleEl) videoTitleEl.textContent = video.title;
  if (creatorHandleEl) creatorHandleEl.textContent = video.channel || `@${video.creator.toLowerCase().replace(/\s+/g, '_')}`;
  if (categoryBadgeEl) categoryBadgeEl.textContent = video.category;
  if (likeCountEl) likeCountEl.textContent = formatNumber(video.likes);
  if (commentCountEl) commentCountEl.textContent = formatNumber(video.commentsCount);

  // Update state buttons
  const isLiked = isVideoLiked(video.id);
  likeBtnEl?.classList.toggle('liked', isLiked);

  const isFav = auth.isFavorite('videos', video.id);
  favBtnEl?.classList.toggle('favorited', isFav);

  // Render video player (prioritize direct native video for reliable playback)
  if (playerContainer) {
    playerContainer.innerHTML = '';

    if (video.url) {
      const vid = document.createElement('video');
      vid.src = video.url;
      vid.autoplay = true;
      vid.loop = true;
      vid.muted = isMuted;
      vid.playsInline = true;
      if (video.thumbnail) vid.poster = video.thumbnail;
      vid.style.width = '100%';
      vid.style.height = '100%';
      vid.style.objectFit = 'cover';
      vid.style.cursor = 'pointer';
      vid.setAttribute('aria-label', video.title);
      vid.addEventListener('click', () => {
        if (vid.paused) vid.play();
        else vid.pause();
      });
      playerContainer.appendChild(vid);
    } else if (video.embedUrl) {
      const iframe = document.createElement('iframe');
      const muteParam = isMuted ? '1' : '0';
      const cleanUrl = video.embedUrl.replace(/mute=[01]/, `mute=${muteParam}`);
      iframe.src = cleanUrl;
      iframe.title = video.title;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      playerContainer.appendChild(iframe);
    }
  }

  // Record category view for recommendation learning
  recordCategoryAffinity(video.category);

  // Progressive batch loading when approaching end of feed
  if (currentIndex >= list.length - 3 && currentBatchIndex < 5) {
    loadVideoBatch(currentBatchIndex + 1);
  }
}

function formatNumber(num) {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return String(num || 0);
}

function isVideoLiked(videoId) {
  try {
    const liked = JSON.parse(localStorage.getItem('z_liked_videos') || '[]');
    return liked.includes(videoId);
  } catch {
    return false;
  }
}

function toggleVideoLike() {
  const list = getFilteredVideos();
  const video = list[currentIndex];
  if (!video) return;

  let liked = [];
  try {
    liked = JSON.parse(localStorage.getItem('z_liked_videos') || '[]');
  } catch {
    liked = [];
  }

  const idx = liked.indexOf(video.id);
  if (idx === -1) {
    liked.push(video.id);
    video.likes++;
    likeBtnEl?.classList.add('liked');
    auth.addXp(10, "Mention J'aime sur une vidéo");
    showToast("J'aime ajouté ! ❤️", 'accent');
    recordCategoryAffinity(video.category);
  } else {
    liked.splice(idx, 1);
    video.likes = Math.max(0, video.likes - 1);
    likeBtnEl?.classList.remove('liked');
  }

  localStorage.setItem('z_liked_videos', JSON.stringify(liked));
  if (likeCountEl) likeCountEl.textContent = formatNumber(video.likes);
}

function setupEventListeners() {
  // Navigation Next / Prev buttons
  document.getElementById('btn-nav-prev')?.addEventListener('click', () => {
    currentIndex--;
    renderCurrentVideo();
  });

  document.getElementById('btn-nav-next')?.addEventListener('click', () => {
    currentIndex++;
    renderCurrentVideo();
  });

  // Keyboard navigation (Up/Down or J/K)
  window.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'PageDown', 'j'].includes(e.key)) {
      e.preventDefault();
      currentIndex++;
      renderCurrentVideo();
    } else if (['ArrowUp', 'PageUp', 'k'].includes(e.key)) {
      e.preventDefault();
      currentIndex--;
      renderCurrentVideo();
    } else if (e.key === 'm') {
      toggleMute();
    } else if (e.key === 'l') {
      toggleVideoLike();
    }
  });

  // Mouse wheel snap scrolling
  let wheelThrottle = false;
  playerContainer?.parentElement?.addEventListener('wheel', (e) => {
    if (wheelThrottle) return;
    wheelThrottle = true;
    setTimeout(() => { wheelThrottle = false; }, 600);

    if (e.deltaY > 30) {
      currentIndex++;
      renderCurrentVideo();
    } else if (e.deltaY < -30) {
      currentIndex--;
      renderCurrentVideo();
    }
  });

  // Touch Swipe for mobile devices
  let touchStartY = 0;
  playerContainer?.parentElement?.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  playerContainer?.parentElement?.addEventListener('touchend', (e) => {
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY - touchEndY;
    if (diff > 50) {
      currentIndex++;
      renderCurrentVideo();
    } else if (diff < -50) {
      currentIndex--;
      renderCurrentVideo();
    }
  }, { passive: true });

  // Like Button
  likeBtnEl?.addEventListener('click', () => toggleVideoLike());

  // Favorite Button
  favBtnEl?.addEventListener('click', () => {
    const list = getFilteredVideos();
    const video = list[currentIndex];
    if (video) {
      const added = auth.toggleFavorite('videos', video.id, video.title);
      favBtnEl.classList.toggle('favorited', added);
    }
  });

  // Share Button
  shareBtnEl?.addEventListener('click', async () => {
    const list = getFilteredVideos();
    const video = list[currentIndex];
    if (!video) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Plateforme Z - ${video.title}`,
          text: `Regarde cette vidéo sur la Plateforme Z : ${video.title}`,
          url: video.sourceUrl || window.location.href
        });
        showToast('Lien partagé avec succès !', 'success');
        return;
      } catch {
        // Fallback
      }
    }

    try {
      await navigator.clipboard.writeText(video.sourceUrl || window.location.href);
      showToast('Lien copié dans le presse-papier !', 'info');
    } catch {
      showToast('Partage : ' + video.sourceUrl, 'info');
    }
  });

  // Mute / Unmute Button
  muteToggleBtnEl?.addEventListener('click', () => toggleMute());
  document.getElementById('callout-unmute')?.addEventListener('click', () => toggleMute());

  // Category Pills Filter
  const filterPills = document.querySelectorAll('.cat-pill');
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeCategory = pill.getAttribute('data-cat') || 'Tous';
      currentIndex = 0;
      renderCurrentVideo();
    });
  });

  // Comments drawer toggle & add comment
  commentBtnEl?.addEventListener('click', () => {
    commentsDrawerEl?.classList.toggle('open');
    renderComments();
  });

  document.getElementById('close-comments')?.addEventListener('click', () => {
    commentsDrawerEl?.classList.remove('open');
  });

  document.getElementById('btn-send-comment')?.addEventListener('click', () => {
    postComment();
  });

  document.getElementById('comment-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') postComment();
  });

  // Import custom video modal
  document.getElementById('btn-import-video')?.addEventListener('click', () => {
    openImportModal();
  });
}

function toggleMute() {
  isMuted = !isMuted;
  const callout = document.getElementById('callout-unmute');
  if (callout) {
    callout.style.display = isMuted ? 'flex' : 'none';
  }
  renderCurrentVideo();
  showToast(isMuted ? 'Son désactivé 🔇' : 'Son activé 🔊', 'info');
}

function renderComments() {
  if (!commentsListEl) return;
  const list = getFilteredVideos();
  const video = list[currentIndex];
  if (!video) return;

  const defaultComments = [
    { author: "Lucas", text: "Tellement vrai ! 😂 J'ai explosé de rire." },
    { author: "Sarah_Danse", text: "Le niveau technique est impressionnant sur cette séquence !" },
    { author: "Yassine", text: "Incroyable l'expression du mec au début haha." }
  ];

  const stored = JSON.parse(localStorage.getItem(`z_comments_${video.id}`) || '[]');
  const allComms = [...stored, ...defaultComments];

  commentsListEl.innerHTML = allComms.map(c => `
    <div class="comment-item">
      <div class="comment-author-avatar">${c.author[0].toUpperCase()}</div>
      <div class="comment-content-box">
        <p class="comment-author-name">${c.author}</p>
        <p class="comment-text">${escapeHtml(c.text)}</p>
      </div>
    </div>
  `).join('');
}

function postComment() {
  const input = document.getElementById('comment-input');
  if (!input || !input.value.trim()) return;

  const list = getFilteredVideos();
  const video = list[currentIndex];
  if (!video) return;

  const authorName = auth.currentUser ? auth.currentUser.displayName : 'Visiteur Z';
  const newComment = { author: authorName, text: input.value.trim() };

  const storedKey = `z_comments_${video.id}`;
  const stored = JSON.parse(localStorage.getItem(storedKey) || '[]');
  stored.unshift(newComment);
  localStorage.setItem(storedKey, JSON.stringify(stored));

  input.value = '';
  video.commentsCount++;
  if (commentCountEl) commentCountEl.textContent = formatNumber(video.commentsCount);
  auth.addXp(15, 'Commentaire publié');
  renderComments();
}

function openImportModal() {
  let modal = document.getElementById('z-import-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'z-import-modal';
    modal.className = 'modal-backdrop';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="import-title">
      <div class="modal-header">
        <h2 id="import-title">Ajouter une vidéo personnalisée</h2>
        <button class="btn-close-modal" id="close-import-modal">✕</button>
      </div>
      <div class="modal-body">
        <p class="modal-lead">Intégrez vos propres vidéos ou liens autorisés (YouTube Shorts ou MP4 direct).</p>
        <form id="import-video-form" class="auth-form">
          <div class="form-group">
            <label for="import-title-in">Titre</label>
            <input type="text" id="import-title-in" placeholder="Ex: Défi acrobatique en ville" required />
          </div>
          <div class="form-group">
            <label for="import-url-in">URL YouTube ou MP4</label>
            <input type="url" id="import-url-in" placeholder="https://www.youtube.com/watch?v=..." required />
          </div>
          <div class="form-group">
            <label for="import-cat-in">Catégorie</label>
            <select id="import-cat-in">
              <option value="Comédie & Sketchs">Comédie & Sketchs</option>
              <option value="Danse & Performance">Danse & Performance</option>
              <option value="Talents & Magie">Talents & Magie</option>
              <option value="Sports Urbains & Défis">Sports Urbains & Défis</option>
              <option value="Interviews & Micro-Trottoir">Interviews & Micro-Trottoir</option>
              <option value="Moments Humains & Réactions">Moments Humains & Réactions</option>
            </select>
          </div>
          <div class="form-group">
            <label for="import-creator-in">Créateur / Chaîne</label>
            <input type="text" id="import-creator-in" placeholder="@mon_talent" required />
          </div>
          <button type="submit" class="btn-submit-auth">Ajouter à mon flux Z</button>
        </form>
      </div>
    </div>
  `;

  modal.classList.add('visible');

  document.getElementById('close-import-modal')?.addEventListener('click', () => {
    modal.classList.remove('visible');
  });

  document.getElementById('import-video-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('import-title-in').value;
    const url = document.getElementById('import-url-in').value;
    const cat = document.getElementById('import-cat-in').value;
    const creator = document.getElementById('import-creator-in').value;

    let embedUrl = url;
    if (url.includes('youtube.com/watch?v=')) {
      const vidId = url.split('v=')[1]?.split('&')[0];
      embedUrl = `https://www.youtube-nocookie.com/embed/${vidId}?autoplay=1&mute=1&playsinline=1`;
    } else if (url.includes('youtu.be/')) {
      const vidId = url.split('youtu.be/')[1]?.split('?')[0];
      embedUrl = `https://www.youtube-nocookie.com/embed/${vidId}?autoplay=1&mute=1&playsinline=1`;
    }

    const newVid = {
      id: `vid-custom-${Date.now()}`,
      title,
      embedUrl,
      sourceUrl: url,
      creator,
      channel: creator.startsWith('@') ? creator : `@${creator}`,
      category: cat,
      likes: 1,
      commentsCount: 0,
      shares: 0,
      verified: true
    };

    allVideos.unshift(newVid);
    currentIndex = 0;
    modal.classList.remove('visible');
    renderCurrentVideo();
    auth.addXp(50, 'Import d’une nouvelle vidéo');
    showToast('Vidéo ajoutée à votre flux Z !', 'success');
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
