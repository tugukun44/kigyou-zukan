let selectedCompany = null;
let selectedHypothesis = null;

function showList() {
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  document.getElementById("company-list").classList.remove("hidden");
}


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
      strengths: data.strengths || [],
      risks: data.risks || [],
      mediumView: data.medium_view,
      longView: data.long_view
    };

    selectedCompany = c;

    detail.innerHTML = `
      <h2>${c.name} <span class="meta">(${c.code})</span></h2>
      <span class="tag">${c.status}</span>

      <div class="section panel">
        <h3>30秒結論</h3>
        <p>${c.reason}</p>
      </div>

      <div class="section panel">
        <h3>評価</h3>
        <p>好き度：${c.like}</p>
        <p>企業評価：${c.evaluation}</p>
        <p>中期：${c.medium}</p>
        <p>長期：${c.long}</p>
      </div>

      <div class="section panel">
        <h3>強み</h3>
        <ul>${c.strengths.map(x => `<li>${x}</li>`).join("")}</ul>
      </div>

      <div class="section panel">
        <h3>リスク</h3>
        <ul>${c.risks.map(x => `<li>${x}</li>`).join("")}</ul>
      </div>

      <div class="section panel">
        <h3>中期の見方</h3>
        <p>${c.mediumView}</p>
      </div>

      <div class="section panel">
        <h3>長期の見方</h3>
        <p>${c.longView}</p>
      </div>

      <button class="primary" onclick="openHypothesis('${c.code}')">
        この会社で仮説トレーニング
      </button>
    `;

    document.querySelectorAll(".view")
      .forEach(v => v.classList.add("hidden"));

    document.getElementById("company-detail")
      .classList.remove("hidden");

  } catch (error) {
    detail.innerHTML =
      `<p>企業情報の取得に失敗しました：${error.message}</p>`;
  }
}


function openHypothesis(code) {
  selectedCompany = companies.find(c => c.code === code);
  selectedHypothesis = null;

  document.getElementById("hypothesis-content").innerHTML = `
    <h2>${selectedCompany.name}：仮説トレーニング</h2>
    <div class="panel">
      <p><strong>問い：</strong>今後、中期的にこの会社の利益や企業価値を左右するものは何だと思いますか？</p>

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

  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  document.getElementById("hypothesis").classList.remove("hidden");
}

function chooseHypothesis(option) {
  selectedHypothesis = option;
  document.getElementById("reason-area").innerHTML = `
    <div class="section">
      <p><strong>${option}を選択しました。</strong></p>
      <p>なぜそう思いましたか？</p>
      <textarea id="reason" placeholder="自分の言葉で1文でもOK"></textarea>
      <button class="primary" onclick="saveHypothesis()">仮説を保存</button>
      <div id="save-result"></div>
    </div>
  `;
}

function saveHypothesis() {
  const reason = document.getElementById("reason").value.trim();
  if (!reason) {
    document.getElementById("save-result").innerHTML =
      `<div class="notice">理由を1文でも書いてから保存してください。</div>`;
    return;
  }

  const record = {
    savedAt: new Date().toISOString(),
    company: selectedCompany.name,
    code: selectedCompany.code,
    hypothesis: selectedHypothesis,
    reason
  };

  const saved = JSON.parse(localStorage.getItem("hypotheses") || "[]");
  saved.push(record);
  localStorage.setItem("hypotheses", JSON.stringify(saved));

  document.getElementById("save-result").innerHTML = `
    <div class="notice">
      保存しました。<br>
      この時点の仮説と理由を、後から振り返れる形で記録しています。
    </div>
  `;
}

async function renderCompanies() {
  const container = document.getElementById("companies");

  try {
    const { data, error } = await window.supabaseClient
      .from("companies")
      .select("stock_code, company_name")
      .order("stock_code");

    if (error) throw error;

    container.innerHTML = data.map(c => `
      <div class="card" onclick="openCompany('${c.stock_code}')">
        <h3>${c.company_name}</h3>
        <div class="meta">${c.stock_code}</div>
      </div>
    `).join("");

  } catch (error) {
    container.innerHTML = companies.map(c => `
      <div class="card" onclick="openCompany('${c.code}')">
        <h3>${c.name}</h3>
        <div class="meta">${c.code}</div>
        <span class="tag">${c.status}</span>
        <p>好き度：${c.like}</p>
        <p>企業評価：${c.evaluation}</p>
        <p>中期：${c.medium}　長期：${c.long}</p>
      </div>
    `).join("");
  }
}

renderCompanies();
// Supabase接続確認用
async function testSupabaseConnection() {
  const result = document.createElement("p");
  result.id = "supabase-status";
  result.textContent = "Supabase接続を確認中...";
  document.querySelector("main").prepend(result);

  try {
    const { data, error } = await window.supabaseClient
      .from("companies")
      .select("stock_code, company_name")
      .limit(5);

    if (error) throw error;

    result.textContent =
      "Supabase接続成功：" +
      data.map(c => `${c.company_name}（${c.stock_code}）`).join("、");
  } catch (error) {
    result.textContent = "接続エラー：" + error.message;
  }
}
// Supabaseログイン画面
const loginPanel = document.createElement("section");
loginPanel.className = "panel";
loginPanel.innerHTML = `
  <h2>データベース接続テスト</h2>
  <form id="supabase-login-form">
    <p>
      <label>メールアドレス<br>
        <input id="supabase-email" type="email" required>
      </label>
    </p>
    <p>
      <label>パスワード<br>
        <input id="supabase-password" type="password" required>
      </label>
    </p>
    <button class="primary" type="submit">ログインして接続確認</button>
    <p id="login-result" aria-live="polite"></p>
  </form>
`;
document.querySelector("main").prepend(loginPanel);

document.getElementById("supabase-login-form")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const result = document.getElementById("login-result");
    result.textContent = "ログイン中...";

    const { error } = await window.supabaseClient.auth.signInWithPassword({
      email: document.getElementById("supabase-email").value.trim(),
      password: document.getElementById("supabase-password").value
    });

    if (error) {
      result.textContent = "ログインエラー：" + error.message;
      return;
    }

    result.textContent = "ログイン成功。データを取得しています...";
    await testSupabaseConnection();
await renderCompanies();
  });
