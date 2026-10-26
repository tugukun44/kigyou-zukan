
/**
 * 若旦那版・企業図鑑
 * 株価データ取込の共通処理
 *
 * 現段階では実データ取得は行わない。
 * 取得元API接続後も使える保存処理を用意する。
 */

window.stockImporter = (() => {
  /**
   * 株価データを検証する
   * company_id、対象日、終値は必須。
   */
  function validatePrice(record) {
    if (!record || typeof record !== "object") {
      throw new Error("株価データの形式が不正です。");
    }

    if (!Number.isInteger(Number(record.company_id))) {
      throw new Error("company_id は整数で指定してください。");
    }

    if (
      typeof record.target_date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(record.target_date)
    ) {
      throw new Error("target_date は YYYY-MM-DD 形式で指定してください。");
    }

    const date = new Date(`${record.target_date}T00:00:00Z`);

    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== record.target_date
    ) {
      throw new Error("target_date が実在する日付ではありません。");
    }

    if (
      record.close_price === null ||
      record.close_price === undefined ||
      !Number.isFinite(Number(record.close_price)) ||
      Number(record.close_price) <= 0
    ) {
      throw new Error("close_price は正の数値で指定してください。");
    }

    for (const field of ["open_price", "high_price", "low_price"]) {
      if (
        record[field] !== null &&
        record[field] !== undefined &&
        (!Number.isFinite(Number(record[field])) ||
          Number(record[field]) <= 0)
      ) {
        throw new Error(`${field} の値が不正です。`);
      }
    }

    if (
      record.volume !== null &&
      record.volume !== undefined &&
      (!Number.isSafeInteger(Number(record.volume)) ||
        Number(record.volume) < 0)
    ) {
      throw new Error("volume は0以上の整数で指定してください。");
    }

    if (
      record.source !== undefined &&
      record.source !== null &&
      typeof record.source !== "string"
    ) {
      throw new Error("source は文字列で指定してください。");
    }
  }

  /**
   * 株価データを保存する
   *
   * 同一企業・同一日付が存在する場合は上書きせずスキップ。
   */
  async function savePrices(records) {
    if (!window.supabaseClient) {
      throw new Error("Supabaseクライアントが初期化されていません。");
    }

    if (!Array.isArray(records) || records.length === 0) {
      throw new Error("保存する株価データがありません。");
    }

    records.forEach(validatePrice);

    const uniqueKeys = new Set();

    for (const record of records) {
      const key = `${record.company_id}:${record.target_date}`;

      if (uniqueKeys.has(key)) {
        throw new Error(
          `入力データ内で企業ID ${record.company_id}・` +
          `${record.target_date} が重複しています。`
        );
      }

      uniqueKeys.add(key);
    }

    const payload = records.map(record => ({
      company_id: Number(record.company_id),
      target_date: record.target_date,
      open_price: record.open_price ?? null,
      high_price: record.high_price ?? null,
      low_price: record.low_price ?? null,
      close_price: Number(record.close_price),
      volume: record.volume ?? null,
      source: record.source || "unknown"
    }));

    const { error, count } = await window.supabaseClient
      .from("stock_prices")
      .upsert(payload, {
        onConflict: "company_id,target_date",
        ignoreDuplicates: true,
        count: "exact"
      });

    if (error) {
      console.error("株価データの保存に失敗しました:", error);
      throw new Error(`株価データの保存に失敗しました：${error.message}`);
    }

    return {
      submitted: payload.length,
      affected: count,
      message: "株価データの保存処理が完了しました。"
    };
  }

  return {
    validatePrice,
    savePrices
  };
})();
