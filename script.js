const IMG_PATH = "https://image.tmdb.org/t/p/w500";
const API_BASE = window.TNSTREAMING_API_BASE || "/api/tmdb";
const STORAGE_KEYS = {
  watchlist: 'tn_watchlist',
  ratings: 'tn_ratings',
  recentlyViewed: 'tn_recentlyViewed',
  comments: 'tn_comments',
  profile: 'tn_profile',
  theme: 'tn_theme',
  cachedMovies: 'tn_cachedMovies',
  continueWatching: 'tn_continueWatching',
  users: 'tn_users',
  currentUser: 'tn_currentUser',
  settings: 'tn_settings'
};

const pages = {
  popular: 1,
  topRated: 1,
  trending: 1,
  popularTv: 1,
  latestReleases: 1
};

let watchlist = JSON.parse(localStorage.getItem(STORAGE_KEYS.watchlist)) || [];
let ratings = JSON.parse(localStorage.getItem(STORAGE_KEYS.ratings)) || {};
let recentlyViewed = JSON.parse(localStorage.getItem(STORAGE_KEYS.recentlyViewed)) || [];
let comments = JSON.parse(localStorage.getItem(STORAGE_KEYS.comments)) || {};
let continueWatching = JSON.parse(localStorage.getItem(STORAGE_KEYS.continueWatching)) || {};
let users = JSON.parse(localStorage.getItem(STORAGE_KEYS.users)) || [];
let currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.currentUser)) || null;
let cachedMovies = JSON.parse(localStorage.getItem(STORAGE_KEYS.cachedMovies)) || {};
const appSettings = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings)) || {
  reducedMotion: false,
  dataSaver: false
};
let featuredItem = null;
let popularResults = [];
let deferredInstallPrompt = null;
let featuredCarouselIndex = 0;
let featuredCarouselInterval = null;
let selectedGenre = '';
let selectedMood = 'action';

const MOOD_OPTIONS = [
  { id: 'action', label: 'Action', keywords: ['action', 'war', 'mission', 'adventure', 'spider', 'hero'] },
  { id: 'chill', label: 'Chill', keywords: ['romance', 'family', 'comedy', 'love', 'sweet', 'cozy'] },
  { id: 'mindbender', label: 'Mind Bender', keywords: ['mystery', 'thriller', 'crime', 'secret', 'dark', 'unknown'] },
  { id: 'future', label: 'Future', keywords: ['sci-fi', 'science', 'future', 'space', 'cyber', 'tech'] },
  { id: 'drama', label: 'Drama', keywords: ['drama', 'story', 'emotional', 'journey', 'life', 'struggle'] },
  { id: 'fun', label: 'Fun', keywords: ['comedy', 'animation', 'adventure', 'family', 'funny', 'laugh'] }
];

function normalizeWatchlist(items) {
  return items.map(item => {
    if (typeof item === 'number') return { id: item, type: 'movie' };
    return item;
  });
}

watchlist = normalizeWatchlist(watchlist);

function isWatchlisted(id, type) {
  return watchlist.some(item => item.id === id && item.type === type);
}

let elements = null;

function getElements() {
  return {
    featured: document.getElementById('featured'),
    featuredTitle: document.getElementById('featuredTitle'),
    featuredOverview: document.getElementById('featuredOverview'),
    featuredDetailsButton: document.getElementById('featuredDetailsButton'),
    featuredWatchNowButton: document.getElementById('featuredWatchNowButton'),
    featuredWatchlistButton: document.getElementById('featuredWatchlistButton'),
    featuredShuffleButton: document.getElementById('featuredShuffleButton'),
    genrePills: document.getElementById('genrePills'),
    mainNavButtons: Array.from(document.querySelectorAll('.nav-pill')),
    continueWatchingSection: document.getElementById('continueWatchingSection'),
    continueWatchingGrid: document.getElementById('continueWatchingGrid'),
    watchlistSection: document.getElementById('watchlistSection'),
    watchlistGrid: document.getElementById('watchlistGrid'),
    statsSection: document.getElementById('statsSection'),
    statsGrid: document.getElementById('statsGrid'),
    popular: document.getElementById('popular'),
    topRated: document.getElementById('topRated'),
    trending: document.getElementById('trending'),
    popularTv: document.getElementById('popularTv'),
    latestReleases: document.getElementById('latestReleases'),
    recentlyViewed: document.getElementById('recentlyViewed'),
    form: document.getElementById('form'),
    search: document.getElementById('search'),
    suggestions: document.getElementById('suggestions'),
    authBtn: document.getElementById('authBtn'),
    installButton: document.getElementById('installButton'),
    settingsBtn: document.getElementById('settingsBtn'),
    settingsModal: document.getElementById('settingsModal'),
    closeSettingsModal: document.getElementById('closeSettingsModal'),
    settingsAutonext: document.getElementById('settingsAutonext'),
    settingsReducedMotion: document.getElementById('settingsReducedMotion'),
    settingsDataSaver: document.getElementById('settingsDataSaver'),
    settingsLanguage: document.getElementById('settingsLanguage'),
    cinemaToggle: document.getElementById('cinemaToggle'),
    authModal: document.getElementById('authModal'),
    closeAuthModal: document.getElementById('closeAuthModal'),
    loginForm: document.getElementById('loginForm'),
    signupForm: document.getElementById('signupForm'),
    authTabs: Array.from(document.querySelectorAll('.auth-tab')),
    profileBtn: document.getElementById('profileBtn'),
    profileModal: document.getElementById('profileModal'),
    closeProfileModal: document.getElementById('closeProfileModal'),
    profileName: document.getElementById('profileName'),
    profileEmail: document.getElementById('profileEmail'),
    profileAvatarPreview: document.getElementById('profileAvatarPreview'),
    profileStats: document.getElementById('profileStats'),
    signOutButton: document.getElementById('signOutButton'),
    avatarGrid: document.getElementById('avatarGrid'),
    themeToggle: document.getElementById('themeToggle'),
    languageFilter: document.getElementById('languageFilter'),
    ratingFilter: document.getElementById('ratingFilter'),
    offlineNotice: document.getElementById('offlineNotice'),
    notificationsContainer: document.getElementById('notificationsContainer'),
    closeModal: document.getElementById('closeModal'),
    modal: document.getElementById('movieModal'),
    modalContent: document.getElementById('modalContent'),
    watchlistBtn: document.getElementById('watchlistBtn')
  };
}

const avatars = [
  'https://i.pravatar.cc/80?img=1',
  'https://i.pravatar.cc/80?img=2',
  'https://i.pravatar.cc/80?img=3',
  'https://i.pravatar.cc/80?img=4',
  'https://i.pravatar.cc/80?img=5',
  'https://i.pravatar.cc/80?img=6',
  'https://i.pravatar.cc/80?img=7',
  'https://i.pravatar.cc/80?img=8'
];

function getClassByRate(vote) {
  if (vote >= 8) return 'good';
  if (vote >= 6.5) return 'average';
  return 'poor';
}

