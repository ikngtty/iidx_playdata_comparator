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

function getVersionNumberForName(name) {
  const num = VERSION_NUMBER_FOR_NAME.get(name);
  if (num == null) {
    throw new Error(`Unexpected version name: ${name}`);
  }
  return num;
}

const DIFFICUTY_ORDER = (() => {
  const m = new Map();
  DIFFICULTIES.forEach((dif, i) => {
    m.set(dif, i);
  });
  return m;
})();

function getDifficultyOrder(difficulty) {
  const order = DIFFICUTY_ORDER.get(difficulty);
  if (order == null) {
    throw new Error(`Unexpected difficulty: ${difficulty}`);
  }
  return order;
}

const SONG_TITLE_COLLATOR = new Intl.Collator("ja");

export function compareVersionName(ver1, ver2) {
  const num1 = getVersionNumberForName(ver1);
  const num2 = getVersionNumberForName(ver2);
  return num1 - num2;
}

export function compareSongTitle(title1, title2) {
  return SONG_TITLE_COLLATOR.compare(title1, title2);
}

export function compareDifficulty(dif1, dif2) {
  const order1 = getDifficultyOrder(dif1);
  const order2 = getDifficultyOrder(dif2);
  return order1 - order2;
}

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

      const missCountText = row[`${difficulty} ミスカウント`];
      const missCount = (() => {
        if (missCountText === "---") return null;

        const num = Number(missCountText);
        if (isNaN(num)) {
          throw new Error(`Unexpected miss count: "${missCountText}"`);
        }
        return num;
      })();

      const djLevelText = row[`${difficulty} DJ LEVEL`];
      const djLevel = djLevelText === "---" ? null : djLevelText;

      const scoreText = row[`${difficulty} スコア`];
      const score = (() => {
        const num = Number(scoreText);
        if (isNaN(num)) {
          throw new Error(`Unexpected score: "${scoreText}"`);
        }
        if (num === 0) {
          return null;
        }
        return num;
      })();

      const result = {
        clearType: row[`${difficulty} クリアタイプ`],
        missCount,
        djLevel,
        score,
      };

      yield { chart, result };
    }
  }
}
