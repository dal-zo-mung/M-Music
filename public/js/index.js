const API_URL = '/api';

async function fetchCurrentUser() {
  try {
    const response = await fetch('/api/me', { credentials: 'same-origin' });
    if (!response.ok) return null;
    const data = await response.json();
    if (data?.authenticated && data.user) {
      return data.user;
    }
    const localUser = localStorage.getItem('mMusicUser');
    if (localUser) {
      return JSON.parse(localUser);
    }
    return null;
  } catch (error) {
    console.warn('Unable to fetch current user', error);
    const localUser = localStorage.getItem('mMusicUser');
    return localUser ? JSON.parse(localUser) : null;
  }
}

function toggleMenu(forceState) {
  const panel = document.getElementById('menu-panel');
  const menuButton = document.getElementById('menuButton');
  if (!panel) return;

  const shouldOpen = typeof forceState === 'boolean'
    ? forceState
    : panel.style.display !== 'block';

  panel.style.display = shouldOpen ? 'block' : 'none';
  menuButton?.setAttribute('aria-expanded', String(shouldOpen));
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

const DEFAULT_COVER = 'images/music-logo.jpg';

let allSongs = [];
let currentIndex = 0;
let autoScroll = false;
let autoScrollInterval = null;
let scrollSpeed = 10;
let currentUser = null;

function changeFontSize(size) {
  const fontSize = parseInt(size, 10) || 18;
  if (els.lyricsText) {
    els.lyricsText.style.fontSize = `${fontSize}px`;
  }
}

function formatLyrics(lyricArray) {
  if (!lyricArray) return '';
  if (Array.isArray(lyricArray)) return lyricArray.join('\n');
  return String(lyricArray);
}

function setLoading(on) {
  if (!els.spinner) return;
  if (on) {
    els.spinner.classList.remove('hidden');
  } else {
    els.spinner.classList.add('hidden');
  }
}

function renderSong(song) {
  if (!song) return;

  els.songTitle.textContent = song['Song Title'] || 'Untitled';
  els.artist.textContent = song.Artist ? `Artist: ${song.Artist}` : '-';
  els.releaseDate.textContent = song['Released Date'] ? `Released: ${song['Released Date']}` : '-';
  els.songGenre.textContent = song['About Song'] || '-';
  els.youtubeLink.href = song['Direct to YT'] || '#';
  els.lyricsText.textContent = formatLyrics(song.Lyric);

  const rawCover = song.albumCover && String(song.albumCover).trim();
  if (!rawCover) {
    els.cover.src = DEFAULT_COVER;
    return;
  }

  let candidate = rawCover.replace(/\\/g, '/');
  try {
    candidate = new URL(candidate, window.location.origin).href;
  } catch (error) {
    candidate = rawCover;
  }

  const tester = new Image();
  tester.onload = () => {
    els.cover.src = tester.src;
  };
  tester.onerror = () => {
    els.cover.src = DEFAULT_COVER;
  };
  tester.src = candidate;
}

async function loadAllSongs() {
  try {
    setLoading(true);
    const response = await fetch(`${API_URL}/songs`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const songs = await response.json();
    allSongs = Array.isArray(songs) ? songs : [];

    if (allSongs.length > 0) {
      currentIndex = 0;
      await loadSongByIndex(currentIndex);
    } else {
      els.songTitle.textContent = 'No songs found';
      els.lyricsText.textContent = '';
    }
  } catch (error) {
    console.error('Failed to load all songs:', error);
    els.songTitle.textContent = 'Failed to load songs';
  } finally {
    setLoading(false);
  }
}

async function loadSongByIndex(index) {
  if (!allSongs.length) {
    console.warn('No songs loaded; cannot change index.');
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

function changeSongBy(delta) {
  if (!allSongs.length) {
    console.warn('No song list yet, ignoring next/previous.');
    return;
  }

  loadSongByIndex(currentIndex + delta);
}

async function loadSongById(id) {
  try {
    setLoading(true);
    const response = await fetch(`${API_URL}/songs/${id}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const song = await response.json();
    renderSong(song);
  } catch (error) {
    console.error('loadSongById error:', error);
  } finally {
    setLoading(false);
  }
}

async function searchSongs(query) {
  const trimmedQuery = (query || '').trim();

  if (!trimmedQuery) {
    // When query is empty, load default song list rather than search in local data.
    await loadAllSongs();
    return;
  }

  try {
    const response = await fetch(`${API_URL}/songs/search/${encodeURIComponent(trimmedQuery)}?limit=50`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const songs = await response.json();
    renderSearchResults(songs);
  } catch (error) {
    console.error('searchSongs error:', error);
    renderSearchResults([]);
  }
}

function renderSearchResults(songs) {
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
      if (foundIndex >= 0) {
        currentIndex = foundIndex;
      } else {
        allSongs.unshift(song);
        currentIndex = 0;
      }

      await loadSongByIndex(currentIndex);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    els.searchResults.appendChild(result);
  });
}

async function copyLyrics() {
  try {
    await navigator.clipboard.writeText(els.lyricsText.textContent || '');
    window.alert('Lyrics copied to clipboard');
  } catch (error) {
    console.error('copy failed', error);
    window.alert('Copy failed');
  }
}

function startAutoScroll() {
  clearInterval(autoScrollInterval);

  // Ultra-slow auto-scroll for very relaxed lyric reading.
  // scrollSpeed 1..40 maps to 0.5..1.5 pixels per tick, tick interval 300ms..160ms.
  const clamped = Math.max(1, Math.min(40, scrollSpeed));
  const step = 0.5 + ((clamped - 1) * 1 / 39); // 0.5..1.5 px
  const interval = 300 - ((clamped - 1) * 140 / 39); // 300..160 ms

  autoScrollInterval = setInterval(() => {
    els.lyricsContainer.scrollBy({ top: step, left: 0, behavior: 'smooth' });
  }, interval);
}

function setAutoScroll(on) {
  autoScroll = Boolean(on);
  els.autoScrollToggle.textContent = `Auto-scroll: ${autoScroll ? 'ON' : 'OFF'}`;

  if (autoScroll) {
    startAutoScroll();
  } else {
    clearInterval(autoScrollInterval);
    autoScrollInterval = null;
  }
}

function changeScrollSpeed(value) {
  scrollSpeed = parseInt(value, 10) || 10;
  if (autoScroll) {
    startAutoScroll();
  }
}

function setupEventListeners() {
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

async function syncAuthUI() {
  try {
    const response = await fetch(`${API_URL}/me`, {
      credentials: 'same-origin'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    currentUser = payload.authenticated ? payload.user : null;
  } catch (error) {
    console.error('syncAuthUI error:', error);
    currentUser = null;
  }

  updateAuthUI(currentUser);
}

function setAvatar(element, username, profileImage) {
  element.replaceChildren();

  if (profileImage && profileImage.trim().length > 0) {
    const img = document.createElement('img');
    img.src = profileImage;
    img.alt = `${username || 'User'} profile`;   
    element.appendChild(img);
    return;
  }

  const firstLetter = username ? username.trim().charAt(0).toUpperCase() : '?';
  element.textContent = firstLetter;
}

function setProfileMenuOpen(isOpen) {
  const userProfile = document.getElementById('userProfile');
  const profileDropdown = document.getElementById('profileDropdown');

  if (!userProfile || !profileDropdown) return;

  profileDropdown.classList.toggle('hidden', !isOpen);
  userProfile.setAttribute('aria-expanded', String(isOpen));
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

    if (profileDropdown) {
      profileDropdown.classList.add('hidden');
      userProfile?.setAttribute('aria-expanded', 'false');
    }
  } else {
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
    userProfile?.setAttribute('aria-expanded', 'false');

  }
}

function setAuthReturnToUrls() {
  const returnTo = window.location.pathname + window.location.search;
  const authAnchor = document.querySelector('#authBtn')?.closest('a');
  if (authAnchor) {
    const url = new URL(authAnchor.href, window.location.origin);
    url.searchParams.set('returnTo', returnTo);
    authAnchor.href = url.toString();
  }
}

function setupIndexPage() {
  const startSearchBtn = document.getElementById('startSearchBtn');

  const safeRedirect = (query) => {
    const trimmed = (query || '').trim();
    if (!trimmed) {
      if (els.searchbox) {
        els.searchbox.focus();
      }
      return;
    }
    window.location.href = `./lyrics.html?q=${encodeURIComponent(trimmed)}`;
  };

  startSearchBtn?.addEventListener('click', () => {
    if (els.searchbox) {
      els.searchbox.focus();
      els.searchbox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  els.searchbt?.addEventListener('click', () => {
    safeRedirect(els.searchbox?.value);
  });

  els.searchbox?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      safeRedirect(els.searchbox?.value);
    }
  });
}

function setupAuthInteractions() {
  const userProfile = document.getElementById('userProfile');
  const profileDropdown = document.getElementById('profileDropdown');
  const logoutBtn = document.getElementById('logoutBtn');

  const toggleProfileMenu = (event) => {
    event.stopPropagation();
    if (!profileDropdown || userProfile?.classList.contains('hidden')) return;
    const shouldOpen = profileDropdown.classList.contains('hidden');
    setProfileMenuOpen(shouldOpen);
  };

  userProfile?.addEventListener('click', toggleProfileMenu);
  userProfile?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleProfileMenu(event);
    }

    if (event.key === 'Escape') {
      setProfileMenuOpen(false);
    }
  });

  logoutBtn?.addEventListener('click', async () => {
    try {
      const response = await fetch(`${API_URL}/logout`, {
        method: 'POST',
        credentials: 'same-origin'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      currentUser = null;
      updateAuthUI(null);
    } catch (error) {
      console.error('logout failed:', error);
      window.alert('Logout failed. Please try again.');
    }
  });

  window.addEventListener('click', () => {
    setProfileMenuOpen(false);
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setProfileMenuOpen(false);
    }
  });

  profileDropdown?.addEventListener('click', (event) => {
    event.stopPropagation();
  });
}

function setupMenuInteractions() {
  const menuPanel = document.getElementById('menu-panel');
  const menuButton = document.getElementById('menuButton');

  if (!menuPanel || !menuButton) return;

  // clicking inside the menu panel should not close it
  menuPanel.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  // close menu when clicking outside (including the rest of the page)
  window.addEventListener('click', (event) => {
    if (menuPanel.style.display !== 'block') return;

    const target = event.target;
    if (menuPanel.contains(target) || menuButton.contains(target)) {
      // click is inside menu panel or on the menu button itself -> keep open/toggle button handles it
      return;
    }

    // click outside menu -> close
    toggleMenu(false);
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuPanel.style.display === 'block') {
      toggleMenu(false);
      menuButton.focus();
    }
  });
}

(async function init() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    setTheme(savedTheme);
  } else {
    setTheme('light');
  }

  setupAuthInteractions();
  setupMenuInteractions();
  setAuthReturnToUrls();

  currentUser = await fetchCurrentUser();
  if (currentUser) {
    localStorage.setItem('mMusicUser', JSON.stringify(currentUser));
  }
  updateAuthUI(currentUser);

  // Ensure auth state stays current if user returns from login flow.
  window.addEventListener('focus', syncAuthUI);

  if (!hasPlayerUI) {
    setupIndexPage();
    return;
  }

  els.cover.onerror = function onCoverError() {
    if (this.src !== DEFAULT_COVER) this.src = DEFAULT_COVER;
  };

  setupEventListeners();
  setAutoScroll(false);
  syncAuthUI();

  const initialQuery = new URLSearchParams(window.location.search).get('q');
  if (initialQuery) {
    els.searchbox.value = initialQuery;
    searchSongs(initialQuery);
  } else {
    loadAllSongs();
  }
})();
