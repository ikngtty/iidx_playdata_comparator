import {
  compareClearType,
  compareDifficulty,
  compareLevel,
  compareSongTitle,
  compareVersionName,
  parseIidxCsv,
} from "../shared/iidx.js";
import { mergeComparators } from "../shared/util.js";
import ValidatableField from "../shared/validation/validatable_field.js";
import { RuleIidxCsv } from "../shared/validation/rules/iidx.js";

// TODO: 絞り込み条件・並び替え順の変更時即時反映 or 変更値と表示の不一致を明示（一致してる時は比較ボタンを押せなくするとか）
// TODO: 絞り込み条件・並び替え順の状態保存・復元

const inputsCsv = [1, 2].map((i) => document.getElementById(`inputCsv${i}`));
const warningCaptionsCsv = [1, 2].map((i) =>
  document.getElementById(`warningCaptionCsv${i}`),
);
const selectFilterLevel = document.getElementById("selectFilterLevel");
const selectSortBy = document.getElementById("selectSortBy");
const buttonCompare = document.getElementById("buttonCompare");
const tableComparison = document.getElementById("tableComparison");

const validatableInputsCsv = [1, 2].map(
  (i) =>
    new ValidatableField(inputsCsv[i - 1], warningCaptionsCsv[i - 1], [
      new RuleIidxCsv(),
    ]),
);

{
  inputsCsv.forEach((inputCsv, i) => {
    const savedValue = localStorage.getItem(`iidxComparator.csv${i + 1}`);
    if (savedValue != null) {
      inputCsv.value = savedValue;
    }
  });
}

inputsCsv.forEach((inputCsv, i) => {
  inputCsv.addEventListener("input", () => {
    localStorage.setItem(`iidxComparator.csv${i + 1}`, inputCsv.value);
  });
});

buttonCompare.addEventListener("click", () => {
  // バリデーションチェック
  for (const validatable of validatableInputsCsv) {
    validatable.clearWarning();
  }
  for (const validatable of validatableInputsCsv) {
    if (validatable.warnIfInvalid()) {
      return;
    }
  }

  // テーブルのリセット
  const tbody = tableComparison.tBodies[0];
  tbody.replaceChildren();

  const filter = getFilterFromForm();
  const sortBy = selectSortBy.value;

  const [records1, records2] = inputsCsv.map((inputCsv) => {
    const allRecords = parseIidxCsv(inputCsv.value);
    const filteredRecords = applyFilterToRecords(allRecords, filter);
    return filteredRecords;
  });

  const compareRecordOrder = getComparatorOfRecordOrder(sortBy);
  const comparisons = makeRecordComparisons(
    compareRecordOrder,
    records1,
    records2,
  );
  const filteredComparisons = applyFilterToComparisons(comparisons, filter);
  const compareComparisonOrder = getComparatorOfComparisonOrder(sortBy);
  const sortedComparisons = compareComparisonOrder
    ? [...filteredComparisons].sort(compareComparisonOrder)
    : filteredComparisons;

  for (const comparison of sortedComparisons) {
    addComparisonRow(tbody, comparison);
  }
});

function addComparisonRow(tbody, comparison) {
  const row = tbody.insertRow();

  row.insertCell().textContent = comparison.chart.song.version;

  const titleCell = row.insertCell();
  titleCell.textContent = comparison.chart.song.title;
  titleCell.classList.add("song-title");

  const difficultyCell = row.insertCell();
  difficultyCell.textContent = comparison.chart.difficulty;
  difficultyCell.classList.add(
    getClassNameForDifficulty(comparison.chart.difficulty),
  );

  row.insertCell().textContent = comparison.chart.level;

  const clearType1Cell = row.insertCell();
  clearType1Cell.textContent = comparison.result1?.clearType;
  clearType1Cell.classList.add(
    "clear-type",
    getClassNameForClearType(comparison.result1?.clearType),
  );
  const clearType2Cell = row.insertCell();
  clearType2Cell.textContent = comparison.result2?.clearType;
  clearType2Cell.classList.add(
    "clear-type",
    getClassNameForClearType(comparison.result2?.clearType),
  );

  const missCount1Cell = row.insertCell();
  missCount1Cell.textContent = comparison.result1?.missCount;
  missCount1Cell.classList.add(comparison.missCountWinLose1);
  const missCount2Cell = row.insertCell();
  missCount2Cell.textContent = comparison.result2?.missCount;
  missCount2Cell.classList.add(comparison.missCountWinLose2);

  row.insertCell().textContent = comparison.result1?.djLevel;
  row.insertCell().textContent = comparison.result2?.djLevel;

  const score1Cell = row.insertCell();
  score1Cell.textContent = comparison.result1?.score;
  score1Cell.classList.add(comparison.scoreWinLose1);
  const score2Cell = row.insertCell();
  score2Cell.textContent = comparison.result2?.score;
  score2Cell.classList.add(comparison.scoreWinLose2);

  row.insertCell().textContent = comparison.scoreDiff;
}

