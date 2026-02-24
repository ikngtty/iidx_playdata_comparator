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

const inputCsv1 = document.getElementById("inputCsv1");
const inputCsv2 = document.getElementById("inputCsv2");
const buttonCompare = document.getElementById("buttonCompare");
const comparisonTable = document.getElementById("comparisonTable");

buttonCompare.addEventListener("click", () => {
  const tbody = comparisonTable.tBodies[0];

  // テーブルのリセット
  tbody.replaceChildren();

  // ソート
  const [records1, records2] = [inputCsv1, inputCsv2].map((inputCsv) => {
    const records = [...parseIidxCsv(inputCsv.value)];
    records.sort((record1, record2) =>
      compareChart(record1.chart, record2.chart),
    );
    return records;
  });

  // 記録を比較しようとして双方の曲が違った時に、どちらを先に処理するか判断するための比較関数
  const compare = (record1, record2) => {
    // nullが常に大きい
    if (record1 == null) {
      return 1;
    } else if (record2 == null) {
      return -1;
    }

    return compareChart(record1.chart, record2.chart);
  };

  // テーブルの構築
  {
    let [i1, i2] = [0, 0];
    while (i1 < records1.length || i2 < records2.length) {
      const [record1, record2] = [records1[i1], records2[i2]];

      const delta = compare(record1, record2);
      switch (true) {
        case delta < 0:
          addComparisonRow(tbody, record1.chart, record1.result, null);
          i1++;
          break;
        case delta > 0:
          addComparisonRow(tbody, record2.chart, null, record2.result);
          i2++;
          break;
        default:
          addComparisonRow(
            tbody,
            record1.chart,
            record1.result,
            record2.result,
          );
          i1++;
          i2++;
          break;
      }
    }
  }
});

function addComparisonRow(tbody, chart, result1, result2) {
  const row = tbody.insertRow();
  row.insertCell().textContent = chart.song.version;
  row.insertCell().textContent = chart.song.title;
  row.insertCell().textContent = chart.difficulty;
  row.insertCell().textContent = chart.level;
  row.insertCell().textContent = result1?.clearType;
  row.insertCell().textContent = result2?.clearType;
  row.insertCell().textContent = result1?.missCount;
  row.insertCell().textContent = result2?.missCount;
  row.insertCell().textContent = result1?.djLevel;
  row.insertCell().textContent = result2?.djLevel;
  row.insertCell().textContent = result1?.score;
  row.insertCell().textContent = result2?.score;
}

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
