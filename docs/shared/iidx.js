import { checkCsv, parseCsv } from "./util.js";

export const VERSION_NAMES = [
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

export const DIFFICULTIES = [
  "BEGINNER",
  "NORMAL",
  "HYPER",
  "ANOTHER",
  "LEGGENDARIA",
];

const VERSION_NUMBER_FOR_NAME = (() => {
  const m = new Map();
  VERSION_NAMES.forEach((name, i) => {
    m.set(name, i + 1);
  });
  return m;
})();

const DIFFICUTY_ORDER = (() => {
  const m = new Map();
  DIFFICULTIES.forEach((dif, i) => {
    m.set(dif, i);
  });
  return m;
})();

const SONG_TITLE_COLLATOR = new Intl.Collator("ja");

export function checkIidxCsv(text) {
  const csvCheckedResult = checkCsv(text);
  if (!csvCheckedResult.isValid) {
    return csvCheckedResult;
  }

  const headerNames = (() => {
    let headerEndIndex = text.indexOf("\n");
    if (headerEndIndex === -1) {
      headerEndIndex = text.length;
    }
    return text.slice(0, headerEndIndex).split(",");
  })();

  const expectedHeaderNames = ["バージョン", "タイトル"];
  expectedHeaderNames.push(
    ...DIFFICULTIES.flatMap((dif) => [
      `${dif} 難易度`,
      `${dif} クリアタイプ`,
      `${dif} ミスカウント`,
      `${dif} DJ LEVEL`,
      `${dif} スコア`,
    ]),
  );

  for (const expectedHeaderName of expectedHeaderNames) {
    if (!headerNames.includes(expectedHeaderName)) {
      return {
        isValid: false,
        line: 0,
        error: `Missing header: ${expectedHeaderName}`,
      };
    }
  }

  // TODO: 各項目の型チェック
  return { isValid: true };
}

export function* parseIidxCsv(text) {
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

export function compareChart(chart1, chart2) {
  const songDelta = compareSong(chart1.song, chart2.song);
  if (songDelta !== 0) {
    return songDelta;
  }

  const [difOrder1, difOrder2] = [chart1, chart2].map((chart) => {
    const dif = chart.difficulty;
    const order = DIFFICUTY_ORDER.get(dif);
    if (order == null) {
      throw new Error(`Unexpected difficulty: ${dif}`);
    }
    return order;
  });

  return difOrder1 - difOrder2;
}

export function compareSong(song1, song2) {
  const [ver1, ver2] = [song1, song2].map((song) => {
    const name = song.version;
    const num = VERSION_NUMBER_FOR_NAME.get(name);
    if (num == null) {
      throw new Error(`Unexpected version name: ${name}`);
    }
    return num;
  });

  const verDelta = ver1 - ver2;
  if (verDelta !== 0) {
    return verDelta;
  }

  return SONG_TITLE_COLLATOR.compare(song1.title, song2.title);
}
