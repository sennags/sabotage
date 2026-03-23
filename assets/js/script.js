const searchForm = document.getElementById("spotify-search");
const queryInput = document.getElementById("query");
const topbar = document.querySelector(".topbar");
const hero = document.getElementById("inicio");
const statusEl = document.getElementById("spotify-status");
const resultsEl = document.getElementById("spotify-results");
const spotifyClientId = document.querySelector('meta[name="spotify-client-id"]')?.content?.trim();

const SPOTIFY_AUTH_BASE = "https://accounts.spotify.com";
const SPOTIFY_API_BASE = "https://api.spotify.com/v1";
const REDIRECT_URI = `${window.location.origin}${window.location.pathname}`;
const STORAGE_KEY = "spotify_auth_data";
const QUERY_KEY = "spotify_pending_query";

const setStatus = (message = "") => {
  if (statusEl) {
    statusEl.textContent = message;
  }
};

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const readAuthData = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveAuthData = (data) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

const clearAuthData = () => {
  window.localStorage.removeItem(STORAGE_KEY);
};

const randomString = (length) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
};

const sha256 = async (value) => {
  const buffer = new TextEncoder().encode(value);
  return crypto.subtle.digest("SHA-256", buffer);
};

const base64UrlEncode = (buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)))
  .replace(/\+/g, "-")
  .replace(/\//g, "_")
  .replace(/=+$/g, "");

const renderItems = (items) => {
  if (!resultsEl) {
    return;
  }

  if (!items.length) {
    resultsEl.innerHTML = "";
    setStatus("Nenhum resultado encontrado.");
    return;
  }

  resultsEl.innerHTML = items.map((item) => {
    const images = item.album?.images ?? [];
    const imageUrl = images.length ? images[images.length - 1].url : "";
    const artists = item.artists?.map((artist) => artist.name).join(", ") || "Artista";

    return `
      <a class="spotify-item" href="${escapeHtml(item.external_urls.spotify)}" target="_blank" rel="noopener noreferrer">
        <img src="${escapeHtml(imageUrl)}" alt="Capa de ${escapeHtml(item.name)}" loading="lazy" decoding="async">
        <div>
          <p class="title">${escapeHtml(item.name)}</p>
          <p class="meta">${escapeHtml(artists)}</p>
        </div>
      </a>
    `;
  }).join("");
};

const searchSpotify = async (query, token) => {
  const params = new URLSearchParams({
    q: query,
    type: "track",
    limit: "6",
    market: "BR",
  });

  const response = await fetch(`${SPOTIFY_API_BASE}/search?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("search_error");
  }

  const data = await response.json();
  return data.tracks?.items ?? [];
};

const exchangeCodeForToken = async (code, verifier) => {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    client_id: spotifyClientId,
    code_verifier: verifier,
  });

  const response = await fetch(`${SPOTIFY_AUTH_BASE}/api/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error("token_exchange_error");
  }

  return response.json();
};

const refreshAccessToken = async (refreshToken) => {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: spotifyClientId,
  });

  const response = await fetch(`${SPOTIFY_AUTH_BASE}/api/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error("refresh_error");
  }

  return response.json();
};

const ensureSpotifyToken = async () => {
  if (!spotifyClientId) {
    throw new Error("missing_client_id");
  }

  const data = readAuthData();
  const now = Date.now();

  if (data.accessToken && data.expiresAt && now < data.expiresAt - 15000) {
    return data.accessToken;
  }

  if (data.refreshToken) {
    const tokenData = await refreshAccessToken(data.refreshToken);
    saveAuthData({
      ...data,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || data.refreshToken,
      expiresAt: Date.now() + (tokenData.expires_in * 1000),
    });
    return tokenData.access_token;
  }

  throw new Error("auth_required");
};

const startSpotifyAuth = async () => {
  const state = randomString(32);
  const verifier = randomString(96);
  const challenge = base64UrlEncode(await sha256(verifier));
  saveAuthData({ ...readAuthData(), state, verifier });

  const authParams = new URLSearchParams({
    response_type: "code",
    client_id: spotifyClientId,
    redirect_uri: REDIRECT_URI,
    code_challenge_method: "S256",
    code_challenge: challenge,
    state,
  });

  window.location.assign(`${SPOTIFY_AUTH_BASE}/authorize?${authParams.toString()}`);
};

const handleSpotifyCallback = async () => {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (!code && !error) {
    return;
  }

  if (error) {
    setStatus("Autenticacao do Spotify cancelada.");
    url.searchParams.delete("error");
    window.history.replaceState({}, "", url.toString());
    return;
  }

  const data = readAuthData();
  if (!data.verifier || !data.state || data.state !== state) {
    setStatus("Falha na autenticacao do Spotify. Tente novamente.");
    clearAuthData();
    url.searchParams.delete("code");
    url.searchParams.delete("state");
    window.history.replaceState({}, "", url.toString());
    return;
  }

  try {
    const tokenData = await exchangeCodeForToken(code, data.verifier);
    saveAuthData({
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + (tokenData.expires_in * 1000),
    });
    setStatus("Spotify conectado com sucesso.");
  } catch {
    clearAuthData();
    setStatus("Nao foi possivel finalizar a autenticacao do Spotify.");
  }

  url.searchParams.delete("code");
  url.searchParams.delete("state");
  window.history.replaceState({}, "", url.toString());
};

const runSpotifySearch = async (query) => {
  setStatus("Buscando no Spotify...");

  try {
    const token = await ensureSpotifyToken();
    const items = await searchSpotify(query, token);
    renderItems(items);
    setStatus(`Mostrando ${items.length} resultado(s).`);
  } catch (error) {
    if (error.message === "auth_required") {
      window.sessionStorage.setItem(QUERY_KEY, query);
      setStatus("Conectando com Spotify...");
      await startSpotifyAuth();
      return;
    }

    if (error.message === "missing_client_id") {
      setStatus("Defina o client id no meta 'spotify-client-id' para usar a API do Spotify.");
      return;
    }

    setStatus("Nao foi possivel buscar no Spotify agora. Tente novamente.");
    if (resultsEl) {
      resultsEl.innerHTML = "";
    }
  }
};

const bootstrapSpotify = async () => {
  await handleSpotifyCallback();
  const pendingQuery = window.sessionStorage.getItem(QUERY_KEY);
  if (pendingQuery) {
    window.sessionStorage.removeItem(QUERY_KEY);
    if (queryInput) {
      queryInput.value = pendingQuery;
    }
    await runSpotifySearch(pendingQuery);
  }
};

if (searchForm && queryInput) {
  searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const query = queryInput.value.trim();

    if (!query) {
      return;
    }

    await runSpotifySearch(query);
  });
}

bootstrapSpotify();

if (topbar && hero) {
  const toggleTopbar = () => {
    const heroBottom = hero.getBoundingClientRect().bottom;
    const shouldShow = heroBottom <= 0;
    topbar.classList.toggle("is-visible", shouldShow);
  };

  toggleTopbar();
  window.addEventListener("scroll", toggleTopbar, { passive: true });
  window.addEventListener("resize", toggleTopbar, { passive: true });
}
