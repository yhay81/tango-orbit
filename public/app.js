const STORAGE_KEY = "tango-orbit:saved:v1";
const VISIT_KEY = "tango-orbit:last-visit:v1";
const CLIENT_KEY = "tango-orbit:client:v1";
const MAX_SAVED = 40;

const state = {
  dictionary: null,
  index: [],
  glossIndex: new Map(),
  wordById: new Map(),
  matches: [],
  current: null,
  saved: [],
  reviewQueue: [],
  reviewIndex: 0,
  reviewRevealed: false,
};

const elements = {
  status: document.querySelector("#dictionary-status"),
  form: document.querySelector("#search-form"),
  input: document.querySelector("#search-input"),
  clear: document.querySelector("#search-clear"),
  results: document.querySelector("#results-list"),
  resultCount: document.querySelector("#result-count"),
  word: document.querySelector("#word-display"),
  reading: document.querySelector("#reading-display"),
  senses: document.querySelector("#sense-list"),
  orbit: document.querySelector("#orbit-list"),
  save: document.querySelector("#save-word"),
  saved: document.querySelector("#saved-list"),
  savedCount: document.querySelector("#saved-count"),
  emptySaved: document.querySelector("#saved-empty"),
  reviewStart: document.querySelector("#review-start"),
  review: document.querySelector("#review-panel"),
  reviewWord: document.querySelector("#review-word"),
  reviewReading: document.querySelector("#review-reading"),
  reviewMeaning: document.querySelector("#review-meaning"),
  reviewReveal: document.querySelector("#review-reveal"),
  reviewNext: document.querySelector("#review-next"),
  reviewClose: document.querySelector("#review-close"),
  loadError: document.querySelector("#load-error"),
};

function normalize(value) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/[\u30a1-\u30f6]/g, (character) =>
      String.fromCharCode(character.charCodeAt(0) - 0x60),
    );
}

function primaryWord(word) {
  return word.k[0] ?? word.r[0] ?? "—";
}

function primaryReading(word) {
  return word.r[0] ?? "";
}

function meanings(word) {
  return word.s.flatMap((sense) => sense.g);
}

function uniqueClientId() {
  let id = localStorage.getItem(CLIENT_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CLIENT_KEY, id);
  }
  return id;
}

const qaMode = navigator.webdriver || new URLSearchParams(location.search).has("qa");

function record(event) {
  const payload = JSON.stringify({ event });
  const headers = {
    "Content-Type": "application/json",
    "X-Tango-Client": uniqueClientId(),
    "X-Tango-QA": qaMode ? "1" : "0",
  };
  fetch("/api/events", {
    method: "POST",
    headers,
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

function hydrateSaved() {
  try {
    const values = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    state.saved = Array.isArray(values)
      ? values.filter((value) => typeof value === "string").slice(0, MAX_SAVED)
      : [];
  } catch {
    state.saved = [];
  }
}

function persistSaved() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.saved));
}

function findWordById(id) {
  return state.wordById.get(id);
}

