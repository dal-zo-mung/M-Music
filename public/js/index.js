const API_URL = '/api';
const DEFAULT_COVER = 'images/music-logo.jpg';

const els = {
  songTitle: document.getElementById('songTitle'),
  artist: document.getElementById('artist'),
  releaseDate: document.getElementById('releaseDate'),
  songGenre: document.getElementById('songGenre'),
  albumCover: document.getElementById('albumCover'),
  youtubeLink: document.getElementById('youtubeLink'),
  lyricsText: document.getElementById('lyricsText'),
  searchbox: document.getElementById('searchbox'),
  searchbt: document.getElementById('searchbt'),
  searchResults: document.getElementById('searchResults'),
  spinner: document.getElementById('spinner'),
  prevBtn: document.getElementById('prevBtn'),
  nextBtn: document.getElementById('nextBtn'),
  copybt: document.getElementById('copybt'),
  autoScrollToggle: document.getElementById('autoScrollToggle'),
  lyricsContainer: document.getElementById('lyricsContainer'),
  cover: document.getElementById('albumCover')
};

const hasPlayerUI = Boolean(
  els.songTitle &&
  els.searchbox &&
  els.searchbt &&
  els.prevBtn &&
  els.nextBtn &&
  els.copybt &&
  els.autoScrollToggle &&
  els.lyricsContainer &&
  els.cover
);

