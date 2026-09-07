import { convertCookingQuantity, parseCookingQuantity } from "/src/lib/cooking-units.ts";

const panel = document.querySelector("#panel");
const title = document.querySelector("#panel-title");
const body = document.querySelector("#panel-body");
let seconds = 402;
const format = () => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
function open(kind) {
  const content = {
    people: ["На кухні", '<p><strong>Макс · ти</strong><br>Нарізаєш часник</p><p><strong>Аня</strong><br>Чистить креветки</p><button class="ct-secondary ct-full" id="invite">Скопіювати посилання</button>'],
    tools: ["Інструменти", '<label>Кількість у грамах<input id="grams" inputmode="decimal" value="100"></label><p><output id="converted">3,53</output> унції</p><button class="ct-secondary ct-full" data-open="timer">Таймер пасти</button><label>Нотатка<textarea placeholder="Наприклад, наступного разу менше лимона"></textarea></label>'],
    timer: ["Таймер пасти", `<div class="ct-timer"><span>Паста</span><span class="ct-time" data-countdown>${format()}</span></div><p>Коли продзвенить, перевір пасту на смак.</p><button class="ct-secondary ct-full" id="add-time">Додати хвилину</button>`],
    photo: ["Нарізання часнику", '<img src="/images/cooking-prep-3d.webp" alt="Приклад дрібно нарізаного часнику"><p>Орієнтуйся на розмір шматочків.</p>'],
    help: ["Запитати помічника", '<p>Приклад запитання</p><button class="ct-secondary ct-full" id="example-question">Можна без вершків?</button><div id="answer"></div>'],
    waiting: ["Часник готовий", '<img class="ct-art" src="/images/cooking-waiting.webp" alt=""><p>Аня ще чистить креветки. Передаси їй часник, коли вона звільниться.</p><button class="ct-secondary ct-full" data-open="timer">Перевірити таймер пасти</button>'],
    shared: ["Час змішати пасту й соус", '<img class="ct-art" src="/images/oven-mitts.webp" alt=""><p>Ти додаєш пасту. Аня перемішує соус.</p><p>Аня готова. Чекаємо на тебе.</p><button class="ct-primary ct-full" id="ready">Я готовий</button>'],
  }[kind];
  title.textContent = content[0];
  body.innerHTML = content[1];
  if (!panel.open) panel.showModal();
  body.querySelector("#grams")?.addEventListener("input", (event) => {
    const value = parseCookingQuantity(event.target.value);
    const result = value === null ? null : convertCookingQuantity(value, "g", "oz");
    body.querySelector("#converted").textContent = result === null ? "Введи кількість" : result.toLocaleString("uk-UA", { maximumFractionDigits: 2 });
  });
  body.querySelector("#add-time")?.addEventListener("click", () => {
    seconds += 60;
    document.querySelectorAll("[data-countdown]").forEach((node) => { node.textContent = format(); });
  });
  body.querySelector("#invite")?.addEventListener("click", async (event) => {
    try { await navigator.clipboard.writeText(location.href); event.target.textContent = "Посилання на демо скопійовано"; }
    catch { event.target.textContent = "Скопіюй адресу цього демо з браузера"; }
  });
  body.querySelector("#example-question")?.addEventListener("click", () => {
    body.querySelector("#answer").innerHTML = '<p>У цьому прикладі замінимо вершки водою від пасти й пармезаном. Часник та креветки лишаються без змін.</p><button class="ct-primary ct-full" id="proposal">Переглянути зміни до кроків 6–7</button>';
    body.querySelector("#proposal").addEventListener("click", () => {
      body.querySelector("#answer").innerHTML = '<p><strong>Крок 6</strong><br>Замість вершків додай 100 мл води від пасти.</p><p><strong>Крок 7</strong><br>Перемішай пасту з соусом і пармезаном.</p><button class="ct-primary ct-full" id="approve">Застосувати в демо</button>';
      body.querySelector("#approve").addEventListener("click", (event) => { event.target.textContent = "Приклад зміни підтверджено"; event.target.disabled = true; });
    });
  });
  body.querySelector("#ready")?.addEventListener("click", (event) => { event.target.textContent = "Обидва готові. Починайте"; event.target.disabled = true; });
}
document.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-open]");
  if (trigger) open(trigger.dataset.open);
});
document.querySelector("#close").addEventListener("click", () => panel.close());
document.querySelector("#complete").addEventListener("click", () => open("waiting"));
const initial = new URLSearchParams(location.search).get("state");
if (["waiting", "shared", "tools", "help"].includes(initial)) open(initial);
