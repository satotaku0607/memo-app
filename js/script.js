/* ===== localStorageのメソッド練習 =====
 * （練習済みなのでコメントアウトしています）
 *
 * localStorage.setItem("myName", "さとう");      // 1. 保存
 * console.log(localStorage.getItem("myName"));   // 2. 取り出し
 * console.log(localStorage.length);              // 3. 件数
 * for (let i = 0; i < localStorage.length; i++) { // 4. i番目のキー
 *   console.log(localStorage.key(i));
 * }
 * localStorage.removeItem("myName");             // 5. 1件削除
 * localStorage.clear();                          // 6. 全削除
 */

/* ===== ここからチームタスク管理アプリ =====
 *
 * 【localStorageに保存するもの（キーは3つ）】
 *   "members" … メンバー名の配列        例）["佐藤", "藤澤"]
 *   "tasks"   … タスク（オブジェクト）の配列
 *               例）{ id: 1731..., title: "資料作成", due: "2026-11-20",
 *                     requester: "部長", status: { 佐藤: "対応中", 藤澤: "未着手" }, note: "" }
 *   "chats"   … タスクIDごとのチャット（オブジェクト）
 *               例）{ "1731...": [ { name: "佐藤", text: "よろしく", time: "11/15 22:00" } ] }
 *
 * どれも localStorage には文字列しか入らないので、
 * 保存するときは JSON.stringify()、取り出すときは JSON.parse() を使う。
 */

// ステータスの選択肢（シートのプルダウンと同じ）
const STATUS_LIST = ["未着手", "対応中", "済", "ー"];

let memberList = [];
let taskList = [];
let chatData = {};
let currentTaskId = null; // いま開いているチャットのタスクID

/* ---------- 保存・読み込み ---------- */

function saveAll() {
  localStorage.setItem("members", JSON.stringify(memberList));
  localStorage.setItem("tasks", JSON.stringify(taskList));
  localStorage.setItem("chats", JSON.stringify(chatData));
}

function loadAll() {
  const members = localStorage.getItem("members");
  const tasks = localStorage.getItem("tasks");
  const chats = localStorage.getItem("chats");

  if (members !== null) {
    memberList = JSON.parse(members);
  }
  if (tasks !== null) {
    taskList = JSON.parse(tasks);
  }
  if (chats !== null) {
    chatData = JSON.parse(chats);
  }
}

/* ---------- 便利関数 ---------- */

// 入力された文字をそのままHTMLに入れると <script> などが動いてしまうので、記号を置き換える
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// IDからタスクを探す（見つからなければ null）
function findTask(id) {
  for (let i = 0; i < taskList.length; i++) {
    if (taskList[i].id === id) {
      return taskList[i];
    }
  }
  return null;
}

// 今日の日付を "2026-11-15" の形で返す（input type="date" と同じ形）
function todayString() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// 全員が「済」か「ー」なら完了とみなす（メンバー0人なら未完了）
function isDone(task) {
  if (memberList.length === 0) {
    return false;
  }
  for (let i = 0; i < memberList.length; i++) {
    const s = task.status[memberList[i]] || "未着手";
    if (s !== "済" && s !== "ー") {
      return false;
    }
  }
  return true;
}

/* ---------- 画面の描画 ---------- */

function renderMembers() {
  $("#memberList").empty();
  for (let i = 0; i < memberList.length; i++) {
    const name = escapeHtml(memberList[i]);
    $("#memberList").append(
      `<li>${name}<button class="member-remove" data-index="${i}" title="削除">×</button></li>`
    );
  }

  // チャットの「発言者」プルダウンも更新
  const savedUser = localStorage.getItem("chatUser");
  $("#chatUser").empty();
  for (let i = 0; i < memberList.length; i++) {
    const name = escapeHtml(memberList[i]);
    const selected = memberList[i] === savedUser ? "selected" : "";
    $("#chatUser").append(`<option value="${name}" ${selected}>${name} として発言</option>`);
  }
}