let allSongs = [];
let currentIndex = 0;
let autoScroll = false;
let autoScrollInterval = null;
let scrollSpeed = 10;
let currentUser = null;
let searchRequestId = 0;
let songRequestId = 0;

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: {
      'Accept': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

async function fetchCurrentUser() {
  try {
    const payload = await fetchJson('/api/me');
    return payload?.authenticated && payload.user ? payload.user : null;
  } catch (error) {
    console.warn('Unable to fetch current user', error);
    return null;
  }
}

function setTheme(mode) {
  const lightBtn = document.getElementById('lightModeBtn');
  const darkBtn = document.getElementById('darkModeBtn');

  if (mode === 'dark') {
    document.body.classList.add('dark-mode');
    localStorage.setItem('theme', 'dark');
    darkBtn?.classList.add('dark-active');
    lightBtn?.classList.remove('light-active');
    return;
  }

  document.body.classList.remove('dark-mode');
  localStorage.setItem('theme', 'light');
  lightBtn?.classList.add('light-active');
  darkBtn?.classList.remove('dark-active');
}

function setupThemeControls() {
  document.querySelectorAll('[data-theme]').forEach((button) => {
    button.addEventListener('click', () => {
      setTheme(button.dataset.theme);
    });
  });
}

function setMenuOpen(open) {
  const menuPanel = document.getElementById('menu-panel');
  const menuButton = document.getElementById('menuToggleButton');

  if (!menuPanel || !menuButton) return;

  menuPanel.style.display = open ? 'block' : 'none';
  menuButton.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function changeFontSize(size) {
  const fontSize = parseInt(size, 10) || 18;
  if (els.lyricsText) {
    els.lyricsText.style.fontSize = `${fontSize}px`;
  }
}

function changeScrollSpeed(value) {
  scrollSpeed = parseInt(value, 10) || 10;
  if (autoScroll) {
    startAutoScroll();
  }
}

function formatLyrics(lyricArray) {
  if (!lyricArray) return '';
  if (Array.isArray(lyricArray)) return lyricArray.join('\n');
  return String(lyricArray);
}

function setLoading(on) {
  if (!els.spinner) return;
  els.spinner.classList.toggle('hidden', !on);
}

function getSafeHref(rawValue) {
  try {
    const url = new URL(String(rawValue || '').trim(), window.location.origin);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '#';
  } catch {
    return '#';
  }
}

function getSafeImageSrc(rawValue) {
  try {
    const url = new URL(String(rawValue || '').trim(), window.location.origin);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : DEFAULT_COVER;
  } catch {
    return DEFAULT_COVER;
  }
}

function renderSong(song) {
  if (!song || !hasPlayerUI) return;

  els.songTitle.textContent = song['Song Title'] || 'Untitled';
  els.artist.textContent = song.Artist ? `Artist: ${song.Artist}` : '-';
  els.releaseDate.textContent = song['Released Date'] ? `Released: ${song['Released Date']}` : '-';
  els.songGenre.textContent = song['About Song'] || '-';
  els.lyricsText.textContent = formatLyrics(song.Lyric);

  const youtubeHref = getSafeHref(song['Direct to YT']);
  els.youtubeLink.href = youtubeHref;
  els.youtubeLink.setAttribute('aria-disabled', youtubeHref === '#' ? 'true' : 'false');

  const coverCandidate = getSafeImageSrc(song.albumCover);
  const tester = new Image();
  tester.onload = () => {
    els.cover.src = tester.src;
  };
  tester.onerror = () => {
    els.cover.src = DEFAULT_COVER;
  };
  tester.src = coverCandidate;
}

async function loadAllSongs() {
  try {
    setLoading(true);
    const songs = await fetchJson(`${API_URL}/songs?limit=100`);
    allSongs = Array.isArray(songs) ? songs : [];

    if (allSongs.length > 0) {
      currentIndex = 0;
      await loadSongByIndex(currentIndex);
    } else if (hasPlayerUI) {
      els.songTitle.textContent = 'No songs found';
      els.lyricsText.textContent = '';
      els.searchResults?.replaceChildren();
    }
  } catch (error) {
    console.error('Failed to load songs:', error);
    if (hasPlayerUI) {
      els.songTitle.textContent = 'Failed to load songs';
      els.lyricsText.textContent = 'Please try again later.';
    }
  } finally {
    setLoading(false);
  }
}

async function loadSongById(id) {
  const requestId = ++songRequestId;

  try {
    setLoading(true);
    const song = await fetchJson(`${API_URL}/songs/${encodeURIComponent(id)}`);
    if (requestId !== songRequestId) return;
    renderSong(song);
  } catch (error) {
    console.error('loadSongById error:', error);
    if (hasPlayerUI) {
      els.songTitle.textContent = 'Failed to load song';
    }
  } finally {
    if (requestId === songRequestId) {
      setLoading(false);
    }
  }
}

async function loadSongByIndex(index) {
  if (!allSongs.length) {
    return;
  }

  const normalizedIndex = ((index % allSongs.length) + allSongs.length) % allSongs.length;
  const song = allSongs[normalizedIndex];

  if (!song || !song._id) {
    console.error('Invalid song at index', normalizedIndex, song);
    return;
  }

  currentIndex = normalizedIndex;
  await loadSongById(song._id);
}

function renderSearchResults(songs) {
  if (!els.searchResults) return;

  els.searchResults.replaceChildren();
  allSongs = Array.isArray(songs) ? songs : [];

  if (!songs || songs.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'search-result';
    emptyState.textContent = 'No results';
    els.searchResults.appendChild(emptyState);
    return;
  }

  songs.forEach((song) => {
    const result = document.createElement('div');
    result.className = 'search-result';

    const title = document.createElement('h4');
    title.textContent = song['Song Title'] || 'No title';

    const meta = document.createElement('p');
    const metaParts = [];
    if (song.Artist) metaParts.push(song.Artist);
    if (song['About Song']) metaParts.push(song['About Song']);
    meta.textContent = metaParts.join(' - ');

    result.append(title, meta);
    result.addEventListener('click', async () => {
      const foundIndex = allSongs.findIndex((item) => item._id === song._id);
      currentIndex = foundIndex >= 0 ? foundIndex : 0;
      await loadSongByIndex(currentIndex);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    els.searchResults.appendChild(result);
  });
}

async function searchSongs(query, { autoOpenFirst = false } = {}) {
  const trimmedQuery = (query || '').trim();

  if (!trimmedQuery) {
    if (els.searchResults) {
      els.searchResults.replaceChildren();
    }
    await loadAllSongs();
    return;
  }

  const requestId = ++searchRequestId;

  try {
    setLoading(true);
    const songs = await fetchJson(`${API_URL}/songs/search?q=${encodeURIComponent(trimmedQuery)}&limit=50`);
    if (requestId !== searchRequestId) return;

    renderSearchResults(songs);
    if (autoOpenFirst && Array.isArray(songs) && songs.length > 0) {
      currentIndex = 0;
      await loadSongByIndex(0);
    }
  } catch (error) {
    console.error('searchSongs error:', error);
    if (requestId === searchRequestId) {
      renderSearchResults([]);
    }
  } finally {
    if (requestId === searchRequestId) {
      setLoading(false);
    }
  }
}

async function copyLyrics() {
  try {
    await navigator.clipboard.writeText(els.lyricsText?.textContent || '');
    window.alert('Lyrics copied to clipboard');
  } catch (error) {
    console.error('copy failed', error);
    window.alert('Copy failed');
  }
}

function startAutoScroll() {
  clearInterval(autoScrollInterval);

  const clamped = Math.max(1, Math.min(40, scrollSpeed));
  const step = 0.5 + ((clamped - 1) * 1 / 39);
  const interval = 300 - ((clamped - 1) * 140 / 39);

  autoScrollInterval = setInterval(() => {
    els.lyricsContainer?.scrollBy({ top: step, left: 0, behavior: 'smooth' });
  }, interval);
}

function setAutoScroll(on) {
  autoScroll = Boolean(on);
  if (els.autoScrollToggle) {
    els.autoScrollToggle.textContent = `Auto-scroll: ${autoScroll ? 'ON' : 'OFF'}`;
  }

  if (autoScroll) {
    startAutoScroll();
  } else {
    clearInterval(autoScrollInterval);
    autoScrollInterval = null;
  }
}

function setupPlayerEventListeners() {
  els.searchbt.addEventListener('click', () => {
    searchSongs(els.searchbox.value);
  });

  els.searchbox.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      searchSongs(els.searchbox.value);
    }
  });

  els.prevBtn.addEventListener('click', async () => {
    await loadSongByIndex(currentIndex - 1);
  });

  els.nextBtn.addEventListener('click', async () => {
    await loadSongByIndex(currentIndex + 1);
  });

  els.copybt.addEventListener('click', copyLyrics);
  els.autoScrollToggle.addEventListener('click', () => setAutoScroll(!autoScroll));

  const fontSlider = document.getElementById('fontSlider');
  if (fontSlider) {
    fontSlider.addEventListener('input', (event) => changeFontSize(event.target.value));
  }

  const scrollSpeedSlider = document.getElementById('scrollSpeedSlider');
  if (scrollSpeedSlider) {
    scrollSpeedSlider.addEventListener('input', (event) => changeScrollSpeed(event.target.value));
  }

  window.addEventListener('keydown', async (event) => {
    const targetTag = event.target?.tagName;
    if (targetTag === 'INPUT' || targetTag === 'TEXTAREA') {
      return;
    }

    if (event.key === 'ArrowLeft') {
      await loadSongByIndex(currentIndex - 1);
    }

    if (event.key === 'ArrowRight') {
      await loadSongByIndex(currentIndex + 1);
    }
  });
}

function getUserLabel(user) {
  if (!user) return '';

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return user.username || user.displayName || fullName || 'User';
}

function setAvatar(element, username, profileImage) {
  element.replaceChildren();

  if (profileImage && profileImage.trim().length > 0) {
    const img = document.createElement('img');
    img.src = getSafeImageSrc(profileImage);
    img.alt = `${username || 'User'} profile`;
    element.appendChild(img);
    return;
  }

  const firstLetter = username ? username.trim().charAt(0).toUpperCase() : '?';
  element.textContent = firstLetter;
}

function updateAuthUI(user) {
  const authBtn = document.getElementById('authBtn');
  const authLink = authBtn?.closest('a');
  const userProfile = document.getElementById('userProfile');
  const avatar = document.getElementById('avatar');
  const usernameEl = document.getElementById('username');
  const dropdownUsername = document.getElementById('dropdownUsername');
  const profileDropdown = document.getElementById('profileDropdown');
  const displayName = getUserLabel(user);

  if (user && displayName) {
    if (authLink) {
      authLink.style.display = 'none';
      authLink.classList.add('hidden');
    }

    if (authBtn) {
      authBtn.style.display = 'none';
      authBtn.classList.add('hidden');
    }

    if (userProfile) {
      userProfile.classList.remove('hidden');
      userProfile.style.display = 'flex';
    }

    if (avatar) setAvatar(avatar, displayName, user.profileImage || '');
    if (usernameEl) usernameEl.textContent = displayName;
    if (dropdownUsername) dropdownUsername.textContent = displayName;
    if (profileDropdown) profileDropdown.classList.add('hidden');
    return;
  }

  if (authLink) {
    authLink.style.display = '';
    authLink.classList.remove('hidden');
  }

  if (authBtn) {
    authBtn.style.display = '';
    authBtn.classList.remove('hidden');
  }

  if (userProfile) {
    userProfile.classList.add('hidden');
    userProfile.style.display = 'none';
  }

  if (avatar) avatar.replaceChildren();
  if (usernameEl) usernameEl.textContent = '';
  if (dropdownUsername) dropdownUsername.textContent = '';
}

async function syncAuthUI() {
  currentUser = await fetchCurrentUser();
  updateAuthUI(currentUser);
}

function setAuthReturnToUrls() {
  const returnTo = window.location.pathname + window.location.search;
  const authAnchor = document.querySelector('#authBtn')?.closest('a');
  if (!authAnchor) return;

  const url = new URL(authAnchor.href, window.location.origin);
  url.searchParams.set('returnTo', returnTo);
  authAnchor.href = `${url.pathname}${url.search}${url.hash}`;
}

function setupAuthInteractions() {
  const userProfile = document.getElementById('userProfile');
  const profileDropdown = document.getElementById('profileDropdown');
  const logoutBtn = document.getElementById('logoutBtn');

  userProfile?.addEventListener('click', (event) => {
    event.stopPropagation();
    if (!profileDropdown) return;
    profileDropdown.classList.toggle('hidden');
  });

  logoutBtn?.addEventListener('click', async () => {
    try {
      await fetchJson(`${API_URL}/logout`, {
        method: 'POST'
      });

      currentUser = null;
      updateAuthUI(null);
      window.location.reload();
    } catch (error) {
      console.error('logout failed:', error);
      window.alert('Logout failed. Please try again.');
    }
  });

  window.addEventListener('click', () => {
    if (profileDropdown) profileDropdown.classList.add('hidden');
  });

  profileDropdown?.addEventListener('click', (event) => {
    event.stopPropagation();
  });
}

function setupMenuInteractions() {
  const menuPanel = document.getElementById('menu-panel');
  const menuButton = document.getElementById('menuToggleButton');

  if (!menuPanel || !menuButton) return;

  menuButton.addEventListener('click', (event) => {
    event.stopPropagation();
    setMenuOpen(menuPanel.style.display !== 'block');
  });

  menuPanel.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  window.addEventListener('click', (event) => {
    if (menuPanel.style.display !== 'block') return;
    if (menuPanel.contains(event.target) || menuButton.contains(event.target)) return;
    setMenuOpen(false);
  });
}

function setupIndexPage() {
  const startSearchBtn = document.getElementById('startSearchBtn');

  const navigateToLyrics = (query) => {
    const trimmed = (query || '').trim();
    if (!trimmed) {
      els.searchbox?.focus();
      return;
    }

    window.location.href = `./lyrics.html?q=${encodeURIComponent(trimmed)}`;
  };

  startSearchBtn?.addEventListener('click', () => {
    els.searchbox?.focus();
    els.searchbox?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  els.searchbt?.addEventListener('click', () => {
    navigateToLyrics(els.searchbox?.value);
  });

  els.searchbox?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      navigateToLyrics(els.searchbox?.value);
    }
  });
}

(async function init() {
  const savedTheme = localStorage.getItem('theme');
  setTheme(savedTheme === 'dark' ? 'dark' : 'light');

  setupThemeControls();
  setupAuthInteractions();
  setupMenuInteractions();
  setAuthReturnToUrls();

  currentUser = await fetchCurrentUser();
  updateAuthUI(currentUser);
  window.addEventListener('focus', () => {
    syncAuthUI();
  });

  if (!hasPlayerUI) {
    setupIndexPage();
    return;
  }

  els.cover.onerror = function onCoverError() {
    if (this.src !== DEFAULT_COVER) {
      this.src = DEFAULT_COVER;
    }
  };

  setupPlayerEventListeners();
  setAutoScroll(false);
  syncAuthUI();

  const initialQuery = new URLSearchParams(window.location.search).get('q');
  if (initialQuery) {
    els.searchbox.value = initialQuery;
    await searchSongs(initialQuery, { autoOpenFirst: true });
  } else {
    await loadAllSongs();
  }
})();