function formatCurrency(amount) {
  if (!amount || amount === 0) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(amount);
}

function getContentType(content) {
  if (content.media_type) return content.media_type;
  return content.first_air_date || content.name ? 'tv' : 'movie';
}

function buildQueryParams({ page = 1, genre = '', sort = 'popularity.desc', language = '', rating = '' } = {}) {
  const params = new URLSearchParams({
    page: page.toString(),
    sort_by: sort
  });
  if (genre) params.append('with_genres', genre);
  if (language) params.append('with_original_language', language);
  if (rating) params.append('vote_average.gte', rating);
  return params.toString();
}

const AUDIO_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ta', label: 'Tamil' },
  { code: 'pt', label: 'Portuguese' }
];
const GENRE_MAP = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 53: 'Thriller', 10759: 'Action', 10765: 'Sci-Fi'
};
const GENRES = [
  { id: '', name: 'All' },
  { id: '28', name: 'Action' },
  { id: '12', name: 'Adventure' },
  { id: '16', name: 'Animation' },
  { id: '35', name: 'Comedy' },
  { id: '80', name: 'Crime' },
  { id: '99', name: 'Documentary' },
  { id: '18', name: 'Drama' },
  { id: '10751', name: 'Family' },
  { id: '14', name: 'Fantasy' },
  { id: '27', name: 'Horror' },
  { id: '878', name: 'Sci-Fi' },
  { id: '53', name: 'Thriller' }
];
const PLAYER_SETTINGS = {
  language: 'en',
  audio: 'en',
  subtitleUrl: '',
  autonext: 0
};
const savedPlayerSettings = JSON.parse(localStorage.getItem('tn_playerSettings')) || {};
Object.assign(PLAYER_SETTINGS, savedPlayerSettings);

const urls = {
  popular: params => `${API_BASE}/discover/movie?${params}`,
  topRated: params => `${API_BASE}/movie/top_rated?${params}`,
  trending: params => `${API_BASE}/trending/movie/week?${params}`,
  popularTv: params => `${API_BASE}/discover/tv?${params}`,
  latestReleases: params => `${API_BASE}/discover/movie?${params}`,
  search: query => `${API_BASE}/search/multi?query=${encodeURIComponent(query)}`,
  details: (id, type) => `${API_BASE}/${type}/${id}`,
  providers: (id, type) => `${API_BASE}/${type}/${id}/watch/providers`,
  recommendations: (id, type) => `${API_BASE}/${type}/${id}/recommendations`,
  videos: (id, type) => `${API_BASE}/${type}/${id}/videos`,
  credits: (id, type) => `${API_BASE}/${type}/${id}/credits`
};

function loadAuthorizedPlayer(type, tmdbId, season, episode) {
  const playerBox = document.getElementById('playerBox');
  if (!playerBox) return;
  playerBox.innerHTML = `<div class="player-error"><strong>Authorized playback is not configured.</strong><span>Use the official trailer button or connect a licensed provider in the backend.</span></div>`;
}

function renderPlayerSettings() {
  return `
    <div class="player-settings">
      <div class="player-control">
        <label for="languageSelect">Player language</label>
        <select id="languageSelect">
          ${AUDIO_LANGUAGES.map(lang => `<option value="${lang.code}" ${lang.code === PLAYER_SETTINGS.language ? 'selected' : ''}>${lang.label}</option>`).join('')}
        </select>
      </div>
      <div class="player-control">
        <label for="audioSelect">Audio track</label>
        <select id="audioSelect">
          ${AUDIO_LANGUAGES.map(lang => `<option value="${lang.code}" ${lang.code === PLAYER_SETTINGS.audio ? 'selected' : ''}>${lang.label}</option>`).join('')}
        </select>
      </div>
      <div class="player-control subtitle-row">
        <label for="subtitleInput">Subtitle URL</label>
        <input type="text" id="subtitleInput" placeholder="Paste .srt/.vtt URL or leave blank" value="${PLAYER_SETTINGS.subtitleUrl || ''}" />
        <button class="secondary-button" id="subtitleApplyButton">Apply</button>
      </div>
      <div class="player-control toggle-row">
        <label class="toggle-switch">
          <input type="checkbox" id="autonextToggle" ${PLAYER_SETTINGS.autonext ? 'checked' : ''} />
          <span>Autoplay next episode</span>
        </label>
      </div>
    </div>
  `;
}

function renderEpisodeSelectors(details) {
  if (!details.seasons || !details.seasons.length) return '';
  const seasons = details.seasons.filter(season => season.season_number > 0);
  if (!seasons.length) return '';
  const seasonOptions = seasons.map(season => `<option value="${season.season_number}">${season.name || 'Season ' + season.season_number}</option>`).join('');

  return `
    <div class="season-controls">
      <label for="seasonSelect">Season</label>
      <select id="seasonSelect" class="episode-select">${seasonOptions}</select>
      <label for="episodeSelect">Episode</label>
      <select id="episodeSelect" class="episode-select"><option value="1">Loading episodes...</option></select>
    </div>
  `;
}

async function populateEpisodeSelector(tvId, season) {
  const selector = document.getElementById('episodeSelect');
  if (!selector) return;
  selector.innerHTML = '<option>Loading episodes...</option>';
  try {
    const data = await fetchJson(`${API_BASE}/tv/${tvId}/season/${season}`);
    const episodes = data.episodes || [];
    if (!episodes.length) {
      selector.innerHTML = '<option value="1">Episode 1</option>';
      return;
    }
    selector.innerHTML = episodes.map(ep => `<option value="${ep.episode_number}">${ep.episode_number}. ${ep.name || 'Episode ' + ep.episode_number}</option>`).join('');
  } catch {
    selector.innerHTML = '<option value="1">Episode 1</option>';
  }
}

function showNotification(title, message) {
  const note = document.createElement('div');
  note.className = 'notification';
  note.innerHTML = `<strong>${title}</strong><span>${message}</span>`;
  elements.notificationsContainer.appendChild(note);
  setTimeout(() => note.remove(), 4200);
}

function createMovieCard(content, containerClass = 'movie-card') {
  const title = content.title || content.name || 'Untitled';
  const poster = content.poster_path ? `${IMG_PATH}${content.poster_path}` : 'https://via.placeholder.com/480x720?text=No+Image';
  const rating = content.vote_average ? content.vote_average.toFixed(1) : 'N/A';
  const progressData = continueWatching[content.id] || null;
  const progressSection = progressData ? `<div class="progress-bar"><span style="width: ${progressData.progress}%"></span></div>` : '';
  const progressBadge = progressData ? `<span class="progress-badge">${progressData.progress}% watched</span>` : '';
  const year = content.release_date ? content.release_date.slice(0, 4) : content.first_air_date ? content.first_air_date.slice(0, 4) : '';
  const cardSubtitle = year ? `${year} · ${content.media_type || getContentType(content)}` : `${content.media_type || getContentType(content)}`;

  const element = document.createElement('div');
  element.className = containerClass;
  element.dataset.id = content.id;
  element.innerHTML = `
    <div class="card-image-wrap">
      <img src="${poster}" alt="${title}" loading="${appSettings.dataSaver ? 'lazy' : 'eager'}" />
      <div class="card-overlay">
        <button class="overlay-action">▶ Play</button>
      </div>
    </div>
    <div class="card-body">
      <div class="card-headline">
        <h3>${title}</h3>
        <span class="card-type">${cardSubtitle}</span>
      </div>
      <div class="card-meta">
        <span class="rating-badge ${getClassByRate(content.vote_average)}">${rating}</span>
        ${progressBadge}
      </div>
      ${progressSection}
    </div>
  `;
  element.addEventListener('click', () => showMovieDetails(content));
  return element;
}

