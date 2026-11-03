"use strict";
// 本工具只處理任務拆解資料。未來整合共同清單時可進一步抽離儲存層。
(() => {
  const STORAGE_KEY = "procrastination-toolkit:task-breakdown:v1";
  const taskForm = document.getElementById("task-form");
  const taskInput = document.getElementById("task-name");
  const taskList = document.getElementById("task-list");
  const feedback = document.getElementById("feedback");
  let tasks = [];

  function message(text) { feedback.textContent = text; }
  function uid() { return (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
  function load() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(value)) throw new Error("資料格式錯誤");
      tasks = value.filter(t => t && typeof t.id === "string" && typeof t.name === "string" && Array.isArray(t.steps)).map(t => ({
        id: t.id, name: t.name.slice(0,100), steps: t.steps.filter(s => s && typeof s.id === "string" && typeof s.text === "string").map(s => ({id:s.id,text:s.text.slice(0,120),done: Boolean(s.done)}))
      }));
    } catch (error) { tasks=[]; message("舊資料目前無法讀取。你仍可以新增任務，但建議先備份原本的瀏覽器資料。"); }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); return true; }
    catch (error) { message("無法儲存資料：可能是瀏覽器限制或儲存空間不足。這次修改只會暫時顯示在頁面上。"); return false; }
  }
  function button(label, action, extra="") {
    const el=document.createElement("button"); el.type="button"; el.className=`secondary-button ${extra}`.trim(); el.textContent=label; el.addEventListener("click", action); return el;
  }
  function render() {
    taskList.replaceChildren();
    if (!tasks.length) {
      const empty=document.createElement("div"); empty.className="empty-state";
      const p=document.createElement("p"); p.textContent="還沒有任務。從上方新增一件想完成的事吧！";
      empty.append(p); taskList.append(empty); return;
    }
    for (const task of tasks) {
      const panel=document.createElement("article"); panel.className="task-panel";
      const heading=document.createElement("div"); heading.className="task-heading";
      const title=document.createElement("h3"); title.textContent=task.name;
      const actions=document.createElement("div"); actions.className="task-actions";
      actions.append(
        button("修改名稱", () => {
          const value=prompt("修改任務名稱",task.name);
          if (value===null) return;
          const name=value.trim(); if (!name) {message("任務名稱不能留白。"); return;}
          if(name.length>100) {message("任務名稱最多 100 字。");return;}
          task.name=name; save(); render(); message("任務名稱已更新。");
        }),
        button("刪除任務", () => {
          if (!confirm(`確定要刪除「${task.name}」與其中所有步驟嗎？`)) return;
          tasks=tasks.filter(t=>t.id!==task.id); save(); render(); message("任務已刪除。");
        }, "danger-button")
      );
      heading.append(title,actions); panel.append(heading);
      const completed=task.steps.filter(s=>s.done).length;
      const ratio=task.steps.length ? Math.round(completed/task.steps.length*100):0;
      const progress=document.createElement("div"); progress.className="progress-line";
      progress.setAttribute("role","progressbar"); progress.setAttribute("aria-label",`${task.name}完成比例`);
      progress.setAttribute("aria-valuemin","0"); progress.setAttribute("aria-valuemax","100"); progress.setAttribute("aria-valuenow",String(ratio));
      const fill=document.createElement("div"); fill.className="progress-fill"; fill.style.width=`${ratio}%`; progress.append(fill);
      const caption=document.createElement("p"); caption.className="progress-caption"; caption.textContent=`已完成 ${completed} / ${task.steps.length} 步（${ratio}%）`;
      panel.append(progress,caption);
      const list=document.createElement("ul"); list.className="step-list";
      if (!task.steps.length) {const noSteps=document.createElement("p"); noSteps.className="help-text"; noSteps.textContent="還沒有小步驟，可以從一件五分鐘內能做的事開始。"; panel.append(noSteps);}
      for (const step of task.steps) {
        const li=document.createElement("li"); li.className=`step-item${step.done?" done":""}`;
        const checkbox=document.createElement("input"); checkbox.type="checkbox"; checkbox.checked=step.done;
        checkbox.setAttribute("aria-label",`完成：${step.text}`);
        checkbox.addEventListener("change", () => {step.done=checkbox.checked; save(); render(); message(step.done?"完成一小步！做得好。":"已更新步驟狀態。");});
        const label=document.createElement("span"); label.className="step-text"; label.textContent=step.text;
        li.append(checkbox,label,button("修改",()=>{
          const value=prompt("修改小步驟",step.text);if(value===null)return;
          const text=value.trim();if(!text){message("小步驟不能留白。");return;}
          if(text.length>120){message("小步驟最多 120 字。");return;}
          step.text=text;save();render();message("小步驟已更新。");
        }),button("刪除",()=>{
          if(!confirm("確定要刪除這個小步驟嗎？"))return;
          task.steps=task.steps.filter(s=>s.id!==step.id);save();render();message("小步驟已刪除。");
        },"danger-button")); list.append(li);
      }
      panel.append(list);
      const form=document.createElement("form"); form.className="step-form";
      const input=document.createElement("input"); input.className="text-input"; input.required=true; input.maxLength=120;
      input.placeholder="例如：先打開報告檔案"; input.setAttribute("aria-label",`為${task.name}新增小步驟`);
      const submit=document.createElement("button"); submit.className="action-button"; submit.type="submit"; submit.textContent="新增小步驟";
      form.append(input,submit); form.addEventListener("submit",event=>{
        event.preventDefault();const text=input.value.trim();
        if(!text){message("請先輸入小步驟內容。");input.focus();return;}
        task.steps.push({id:uid(),text,done:false});save();render();message("已新增小步驟！");
      });
      panel.append(form);taskList.append(panel);
    }
  }
  taskForm.addEventListener("submit",event=>{
    event.preventDefault(); const name=taskInput.value.trim();
    if(!name){message("先輸入一個想完成的任務吧！");taskInput.focus();return;}
    tasks.unshift({id:uid(),name,steps:[]});save();taskInput.value="";render();message("任務建立好了，現在替它加上第一個小步驟！");
  });
  load();render();
})();