function getFilterFromForm() {
  const difficulties = getDifficultyFiltersFromForm();
  const level = parseFilterLevel(selectFilterLevel.value);
  return { difficulties, level };
}

function getDifficultyFiltersFromForm() {
  const checkboxes = document.querySelectorAll('input[name="difficulty"]');
  return Object.fromEntries(
    Array.from(checkboxes).map((checkbox) => [
      checkbox.value,
      checkbox.checked,
    ]),
  );
}

function parseFilterLevel(text) {
  if (text === "all") return null;

  const num = Number(text);
  if (isNaN(num)) {
    throw new Error(`Unexpected filter level: "${text}"`);
  }
  return num;
}

function getClassNameForDifficulty(difficulty) {
  switch (difficulty) {
    case "BEGINNER":
      return "beginner";
    case "NORMAL":
      return "normal";
    case "HYPER":
      return "hyper";
    case "ANOTHER":
      return "another";
    case "LEGGENDARIA":
      return "leggendaria";
    default:
      throw new Error(`Unexpected difficulty: ${difficulty}`);
  }
}

function getClassNameForClearType(clearType) {
  if (clearType == null) return "noplay";

  switch (clearType) {
    case "NO PLAY":
      return "noplay";
    case "FAILED":
      return "failed";
    case "ASSIST CLEAR":
      return "assist";
    case "EASY CLEAR":
      return "easy";
    case "CLEAR":
      return "clear";
    case "HARD CLEAR":
      return "hard";
    case "EX HARD CLEAR":
      return "exhard";
    case "FULLCOMBO CLEAR":
      return "fullcombo";
    default:
      throw new Error(`Unexpected clear type: ${clearType}`);
  }
}

