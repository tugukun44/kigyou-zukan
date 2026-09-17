let selectedCompany = null;
let selectedHypothesis = null;

function showList() {
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  document.getElementById("company-list").classList.remove("hidden");
}

function openCompany(code) {
  selectedCompany = companies.find(c => c.code === code);
  const c = selectedCompany;

  document.getElementById("detail").innerHTML = `
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

  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  document.getElementById("company-detail").classList.remove("hidden");
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

function renderCompanies() {
  document.getElementById("companies").innerHTML = companies.map(c => `
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

renderCompanies();
