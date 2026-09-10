import BbqGrillIcon from "@hugeicons/core-free-icons/BbqGrillIcon";
import CakeSliceIcon from "@hugeicons/core-free-icons/CakeSliceIcon";
import CheeseIcon from "@hugeicons/core-free-icons/CheeseIcon";
import ChickenThighsIcon from "@hugeicons/core-free-icons/ChickenThighsIcon";
import DiceIcon from "@hugeicons/core-free-icons/DiceIcon";
import Dish01Icon from "@hugeicons/core-free-icons/Dish01Icon";
import EggFriedIcon from "@hugeicons/core-free-icons/EggFriedIcon";
import FishIcon from "@hugeicons/core-free-icons/FishIcon";
import FridgeIcon from "@hugeicons/core-free-icons/FridgeIcon";
import HeartIcon from "@hugeicons/core-free-icons/HeartIcon";
import KidIcon from "@hugeicons/core-free-icons/KidIcon";
import LeafyGreenIcon from "@hugeicons/core-free-icons/LeafyGreenIcon";
import MoonIcon from "@hugeicons/core-free-icons/MoonIcon";
import MushroomIcon from "@hugeicons/core-free-icons/MushroomIcon";
import NoodlesIcon from "@hugeicons/core-free-icons/NoodlesIcon";
import PepperIcon from "@hugeicons/core-free-icons/PepperIcon";
import PiggyBankIcon from "@hugeicons/core-free-icons/PiggyBankIcon";
import Pizza01Icon from "@hugeicons/core-free-icons/Pizza01Icon";
import PumpkinIcon from "@hugeicons/core-free-icons/PumpkinIcon";
import RiceBowl01Icon from "@hugeicons/core-free-icons/RiceBowl01Icon";
import SaladIcon from "@hugeicons/core-free-icons/SaladIcon";
import SoupIcon from "@hugeicons/core-free-icons/SoupIcon";
import SpaghettiIcon from "@hugeicons/core-free-icons/SpaghettiIcon";
import Timer01Icon from "@hugeicons/core-free-icons/Timer01Icon";
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon";
import type { IconSvgElement } from "@hugeicons/react";

export type QuickPrompt = Readonly<{
  icon: IconSvgElement;
  id: string;
  label: string;
}>;

export const surprisePrompt: QuickPrompt = {
  icon: DiceIcon,
  id: "surprise",
  label: "Не знаю, здивуй мене",
};

export const quickPromptPool: readonly QuickPrompt[] = [
  { icon: SoupIcon, id: "borscht", label: "Борщ із пампушками" },
  { icon: CheeseIcon, id: "syrnyky", label: "Сирники на сніданок" },
  { icon: Dish01Icon, id: "deruny", label: "Хрусткі деруни" },
  { icon: MushroomIcon, id: "risotto", label: "Ризото з грибами" },
  { icon: RiceBowl01Icon, id: "pilaf", label: "Плов в одній каструлі" },
  { icon: EggFriedIcon, id: "shakshuka", label: "Шакшука з томатами" },
  { icon: NoodlesIcon, id: "udon", label: "Удон з овочами" },
  { icon: FishIcon, id: "baked-fish", label: "Риба з картоплею" },
  { icon: ChickenThighsIcon, id: "chicken-wrap", label: "Домашня шаурма" },
  { icon: PepperIcon, id: "tacos", label: "Тако для компанії" },
  { icon: LeafyGreenIcon, id: "falafel", label: "Фалафель у піті" },
  { icon: CheeseIcon, id: "khachapuri", label: "Хачапурі з сиром" },
  { icon: Dish01Icon, id: "varenyky", label: "Вареники з картоплею" },
  { icon: SaladIcon, id: "warm-salad", label: "Теплий салат із нутом" },
  { icon: SoupIcon, id: "lentil-soup", label: "Сочевичний суп" },
  { icon: CakeSliceIcon, id: "apple-crumble", label: "Яблучний крамбл" },
  { icon: CakeSliceIcon, id: "banana-pancakes", label: "Бананові оладки" },
  { icon: RiceBowl01Icon, id: "buckwheat", label: "Гречка з грибами" },
  { icon: Pizza01Icon, id: "flatbread", label: "Піца на пательні" },
  { icon: ChickenThighsIcon, id: "meatballs", label: "Тефтелі в соусі" },
  { icon: SpaghettiIcon, id: "pasta", label: "Паста на двох" },
  { icon: ChickenThighsIcon, id: "chicken", label: "Щось із куркою" },
  { icon: Timer01Icon, id: "quick", label: "Вечеря за 30 хв" },
  { icon: EggFriedIcon, id: "breakfast", label: "Сніданок вихідного дня" },
  { icon: SoupIcon, id: "soup", label: "Суп на всю сім'ю" },
  { icon: LeafyGreenIcon, id: "veggie", label: "Без м'яса" },
  { icon: FishIcon, id: "fish", label: "Щось із рибою" },
  { icon: Pizza01Icon, id: "pizza", label: "Піца вдома" },
  { icon: SaladIcon, id: "salad", label: "Салат до вечері" },
  { icon: CakeSliceIcon, id: "dessert", label: "Десерт без духовки" },
  { icon: PiggyBankIcon, id: "budget", label: "Бюджетна вечеря" },
  { icon: FridgeIcon, id: "fridge", label: "З того, що є вдома" },
  { icon: HeartIcon, id: "date", label: "Романтична вечеря" },
  { icon: UserGroupIcon, id: "guests", label: "Гості через годину" },
  { icon: KidIcon, id: "kids", label: "Дитяча вечеря" },
  { icon: PepperIcon, id: "spicy", label: "Щось гостре" },
  { icon: NoodlesIcon, id: "asian", label: "Азійська кухня" },
  { icon: BbqGrillIcon, id: "grill", label: "Гриль на балконі" },
  { icon: Dish01Icon, id: "lunchbox", label: "Обід у контейнер" },
  { icon: MoonIcon, id: "late", label: "Легке на ніч" },
  { icon: CheeseIcon, id: "cheese", label: "Сирна вечеря" },
  { icon: MushroomIcon, id: "mushrooms", label: "Із грибами" },
  { icon: PumpkinIcon, id: "pumpkin", label: "Гарбузовий суп" },
  { icon: RiceBowl01Icon, id: "grains", label: "Каша по-новому" },
];

export const quickPromptCount = 3;

export function sampleQuickPrompts(
  pool: readonly QuickPrompt[],
  count: number,
  random: () => number = Math.random,
): QuickPrompt[] {
  const shuffled = [...pool];
  const limit = Math.min(count, shuffled.length);

  for (let index = 0; index < limit; index += 1) {
    const swapWith = index + Math.floor(random() * (shuffled.length - index));
    [shuffled[index], shuffled[swapWith]] = [shuffled[swapWith]!, shuffled[index]!];
  }

  return shuffled.slice(0, limit);
}

export function pickQuickPrompts(random: () => number = Math.random): QuickPrompt[] {
  return [...sampleQuickPrompts(quickPromptPool, quickPromptCount, random), surprisePrompt];
}
