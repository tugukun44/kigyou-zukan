
let selectedCompany = null;
let selectedHypothesis = null;

// HTMLへ埋め込む文字列をエスケープ
function escapeHypothesisText(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

// 企業一覧へ戻る
function showList() {
  document.querySelectorAll(".view")
    .forEach(v => v.classList.add("hidden"));

  document.getElementById("company-list")
    .classList.remove("hidden");
}

// 企業詳細を開く
async function openCompany(code) {
  const detail = document.getElementById("detail");
  detail.innerHTML = "<p>企業情報を取得中...</p>";

  try {
    const { data, error } = await window.supabaseClient
      .from("companies")
      .select("*")
      .eq("stock_code", code)
      .single();

    if (error) throw error;

    const c = {
      code: data.stock_code,
      name: data.company_name,
      status: data.status,
      like: data.like,
      evaluation: data.evaluation ?? "—",
      medium: data.medium,
      long: data.long,
      reason: data.reason,
      strengths: Array.isArray(data.strengths) ? data.strengths : [],
      risks: Array.isArray(data.risks) ? data.risks : [],
      mediumView: data.medium_view,
      longView: data.long_view
    };

    selectedCompany = c;

    detail.innerHTML = `
      <h2>${escapeHypothesisText(c.name)}
        <span class="meta">(${escapeHypothesisText(c.code)})</span>
      </h2>

      <span class="tag">${escapeHypothesisText(c.status)}</span>

      <div class="section panel">
        <h3>30秒結論</h3>
        <p>${escapeHypothesisText(c.reason)}</p>
      </div>

      <div class="section panel">
        <h3>評価</h3>
        <p>好き度：${escapeHypothesisText(c.like)}</p>
        <p>企業評価：${escapeHypothesisText(c.evaluation)}</p>
        <p>中期：${escapeHypothesisText(c.medium)}</p>
        <p>長期：${escapeHypothesisText(c.long)}</p>
      </div>

      <div class="section panel">
        <h3>強み</h3>
        <ul>
          ${c.strengths.map(x =>
            `<li>${escapeHypothesisText(x)}</li>`
          ).join("")}
        </ul>
      </div>

      <div class="section panel">
        <h3>リスク</h3>
        <ul>
          ${c.risks.map(x =>
            `<li>${escapeHypothesisText(x)}</li>`
          ).join("")}
        </ul>
      </div>

      <div class="section panel">
        <h3>中期の見方</h3>
        <p>${escapeHypothesisText(c.mediumView)}</p>
      </div>

      <div class="section panel">
        <h3>長期の見方</h3>
        <p>${escapeHypothesisText(c.longView)}</p>
      </div>

      <button class="primary"
        onclick="openHypothesis('${escapeHypothesisText(c.code)}')">
        この会社で仮説トレーニング
      </button>
    `;

    document.querySelectorAll(".view")
      .forEach(v => v.classList.add("hidden"));

    document.getElementById("company-detail")
      .classList.remove("hidden");

  } catch (error) {
    console.error("企業詳細の取得に失敗しました:", error);
    detail.innerHTML = `
      <div class="notice">
        企業情報の取得に失敗しました：
        ${escapeHypothesisText(error.message)}
      </div>
    `;
  }
}

// 仮説トレーニングを開く
function openHypothesis(code) {
  if (!selectedCompany || selectedCompany.code !== code) {
    alert("企業情報を取得し直してください。");
    return;
  }

  selectedHypothesis = null;

  document.getElementById("hypothesis-content").innerHTML = `
    <h2>${escapeHypothesisText(selectedCompany.name)}：仮説トレーニング</h2>

    <div class="panel">
      <p>
        <strong>問い：</strong>
        今後、中期的にこの会社の利益や企業価値を左右するものは何だと思いますか？
      </p>

      <button class="option" onclick="chooseHypothesis('A')">
        <strong>A</strong>　市場環境・市況の変化が主因になる
      </button>

      <button class="option" onclick="chooseHypothesis('B')">
        <strong>B</strong>　既存事業の需要・シェア拡大が主因になる
      </button>

      <button class="option" onclick="chooseHypothesis('C')">
        <strong>C</strong>　新製品・新規事業・設備投資が主因になる
      </button>

      <button class="option" onclick="chooseHypothesis('D')">
        <strong>D</strong>　経営戦略・資本配分の変化が主因になる
      </button>

      <div id="reason-area"></div>
    </div>
  `;

  document.querySelectorAll(".view")
    .forEach(v => v.classList.add("hidden"));

  document.getElementById("hypothesis")
    .classList.remove("hidden");
}

// 仮説の選択
function chooseHypothesis(option) {
  selectedHypothesis = option;

  document.getElementById("reason-area").innerHTML = `
    <div class="section">
      <p><strong>${escapeHypothesisText(option)}を選択しました。</strong></p>
      <p>なぜそう思いましたか？</p>

      <textarea id="reason"
        placeholder="自分の言葉で1文でもOK"></textarea>

      <button class="primary" onclick="saveHypothesis()">
        仮説を保存
      </button>

      <div id="save-result"></div>
    </div>
  `;
}

// 仮説をSupabaseに保存
async function saveHypothesis() {
  const reasonElement = document.getElementById("reason");
  const result = document.getElementById("save-result");

  const reason = reasonElement.value.trim();

  if (!selectedCompany || !selectedHypothesis) {
    result.innerHTML =
      `<div class="notice">企業と仮説を選択してください。</div>`;
    return;
  }

  if (!reason) {
    result.innerHTML =
      `<div class="notice">理由を1文でも書いてから保存してください。</div>`;
    return;
  }

  const { data: { user }, error: userError } =
    await window.supabaseClient.auth.getUser();

  if (userError || !user) {
    result.innerHTML =
      `<div class="notice">ログインしてください。記録は保存されていません。</div>`;
    return;
  }

  const record = {
    user_id: user.id,
    company_name: selectedCompany.name,
    stock_code: selectedCompany.code,
    hypothesis: selectedHypothesis,
    reason: reason
  };

  result.textContent = "保存中...";

  const { error } = await window.supabaseClient
    .from("hypotheses")
    .insert(record);

  if (error) {
    console.error("仮説の保存に失敗しました:", error);
    result.innerHTML = `
      <div class="notice">
        保存に失敗しました：
        ${escapeHypothesisText(error.message)}
      </div>
    `;
    return;
  }

  result.innerHTML = `
    <div class="notice">
      保存しました。<br>
      この時点の仮説と理由を、後から振り返れる形で記録しています。
    </div>
  `;
}

// 企業一覧と最新株価を取得して表示
async function renderCompanies() {
  const container = document.getElementById("companies");

  container.innerHTML = "<p>企業データを取得中...</p>";

  try {
    const { data: companiesData, error: companiesError } =
      await window.supabaseClient
        .from("companies")
        .select("id, stock_code, company_name")
        .order("stock_code");

    if (companiesError) throw companiesError;

    const { data: pricesData, error: pricesError } =
      await window.supabaseClient
        .from("stock_latest")
        .select("company_id, close_price, target_date");

    if (pricesError) throw pricesError;

    const pricesByCompanyId = new Map(
      (pricesData || []).map(price => [
        String(price.company_id),
        price
      ])
    );

    if (!companiesData || companiesData.length === 0) {
      container.innerHTML = "<p>登録されている企業はありません。</p>";
      return;
    }

    container.innerHTML = companiesData.map(company => {
      const price = pricesByCompanyId.get(String(company.id));

      const latestPrice = price
        ? `${Number(price.close_price).toLocaleString("ja-JP")}円`
        : "株価データなし";

      const priceDate = price
        ? `対象日：${escapeHypothesisText(price.target_date)}`
        : "対象日：—";

      return `
        <div class="card"
          onclick="openCompany('${escapeHypothesisText(company.stock_code)}')">

          <h3>${escapeHypothesisText(company.company_name)}</h3>

          <div class="meta">
            ${escapeHypothesisText(company.stock_code)}
          </div>

          <p>最新終値：<strong>${latestPrice}</strong></p>
          <p class="meta">${priceDate}</p>
        </div>
      `;
    }).join("");

  } catch (error) {
    console.error("企業一覧の取得に失敗しました:", error);

    container.innerHTML = `
      <div class="notice">
        企業データまたは株価データの取得に失敗しました。<br>
        詳細はブラウザのコンソールを確認してください。
      </div>
    `;
  }
}

// Supabase接続確認
async function testSupabaseConnection() {
  let result = document.getElementById("supabase-status");

  if (!result) {
    result = document.createElement("p");
    result.id = "supabase-status";
    document.querySelector("main").prepend(result);
  }

  result.textContent = "Supabase接続を確認中...";

  try {
    const { data, error } = await window.supabaseClient
      .from("companies")
      .select("stock_code, company_name")
      .limit(5);

    if (error) throw error;

    result.textContent =
      "Supabase接続成功：" +
      data.map(c =>
        `${escapeHypothesisText(c.company_name)}（${escapeHypothesisText(c.stock_code)}）`
      ).join("、");

  } catch (error) {
    result.textContent =
      "接続エラー：" + error.message;
  }
}

// ログイン画面
const loginPanel = document.createElement("section");
loginPanel.className = "panel";

loginPanel.innerHTML = `
  <h2>データベース接続テスト</h2>

  <form id="supabase-login-form">
    <p>
      <label>
        メールアドレス<br>
        <input id="supabase-email" type="email" required>
      </label>
    </p>

    <p>
      <label>
        パスワード<br>
        <input id="supabase-password" type="password" required>
      </label>
    </p>

    <button class="primary" type="submit">
      ログインして接続確認
    </button>

    <p id="login-result" aria-live="polite"></p>
  </form>
`;

document.querySelector("main").prepend(loginPanel);

// ログイン処理
document.getElementById("supabase-login-form")
  .addEventListener("submit", async event => {
    event.preventDefault();

    const result = document.getElementById("login-result");
    const submitButton = event.submitter;

    result.textContent = "ログイン中...";

    if (submitButton) submitButton.disabled = true;

    try {
      const { error } = await window.supabaseClient.auth
        .signInWithPassword({
          email: document.getElementById("supabase-email").value.trim(),
          password: document.getElementById("supabase-password").value
        });

      if (error) throw error;

      result.textContent = "ログイン成功。データを取得しています...";

      await testSupabaseConnection();
      await renderCompanies();

      result.textContent = "ログイン成功。企業一覧を更新しました。";

    } catch (error) {
      console.error("ログインに失敗しました:", error);

      result.textContent =
        "ログインまたはデータ取得エラー：" + error.message;

    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

// 仮説履歴を取得して表示
async function loadHypothesisHistory() {
  const container =
    document.getElementById("hypothesis-history-content");

  container.textContent = "記録を読み込み中...";

  const { data: { user }, error: userError } =
    await window.supabaseClient.auth.getUser();

  if (userError || !user) {
    container.textContent = "ログインしてください。";
    return;
  }

  const { data, error } = await window.supabaseClient
    .from("hypotheses")
    .select("saved_at, company_name, stock_code, hypothesis, reason")
    .eq("user_id", user.id)
    .order("saved_at", { ascending: false });

  if (error) {
    console.error("仮説履歴の取得に失敗しました:", error);
    container.textContent =
      "記録の取得に失敗しました：" + error.message;
    return;
  }

  if (!data || data.length === 0) {
    container.textContent = "保存された仮説記録はまだありません。";
    return;
  }

  container.innerHTML = data.map(record => `
    <div class="panel">
      <h3>
        ${escapeHypothesisText(record.company_name)}
        （${escapeHypothesisText(record.stock_code)}）
      </h3>

      <p>
        保存日時：
        ${escapeHypothesisText(
          new Date(record.saved_at).toLocaleString("ja-JP")
        )}
      </p>

      <p>
        選んだ仮説：
        ${escapeHypothesisText(record.hypothesis)}
      </p>

      <p>
        理由：
        ${escapeHypothesisText(record.reason)}
      </p>
    </div>
  `).join("");
}

// 仮説履歴画面を開く
function showHypothesisHistory() {
  document.querySelectorAll(".view")
    .forEach(v => v.classList.add("hidden"));

  document.getElementById("hypothesis-history")
    .classList.remove("hidden");

  loadHypothesisHistory();
}
