import { compareChart, parseIidxCsv } from "../shared/iidx.js";
import ValidatableField from "../shared/validation/validatable_field.js";
import { RuleIidxCsv } from "../shared/validation/rules/iidx.js";

const inputsCsv = [1, 2].map((i) => document.getElementById(`inputCsv${i}`));
const warningCaptionsCsv = [1, 2].map((i) =>
  document.getElementById(`warningCaptionCsv${i}`),
);
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

  const tbody = tableComparison.tBodies[0];

  // テーブルのリセット
  tbody.replaceChildren();

  const [records1, records2] = inputsCsv.map((inputCsv) =>
    parseIidxCsv(inputCsv.value),
  );

  const comparisons = makeRecordComparisons(compareChart, records1, records2);
  for (const comparison of comparisons) {
    addComparisonRow(tbody, comparison);
  }
});

function addComparisonRow(tbody, comparison) {
  const row = tbody.insertRow();
  row.insertCell().textContent = comparison.chart.song.version;
  row.insertCell().textContent = comparison.chart.song.title;
  row.insertCell().textContent = comparison.chart.difficulty;
  row.insertCell().textContent = comparison.chart.level;

  const clearType1Cell = row.insertCell();
  clearType1Cell.textContent = comparison.result1?.clearType;
  clearType1Cell.classList.add(
    getClassNameForClearType(comparison.result1?.clearType),
  );
  const clearType2Cell = row.insertCell();
  clearType2Cell.textContent = comparison.result2?.clearType;
  clearType2Cell.classList.add(
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

function* makeRecordComparisons(compareChart, records1, records2) {
  // ソート
  const [sortedRecords1, sortedRecords2] = [records1, records2].map((records) =>
    [...records].sort((left, right) => compareChart(left.chart, right.chart)),
  );

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

  // 片方に無い曲を補完しながら比較を生成
  let [i1, i2] = [0, 0];
  while (i1 < sortedRecords1.length || i2 < sortedRecords2.length) {
    const [record1, record2] = [sortedRecords1[i1], sortedRecords2[i2]];

    const delta = compare(record1, record2);
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
  return {
    chart,
    result1,
    result2,
    missCountWinLose1,
    missCountWinLose2,
    scoreWinLose1,
    scoreWinLose2,
    scoreDiff,
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