async function fetchJson(url) {
  const cacheKey = `cache_${url}`;
  if (!navigator.onLine && cachedMovies[cacheKey]) {
    return cachedMovies[cacheKey];
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error('Network error');
  const data = await response.json();
  cachedMovies[cacheKey] = data;
  localStorage.setItem(STORAGE_KEYS.cachedMovies, JSON.stringify(cachedMovies));
  return data;
}

async function updateCategory(category, append = false) {
  const container = elements[category];
  if (!container) {
    console.warn(`Missing content container for category: ${category}`);
    return;
  }

  const language = elements.languageFilter.value;
  const rating = elements.ratingFilter.value;
  const sort = document.querySelector(`.sort-select[data-target="${category}"]`)?.value || 'popularity.desc';
  const filterGenre = document.querySelector(`.filter-select[data-target="${category}"]`)?.value || '';
  const useGenre = selectedGenre || filterGenre;
  const params = buildQueryParams({ page: pages[category], genre: useGenre, sort, language, rating });

  if (!append) container.innerHTML = '';
  try {
    const data = await fetchJson(urls[category](params));
    const results = data.results || [];
    if (!append) container.innerHTML = '';
    results.forEach(item => container.appendChild(createMovieCard(item, category === 'popularTv' ? 'movie-card' : 'movie-card')));
    if (category === 'popular') {
      popularResults = results;
      renderMoodGrid();
      if (!featuredItem && results.length) {
        featuredItem = results[0];
        featuredCarouselIndex = 0;
        setFeaturedItem(featuredItem);
        updateMoreLikeThis();
        renderFeaturedCarousel();
        startFeaturedCarousel();
      }
    }
  } catch (error) {
    container.innerHTML = '<div class="section-note">Unable to load content at the moment.</div>';
    console.error(error);
  }
}

function setFeaturedItem(item) {
  if (!item) return;
  const title = item.title || item.name || 'Featured title';
  elements.featuredTitle.textContent = title;
  elements.featuredOverview.textContent = item.overview || 'Discover new releases and trending recommendations.';
  elements.featuredWatchlistButton.textContent = isWatchlisted(item.id, getContentType(item)) ? 'Remove from Watchlist' : '+ My List';
  elements.featured.dataset.featuredId = item.id;
  elements.featured.style.backgroundImage = `linear-gradient(180deg, rgba(11, 11, 15, 0.15), rgba(11, 11, 15, 0.9)), url(${item.backdrop_path ? IMG_PATH + item.backdrop_path : 'https://via.placeholder.com/1200x700?text=Featured'})`;

  const ratingText = item.vote_average ? `${item.vote_average.toFixed(1)} ★` : 'NR';
  const yearText = (item.release_date || item.first_air_date || 'Unknown').slice(0, 4);
  const genreText = (item.genre_ids || []).map(id => GENRE_MAP[id]).filter(Boolean).slice(0, 3).join(', ') || 'Recommended';

  document.getElementById('heroRating').textContent = ratingText;
  document.getElementById('heroRuntime').textContent = yearText;
  document.getElementById('heroGenre').textContent = genreText;
}

function renderGenrePills() {
  if (!elements.genrePills) return;
  elements.genrePills.innerHTML = GENRES.map(genre => `
    <button class="genre-pill ${genre.id === selectedGenre ? 'active' : ''}" data-genre="${genre.id}">${genre.name}</button>
  `).join('');
  elements.genrePills.querySelectorAll('.genre-pill').forEach(button => {
    button.addEventListener('click', () => {
      selectedGenre = button.dataset.genre;
      renderGenrePills();
      ['popular', 'topRated', 'trending', 'popularTv'].forEach(category => updateCategory(category));
    });
  });
}

function getMoodMatches(items) {
  const mood = MOOD_OPTIONS.find(option => option.id === selectedMood) || MOOD_OPTIONS[0];
  return (items || []).filter(item => {
    const haystack = [
      item.title || '',
      item.name || '',
      item.overview || '',
      (item.genre_ids || []).map(id => GENRE_MAP[id] || '').join(' '),
      (item.genres || []).map(genre => genre.name).join(' ')
    ].join(' ').toLowerCase();

    return mood.keywords.some(keyword => haystack.includes(keyword));
  });
}

function renderMoodPills() {
  const container = document.getElementById('moodPills');
  if (!container) return;

  container.innerHTML = MOOD_OPTIONS.map(mood => `
    <button class="mood-pill ${mood.id === selectedMood ? 'active' : ''}" data-mood="${mood.id}">${mood.label}</button>
  `).join('');

  container.querySelectorAll('.mood-pill').forEach(button => {
    button.addEventListener('click', () => {
      selectedMood = button.dataset.mood;
      renderMoodPills();
      renderMoodGrid();
    });
  });
}

function renderMoodGrid() {
  const container = document.getElementById('moodGrid');
  if (!container) return;

  const picks = getMoodMatches(popularResults).slice(0, 6);

  if (!picks.length) {
    container.innerHTML = '<div class="section-note">No matches found for this mood right now. Try another vibe.</div>';
    return;
  }

  container.innerHTML = picks.map(item => `
    <div class="mood-card" data-id="${item.id}">
      <img src="${item.poster_path ? IMG_PATH + item.poster_path : 'https://via.placeholder.com/480x720?text=No+Image'}" alt="${item.title || item.name}" />
      <div class="mood-card-body">
        <h3>${item.title || item.name}</h3>
        <p>${(item.release_date || item.first_air_date || '2026').slice(0, 4)} • ${(item.vote_average || 0).toFixed(1)} ★</p>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.mood-card').forEach(card => {
    card.addEventListener('click', () => {
      const selected = popularResults.find(result => result.id.toString() === card.dataset.id);
      if (selected) showMovieDetails(selected);
    });
  });
}

function updateMoreLikeThis() {
  const container = document.getElementById('moreLikeThis');
  if (!container || !popularResults.length || !featuredItem) return;
  const suggestions = popularResults.filter(item => item.id !== featuredItem.id).slice(0, 8);
  container.innerHTML = suggestions.map(item => `
    <div class="movie-card more-like-card" data-id="${item.id}">
      <img src="${item.poster_path ? IMG_PATH + item.poster_path : 'https://via.placeholder.com/480x720?text=No+Image'}" alt="${item.title || item.name}" />
      <div class="card-body">
        <h3>${item.title || item.name}</h3>
        <span class="card-type">${item.release_date ? item.release_date.slice(0, 4) : ''}</span>
      </div>
    </div>
  `).join('');
  container.querySelectorAll('.movie-card').forEach(card => {
    card.addEventListener('click', () => {
      const selected = suggestions.find(result => result.id.toString() === card.dataset.id);
      if (selected) showMovieDetails(selected);
    });
  });
}

function createFeaturedCarouselCard(item) {
  const card = document.createElement('div');
  card.className = 'carousel-card';
  if (featuredItem && featuredItem.id === item.id) card.classList.add('active');
  card.innerHTML = `
    <img src="${item.backdrop_path ? IMG_PATH + item.backdrop_path : item.poster_path ? IMG_PATH + item.poster_path : 'https://via.placeholder.com/480x360?text=Featured'}" alt="${item.title || item.name}" />
    <div class="carousel-card-body">
      <h3>${item.title || item.name}</h3>
      <span>${item.release_date ? item.release_date.slice(0, 4) : item.first_air_date ? item.first_air_date.slice(0, 4) : 'TV Series'}</span>
    </div>
  `;
  card.addEventListener('click', () => {
    featuredItem = item;
    featuredCarouselIndex = popularResults.findIndex(result => result.id === item.id);
    setFeaturedItem(item);
    updateMoreLikeThis();
    renderFeaturedCarousel();
    startFeaturedCarousel();
  });
  return card;
}

function renderFeaturedCarousel() {
  const container = document.getElementById('featuredCarousel');
  if (!container || !popularResults.length) return;
  container.innerHTML = '';
  popularResults.slice(0, 10).forEach(item => container.appendChild(createFeaturedCarouselCard(item)));
}

function startFeaturedCarousel() {
  if (featuredCarouselInterval) {
    clearInterval(featuredCarouselInterval);
  }
  if (!popularResults.length) return;
  featuredCarouselInterval = setInterval(() => {
    featuredCarouselIndex = (featuredCarouselIndex + 1) % popularResults.length;
    const nextItem = popularResults[featuredCarouselIndex];
    if (!nextItem) return;
    featuredItem = nextItem;
    setFeaturedItem(nextItem);
    updateMoreLikeThis();
    renderFeaturedCarousel();
  }, 12000);
}

function pauseFeaturedCarousel() {
  if (featuredCarouselInterval) {
    clearInterval(featuredCarouselInterval);
    featuredCarouselInterval = null;
  }
}

function handleNavigationScroll(targetId) {
  const target = document.getElementById(targetId);
  if (!target) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function shuffleFeatured() {
  if (!popularResults.length) return;
  const randomIndex = Math.floor(Math.random() * popularResults.length);
  const selection = popularResults[randomIndex];
  featuredItem = selection;
  featuredCarouselIndex = randomIndex;
  setFeaturedItem(selection);
  updateMoreLikeThis();
  renderFeaturedCarousel();
  startFeaturedCarousel();
}

function toggleWatchlistItem(item) {
  const watchItem = typeof item === 'number' ? { id: item, type: 'movie' } : item;
  if (!watchItem || !watchItem.id) return;
  if (!watchItem.type) {
    watchItem.type = getContentType(watchItem);
  }
  const exists = isWatchlisted(watchItem.id, watchItem.type);
  if (exists) {
    watchlist = watchlist.filter(entry => !(entry.id === watchItem.id && entry.type === watchItem.type));
    showNotification('Watchlist', 'Removed from watchlist.');
  } else {
    watchlist.push({ id: watchItem.id, type: watchItem.type });
    showNotification('Watchlist', 'Added to your watchlist.');
  }
  localStorage.setItem(STORAGE_KEYS.watchlist, JSON.stringify(watchlist));
  updateWatchlist();

  if (featuredItem && featuredItem.id === watchItem.id && getContentType(featuredItem) === watchItem.type) {
    elements.featuredWatchlistButton.textContent = isWatchlisted(watchItem.id, watchItem.type) ? 'Remove from My List' : '+ My List';
  }
}

async function updateWatchlist() {
  elements.watchlistGrid.innerHTML = '';
  if (!watchlist.length) {
    elements.watchlistGrid.innerHTML = '<div class="section-note">Your watchlist is empty. Add titles while browsing.</div>';
    return;
  }
  for (const entry of watchlist) {
    try {
      const movie = await fetchJson(urls.details(entry.id, entry.type));
      elements.watchlistGrid.appendChild(createMovieCard(movie, 'watchlist-card'));
    } catch {
      // ignore missing item
    }
  }
}

function updateContinueWatching() {
  const entries = Object.values(continueWatching).sort((a, b) => b.lastUpdated - a.lastUpdated);
  elements.continueWatchingGrid.innerHTML = '';
  if (!entries.length) {
    elements.continueWatchingSection.style.display = 'none';
    return;
  }
  elements.continueWatchingSection.style.display = 'block';
  entries.forEach(entry => {
    const card = createMovieCard(entry.content, 'continue-card');
    elements.continueWatchingGrid.appendChild(card);
  });
}

function updateRecentlyViewed() {
  elements.recentlyViewed.innerHTML = '';
  if (!recentlyViewed.length) {
    elements.recentlyViewed.innerHTML = '<div class="section-note">Browse titles to populate your recently viewed list.</div>';
    return;
  }
  recentlyViewed.slice(0, 8).forEach(item => {
    elements.recentlyViewed.appendChild(createMovieCard(item, 'recent-card'));
  });
}

function updateStats() {
  const watchedCount = recentlyViewed.length;
  const watchlistCount = watchlist.length;
  const averageRating = Object.values(ratings).length ? (Object.values(ratings).reduce((sum, value) => sum + value, 0) / Object.values(ratings).length).toFixed(1) : 'N/A';
  const topRated = Object.entries(ratings).sort((a, b) => b[1] - a[1]).slice(0, 1);
  const topRatedText = topRated.length ? `Title ID ${topRated[0][0]} rated ${topRated[0][1]}` : 'No ratings yet';

  elements.statsGrid.innerHTML = `
    <div class="stat-card">
      <h3>${watchedCount}</h3>
      <p>Recently Viewed</p>
    </div>
    <div class="stat-card">
      <h3>${watchlistCount}</h3>
      <p>Watchlist Items</p>
    </div>
    <div class="stat-card">
      <h3>${averageRating}</h3>
      <p>Average Rating</p>
    </div>
    <div class="stat-card">
      <h3>${topRatedText}</h3>
      <p>Top rated item</p>
    </div>
  `;
}

function saveContinueWatching(id, content, progress = 0) {
  continueWatching[id] = {
    content,
    progress,
    lastUpdated: Date.now()
  };
  localStorage.setItem(STORAGE_KEYS.continueWatching, JSON.stringify(continueWatching));
  updateContinueWatching();
}

async function showMovieDetails(content, autoPlay = false) {
  const type = content.media_type || getContentType(content);
  const id = content.id;
  let details = content;
  try {
    details = await fetchJson(urls.details(id, type));
  } catch (error) {
    console.warn('Could not fetch full details, using available content', error);
    details = content;
  }

  recentlyViewed = [
    { id, ...details },
    ...recentlyViewed.filter(item => item.id !== id)
  ].slice(0, 12);
  localStorage.setItem(STORAGE_KEYS.recentlyViewed, JSON.stringify(recentlyViewed));
  updateRecentlyViewed();
  updateStats();

  const providersData = await fetchJson(urls.providers(id, type)).catch(() => ({}));
  const recommendationsData = await fetchJson(urls.recommendations(id, type)).catch(() => ({ results: [] }));
  const videosData = await fetchJson(urls.videos(id, type)).catch(() => ({ results: [] }));
  const creditsData = await fetchJson(urls.credits(id, type)).catch(() => ({ cast: [] }));

  const watchProviders = (providersData.results && providersData.results.US) ? providersData.results.US.flatrate || providersData.results.US.rent || [] : [];
  const trailer = (videosData.results || []).find(video => video.type === 'Trailer' && video.site === 'YouTube');
  const progressData = continueWatching[id] || null;
  const isTv = type === 'tv';
  const castList = (creditsData.cast || []).slice(0, 8);

  const poster = details.poster_path ? `${IMG_PATH}${details.poster_path}` : 'https://via.placeholder.com/480x720?text=No+Image';
  const title = details.title || details.name || 'Untitled';
  const releaseDate = details.release_date || details.first_air_date || 'Unknown';
  const genres = details.genres ? details.genres.map(genre => genre.name).join(', ') : 'N/A';
  const runtime = details.runtime ? `${details.runtime} min` : details.episode_run_time ? `${details.episode_run_time[0] || 0} min` : 'N/A';
  const voteAverage = details.vote_average ? details.vote_average.toFixed(1) : 'N/A';
  const seasonsText = details.number_of_seasons ? `${details.number_of_seasons} Seasons` : '';

  elements.modalContent.innerHTML = `
    <div class="modal-body">
      <div>
        <img class="modal-poster" src="${poster}" alt="${title}" />
      </div>
      <div class="modal-info">
        <div class="detail-meta">
          <span>${type.toUpperCase()}</span>
          <span>${releaseDate}</span>
          <span>${genres}</span>
          <span>${runtime}</span>
          <span>${voteAverage} ★</span>
          ${seasonsText ? `<span>${seasonsText}</span>` : ''}
        </div>
        <h2>${title}</h2>
        <p>${details.overview || 'No description available.'}</p>
        <div class="rating-stars" data-id="${id}">${renderStars(ratings[id] || 0)}</div>
        <div class="modal-buttons">
          <button class="primary-button" id="modalWatchlistButton">${isWatchlisted(id, type) ? 'Remove from Watchlist' : 'Add to Watchlist'}</button>
          <button class="secondary-button" id="modalContinueButton">${progressData ? 'Resume' : 'Start Watching'}</button>
          <button class="secondary-button" id="modalWatchNowButton">Watch Now</button>
          ${trailer ? `<button class="secondary-button" id="modalTrailerButton">Watch Trailer</button>` : ''}
          <button class="secondary-button" id="modalShareButton">Share</button>
        </div>
        ${renderPlayerSettings()}
        ${isTv ? renderEpisodeSelectors(details) : ''}
        <div class="player-box" id="playerBox"></div>
        <div class="player-meta-grid">
          <div class="watch-providers-section">
            <h3>Watch Providers</h3>
            <div class="provider-list">
              ${watchProviders.length ? watchProviders.map(provider => `<a href="#" class="secondary-button">${provider.provider_name}</a>`).join(' ') : '<p>No provider links available.</p>'}
            </div>
          </div>
          <div class="cast-section">
            <h3>Cast</h3>
            <div class="cast-list">
              ${castList.length ? castList.map(member => `<div class="cast-member"><span>${member.name}</span><small>${member.character || 'Cast'}</small></div>`).join('') : '<p>Cast information unavailable.</p>'}
            </div>
          </div>
        </div>
        <div class="comments-section">
          <h3>Comments</h3>
          <form class="comment-form" id="commentForm">
            <textarea placeholder="Add a comment..." rows="4"></textarea>
            <button type="submit" class="primary-button">Post Comment</button>
          </form>
          <div class="comment-list" id="comments-${id}"></div>
        </div>
      </div>
    </div>
    <section class="recommendations">
      <h3>Recommended for you</h3>
      <div class="recommendation-grid">
        ${recommendationsData.results.slice(0, 6).map(item => `
          <div class="recommendation-item" data-id="${item.id}">
            <img src="${item.poster_path ? IMG_PATH + item.poster_path : 'https://via.placeholder.com/300x450?text=No+Image'}" alt="${item.title || item.name}" />
            <p>${item.title || item.name}</p>
          </div>
        `).join('')}
      </div>
    </section>
  `;

  const modal = document.getElementById('movieModal');
  modal.classList.add('show');

  document.getElementById('modalWatchlistButton').addEventListener('click', () => {
    toggleWatchlistItem({ id, type });
    document.getElementById('modalWatchlistButton').textContent = isWatchlisted(id, type) ? 'Remove from Watchlist' : 'Add to Watchlist';
  });

  document.getElementById('modalContinueButton').addEventListener('click', () => {
    saveContinueWatching(id, details, progressData ? progressData.progress : 5);
    showNotification('Continue Watching', `${title} has been added to your resume list.`);
  });

  document.getElementById('modalWatchNowButton').addEventListener('click', () => {
    const seasonValue = document.getElementById('seasonSelect');
    const episodeValue = document.getElementById('episodeSelect');
    const season = seasonValue ? Number(seasonValue.value) : undefined;
    const episode = episodeValue ? Number(episodeValue.value) : undefined;
    loadAuthorizedPlayer(type, id, season, episode);
  });

  document.getElementById('modalShareButton').addEventListener('click', () => shareContent(title, id, type));

  const languageSelect = document.getElementById('languageSelect');
  const audioSelect = document.getElementById('audioSelect');
  const subtitleInput = document.getElementById('subtitleInput');
  const subtitleApplyButton = document.getElementById('subtitleApplyButton');
  const autonextToggle = document.getElementById('autonextToggle');
  const reloadPlayer = () => {
    const seasonValue = document.getElementById('seasonSelect');
    const episodeValue = document.getElementById('episodeSelect');
    const season = seasonValue ? Number(seasonValue.value) : undefined;
    const episode = episodeValue ? Number(episodeValue.value) : undefined;
    loadAuthorizedPlayer(type, id, season, episode);
  };
  if (languageSelect) {
    languageSelect.addEventListener('change', () => {
      PLAYER_SETTINGS.language = languageSelect.value;
      reloadPlayer();
      showNotification('Player settings', `Language set to ${languageSelect.options[languageSelect.selectedIndex].text}.`);
    });
  }
  if (audioSelect) {
    audioSelect.addEventListener('change', () => {
      PLAYER_SETTINGS.audio = audioSelect.value;
      reloadPlayer();
      showNotification('Player settings', `Audio track set to ${audioSelect.options[audioSelect.selectedIndex].text}.`);
    });
  }
  if (subtitleApplyButton) {
    subtitleApplyButton.addEventListener('click', () => {
      PLAYER_SETTINGS.subtitleUrl = subtitleInput.value.trim();
      reloadPlayer();
      showNotification('Player settings', PLAYER_SETTINGS.subtitleUrl ? 'Subtitle applied.' : 'Removed subtitles.');
    });
  }
  if (autonextToggle) {
    autonextToggle.addEventListener('change', () => {
      PLAYER_SETTINGS.autonext = autonextToggle.checked ? 1 : 0;
      reloadPlayer();
      showNotification('Player settings', `Autoplay next episode ${autonextToggle.checked ? 'enabled' : 'disabled'}.`);
    });
  }

  const seasonInput = document.getElementById('seasonSelect');
  if (seasonInput) {
    populateEpisodeSelector(id, Number(seasonInput.value));
    seasonInput.addEventListener('change', () => populateEpisodeSelector(id, Number(seasonInput.value)));
  }

  if (trailer) {
    document.getElementById('modalTrailerButton').addEventListener('click', () => {
      window.open(`https://www.youtube.com/watch?v=${trailer.key}`, '_blank');
    });
  }

  const initialSeasonValue = document.getElementById('seasonSelect');
  const initialEpisodeValue = document.getElementById('episodeSelect');
  const initialSeason = initialSeasonValue ? Number(initialSeasonValue.value) : undefined;
  const initialEpisode = initialEpisodeValue ? Number(initialEpisodeValue.value) : undefined;
  if (autoPlay || progressData) {
    loadAuthorizedPlayer(type, id, initialSeason, initialEpisode);
  }

  setupRatingStars(id);
  renderComments(id);
  document.getElementById(`commentForm`).addEventListener('submit', event => addComment(event, id));
  document.querySelectorAll('.recommendation-item').forEach(card => {
    card.addEventListener('click', () => {
      const selected = recommendationsData.results.find(result => result.id.toString() === card.dataset.id);
      if (selected) showMovieDetails(selected);
    });
  });

  if (currentUser === null) {
    document.getElementById('commentForm').querySelector('button').disabled = true;
    document.getElementById('commentForm').querySelector('textarea').placeholder = 'Sign in to post comments';
  }
}

