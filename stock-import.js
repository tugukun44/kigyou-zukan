/**
 * 若旦那版・企業図鑑
 * 株価データ取込の共通処理
 *
 * 現段階では実データ取得は行わない。
 * 株価保存・処理ログ・取得状態管理を行う。
 */

window.StockImport = (() => {

  /**
   * 株価データの検証
   */
  function validatePrice(record) {
    if (!record || typeof record !== "object") {
      throw new Error("株価データの形式が不正です。");
    }

    if (
      !Number.isSafeInteger(Number(record.company_id)) ||
      Number(record.company_id) <= 0
    ) {
      throw new Error("company_id は正の整数で指定してください。");
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
        (
          !Number.isFinite(Number(record[field])) ||
          Number(record[field]) <= 0
        )
      ) {
        throw new Error(`${field} の値が不正です。`);
      }
    }

    if (
      record.volume !== null &&
      record.volume !== undefined &&
      (
        !Number.isSafeInteger(Number(record.volume)) ||
        Number(record.volume) < 0
      )
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
   * 処理ログの終了状態を更新
   */
  async function finishLog(client, logId, status, details = {}) {
    const { error } = await client
      .from("collection_logs")
      .update({
        status,
        finished_at: new Date().toISOString(),
        ...details
      })
      .eq("id", logId);

    if (error) {
      throw new Error(`処理ログの更新に失敗しました：${error.message}`);
    }
  }

  /**
   * 企業・対象日ごとの取得状態を更新
   */
  async function updateAcquisitionStatus(client, record) {
    const now = new Date().toISOString();

    const { data, error: selectError } = await client
      .from("data_acquisition_statuses")
      .select("id")
      .eq("data_kind", "stock_price")
      .eq("scope_type", "company")
      .eq("scope_key", String(record.company_id))
      .eq("target_date", record.target_date)
      .maybeSingle();

    if (selectError) {
      throw new Error(`取得状態の確認に失敗しました：${selectError.message}`);
    }

    const statusData = {
      processing_status: "success",
      data_presence: "present",
      freshness: "unknown",
      last_attempt_at: now,
      last_confirmed_at: now,
      updated_at: now
    };

    let result;

    if (data) {
      result = await client
        .from("data_acquisition_statuses")
        .update(statusData)
        .eq("id", data.id);
    } else {
      result = await client
        .from("data_acquisition_statuses")
        .insert({
          data_kind: "stock_price",
          scope_type: "company",
          scope_key: String(record.company_id),
          target_date: record.target_date,
          ...statusData
        });
    }

    if (result.error) {
      throw new Error(`取得状態の保存に失敗しました：${result.error.message}`);
    }
  }

  /**
   * 株価データを保存し、処理ログと取得状態を記録する
   */
  async function savePrices(records) {
    const client = window.supabaseClient;

    if (!client) {
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

    // 1. 処理開始ログ
    const { data: log, error: logError } = await client
      .from("collection_logs")
      .insert({
        job_name: "stock_price_import",
        target_type: "stock_price",
        target_key: `${payload.length} records`,
        status: "started",
        message: "株価保存処理を開始しました。",
        metadata: {
          submitted_count: payload.length
        }
      })
      .select("id")
      .single();

    if (logError || !log) {
      throw new Error(
        `処理開始ログを記録できません：${logError?.message || "ログIDなし"}`
      );
    }

    // 2. 株価保存
    let saveResult;

    try {
      const { error, count } = await client
        .from("stock_prices")
        .upsert(payload, {
          onConflict: "company_id,target_date",
          ignoreDuplicates: true,
          count: "exact"
        });

      if (error) {
        throw new Error(error.message);
      }

      saveResult = {
        submitted: payload.length,
        affected: count
      };

    } catch (error) {
      await finishLog(client, log.id, "failed", {
        error_code: "STOCK_PRICE_SAVE_FAILED",
        error_message: error.message,
        message: "株価保存に失敗しました。"
      });

      throw new Error(`株価データの保存に失敗しました：${error.message}`);
    }

    // 3. 取得状態の更新
    const statusErrors = [];

    for (const record of records) {
      try {
        await updateAcquisitionStatus(client, record);
      } catch (error) {
        statusErrors.push({
          company_id: record.company_id,
          target_date: record.target_date,
          message: error.message
        });
      }
    }

    // 4. 処理ログの終了
    if (statusErrors.length > 0) {
      await finishLog(client, log.id, "partial_success", {
        record_count: saveResult.submitted,
        error_code: "ACQUISITION_STATUS_UPDATE_FAILED",
        error_message: JSON.stringify(statusErrors),
        message: "株価保存成功。一部の取得状態更新に失敗しました。"
      });

      return {
        ...saveResult,
        status: "partial_success",
        statusErrors,
        message: "株価保存は成功しましたが、一部の取得状態更新に失敗しました。"
      };
    }

    await finishLog(client, log.id, "success", {
      record_count: saveResult.submitted,
      message: "株価保存・取得状態更新が完了しました。"
    });

    return {
      ...saveResult,
      status: "success",
      message: "株価保存・取得状態更新が完了しました。"
    };
  }

  // 外部から利用する機能を公開
  return {
    validatePrice,
    savePrices
  };

})();
