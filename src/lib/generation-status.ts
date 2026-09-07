import type { UIMessage } from "@convex-dev/agent";
import { isToolPart } from "./question-messages";

const fallback = [
  "Працюю над ідеєю",
  "Готую наступний крок",
  "Працюю. Кулінарна магія потребує хвилинки",
] as const;

const phrases: Record<string, readonly [string, ...string[]]> = {
  web_search: [
    "Шукаю рецепти в інтернеті",
    "Шукаю в мережі. Рецепт сам себе не знайде",
    "Шукаю в інтернеті. Пірнаю в кулінарні нетрі",
  ],
  read_page: [
    "Читаю знайдене джерело",
    "Читаю рецепт. Навіть дрібний шрифт",
    "Перевіряю джерело. Довіряй, але перечитуй",
  ],
  silpo_find_products: [
    "Підбираю продукти в Сільпо",
    "Шукаю продукти в Сільпо. Кошик сам не збереться",
    "Підбираю товари в Сільпо. Полюю на смакоту",
  ],
  save_idea: [
    "Зберігаю ідею та створюю її зображення",
    "Готую картку страви. Зараз буде апетитно",
    "Зберігаю ідею. Малюю їй смачний портрет",
  ],
  ask_user: [
    "Готую уточнювальні питання",
    "Уточнюю твої побажання. Без кулінарної телепатії",
    "Готую питання. Хочу влучити у твій смак",
  ],
  add_memory: [
    "Запам’ятовую твої побажання",
    "Занотовую на майбутнє",
    "Запам’ятовую. Це тобі не сито",
  ],
  remove_memory: ["Прибираю спогад", "Оновлюю те, що пам’ятаю", "Забуваю це. За твоїм рецептом"],
  thinking: [
    "Думаю над стравою",
    "Підбираю ідею. Мозок уже в фартусі",
    "Міркую, що приготувати смачненького",
  ],
  writing: [
    "Пишу відповідь",
    "Формулюю ідею. Майже можна подавати",
    "Пишу відповідь. Без словесної локшини",
  ],
};

export function generationStatus(messages: readonly UIMessage[]) {
  const latest = messages.at(-1);
  const active =
    latest?.role === "assistant"
      ? latest.parts
          .filter(isToolPart)
          .findLast((part) => part.state === "input-streaming" || part.state === "input-available")
      : undefined;
  const activity = active
    ? active.type.replace(/^tool-/, "")
    : latest?.role === "assistant" && latest.text.trim()
      ? "writing"
      : "thinking";
  const options = phrases[activity] ?? fallback;
  const key = active?.toolCallId ?? latest?.key ?? "initial";
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return { activity, label: options[hash % options.length] ?? options[0] };
}