async function shareContent(title, id, type) {
  const shareUrl = `${window.location.origin}${window.location.pathname}?title=${encodeURIComponent(id)}&type=${type}`;
  const shareData = {
    title: `${title} | TN STREAMING`,
    text: `Check out ${title} on TN STREAMING.`,
    url: shareUrl
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
      showNotification('Shared', `${title} is ready to share.`);
      return;
    }
    await navigator.clipboard.writeText(shareUrl);
    showNotification('Link copied', `${title} link copied to your clipboard.`);
  } catch (error) {
    if (error.name !== 'AbortError') showNotification('Share unavailable', 'Unable to share this title right now.');
  }
}

function renderStars(rating) {
  return Array.from({ length: 5 }, (_, index) => `<span class="star ${index < rating ? 'filled' : ''}" data-value="${index + 1}">★</span>`).join('');
}

function setupRatingStars(id) {
  const stars = document.querySelectorAll('.rating-stars .star');
  stars.forEach(star => {
    star.addEventListener('click', () => {
      const value = Number(star.dataset.value);
      ratings[id] = value;
      localStorage.setItem(STORAGE_KEYS.ratings, JSON.stringify(ratings));
      stars.forEach(element => element.classList.toggle('filled', Number(element.dataset.value) <= value));
      updateStats();
      showNotification('Rating', `You rated this title ${value} stars.`);
    });
  });
}

