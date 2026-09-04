// Pure helpers that turn loosely typed Сільпо tool results into the few fields the app stores.
// The tool schemas are owned by Сільпо, so every reader tolerates missing or renamed fields.

export type SilpoAddress = Readonly<{
  latitude: number;
  longitude: number;
  city?: string;
  street?: string;
  house?: string;
  district?: string;
}>;

export type DeliveryOption = Readonly<{ deliveryType: string; branchId: string }>;

export type Timeslot = Readonly<{ start: string; end: string }>;

export type ProductMatch = Readonly<{
  ingredient: string;
  quantity: number;
  productId?: string;
  companyId?: string;
  branchId?: string;
  title?: string;
  price?: number;
  unit?: string;
}>;

export const DELIVERY_TYPE_PREFERENCE = [
  "DeliveryHome",
  "WideAssortDelivery",
  "DeliveryExpressByPromise",
  "LongDelivery",
  "SelfPickup",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickString(record: Record<string, unknown>, keys: readonly string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return undefined;
}

function pickNumber(record: Record<string, unknown>, keys: readonly string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }

  return undefined;
}

// Finds the first array of objects anywhere near the top of a tool result.
export function findObjectArray(payload: unknown, depth = 3): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    // Nested arrays (one per request) become groups with an `items` list.
    return payload.flatMap((value) =>
      isRecord(value) ? [value] : Array.isArray(value) ? [{ items: value }] : [],
    );
  }

  if (!isRecord(payload) || depth === 0) {
    return [];
  }

  for (const value of Object.values(payload)) {
    if (Array.isArray(value) && value.some(isRecord)) {
      return value.filter(isRecord);
    }
  }

  for (const value of Object.values(payload)) {
    const nested = findObjectArray(value, depth - 1);

    if (nested.length > 0) {
      return nested;
    }
  }

  return [];
}

export function shapeAddress(payload: unknown): SilpoAddress | null {
  const candidates = findObjectArray(payload);
  const source = candidates[0] ?? (isRecord(payload) ? payload : undefined);

  if (!source) {
    return null;
  }

  const latitude = pickNumber(source, ["latitude", "lat"]);
  const longitude = pickNumber(source, ["longitude", "lng", "lon"]);

  if (latitude === undefined || longitude === undefined) {
    return null;
  }

  return {
    latitude,
    longitude,
    city: pickString(source, ["city", "cityName"]),
    street: pickString(source, ["street", "streetName"]),
    house: pickString(source, ["houseNumber", "house", "building"]),
    district: pickString(source, ["district"]),
  };
}

export function chooseDelivery(payload: unknown): DeliveryOption | null {
  const options = findObjectArray(payload)
    .map((record) => ({
      deliveryType: pickString(record, ["deliveryType", "type", "name"]),
      branchId: pickString(record, ["branchId", "branch_id", "filialId"]),
    }))
    .filter((option): option is DeliveryOption => Boolean(option.deliveryType && option.branchId));

  for (const preferred of DELIVERY_TYPE_PREFERENCE) {
    const match = options.find((option) => option.deliveryType === preferred);

    if (match) {
      return match;
    }
  }

  return options[0] ?? null;
}

export function chooseTimeslot(payload: unknown, now = Date.now()): Timeslot | null {
  const slots = findObjectArray(payload)
    .map((record) => ({
      start: pickString(record, ["start", "from", "startTime"]),
      end: pickString(record, ["end", "to", "endTime"]),
      available: record.available ?? record.isAvailable,
    }))
    .filter((slot): slot is { start: string; end: string; available: unknown } =>
      Boolean(slot.start && slot.end && slot.available !== false),
    )
    .filter((slot) => {
      const time = Date.parse(slot.start);

      return Number.isNaN(time) || time > now;
    });

  const slot = slots[0];

  return slot ? { start: slot.start, end: slot.end } : null;
}

export function readCartId(payload: unknown) {
  return isRecord(payload) ? pickString(payload, ["shoppingCartId", "cartId", "id"]) : undefined;
}