function* makeRecordComparisons(compareRecordOrder, records1, records2) {
  // ソート
  const [sortedRecords1, sortedRecords2] = [records1, records2].map((records) =>
    [...records].sort(compareRecordOrder),
  );

  // 記録を比較しようとして双方の曲が違った時に、どちらを先に処理するか判断するための比較関数
  const compareRecordOrderWithNull = (record1, record2) => {
    // nullが常に大きい
    if (record1 == null) {
      return 1;
    } else if (record2 == null) {
      return -1;
    }

    return compareRecordOrder(record1, record2);
  };

  // 片方に無い曲を補完しながら比較を生成
  let [i1, i2] = [0, 0];
  while (i1 < sortedRecords1.length || i2 < sortedRecords2.length) {
    const [record1, record2] = [sortedRecords1[i1], sortedRecords2[i2]];

    const delta = compareRecordOrderWithNull(record1, record2);
    switch (true) {
      case delta < 0:
        yield makeRecordComparison(record1.chart, record1.result, null);
        i1++;
        break;
      case delta > 0:
        yield makeRecordComparison(record2.chart, null, record2.result);
        i2++;
        break;
      default:
        yield makeRecordComparison(
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

function makeRecordComparison(chart, result1, result2) {
  const missCountWinLose1 = judgeMissCountWinLose(
    result1?.missCount,
    result2?.missCount,
  );
  const missCountWinLose2 = judgeMissCountWinLose(
    result2?.missCount,
    result1?.missCount,
  );
  const scoreWinLose1 = judgeScoreWinLose(result1?.score, result2?.score);
  const scoreWinLose2 = judgeScoreWinLose(result2?.score, result1?.score);
  const scoreDiff =
    result1?.score == null || result2?.score == null
      ? null
      : result1.score - result2.score;
  const nominalScoreDiff =
    result1?.score == null && result2?.score == null
      ? null
      : (result1?.score ?? 0) - (result2?.score ?? 0);
  return {
    chart,
    result1,
    result2,
    missCountWinLose1,
    missCountWinLose2,
    scoreWinLose1,
    scoreWinLose2,
    scoreDiff,
    nominalScoreDiff,
  };
}

function judgeMissCountWinLose(missCount1, missCount2) {
  if (missCount1 == null) return "noplay";
  if (missCount2 == null) return "win";
  if (missCount1 < missCount2) return "win";
  if (missCount1 > missCount2) return "lose";
  return "draw";
}

function judgeScoreWinLose(score1, score2) {
  if (score1 == null) return "noplay";
  if (score2 == null) return "win";
  if (score1 > score2) return "win";
  if (score1 < score2) return "lose";
  return "draw";
}

function* applyFilterToRecords(records, filter) {
  for (const record of records) {
    if (!filter.difficulties[record.chart.difficulty]) {
      continue;
    }
    if (filter.level != null && record.chart.level !== filter.level) {
      continue;
    }
    yield record;
  }
}

function* applyFilterToComparisons(comparisons, filter) {
  for (const comparison of comparisons) {
    yield comparison;
  }
}

function getComparatorOfRecordOrder(sortBy) {
  switch (sortBy) {
    case "version":
    case "scoreDiff":
    case "clearDiff":
    case "player1MissCount":
    case "player2MissCount":
      return mergeComparators(
        compareRecordOrderByVersionName,
        compareRecordOrderBySongTitle,
        compareRecordOrderByDifficulty,
      );
    case "levelAsc":
      return mergeComparators(
        compareRecordOrderByLevelAsc,
        compareRecordOrderBySongTitle,
        compareComparisonOrderByVersionName,
        compareComparisonOrderByDifficulty,
      );
    case "levelDesc":
      return mergeComparators(
        compareRecordOrderByLevelDesc,
        compareRecordOrderBySongTitle,
        compareComparisonOrderByVersionName,
        compareComparisonOrderByDifficulty,
      );
    default:
      throw new Error(`Unexpected sort-by: ${sortBy}`);
  }
}

function getComparatorOfComparisonOrder(sortBy) {
  switch (sortBy) {
    case "version":
    case "levelAsc":
    case "levelDesc":
      return null;
    case "scoreDiff":
      return mergeComparators(
        compareComparisonOrderByScoreDiff,
        compareComparisonOrderByVersionName,
        compareComparisonOrderBySongTitle,
        compareComparisonOrderByDifficulty,
      );
    case "clearDiff":
      return mergeComparators(
        compareComparisonOrderByClearDiff,
        compareComparisonOrderByLevelDesc,
        compareComparisonOrderBySongTitle,
        compareComparisonOrderByVersionName,
        compareComparisonOrderByDifficulty,
      );
    case "player1MissCount":
      return mergeComparators(
        compareComparisonOrderByPlayer1MissCount,
        compareComparisonOrderByLevelAsc,
        compareComparisonOrderBySongTitle,
        compareComparisonOrderByVersionName,
        compareComparisonOrderByDifficulty,
      );
    case "player2MissCount":
      return mergeComparators(
        compareComparisonOrderByPlayer2MissCount,
        compareComparisonOrderByLevelAsc,
        compareComparisonOrderBySongTitle,
        compareComparisonOrderByVersionName,
        compareComparisonOrderByDifficulty,
      );
    default:
      throw new Error(`Unexpected sort-by: ${sortBy}`);
  }
}

function compareResultOrderByPlayerMissCount(result1, result2) {
  const missCount1 = result1?.missCount;
  const missCount2 = result2?.missCount;

  if (missCount1 == null && missCount2 == null) return 0;
  // nullが常に大きい
  if (missCount1 == null) return 1;
  if (missCount2 == null) return -1;
  return missCount1 - missCount2;
}

function compareRecordOrderByVersionName(record1, record2) {
  return compareVersionName(
    record1.chart.song.version,
    record2.chart.song.version,
  );
}

function compareRecordOrderBySongTitle(record1, record2) {
  return compareSongTitle(record1.chart.song.title, record2.chart.song.title);
}

function compareRecordOrderByDifficulty(record1, record2) {
  return compareDifficulty(record1.chart.difficulty, record2.chart.difficulty);
}

function compareRecordOrderByLevelAsc(record1, record2) {
  return compareLevel(record1.chart.level, record2.chart.level);
}

function compareRecordOrderByLevelDesc(record1, record2) {
  return compareLevel(record2.chart.level, record1.chart.level);
}

function compareComparisonOrderByVersionName(comparison1, comparison2) {
  return compareVersionName(
    comparison1.chart.song.version,
    comparison2.chart.song.version,
  );
}

function compareComparisonOrderBySongTitle(comparison1, comparison2) {
  return compareSongTitle(
    comparison1.chart.song.title,
    comparison2.chart.song.title,
  );
}

function compareComparisonOrderByDifficulty(comparison1, comparison2) {
  return compareDifficulty(
    comparison1.chart.difficulty,
    comparison2.chart.difficulty,
  );
}

function compareComparisonOrderByLevelAsc(comparison1, comparison2) {
  return compareLevel(comparison1.chart.level, comparison2.chart.level);
}

function compareComparisonOrderByLevelDesc(comparison1, comparison2) {
  return compareLevel(comparison2.chart.level, comparison1.chart.level);
}

function compareComparisonOrderByPlayer1ClearType(comparison1, comparison2) {
  return compareClearType(
    comparison1.result1?.clearType ?? "NO PLAY",
    comparison2.result1?.clearType ?? "NO PLAY",
  );
}

function compareComparisonOrderByPlayer2ClearType(comparison1, comparison2) {
  return compareClearType(
    comparison1.result2?.clearType ?? "NO PLAY",
    comparison2.result2?.clearType ?? "NO PLAY",
  );
}

function compareComparisonOrderByPlayer1MissCount(comparison1, comparison2) {
  return compareResultOrderByPlayerMissCount(
    comparison1.result1,
    comparison2.result1,
  );
}

function compareComparisonOrderByPlayer2MissCount(comparison1, comparison2) {
  return compareResultOrderByPlayerMissCount(
    comparison1.result2,
    comparison2.result2,
  );
}

function compareComparisonOrderByScoreDiff(comparison1, comparison2) {
  const diff1 = comparison1.scoreDiff;
  const diff2 = comparison2.scoreDiff;

  if (diff1 != null && diff2 != null) return diff2 - diff1;

  if (diff1 == null && diff2 != null) return 1;
  if (diff1 != null && diff2 == null) return -1;

  const nomDiff1 = comparison1.nominalScoreDiff;
  const nomDiff2 = comparison2.nominalScoreDiff;

  if (nomDiff1 != null && nomDiff2 != null) return nomDiff2 - nomDiff1;

  if (nomDiff1 == null && nomDiff2 != null) return 1;
  if (nomDiff1 != null && nomDiff2 == null) return -1;

  return 0;
}

function compareComparisonOrderByClearDiff(comparison1, comparison2) {
  // 勝敗による順序付け
  const winLoseOrder1 = getComparisonOrderByClearDiffWinLose(comparison1);
  const winLoseOrder2 = getComparisonOrderByClearDiffWinLose(comparison2);
  const winLoseOrderDelta = winLoseOrder1 - winLoseOrder2;
  if (winLoseOrderDelta !== 0) {
    return winLoseOrderDelta;
  }

  // 勝敗が同じ場合の、より細かい順序付け
  switch (winLoseOrder1) {
    // 両者NO PLAY同士
    case 2:
      return 0;

    // 引き分け同士
    case 0:
      // クリアランプの強い方を先にする
      return compareComparisonOrderByPlayer1ClearType(comparison2, comparison1);

    // プレイヤー1の勝ち同士
    case -1: {
      // プレイヤー1のクリアランプの強い方を先にする
      const player1ClearTypeDelta = compareComparisonOrderByPlayer1ClearType(
        comparison2,
        comparison1,
      );
      if (player1ClearTypeDelta !== 0) {
        return player1ClearTypeDelta;
      }
      // プレイヤー1のクリアランプが同じなら、プレイヤー2のクリアランプの弱い方を先にする
      return compareComparisonOrderByPlayer2ClearType(comparison1, comparison2);
    }

    // プレイヤー2の勝ち同士
    case 1: {
      // プレイヤー2のクリアランプの弱い方を先にする
      const player2ClearTypeDelta = compareComparisonOrderByPlayer2ClearType(
        comparison1,
        comparison2,
      );
      if (player2ClearTypeDelta !== 0) {
        return player2ClearTypeDelta;
      }
      // プレイヤー2のクリアランプが同じなら、プレイヤー1のクリアランプの強い方を先にする
      return compareComparisonOrderByPlayer1ClearType(comparison2, comparison1);
    }

    default:
      throw new Error(`Unexpected win-lose order: ${winLoseOrder1}`);
  }
}

function getComparisonOrderByClearDiffWinLose(comparison) {
  // プレイヤー1の勝ち -> 引き分け -> プレイヤー2の勝ち -> 両者NO PLAY

  const clearType1 = comparison.result1?.clearType ?? "NO PLAY";
  const clearType2 = comparison.result2?.clearType ?? "NO PLAY";

  if (clearType1 === "NO PLAY" && clearType2 === "NO PLAY") return 2; // 両者NO PLAY

  const delta = compareClearType(clearType1, clearType2);
  if (delta > 0) return -1; // プレイヤー1の勝ち
  if (delta < 0) return 1; // プレイヤー2の勝ち
  return 0; // 引き分け
}