function renderComments(id) {
  const commentList = document.getElementById(`comments-${id}`);
  const existing = comments[id] || [];
  if (!commentList) return;
  if (!existing.length) {
    commentList.innerHTML = '<div class="section-note">No comments yet. Be the first to share your opinion.</div>';
    return;
  }
  commentList.innerHTML = existing.map(entry => `
    <div class="comment">
      <img src="${entry.avatar}" alt="Avatar" />
      <div><strong>${entry.user}</strong><p>${entry.message}</p></div>
    </div>
  `).join('');
}

function addComment(event, id) {
  event.preventDefault();
  if (!currentUser) {
    showNotification('Comment blocked', 'Please sign in before posting comments.');
    return;
  }
  const textarea = event.target.querySelector('textarea');
  const message = textarea.value.trim();
  if (!message) return;
  const entry = {
    user: currentUser.name,
    avatar: currentUser.avatar,
    message,
    createdAt: Date.now()
  };
  comments[id] = comments[id] || [];
  comments[id].unshift(entry);
  localStorage.setItem(STORAGE_KEYS.comments, JSON.stringify(comments));
  textarea.value = '';
  renderComments(id);
  showNotification('Comment added', 'Your comment has been posted.');
}

function openAuthModal() {
  elements.authModal.classList.add('show');
}