function renderTable() {
  // --- 見出し行（メンバーの数だけステータス列を作る） ---
  let head = "<tr><th>No</th><th>タスク名</th><th>期限</th><th>依頼主</th>";
  for (let i = 0; i < memberList.length; i++) {
    head += `<th class="member-head">${escapeHtml(memberList[i])}</th>`;
  }
  head += "<th>備考</th><th>操作</th></tr>";
  $("#taskHead").html(head);

  // --- 本体 ---
  $("#todoList").empty();
  const hideDone = $("#hideDone").prop("checked");
  const today = todayString();
  let shown = 0;

  for (let i = 0; i < taskList.length; i++) {
    const task = taskList[i];
    const done = isDone(task);
    if (hideDone && done) {
      continue; // 「完了を隠す」がONなら飛ばす
    }

    let rowClass = "";
    if (done) {
      rowClass = "row-done";
    } else if (task.due !== "" && task.due < today) {
      rowClass = "row-overdue";
    }

    // メンバーごとのステータス選択
    let statusCells = "";
    for (let j = 0; j < memberList.length; j++) {
      const member = memberList[j];
      const current = task.status[member] || "未着手";
      let options = "";
      for (let k = 0; k < STATUS_LIST.length; k++) {
        const sel = STATUS_LIST[k] === current ? "selected" : "";
        options += `<option ${sel}>${STATUS_LIST[k]}</option>`;
      }
      statusCells += `<td style="text-align:center">
        <select class="status-select status-${current}" data-field="status" data-member="${escapeHtml(member)}">${options}</select>
      </td>`;
    }

    // チャット件数
    const chatCount = chatData[task.id] ? chatData[task.id].length : 0;

    $("#todoList").append(`
      <tr class="${rowClass}" data-id="${task.id}">
        <td class="col-no">${i + 1}</td>
        <td><input class="cell-input cell-title" data-field="title" value="${escapeHtml(task.title)}" /></td>
        <td><input type="date" class="cell-input cell-date" data-field="due" value="${escapeHtml(task.due)}" /></td>
        <td><input class="cell-input" data-field="requester" value="${escapeHtml(task.requester)}" /></td>
        ${statusCells}
        <td><input class="cell-input" data-field="note" value="${escapeHtml(task.note)}" /></td>
        <td class="col-actions">
          <button class="chat-open-btn">💬 ${chatCount}</button>
          <button class="row-delete-btn">削除</button>
        </td>
      </tr>
    `);
    shown++;
  }

  // タスクが0件ならメッセージを表示
  if (shown === 0) {
    $("#emptyMessage").show();
  } else {
    $("#emptyMessage").hide();
  }
}

function renderChat() {
  $("#chatLog").empty();
  const task = findTask(currentTaskId);
  if (task === null) {
    return;
  }
  $("#chatTitle").text(task.title);

  const messages = chatData[currentTaskId] || [];
  const me = $("#chatUser").val();

  if (messages.length === 0) {
    $("#chatLog").append(`<li class="chat-empty">まだメッセージはありません</li>`);
  }
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const meClass = msg.name === me ? "is-me" : "";
    $("#chatLog").append(`
      <li class="${meClass}">
        <p class="chat-meta"><strong>${escapeHtml(msg.name)}</strong>${escapeHtml(msg.time)}</p>
        <p class="chat-bubble">${escapeHtml(msg.text)}</p>
      </li>
    `);
  }
  // 一番下（最新）までスクロール
  $("#chatLog").scrollTop($("#chatLog")[0].scrollHeight);
}

function renderAll() {
  renderMembers();
  renderTable();
}

/* ---------- メンバーの操作 ---------- */

$("#addMemberBtn").on("click", function () {
  const name = $("#memberName").val().trim();
  if (name === "") {
    return;
  }
  if (memberList.includes(name)) {
    alert("同じ名前のメンバーがすでにいます");
    return;
  }
  memberList.push(name);
  saveAll();
  renderAll();
  $("#memberName").val("");
});

// 後から追加されたボタンにもクリックを効かせるため、親要素に .on() を付ける
$("#memberList").on("click", ".member-remove", function () {
  const index = $(this).data("index");
  const name = memberList[index];
  if (!confirm(`${name} さんをメンバーから外しますか？`)) {
    return;
  }
  memberList.splice(index, 1); // 配列から1件取り除く
  for (let i = 0; i < taskList.length; i++) {
    delete taskList[i].status[name];
  }
  saveAll();
  renderAll();
});

/* ---------- タスクの操作 ---------- */

