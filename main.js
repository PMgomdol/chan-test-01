const CSV_PATH = "data.csv";

const state = {
  items: [],
  filtered: [],
  sections: []
};

const searchInput = document.getElementById("searchInput");
const sectionFilter = document.getElementById("sectionFilter");
const sortMode = document.getElementById("sortMode");
const resultsEl = document.getElementById("results");
const statsEl = document.getElementById("stats");
const cardTemplate = document.getElementById("cardTemplate");

init().catch((error) => {
  console.error(error);
  statsEl.textContent = "데이터를 불러오지 못했습니다. 파일 경로를 확인해주세요.";
});

async function init() {
  const text = await fetchCsv(CSV_PATH);
  const rows = parseCsv(text);
  state.items = toItems(rows);
  state.sections = [...new Set(state.items.map((item) => item.section))].sort((a, b) =>
    a.localeCompare(b, "ko")
  );

  for (const section of state.sections) {
    const option = document.createElement("option");
    option.value = section;
    option.textContent = section;
    sectionFilter.append(option);
  }

  bindEvents();
  applyFilters();
}

function bindEvents() {
  searchInput.addEventListener("input", applyFilters);
  sectionFilter.addEventListener("change", applyFilters);
  sortMode.addEventListener("change", applyFilters);
}

async function fetchCsv(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`CSV load failed: ${response.status}`);
  }
  return response.text();
}

function parseCsv(input) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        cell += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function toItems(rows) {
  const items = [];
  let currentSection = "미분류";

  rows.forEach((rawRow, rowIndex) => {
    const row = rawRow.map(cleanCell);
    const nonEmpty = row.filter(Boolean);
    if (nonEmpty.length === 0) {
      return;
    }

    const urls = row.filter(isLikelyUrl).map(normalizeUrl);

    if (urls.length === 0 && looksLikeSection(nonEmpty)) {
      currentSection = nonEmpty[0];
      return;
    }

    if (urls.length === 0) {
      return;
    }

    const indexCell = row.find((cell) => /^\d+$/.test(cell));
    const index = indexCell ? Number(indexCell) : null;

    const textCandidates = row.filter((cell) => cell && !isLikelyUrl(cell) && !/^\d+$/.test(cell));
    const title = pickTitle(textCandidates, urls[0]);
    const note = pickNote(textCandidates, title);

    urls.forEach((url, urlOrder) => {
      items.push({
        id: `${rowIndex}-${urlOrder}`,
        section: currentSection,
        index,
        title,
        note,
        url,
        sourceRow: row.join(" | ")
      });
    });
  });

  return items;
}

function cleanCell(value) {
  return value.replace(/\uFEFF/g, "").replace(/\s+/g, " ").trim();
}

function looksLikeSection(nonEmptyCells) {
  if (nonEmptyCells.length > 2) {
    return false;
  }
  const [first] = nonEmptyCells;
  if (isLikelyUrl(first) || /^\d+$/.test(first)) {
    return false;
  }
  if (first.length > 70) {
    return false;
  }
  return true;
}

function isLikelyUrl(value) {
  return /^https?:\/\//i.test(value);
}

function normalizeUrl(value) {
  return value.trim();
}

function pickTitle(candidates, fallbackUrl) {
  const preferred = candidates.find((text) => text.length >= 4 && text.length <= 140);
  return preferred || new URL(fallbackUrl).hostname;
}

function pickNote(candidates, title) {
  const note = candidates.filter((text) => text !== title).join(" · ");
  return note.slice(0, 240);
}

function applyFilters() {
  const query = searchInput.value.trim().toLowerCase();
  const section = sectionFilter.value;
  const sort = sortMode.value;

  let items = state.items.filter((item) => {
    if (section !== "all" && item.section !== section) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = `${item.section} ${item.title} ${item.note} ${item.url} ${item.sourceRow}`.toLowerCase();
    return haystack.includes(query);
  });

  if (sort === "section") {
    items = [...items].sort((a, b) => a.section.localeCompare(b.section, "ko") || compareIndex(a, b));
  } else if (sort === "title") {
    items = [...items].sort((a, b) => a.title.localeCompare(b.title, "ko"));
  } else {
    items = [...items].sort(compareIndex);
  }

  state.filtered = items;
  render();
}

function compareIndex(a, b) {
  if (a.index === null && b.index === null) {
    return a.id.localeCompare(b.id);
  }
  if (a.index === null) {
    return 1;
  }
  if (b.index === null) {
    return -1;
  }
  return a.index - b.index;
}

function render() {
  const total = state.items.length;
  const count = state.filtered.length;

  statsEl.textContent = `전체 ${total.toLocaleString("ko-KR")}개 링크 중 ${count.toLocaleString(
    "ko-KR"
  )}개 표시`;
  resultsEl.innerHTML = "";

  if (count === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "검색 결과가 없습니다. 다른 키워드로 시도해보세요.";
    resultsEl.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();

  state.filtered.forEach((item) => {
    const node = cardTemplate.content.cloneNode(true);
    node.querySelector(".section").textContent = item.section;
    node.querySelector(".index").textContent = item.index ? `#${item.index}` : "참고";
    node.querySelector(".title").textContent = item.title;
    node.querySelector(".meta").textContent = item.note || "추가 설명 없음";

    const link = node.querySelector(".link");
    link.href = item.url;
    link.textContent = truncateUrl(item.url);

    fragment.append(node);
  });

  resultsEl.append(fragment);
}

function truncateUrl(url) {
  if (url.length <= 42) {
    return url;
  }
  return `${url.slice(0, 39)}...`;
}