function closeAuthModal() {
  elements.authModal.classList.remove('show');
}

function switchAuthTab(tab) {
  elements.authTabs.forEach(button => {
    button.classList.toggle('active', button.dataset.tab === tab);
  });
  elements.loginForm.classList.toggle('hidden', tab !== 'login');
  elements.signupForm.classList.toggle('hidden', tab !== 'signup');
}

function updateAuthDisplay() {
  if (currentUser) {
    elements.authBtn.textContent = `Hi, ${currentUser.name}`;
    elements.authBtn.dataset.loggedIn = 'true';
  } else {
    elements.authBtn.textContent = 'Sign In';
    elements.authBtn.removeAttribute('data-logged-in');
  }
}

function signIn(event) {
  event.preventDefault();
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  const existing = users.find(user => user.email === email && user.password === password);
  if (!existing) {
    showNotification('Authentication failed', 'Invalid email or password.');
    return;
  }
  currentUser = existing;
  localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(currentUser));
  updateAuthDisplay();
  closeAuthModal();
  showNotification('Signed in', `Welcome back, ${currentUser.name}.`);
}

function signUp(event) {
  event.preventDefault();
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim().toLowerCase();
  const password = document.getElementById('signupPassword').value;
  const confirm = document.getElementById('signupConfirm').value;
  if (password !== confirm) {
    showNotification('Signup failed', 'Passwords do not match.');
    return;
  }
  if (users.some(user => user.email === email)) {
    showNotification('Signup failed', 'This email is already registered.');
    return;
  }
  const user = { name, email, password, avatar: avatars[0] };
  users.push(user);
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
  currentUser = user;
  localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(currentUser));
  updateAuthDisplay();
  closeAuthModal();
  showNotification('Account created', `Welcome, ${name}!`);
}