$("#addTodoBtn").on("click", function () {
  const todoText = $("#todoText").val().trim();
  if (todoText === "") {
    return;
  }

  // 全メンバーのステータスを「未着手」で用意
  const status = {};
  for (let i = 0; i < memberList.length; i++) {
    status[memberList[i]] = "未着手";
  }

  taskList.push({
    id: Date.now(), // 今の時刻（ミリ秒）をIDとして使う
    title: todoText,
    due: $("#todoDue").val(),
    requester: $("#todoRequester").val().trim(),
    status: status,
    note: "",
  });
  saveAll();
  renderTable();

  $("#todoText").val("");
  $("#todoDue").val("");
  $("#todoRequester").val("");
});

// タスク名の入力欄でEnterを押しても追加できるように
$("#todoText, #memberName").on("keydown", function (e) {
  if (e.key === "Enter" && !e.originalEvent.isComposing) {
    if (this.id === "todoText") {
      $("#addTodoBtn").click();
    } else {
      $("#addMemberBtn").click();
    }
  }
});

// 表のセルを編集したとき（入力欄・プルダウン共通）
$("#todoList").on("change", ".cell-input, .status-select", function () {
  const id = $(this).closest("tr").data("id");
  const task = findTask(id);
  const field = $(this).data("field");

  if (field === "status") {
    task.status[$(this).data("member")] = $(this).val();
  } else {
    task[field] = $(this).val();
  }
  saveAll();
  renderTable(); // 色・完了表示を更新するため描き直す
});

// 1件削除
$("#todoList").on("click", ".row-delete-btn", function () {
  const id = $(this).closest("tr").data("id");
  const task = findTask(id);
  if (!confirm(`「${task.title}」を削除しますか？（チャットも消えます）`)) {
    return;
  }
  const newList = [];
  for (let i = 0; i < taskList.length; i++) {
    if (taskList[i].id !== id) {
      newList.push(taskList[i]);
    }
  }
  taskList = newList;
  delete chatData[id];
  saveAll();
  renderTable();
});

// 完了を隠す
$("#hideDone").on("change", function () {
  renderTable();
});

// 全削除（タスクとチャットを消す。メンバーは残す）
$("#deleteTodoBtn").on("click", function () {
  if (!confirm("すべてのタスクとチャットを削除しますか？")) {
    return;
  }
  taskList = [];
  chatData = {};
  localStorage.removeItem("tasks");
  localStorage.removeItem("chats");
  $("#todoList").empty();
  renderTable();
});

/* ---------- チャットの操作 ---------- */

function openChat(id) {
  currentTaskId = id;
  renderChat();
  $("#chatPanel, #chatOverlay").addClass("is-open");
  $("#chatText").focus();
}

function closeChat() {
  currentTaskId = null;
  $("#chatPanel, #chatOverlay").removeClass("is-open");
}

$("#todoList").on("click", ".chat-open-btn", function () {
  openChat($(this).closest("tr").data("id"));
});

$("#closeChatBtn, #chatOverlay").on("click", closeChat);

// 発言者を切り替えたら覚えておく（次回も同じ人で開く）
$("#chatUser").on("change", function () {
  localStorage.setItem("chatUser", $(this).val());
  renderChat();
});

$("#sendChatBtn").on("click", function () {
  const text = $("#chatText").val().trim();
  const name = $("#chatUser").val();
  if (text === "" || currentTaskId === null) {
    return;
  }
  if (!name) {
    alert("先にメンバーを追加してください");
    return;
  }

  const now = new Date();
  const time = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;

  if (!chatData[currentTaskId]) {
    chatData[currentTaskId] = []; // このタスクの最初の発言なら配列を作る
  }
  chatData[currentTaskId].push({ name: name, text: text, time: time });
  saveAll();

  $("#chatText").val("");
  renderChat();
  renderTable(); // 💬の件数を更新
});

// Enterで送信、Shift+Enterで改行（日本語変換中のEnterは無視）
$("#chatText").on("keydown", function (e) {
  if (e.key === "Enter" && !e.shiftKey && !e.originalEvent.isComposing) {
    e.preventDefault();
    $("#sendChatBtn").click();
  }
});

// Escキーでチャットを閉じる
$(document).on("keydown", function (e) {
  if (e.key === "Escape") {
    closeChat();
  }
});

/* ---------- ページを開いたとき ---------- */
loadAll();
renderAll();
