
/**
 * 若旦那版・企業図鑑
 * 株価データ共通形式変換・検証
 *
 * 取得元ごとのデータを共通形式に整える。
 * このファイルではDBへの保存は行わない。
 */

window.StockDataNormalizer = (() => {

  /**
   * 数値を検証して変換する
   */
  function toNumber(value, field, options = {}) {
    const { required = false, integer = false, min = 0 } = options;

    if (value === null || value === undefined || value === "") {
      if (required) {
        throw new Error(`${field} は必須です。`);
      }
      return null;
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
      throw new Error(`${field} は数値で指定してください。`);
    }

    if (integer && !Number.isSafeInteger(number)) {
      throw new Error(`${field} は整数で指定してください。`);
    }

    if (number < min) {
      throw new Error(`${field} は ${min} 以上で指定してください。`);
    }

    return number;
  }

  /**
   * 日付を検証する
   */
  function validateDate(value) {
    if (
      typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
      throw new Error(
        "target_date は YYYY-MM-DD 形式で指定してください。"
      );
    }

    const date = new Date(`${value}T00:00:00Z`);

    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      throw new Error("target_date が実在する日付ではありません。");
    }

    return value;
  }

  /**
   * 取得日時を検証する
   */
  function validateFetchedAt(value) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("fetched_at は必須です。");
    }

    const timestamp = Date.parse(value);

    if (!Number.isFinite(timestamp)) {
      throw new Error("fetched_at の日時形式が不正です。");
    }

    return new Date(timestamp).toISOString();
  }

  /**
   * 1件の株価データを共通形式に変換する
   */
  function normalizePriceRecord(record) {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      throw new Error("株価データの形式が不正です。");
    }

    const companyId = toNumber(
      record.company_id,
      "company_id",
      { required: true, integer: true, min: 1 }
    );

    const targetDate = validateDate(record.target_date);

    const openPrice = toNumber(record.open_price, "open_price", {
      min: 0
    });

    const highPrice = toNumber(record.high_price, "high_price", {
      min: 0
    });

    const lowPrice = toNumber(record.low_price, "low_price", {
      min: 0
    });

    const closePrice = toNumber(record.close_price, "close_price", {
      required: true,
      min: 0.000001
    });

    const volume = toNumber(record.volume, "volume", {
      integer: true,
      min: 0
    });

    if (
      highPrice !== null &&
      lowPrice !== null &&
      highPrice < lowPrice
    ) {
      throw new Error("high_price が low_price より小さくなっています。");
    }

    const prices = [
      openPrice,
      closePrice,
      lowPrice
    ].filter(value => value !== null);

    if (
      highPrice !== null &&
      prices.some(value => highPrice < value)
    ) {
      throw new Error("high_price が他の価格より小さくなっています。");
    }

    if (
      lowPrice !== null &&
      prices.some(value => lowPrice > value)
    ) {
      throw new Error("low_price が他の価格より大きくなっています。");
    }

    if (
      typeof record.source !== "string" ||
      record.source.trim() === ""
    ) {
      throw new Error("source は空でない文字列で指定してください。");
    }

    const fetchedAt = validateFetchedAt(record.fetched_at);

    return {
      company_id: companyId,
      target_date: targetDate,
      open_price: openPrice,
      high_price: highPrice,
      low_price: lowPrice,
      close_price: closePrice,
      volume,
      source: record.source.trim(),
      fetched_at: fetchedAt
    };
  }

  /**
   * 複数件の株価データを変換する
   */
  function normalizePriceRecords(records) {
    if (!Array.isArray(records) || records.length === 0) {
      throw new Error("株価データがありません。");
    }

    const normalized = records.map(normalizePriceRecord);
    const uniqueKeys = new Set();

    for (const record of normalized) {
      const key = `${record.company_id}:${record.target_date}`;

      if (uniqueKeys.has(key)) {
        throw new Error(
          `企業ID ${record.company_id}・${record.target_date} が重複しています。`
        );
      }

      uniqueKeys.add(key);
    }

    return normalized;
  }

  return {
    normalizePriceRecord,
    normalizePriceRecords
  };

})();
