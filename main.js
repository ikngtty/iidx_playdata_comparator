const inputCsv = document.getElementById("inputCsv");
const buttonView = document.getElementById("buttonView");
const viewTable = document.getElementById("viewTable");

buttonView.addEventListener("click", () => {
  const tbody = viewTable.tBodies[0];

  tbody.replaceChildren();

  const records = parseIidxCsv(inputCsv.value);

  for (const record of records) {
    const row = tbody.insertRow();
    row.insertCell().textContent = record.song.version;
    row.insertCell().textContent = record.song.title;
    row.insertCell().textContent = record.chart.difficulty;
    row.insertCell().textContent = record.chart.level;
    row.insertCell().textContent = record.result.clearType;
    row.insertCell().textContent = record.result.missCount;
    row.insertCell().textContent = record.result.djLevel;
    row.insertCell().textContent = record.result.score;
  }
});

function* parseIidxCsv(text) {
  for (const row of parseCsv(text)) {
    const song = {
      version: row["バージョン"],
      title: row["タイトル"],
    };

    for (const difficulty of [
      "BEGINNER",
      "NORMAL",
      "HYPER",
      "ANOTHER",
      "LEGGENDARIA",
    ]) {
      const level = row[`${difficulty} 難易度`];
      if (level === "0") {
        continue;
      }

      const chart = {
        difficulty,
        level,
      };

      const result = {
        clearType: row[`${difficulty} クリアタイプ`],
        missCount: row[`${difficulty} ミスカウント`],
        djLevel: row[`${difficulty} DJ LEVEL`],
        score: row[`${difficulty} スコア`],
      };

      yield { song, chart, result };
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