function openProfileModal() {
  elements.profileModal.classList.add('show');
  const activityCount = Object.keys(continueWatching).length;
  const ratedCount = Object.keys(ratings).length;
  elements.profileName.textContent = currentUser ? currentUser.name : 'Guest profile';
  elements.profileEmail.textContent = currentUser ? currentUser.email : 'Sign in to sync your streaming activity.';
  elements.profileAvatarPreview.innerHTML = currentUser?.avatar
    ? `<img src="${currentUser.avatar}" alt="Profile avatar" />`
    : '👤';
  elements.profileStats.innerHTML = `
    <div class="profile-stat"><strong>${watchlist.length}</strong><span>My List</span></div>
    <div class="profile-stat"><strong>${activityCount}</strong><span>In progress</span></div>
    <div class="profile-stat"><strong>${ratedCount}</strong><span>Rated</span></div>
  `;
  elements.signOutButton.classList.toggle('hidden', !currentUser);
  elements.avatarGrid.innerHTML = avatars.map(avatar => `
    <img src="${avatar}" class="${currentUser && currentUser.avatar === avatar ? 'selected' : ''}" data-avatar="${avatar}" />
  `).join('');
  document.querySelectorAll('#avatarGrid img').forEach(img => {
    img.addEventListener('click', () => {
      selectAvatar(img.dataset.avatar);
    });
  });
}

function selectAvatar(avatar) {
  if (!currentUser) {
    showNotification('Profile', 'Sign in to save your profile avatar.');
    return;
  }
  currentUser.avatar = avatar;
  localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(currentUser));
  users = users.map(user => user.email === currentUser.email ? currentUser : user);
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
  elements.profileModal.classList.remove('show');
  showNotification('Profile updated', 'Avatar changed successfully.');
}

function signOut() {
  currentUser = null;
  localStorage.removeItem(STORAGE_KEYS.currentUser);
  updateAuthDisplay();
  elements.profileModal.classList.remove('show');
  showNotification('Signed out', 'Your local viewing activity is still available.');
}

async function searchContent(query) {
  if (!query || !query.trim()) {
    showNotification('Search', 'Type a movie, show, or actor name to search.');
    return;
  }

  try {
    const data = await fetchJson(urls.search(query));
    const results = data.results || [];
    elements.popular.innerHTML = '';

    if (!results.length) {
      elements.popular.innerHTML = '<div class="section-note">No search results found. Try another term.</div>';
      return;
    }

    results.slice(0, 20).forEach(item => elements.popular.appendChild(createMovieCard(item)));
    document.getElementById('popular').scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    elements.popular.innerHTML = '<div class="section-note">Search service is unavailable. Please try again later.</div>';
    showNotification('Search failed', 'Unable to retrieve search results.');
  }
}

function showSearchSuggestions(query) {
  if (!query || !query.trim()) {
    elements.suggestions.style.display = 'none';
    return;
  }

  fetch(urls.search(query))
    .then(res => res.json())
    .then(data => {
      const results = data.results || [];
      if (!results.length) {
        elements.suggestions.style.display = 'none';
        return;
      }

      elements.suggestions.innerHTML = results.slice(0, 5).map(item => `
        <div class="search-suggestion" data-title="${item.title || item.name}">${item.title || item.name}</div>
      `).join('');
      elements.suggestions.style.display = 'block';
      document.querySelectorAll('.search-suggestion').forEach(item => {
        item.addEventListener('click', () => {
          elements.search.value = item.dataset.title;
          elements.suggestions.style.display = 'none';
          searchContent(item.dataset.title);
        });
      });
    })
    .catch(() => {
      elements.suggestions.style.display = 'none';
    });
}

function toggleTheme() {
  document.body.classList.toggle('light-theme');
  const light = document.body.classList.contains('light-theme');
  localStorage.setItem(STORAGE_KEYS.theme, light ? 'light' : 'dark');
  elements.themeToggle.textContent = light ? '🌙' : '☀️';
}

function persistSettings() {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(appSettings));
  localStorage.setItem('tn_playerSettings', JSON.stringify(PLAYER_SETTINGS));
}

function syncSettingsControls() {
  elements.settingsAutonext.checked = Boolean(PLAYER_SETTINGS.autonext);
  elements.settingsReducedMotion.checked = Boolean(appSettings.reducedMotion);
  elements.settingsDataSaver.checked = Boolean(appSettings.dataSaver);
  elements.settingsLanguage.value = PLAYER_SETTINGS.language;
  document.body.classList.toggle('reduced-motion', appSettings.reducedMotion);
  document.body.classList.toggle('data-saver', appSettings.dataSaver);
}

function openSettingsModal() {
  syncSettingsControls();
  elements.settingsModal.classList.add('show');
  elements.settingsModal.setAttribute('aria-hidden', 'false');
}

function closeSettingsModal() {
  elements.settingsModal.classList.remove('show');
  elements.settingsModal.setAttribute('aria-hidden', 'true');
}

function toggleCinemaMode() {
  const active = document.body.classList.toggle('cinema-mode');
  elements.cinemaToggle.textContent = active ? '×' : '◉';
  elements.cinemaToggle.title = active ? 'Exit Cinema Mode' : 'Toggle Cinema Mode';
  elements.cinemaToggle.setAttribute('aria-label', elements.cinemaToggle.title);
  showNotification(active ? 'Cinema Mode' : 'Browse Mode', active ? 'Focused viewing layout enabled.' : 'Full catalog restored.');
}

async function installApp() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const choice = await deferredInstallPrompt.userChoice;
  if (choice.outcome === 'accepted') showNotification('App installed', 'TN STREAMING is ready from your home screen.');
  deferredInstallPrompt = null;
  elements.installButton.hidden = true;
}

function checkOfflineStatus() {
  elements.offlineNotice.style.display = navigator.onLine ? 'none' : 'block';
}

async function openSharedTitle() {
  const params = new URLSearchParams(window.location.search);
  const sharedId = Number(params.get('title'));
  const sharedType = params.get('type');
  if (!Number.isInteger(sharedId) || sharedId <= 0 || !['movie', 'tv'].includes(sharedType)) return;

  await showMovieDetails({ id: sharedId, media_type: sharedType });
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js?v=4').catch(error => console.warn('SW registration failed', error));
  }
}

const catalogCategories = ['popular', 'topRated', 'trending', 'popularTv', 'latestReleases'];

function renderCatalogUnavailable(message) {
  catalogCategories.forEach(category => {
    if (elements[category]) elements[category].innerHTML = `<div class="section-note">${message}</div>`;
  });
}

