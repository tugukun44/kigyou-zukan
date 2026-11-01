
// IR資料一覧の取得・表示
// 既存のapp.js・stock-import.jsとは独立して動作する

window.loadIRDocuments = async function (companyId, container) {
  if (!container) {
    console.error("IR資料の表示先が見つかりません。");
    return;
  }

  container.replaceChildren();

  const panel = document.createElement("div");
  panel.className = "section panel";

  const heading = document.createElement("h3");
  heading.textContent = "IR資料";
  panel.appendChild(heading);

  const message = document.createElement("p");
  message.textContent = "IR資料を取得中...";
  panel.appendChild(message);

  container.appendChild(panel);

  try {
    const { data, error } = await window.supabaseClient
      .from("ir_documents")
      .select(
        "id, document_type, title, published_at, document_url, storage_path"
      )
      .eq("company_id", companyId)
      .order("published_at", {
        ascending: false,
        nullsFirst: false
      });

    if (error) throw error;

    panel.removeChild(message);

    if (!data || data.length === 0) {
      message.textContent = "登録されているIR資料はありません。";
      panel.appendChild(message);
      return;
    }

    const typeLabels = {
      earnings_release: "決算短信",
      earnings_presentation: "決算説明資料",
      securities_report: "有価証券報告書",
      timely_disclosure: "適時開示",
      other: "その他"
    };

    for (const item of data) {
      const article = document.createElement("div");
      article.className = "section";

      const title = document.createElement("p");
      title.textContent = item.title || "資料名なし";
      article.appendChild(title);

      const metadata = document.createElement("p");
      metadata.className = "meta";

      const type =
        typeLabels[item.document_type] || item.document_type;

      metadata.textContent =
        `${type} ／ 公開日：${item.published_at || "不明"}`;

      article.appendChild(metadata);

      const link = document.createElement("a");
      link.textContent = "PDFを開く";
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      if (item.storage_path) {
        const { data: fileData, error: fileError } =
          await window.supabaseClient.storage
            .from("ir-documents")
            .createSignedUrl(item.storage_path, 3600);

        if (fileError) {
          console.error("PDF URLの発行に失敗:", fileError);

          const errorMessage = document.createElement("p");
          errorMessage.className = "meta";
          errorMessage.textContent = "PDFを開けませんでした。";

          article.appendChild(errorMessage);
          panel.appendChild(article);
          continue;
        }

        link.href = fileData.signedUrl;
      } else if (item.document_url) {
        link.href = item.document_url;
      } else {
        const unavailable = document.createElement("p");
        unavailable.textContent = "PDFの保存先がありません。";
        article.appendChild(unavailable);
        panel.appendChild(article);
        continue;
      }

      article.appendChild(link);
      panel.appendChild(article);
    }

  } catch (error) {
    console.error("IR資料の取得に失敗:", error);

    message.textContent =
      "IR資料の取得に失敗しました：" + error.message;
  }
};
