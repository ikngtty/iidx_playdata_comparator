export function mergeComparators(...comparators) {
  return (a, b) => {
    for (const comparator of comparators) {
      const result = comparator(a, b);
      if (result !== 0) {
        return result;
      }
    }
    return 0;
  };
}

export function checkCsv(text) {
  const lines = readLines(text);

  const { done, value: header } = lines.next();
  if (done) {
    return { isValid: false, line: 0, error: "No header" };
  }
  const headerNames = header.split(",");

  {
    let lineIndex = 0;
    for (const line of lines) {
      lineIndex++;
      if (line === "") {
        continue;
      }

      const items = line.split(",");
      if (items.length !== headerNames.length) {
        return {
          isValid: false,
          line: lineIndex,
          error: "Different column count",
        };
      }
    }
  }

  return { isValid: true };
}

export function* parseCsv(text) {
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

export function* readLines(text) {
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

export function firestoreTimestampToString(timestamp) {
  if (timestamp == null) return "---";

  return timestamp.toDate().toLocaleString();
}
