export class RuleRequired {
  constructor(targetName) {
    this.targetName = targetName;
  }

  get errorMessage() {
    return `${this.targetName}は必須項目です。`;
  }

  valueIsValid(value) {
    return value.trim().length > 0;
  }
}

export class RuleMaxLength {
  constructor(length) {
    this.length = length;
  }

  get errorMessage() {
    return `${this.length}文字以内に収めて下さい。`;
  }

  valueIsValid(value) {
    return value.length <= this.length;
  }
}

export class RuleJustLength {
  constructor(length) {
    this.length = length;
  }

  get errorMessage() {
    return `${this.length}文字にして下さい。`;
  }

  valueIsValid(value) {
    return value.length === 0 || value.length === this.length;
  }
}

export class RuleNumeric {
  get errorMessage() {
    return "数字を入力してください。";
  }

  valueIsValid(value) {
    return /^\d*$/.test(value);
  }
}
