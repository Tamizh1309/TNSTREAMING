import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './react.css';

const API_BASE = '/api/tmdb';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 480 720%22%3E%3Crect width=%22480%22 height=%22720%22 fill=%22%2311131b%22/%3E%3C/svg%3E';

const moods = [
  { label: 'Action', query: 'action' },
  { label: 'Chill', query: 'romance' },
  { label: 'Mind Bender', query: 'thriller' },
  { label: 'Future', query: 'science fiction' },
  { label: 'Drama', query: 'drama' },
  { label: 'Fun', query: 'comedy' }
];

async function requestJson(path) {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

function getTitle(item) {
  return item.title || item.name || 'Untitled';
}

function getPoster(item) {
  return item.poster_path ? `${IMAGE_BASE}${item.poster_path}` : PLACEHOLDER;
}

function ContentCard({ item, onSelect, onToggleWatchlist, saved }) {
  return (
    <article className="react-card" onClick={() => onSelect(item)}>
      <div className="react-card-image">
        <img src={getPoster(item)} alt={getTitle(item)} loading="lazy" />
        <button
          className={`react-save ${saved ? 'is-saved' : ''}`}
          type="button"
          aria-label={saved ? `Remove ${getTitle(item)} from My List` : `Add ${getTitle(item)} to My List`}
          onClick={event => {
            event.stopPropagation();
            onToggleWatchlist(item);
          }}
        >
          {saved ? '★' : '+'}
        </button>
      </div>
      <div className="react-card-copy">
        <h3>{getTitle(item)}</h3>
        <span>{item.release_date?.slice(0, 4) || item.first_air_date?.slice(0, 4) || 'New'} · ★ {item.vote_average?.toFixed?.(1) || 'N/A'}</span>
      </div>
    </article>
  );
}

function App() {
  const [catalog, setCatalog] = useState({ trending: [], popular: [], topRated: [], tv: [] });
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeMood, setActiveMood] = useState('Action');
  const [watchlist, setWatchlist] = useState(() => JSON.parse(localStorage.getItem('tn_watchlist') || '[]'));
  const [theme, setTheme] = useState(() => localStorage.getItem('tn_theme') || 'dark');
  const [cinemaMode, setCinemaMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => localStorage.getItem('tn_reduced_motion') === 'true');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const watchlistIds = useMemo(() => new Set(watchlist.map(item => item.id)), [watchlist]);

  useEffect(() => {
    document.body.classList.toggle('light-theme', theme === 'light');
    document.body.classList.toggle('reduced-motion', reducedMotion);
    localStorage.setItem('tn_theme', theme);
    localStorage.setItem('tn_reduced_motion', String(reducedMotion));
  }, [theme, reducedMotion]);

  useEffect(() => {
    let active = true;
    async function loadCatalog() {
      try {
        const [trending, popular, topRated, tv] = await Promise.all([
          requestJson('/trending/movie/week'),
          requestJson('/discover/movie?page=1&sort_by=popularity.desc'),
          requestJson('/movie/top_rated?page=1&sort_by=vote_average.desc'),
          requestJson('/discover/tv?page=1&sort_by=popularity.desc')
        ]);
        if (active) setCatalog({ trending: trending.results || [], popular: popular.results || [], topRated: topRated.results || [], tv: tv.results || [] });
      } catch {
        if (active) setError('The catalog could not load. Check the backend and TMDB configuration.');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadCatalog();
    return () => { active = false; };
  }, []);

  async function runSearch(event) {
    event.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      const results = await requestJson(`/search/multi?query=${encodeURIComponent(searchQuery.trim())}`);
      setSearchResults(results.results || []);
    } catch {
      setError('Search is unavailable right now.');
    }
  }

  function toggleWatchlist(item) {
    setWatchlist(current => {
      const next = current.some(saved => saved.id === item.id)
        ? current.filter(saved => saved.id !== item.id)
        : [...current, { ...item, media_type: item.media_type || 'movie' }];
      localStorage.setItem('tn_watchlist', JSON.stringify(next));
      return next;
    });
  }

  function selectMood(mood) {
    setActiveMood(mood.label);
    setSearchQuery(mood.query);
  }

  const featured = catalog.trending[0];
  const heroStyle = featured?.backdrop_path ? { backgroundImage: `linear-gradient(90deg, rgba(3,3,6,.98), rgba(3,3,6,.35)), url(${IMAGE_BASE}${featured.backdrop_path})` } : undefined;
  const sections = [
    ['Trending Now', catalog.trending],
    ['Popular Movies', catalog.popular],
    ['Top Rated', catalog.topRated],
    ['Popular TV Shows', catalog.tv]
  ];

  return (
    <div className={`react-shell ${cinemaMode ? 'cinema-mode' : ''}`}>
      <header className="react-header">
        <div>
          <div className="react-logo">TN STREAMING</div>
          <p>Movies, shows and recommendations made for you</p>
        </div>
        <div className="react-actions">
          <form onSubmit={runSearch} className="react-search">
            <input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search titles, actors, genres..." aria-label="Search catalog" />
            <button type="submit">Search</button>
          </form>
          <button type="button" onClick={() => setSettingsOpen(true)} aria-label="Open settings">⚙</button>
          <button type="button" onClick={() => setCinemaMode(current => !current)} aria-label="Toggle Cinema Mode">◉</button>
          <button type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">{theme === 'dark' ? '☀' : '☾'}</button>
        </div>
      </header>

      {!cinemaMode && <nav className="react-nav" aria-label="Primary navigation">
        {['Home', 'Movies', 'TV Shows', 'My List', 'Live', 'Sports', 'Kids'].map(item => <a href={`#${item.toLowerCase().replaceAll(' ', '-')}`} key={item}>{item}</a>)}
      </nav>}

      <main>
        {error && <div className="react-alert" role="alert">{error}</div>}
        <section className="react-hero" style={heroStyle} id="home">
          <div className="react-hero-copy">
            <span className="react-kicker">Featured this week</span>
            <h1>{featured ? getTitle(featured) : 'Your next great watch'}</h1>
            <p>{featured?.overview || 'Discover movies and shows shaped around your mood, your list, and your time.'}</p>
            <div className="react-hero-actions">
              <button type="button" onClick={() => featured && setSelectedItem(featured)}>More info</button>
              {featured && <button type="button" className="ghost-button" onClick={() => toggleWatchlist(featured)}>{watchlistIds.has(featured.id) ? 'In My List' : '+ My List'}</button>}
            </div>
          </div>
        </section>

        <section className="react-section" id="moods">
          <div className="react-section-heading"><div><span className="react-kicker">Smart discovery</span><h2>Match your mood</h2></div><span>{activeMood}</span></div>
          <div className="react-moods">{moods.map(mood => <button className={activeMood === mood.label ? 'active' : ''} type="button" key={mood.label} onClick={() => selectMood(mood)}>{mood.label}</button>)}</div>
        </section>

        {searchResults.length > 0 && <section className="react-section"><div className="react-section-heading"><h2>Search results</h2><button type="button" onClick={() => setSearchResults([])}>Clear</button></div><div className="react-grid">{searchResults.map(item => <ContentCard key={`${item.media_type}-${item.id}`} item={item} onSelect={setSelectedItem} onToggleWatchlist={toggleWatchlist} saved={watchlistIds.has(item.id)} />)}</div></section>}

        {loading && <div className="react-loading">Loading your catalog...</div>}
        {!loading && sections.map(([title, items]) => <section className="react-section" id={title.toLowerCase().replaceAll(' ', '-')} key={title}><div className="react-section-heading"><h2>{title}</h2><span>{items.length} titles</span></div><div className="react-grid">{items.slice(0, 12).map(item => <ContentCard key={`${item.id}-${title}`} item={item} onSelect={setSelectedItem} onToggleWatchlist={toggleWatchlist} saved={watchlistIds.has(item.id)} />)}</div></section>)}
      </main>

      {selectedItem && <div className="react-overlay" role="presentation" onClick={() => setSelectedItem(null)}><article className="react-detail" role="dialog" aria-modal="true" aria-label={getTitle(selectedItem)} onClick={event => event.stopPropagation()}><button className="react-close" type="button" onClick={() => setSelectedItem(null)} aria-label="Close details">×</button><img src={getPoster(selectedItem)} alt={getTitle(selectedItem)} /><div><span className="react-kicker">{selectedItem.media_type || 'movie'}</span><h2>{getTitle(selectedItem)}</h2><p>{selectedItem.overview || 'Details are loading from the catalog.'}</p><button type="button" onClick={() => toggleWatchlist(selectedItem)}>{watchlistIds.has(selectedItem.id) ? 'Remove from My List' : 'Add to My List'}</button></div></article></div>}

      {settingsOpen && <div className="react-overlay" role="presentation" onClick={() => setSettingsOpen(false)}><article className="react-settings" role="dialog" aria-modal="true" aria-label="Settings" onClick={event => event.stopPropagation()}><button className="react-close" type="button" onClick={() => setSettingsOpen(false)} aria-label="Close settings">×</button><span className="react-kicker">Personalize</span><h2>Settings</h2><label><span>Reduce motion</span><input type="checkbox" checked={reducedMotion} onChange={event => setReducedMotion(event.target.checked)} /></label><label><span>Autoplay next episode</span><input type="checkbox" /></label><label><span>Data saver</span><input type="checkbox" /></label></article></div>}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