function scoreWord(word, searchable, query, hiraganaQuery) {
  const forms = [...word.k, ...word.r].map(normalize);
  if (forms.includes(query) || forms.includes(hiraganaQuery)) return 120;
  if (forms.some((form) => form.startsWith(query))) return 95;

  const wordMatch = searchable.wordText.indexOf(query);
  if (wordMatch >= 0) return 78 - Math.min(wordMatch, 18);

  if (searchable.glosses.includes(query)) return 116;
  const primaryGloss = searchable.glosses[0] ?? "";
  if (primaryGloss.startsWith(`${query} `) || primaryGloss.startsWith(`${query} (`)) {
    return 108;
  }
  if (
    searchable.glosses.some(
      (gloss) => gloss.startsWith(`${query} `) || gloss.startsWith(`${query} (`),
    )
  ) {
    return 88;
  }

  const englishWords = searchable.englishText.split(/\W+/);
  if (englishWords.includes(query)) return 72;
  if (englishWords.some((part) => part.startsWith(query))) return 58;

  if (/^[a-z0-9 '-]+$/.test(query) && query.length < 4) return 0;
  const englishMatch = searchable.englishText.indexOf(query);
  return englishMatch >= 0 ? 42 - Math.min(englishMatch, 20) : 0;
}

function search(queryValue, eventName = null) {
  const query = normalize(queryValue);
  if (!query) {
    state.matches = [];
    renderResults();
    return;
  }

  const hiraganaQuery = normalize(query);
  state.matches = state.index
    .map((searchable, index) => ({
      word: state.dictionary.words[index],
      score: scoreWord(state.dictionary.words[index], searchable, query, hiraganaQuery),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 12)
    .map((item) => item.word);

  renderResults();
  if (state.matches[0]) selectWord(state.matches[0]);
  if (eventName) record(eventName);
}

function renderResults() {
  elements.results.replaceChildren();
  elements.resultCount.textContent = state.matches.length
    ? `${state.matches.length}件`
    : "候補なし";

  for (const word of state.matches) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "result-item";
    button.dataset.active = String(state.current?.i === word.i);
    button.addEventListener("click", () => selectWord(word));

    const name = document.createElement("strong");
    name.textContent = primaryWord(word);
    const reading = document.createElement("span");
    reading.textContent = primaryReading(word);
    const gloss = document.createElement("small");
    gloss.textContent = meanings(word).slice(0, 2).join(" · ");
    button.append(name, reading, gloss);
    elements.results.append(button);
  }
}

function makeOrbitButton(label, kind, index) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "orbit-word";
  button.dataset.kind = kind;
  button.dataset.position = String(index + 1);
  button.textContent = label;
  button.addEventListener("click", () => {
    elements.input.value = label;
    search(label, "searched");
  });
  return button;
}

function renderOrbit(word) {
  elements.orbit.replaceChildren();
  const related = word.x.map((value) => [value, "related"]);
  const antonyms = word.a.map((value) => [value, "antonym"]);
  const orbitWords = [...related, ...antonyms].slice(0, 8);

  if (orbitWords.length < 4) {
    const base = normalize(primaryWord(word));
    if (base && !/^[a-z0-9 '-]+$/.test(base)) {
      const lexicalSuggestions = state.dictionary.words
        .filter(
          (candidate) =>
            candidate.i !== word.i &&
            [...candidate.k, ...candidate.r].some((form) => normalize(form).includes(base)),
        )
        .slice(0, 8)
        .map((candidate) => [primaryWord(candidate), "nearby"]);
      for (const suggestion of lexicalSuggestions) {
        if (!orbitWords.some(([label]) => label === suggestion[0])) {
          orbitWords.push(suggestion);
        }
        if (orbitWords.length >= 8) break;
      }
    }
  }

  if (orbitWords.length < 4) {
    const currentGlosses = meanings(word)
      .join(" ")
      .toLowerCase()
      .split(/\W+/)
      .filter((part) => part.length >= 4);
    const suggestionIds = [
      ...new Set(currentGlosses.flatMap((part) => state.glossIndex.get(part) ?? [])),
    ];
    const suggestions = suggestionIds
      .map(findWordById)
      .filter((candidate) => candidate && candidate.i !== word.i)
      .slice(0, 6)
      .map((candidate) => [primaryWord(candidate), "nearby"]);
    for (const suggestion of suggestions) {
      if (!orbitWords.some(([label]) => label === suggestion[0])) {
        orbitWords.push(suggestion);
      }
      if (orbitWords.length >= 8) break;
    }
  }

  orbitWords.forEach(([label, kind], index) => {
    elements.orbit.append(makeOrbitButton(label, kind, index));
  });
  document.querySelector("#orbit-empty").hidden = orbitWords.length > 0;
}

function renderSenses(word) {
  elements.senses.replaceChildren();
  word.s.slice(0, 6).forEach((sense, index) => {
    const item = document.createElement("li");
    const number = document.createElement("span");
    number.className = "sense-number";
    number.textContent = String(index + 1).padStart(2, "0");
    const body = document.createElement("div");
    const gloss = document.createElement("p");
    gloss.textContent = sense.g.join("; ");
    body.append(gloss);
    if (sense.p.length) {
      const meta = document.createElement("small");
      meta.textContent = sense.p.map((tag) => state.dictionary.tags[tag] ?? tag).join(" · ");
      body.append(meta);
    }
    if (sense.n.length) {
      const note = document.createElement("small");
      note.textContent = sense.n.join(" · ");
      body.append(note);
    }
    item.append(number, body);
    elements.senses.append(item);
  });
}

function selectWord(word) {
  state.current = word;
  elements.word.textContent = primaryWord(word);
  const reading = primaryReading(word);
  const alternatives = [...word.k.slice(1), ...word.r.slice(1)].slice(0, 4);
  elements.reading.textContent = [reading, ...alternatives].filter(Boolean).join(" ・ ");
  elements.save.dataset.saved = String(state.saved.includes(word.i));
  elements.save.textContent = state.saved.includes(word.i) ? "保存済み" : "単語帳へ";
  elements.save.setAttribute(
    "aria-label",
    state.saved.includes(word.i)
      ? `${primaryWord(word)}を単語帳から外す`
      : `${primaryWord(word)}を単語帳へ保存`,
  );
  renderSenses(word);
  renderOrbit(word);
  renderResults();
}

function renderSaved() {
  elements.saved.replaceChildren();
  elements.savedCount.textContent = `${state.saved.length}/${MAX_SAVED}`;
  elements.emptySaved.hidden = state.saved.length > 0;
  elements.reviewStart.disabled = state.saved.length === 0;

  for (const id of state.saved) {
    const word = findWordById(id);
    if (!word) continue;
    const row = document.createElement("div");
    row.className = "saved-item";
    const open = document.createElement("button");
    open.type = "button";
    open.className = "saved-open";
    open.textContent = primaryWord(word);
    open.addEventListener("click", () => selectWord(word));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "saved-remove";
    remove.setAttribute("aria-label", `${primaryWord(word)}を単語帳から外す`);
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      state.saved = state.saved.filter((value) => value !== id);
      persistSaved();
      renderSaved();
      if (state.current) selectWord(state.current);
    });
    row.append(open, remove);
    elements.saved.append(row);
  }
}

function toggleSave() {
  if (!state.current) return;
  const id = state.current.i;
  if (state.saved.includes(id)) {
    state.saved = state.saved.filter((value) => value !== id);
  } else {
    state.saved = [id, ...state.saved].slice(0, MAX_SAVED);
    record("word_saved");
  }
  persistSaved();
  renderSaved();
  selectWord(state.current);
}

function currentReviewWord() {
  return findWordById(state.reviewQueue[state.reviewIndex]);
}

function renderReview() {
  const word = currentReviewWord();
  if (!word) {
    closeReview();
    return;
  }
  elements.reviewWord.textContent = primaryWord(word);
  elements.reviewReading.textContent = primaryReading(word);
  elements.reviewMeaning.textContent = meanings(word).slice(0, 4).join("; ");
  elements.reviewMeaning.hidden = !state.reviewRevealed;
  elements.reviewReveal.hidden = state.reviewRevealed;
  elements.reviewNext.hidden = !state.reviewRevealed;
  document.querySelector("#review-progress").textContent =
    `${state.reviewIndex + 1} / ${state.reviewQueue.length}`;
}

function startReview() {
  state.reviewQueue = [...state.saved].sort(() => Math.random() - 0.5).slice(0, 10);
  state.reviewIndex = 0;
  state.reviewRevealed = false;
  elements.review.hidden = false;
  elements.review.setAttribute("aria-modal", "true");
  renderReview();
  record("reviewed");
}

function closeReview() {
  elements.review.hidden = true;
  elements.review.removeAttribute("aria-modal");
  elements.reviewStart.focus();
}

function noteVisit() {
  const lastVisit = localStorage.getItem(VISIT_KEY);
  if (lastVisit) {
    const elapsed = Date.now() - Number(lastVisit);
    if (elapsed > 20 * 60 * 60 * 1000) record("returned");
  }
  localStorage.setItem(VISIT_KEY, String(Date.now()));
  record("visited");
}

async function loadDictionary() {
  try {
    const response = await fetch("/dictionary.json");
    if (!response.ok) throw new Error(`dictionary ${response.status}`);
    state.dictionary = await response.json();
    state.index = state.dictionary.words.map((word) => ({
      wordText: normalize([...word.k, ...word.r].join("\u0000")),
      glosses: meanings(word).map(normalize),
      englishText: normalize(meanings(word).join("\u0000")),
    }));
    for (const word of state.dictionary.words) {
      state.wordById.set(word.i, word);
      const tokens = new Set(
        normalize(meanings(word).join(" "))
          .split(/\W+/)
          .filter((part) => part.length >= 4),
      );
      for (const token of tokens) {
        const ids = state.glossIndex.get(token) ?? [];
        if (ids.length < 16) ids.push(word.i);
        state.glossIndex.set(token, ids);
      }
    }
    elements.status.textContent = `${state.dictionary.entries.toLocaleString("ja-JP")}語 · ${state.dictionary.date}`;
    elements.form.dataset.ready = "true";
    elements.input.disabled = false;
    hydrateSaved();
    renderSaved();
    search("言葉");
    noteVisit();
  } catch {
    elements.loadError.hidden = false;
    elements.status.textContent = "辞書を読み込めません";
  }
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  search(elements.input.value, "searched");
});
elements.input.addEventListener("input", () => {
  elements.clear.hidden = elements.input.value.length === 0;
  window.clearTimeout(elements.input.searchTimer);
  elements.input.searchTimer = window.setTimeout(() => search(elements.input.value), 90);
});
elements.clear.addEventListener("click", () => {
  elements.input.value = "";
  elements.clear.hidden = true;
  elements.input.focus();
  search("言葉");
});
elements.save.addEventListener("click", toggleSave);
elements.reviewStart.addEventListener("click", startReview);
elements.reviewReveal.addEventListener("click", () => {
  state.reviewRevealed = true;
  renderReview();
});
elements.reviewNext.addEventListener("click", () => {
  state.reviewIndex += 1;
  state.reviewRevealed = false;
  renderReview();
});
elements.reviewClose.addEventListener("click", closeReview);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !elements.review.hidden) closeReview();
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

void loadDictionary();