const validationMessages: Record<string, string> = {
  "product.offer.stock.max": "Деяких товарів на складі менше, ніж додано; кількість зменшено.",
  "order.min_total": "Сума замовлення менша за мінімальну для доставки.",
};

function describeValidation(code: string) {
  return (
    validationMessages[code] ?? "Сільпо додало зауваження до кошика. Перевір його перед оплатою."
  );
}

// Totals and error-level validations from silpo_get_shopping_cart_by_id.
export function readCartSummary(payload: unknown) {
  const cart = isRecord(payload) && isRecord(payload.cart) ? payload.cart : undefined;
  const calculation = cart && isRecord(cart.calculation) ? cart.calculation : undefined;
  const total = calculation
    ? pickNumber(calculation, ["totalAfterDiscounts", "total", "productsTotal"])
    : undefined;
  const validations = calculation ? findObjectArray(calculation.validations ?? []) : [];
  const warnings = validations
    .filter((entry) => {
      const level = pickString(entry, ["level", "severity", "type"]);

      return level === undefined || /error|warn/i.test(level);
    })
    .map((entry) => pickString(entry, ["message", "text", "code"]))
    .filter((message): message is string => message !== undefined)
    .map(describeValidation)
    .filter((message, index, all) => all.indexOf(message) === index)
    .slice(0, 3);

  return { total, warnings };
}

export function readCheckoutLink(payload: unknown) {
  if (!isRecord(payload)) {
    return undefined;
  }

  const direct = pickString(payload, ["checkoutWebLink"]);

  if (direct) {
    return direct;
  }

  for (const value of Object.values(payload)) {
    if (isRecord(value)) {
      const nested = pickString(value, ["checkoutWebLink"]);

      if (nested) {
        return nested;
      }
    }
  }

  return undefined;
}

export type ProductRequest = Readonly<{ ingredient: string; query: string; quantity: number }>;

export type ProductCandidate = Readonly<{
  productId: string;
  companyId?: string;
  branchId?: string;
  title: string;
  price?: number;
  unit?: string;
  stock?: number;
  weighted?: boolean;
  step?: number;
}>;

export type IngredientCandidates = Readonly<{
  ingredient: string;
  quantity: number;
  candidates: ProductCandidate[];
}>;

export const CANDIDATES_PER_INGREDIENT = 3;

function shapeCandidate(record: Record<string, unknown>): ProductCandidate | null {
  const productId = pickString(record, ["productId", "id"]);
  const title = pickString(record, ["name", "title", "productName"]);

  if (!productId || !title || record.available === false) {
    return null;
  }

  return {
    productId,
    companyId: pickString(record, ["companyId"]),
    branchId: pickString(record, ["branchId"]),
    title,
    price: pickNumber(record, ["price", "currentPrice", "priceValue"]),
    unit: pickString(record, ["displayRatio", "unit", "measure"]),
    stock: pickNumber(record, ["stock"]),
    weighted: record.weighted === true ? true : undefined,
    step: pickNumber(record, ["step"]),
  };
}

// Maps a batch result back onto the requested ingredients, by query first and by index second,
// keeping a few available candidates so the model can pick the sensible one.
export function shapeProductCandidates(
  requests: readonly ProductRequest[],
  payload: unknown,
): IngredientCandidates[] {
  const groups = findObjectArray(payload);

  return requests.map((request, index) => {
    const group =
      groups.find((record) => {
        const query = pickString(record, ["query", "searchText", "text"]);

        return query !== undefined && query.toLowerCase() === request.query.toLowerCase();
      }) ?? groups[index];
    const candidates = (group ? findObjectArray(group) : [])
      .map(shapeCandidate)
      .filter((candidate): candidate is ProductCandidate => candidate !== null)
      .slice(0, CANDIDATES_PER_INGREDIENT);

    return { ingredient: request.ingredient, quantity: request.quantity, candidates };
  });
}

export function cartTotal(products: readonly ProductMatch[]) {
  return products.reduce((sum, product) => sum + (product.price ?? 0) * product.quantity, 0);
}
