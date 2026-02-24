const VERSION_NAMES = [
  "1st&substream",
  "2nd style",
  "3rd style",
  "4th style",
  "5th style",
  "6th style",
  "7th style",
  "8th style",
  "9th style",
  "10th style",
  "IIDX RED",
  "HAPPY SKY",
  "DistorteD",
  "GOLD",
  "DJ TROOPERS",
  "EMPRESS",
  "SIRIUS",
  "Resort Anthem",
  "Lincle",
  "tricoro",
  "SPADA",
  "PENDUAL",
  "copula",
  "SINOBUZ",
  "CANNON BALLERS",
  "Rootage",
  "HEROIC VERSE",
  "BISTROVER",
  "CastHour",
  "RESIDENT",
  "EPOLIS",
  "Pinky Crush",
  "Sparkle Shower",
];

const VERSION_NUMBER_FOR_NAME = (() => {
  const m = new Map();
  VERSION_NAMES.forEach((name, i) => {
    m.set(name, i + 1);
  });
  return m;
})();

const SONG_TITLE_COLLATOR = new Intl.Collator("ja");

const DIFFICULTIES = ["BEGINNER", "NORMAL", "HYPER", "ANOTHER", "LEGGENDARIA"];

const DIFFICUTY_ORDER = (() => {
  const m = new Map();
  DIFFICULTIES.forEach((dif, i) => {
    m.set(dif, i);
  });
  return m;
})();

const inputCsv = document.getElementById("inputCsv");
const buttonView = document.getElementById("buttonView");
const viewTable = document.getElementById("viewTable");

buttonView.addEventListener("click", () => {
  const tbody = viewTable.tBodies[0];

  tbody.replaceChildren();

  const records = parseIidxCsv(inputCsv.value);

  let prev = null;
  for (const record of records) {
    const row = tbody.insertRow();
    row.insertCell().textContent = record.chart.song.version;
    row.insertCell().textContent = record.chart.song.title;
    row.insertCell().textContent = record.chart.difficulty;
    row.insertCell().textContent = record.chart.level;
    row.insertCell().textContent = record.result.clearType;
    row.insertCell().textContent = record.result.missCount;
    row.insertCell().textContent = record.result.djLevel;
    row.insertCell().textContent = record.result.score;

    if (prev != null && compareChart(prev.chart, record.chart) >= 0) {
      console.log("PREV", prev);
      console.log("CURRENT", record);
    }
    prev = record;
  }
});

function compareChart(chart1, chart2) {
  const songDelta = compareSong(chart1.song, chart2.song);
  if (songDelta !== 0) {
    return songDelta;
  }

  const [difOrder1, difOrder2] = [chart1, chart2].map((chart) => {
    const dif = chart.difficulty;
    const order = DIFFICUTY_ORDER.get(dif);
    if (order == null) {
      throw new Error(`unexpected difficulty: ${dif}`);
    }
    return order;
  });

  return difOrder1 - difOrder2;
}

function compareSong(song1, song2) {
  const [ver1, ver2] = [song1, song2].map((song) => {
    const name = song.version;
    const num = VERSION_NUMBER_FOR_NAME.get(name);
    if (num == null) {
      throw new Error(`unexpected version name: ${name}`);
    }
    return num;
  });

  const verDelta = ver1 - ver2;
  if (verDelta !== 0) {
    return verDelta;
  }

  return SONG_TITLE_COLLATOR.compare(song1.title, song2.title);
}

function* parseIidxCsv(text) {
  for (const row of parseCsv(text)) {
    const song = {
      version: row["バージョン"],
      title: row["タイトル"],
    };

    for (const difficulty of DIFFICULTIES) {
      const level = row[`${difficulty} 難易度`];
      if (level === "0") {
        continue;
      }

      const chart = {
        song,
        difficulty,
        level,
      };

      const result = {
        clearType: row[`${difficulty} クリアタイプ`],
        missCount: row[`${difficulty} ミスカウント`],
        djLevel: row[`${difficulty} DJ LEVEL`],
        score: row[`${difficulty} スコア`],
      };

      yield { chart, result };
    }
  }
}

function* parseCsv(text) {
  const lines = readLines(text);

  const { done, value: header } = lines.next();
  if (done) {
    throw new Error("No header");
  }
  const headerNames = header.split(",");

  for (const line of lines) {
    if (line === "") {
      continue;
    }

    const items = line.split(",");
    if (items.length !== headerNames.length) {
      throw new Error("Different column count");
    }

    yield Object.fromEntries(headerNames.map((h, i) => [h, items[i]]));
  }
}

function* readLines(text) {
  let start = 0;
  let end;
  while ((end = text.indexOf("\n", start)) !== -1) {
    yield text.slice(start, end);
    start = end + 1;
  }
  if (start < text.length) {
    yield text.slice(start);
  }
}