async function loadCatalog() {
  if (!API_BASE.startsWith('/api/')) {
    await Promise.all(catalogCategories.map(category => updateCategory(category)));
    return;
  }

  try {
    const response = await fetch('/api/health');
    const health = await response.json();
    if (!response.ok || !health.tmdbConfigured) {
      renderCatalogUnavailable('Catalog setup is incomplete. Add TMDB_API_KEY to the server environment.');
      return;
    }
  } catch {
    renderCatalogUnavailable('The catalog service is unavailable. Start the backend and try again.');
    return;
  }

  await Promise.all(catalogCategories.map(category => updateCategory(category)));
}

function hideModalOnClick(event) {
  if (event.target === elements.modal) {
    elements.modal.classList.remove('show');
  }
}

function initialize() {
  elements = getElements();

  updateStats();
  updateWatchlist();
  updateContinueWatching();
  updateRecentlyViewed();
  updateAuthDisplay();
  elements.settingsLanguage.innerHTML = AUDIO_LANGUAGES.map(language => `<option value="${language.code}">${language.label}</option>`).join('');
  syncSettingsControls();
  registerServiceWorker();
  checkOfflineStatus();

  const savedTheme = localStorage.getItem(STORAGE_KEYS.theme);
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    elements.themeToggle.textContent = '🌙';
  }

  renderGenrePills();
  renderMoodPills();
  renderMoodGrid();
  loadCatalog();

  elements.featuredDetailsButton?.addEventListener('click', () => {
    if (featuredItem) showMovieDetails(featuredItem);
  });

  elements.featuredWatchNowButton?.addEventListener('click', () => {
    if (featuredItem) showMovieDetails(featuredItem, true);
  });

  elements.featuredShuffleButton?.addEventListener('click', () => {
    shuffleFeatured();
  });

  elements.featured?.addEventListener('mouseenter', pauseFeaturedCarousel);
  elements.featured?.addEventListener('mouseleave', startFeaturedCarousel);

  elements.featuredWatchlistButton?.addEventListener('click', () => {
    if (featuredItem) toggleWatchlistItem(featuredItem);
  });

  Array.from(elements.mainNavButtons || []).forEach(button => {
    button.addEventListener('click', () => {
      elements.mainNavButtons.forEach(btn => btn.classList.toggle('active', btn === button));
      handleNavigationScroll(button.dataset.target);
    });
  });

  elements.form.addEventListener('submit', event => {
    event.preventDefault();
    searchContent(elements.search.value);
  });

  elements.search.addEventListener('input', event => showSearchSuggestions(event.target.value));
  elements.search.addEventListener('blur', () => setTimeout(() => { elements.suggestions.style.display = 'none'; }, 180));

  elements.themeToggle.addEventListener('click', toggleTheme);
  elements.settingsBtn.addEventListener('click', openSettingsModal);
  elements.closeSettingsModal.addEventListener('click', closeSettingsModal);
  elements.settingsModal.addEventListener('click', event => {
    if (event.target === elements.settingsModal) closeSettingsModal();
  });
  elements.settingsAutonext.addEventListener('change', () => {
    PLAYER_SETTINGS.autonext = elements.settingsAutonext.checked ? 1 : 0;
    persistSettings();
  });
  elements.settingsReducedMotion.addEventListener('change', () => {
    appSettings.reducedMotion = elements.settingsReducedMotion.checked;
    persistSettings();
    syncSettingsControls();
  });
  elements.settingsDataSaver.addEventListener('change', () => {
    appSettings.dataSaver = elements.settingsDataSaver.checked;
    persistSettings();
    syncSettingsControls();
    showNotification('Data saver', appSettings.dataSaver ? 'New artwork will load lazily.' : 'Full artwork loading restored.');
  });
  elements.settingsLanguage.addEventListener('change', () => {
    PLAYER_SETTINGS.language = elements.settingsLanguage.value;
    persistSettings();
    showNotification('Player language', 'Your default language was saved.');
  });
  elements.installButton.addEventListener('click', installApp);
  elements.cinemaToggle.addEventListener('click', toggleCinemaMode);
  elements.watchlistBtn.addEventListener('click', () => {
    const visible = elements.watchlistSection.style.display !== 'none';
    elements.watchlistSection.style.display = visible ? 'none' : 'block';
  });
  elements.profileBtn.addEventListener('click', openProfileModal);
  elements.closeProfileModal.addEventListener('click', () => elements.profileModal.classList.remove('show'));
  elements.signOutButton.addEventListener('click', signOut);
  elements.profileModal.addEventListener('click', event => {
    if (event.target === elements.profileModal) elements.profileModal.classList.remove('show');
  });
  elements.closeModal.addEventListener('click', () => elements.modal.classList.remove('show'));
  elements.modal.addEventListener('click', hideModalOnClick);
  elements.closeAuthModal.addEventListener('click', closeAuthModal);
  elements.authBtn.addEventListener('click', openAuthModal);

  elements.authTabs.forEach(tab => {
    tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab));
  });

  elements.loginForm.addEventListener('submit', signIn);
  elements.signupForm.addEventListener('submit', signUp);
  elements.languageFilter.addEventListener('change', () => ['popular', 'topRated', 'trending', 'popularTv'].forEach(category => updateCategory(category)));
  elements.ratingFilter.addEventListener('change', () => ['popular', 'topRated', 'trending', 'popularTv'].forEach(category => updateCategory(category)));

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (document.body.classList.contains('cinema-mode')) toggleCinemaMode();
      elements.modal.classList.remove('show');
      closeAuthModal();
      elements.profileModal.classList.remove('show');
      closeSettingsModal();
    }
  });

  // Global keyboard shortcuts for modal player
  document.addEventListener('keydown', event => {
    if (event.key.toLowerCase() === 'c' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      toggleCinemaMode();
    }
    const modalOpen = elements.modal.classList.contains('show');
    if (!modalOpen) return;
    const seasonSel = document.getElementById('seasonSelect');
    const episodeSel = document.getElementById('episodeSelect');
    if (event.key === 'ArrowRight' && episodeSel) {
      episodeSel.value = Math.min(Number(episodeSel.value) + 1, Number(episodeSel.options[episodeSel.options.length - 1].value));
      episodeSel.dispatchEvent(new Event('change'));
      document.getElementById('modalWatchNowButton')?.click();
    }
    if (event.key === 'ArrowLeft' && episodeSel) {
      episodeSel.value = Math.max(Number(episodeSel.value) - 1, 1);
      episodeSel.dispatchEvent(new Event('change'));
      document.getElementById('modalWatchNowButton')?.click();
    }
    if (event.key.toLowerCase() === 's') {
      document.getElementById('subtitleInput')?.focus();
    }
    if (event.key.toLowerCase() === 'a') {
      document.getElementById('audioSelect')?.focus();
    }
  });

  window.addEventListener('online', checkOfflineStatus);
  window.addEventListener('offline', checkOfflineStatus);
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    elements.installButton.hidden = false;
  });
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    elements.installButton.hidden = true;
    showNotification('App ready', 'TN STREAMING is installed on this device.');
  });
  openSharedTitle();
}

document.addEventListener('DOMContentLoaded', () => {
  initialize();
});
