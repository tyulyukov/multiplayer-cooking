// Pure helpers that turn loosely typed Сільпо tool results into the few fields the app stores.
// The tool schemas are owned by Сільпо, so every reader tolerates missing or renamed fields.

import { z } from "zod";

// A parsed JSON value: what a Сільпо MCP tool call can ever hand back once it leaves the wire.
export type JsonValue = string | number | boolean | null | JsonValue[] | JsonRecord;

export type JsonRecord = { [key: string]: JsonValue };

// The permissive counterpart used to build outgoing tool call arguments: `undefined` fields are
// allowed at any depth so callers can omit optional values, the same way JSON.stringify always
// drops them on the wire.
export type JsonInput =
  | string
  | number
  | boolean
  | null
  | undefined
  | JsonInput[]
  | JsonInputRecord;

export type JsonInputRecord = { [key: string]: JsonInput };

const jsonPrimitiveSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

// Recursive boundary schema: parses genuinely unknown transport data into JsonValue once.
export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([jsonPrimitiveSchema, z.array(jsonValueSchema), z.record(z.string(), jsonValueSchema)]),
);

const jsonRecordSchema = z.record(z.string(), z.unknown());

const stringSchema = z.string();

const finiteNumberSchema = z.number().finite();

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
  oldPrice?: number;
  unit?: string;
  imageUrl?: string;
  slug?: string;
  productUrl?: string;
}>;

export const DELIVERY_TYPE_PREFERENCE = [
  "DeliveryHome",
  "WideAssortDelivery",
  "DeliveryExpressByPromise",
  "LongDelivery",
  "SelfPickup",
] as const;

export function isRecord(value: JsonValue): value is JsonRecord {
  return jsonRecordSchema.safeParse(value).success;
}

function pickString(record: JsonRecord, keys: readonly string[]) {
  for (const key of keys) {
    const value = record[key];
    const asString = stringSchema.safeParse(value);

    if (asString.success && asString.data.trim()) {
      return asString.data.trim();
    }

    const asNumber = finiteNumberSchema.safeParse(value);

    if (asNumber.success) {
      return String(asNumber.data);
    }
  }

  return undefined;
}

function pickNumber(record: JsonRecord, keys: readonly string[]) {
  for (const key of keys) {
    const value = record[key];
    const asNumber = finiteNumberSchema.safeParse(value);

    if (asNumber.success) {
      return asNumber.data;
    }

    const asString = stringSchema.safeParse(value);

    if (asString.success && asString.data.trim() && Number.isFinite(Number(asString.data))) {
      return Number(asString.data);
    }
  }

  return undefined;
}

// Finds the first array of objects anywhere near the top of a tool result.
export function findObjectArray(payload: JsonValue, depth = 3): JsonRecord[] {
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

export function readAddress(payload: JsonValue): SilpoAddress | null {
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

export function chooseDelivery(payload: JsonValue): DeliveryOption | null {
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

export function chooseTimeslot(payload: JsonValue, now = Date.now()): Timeslot | null {
  const slots = findObjectArray(payload)
    .map((record) => ({
      start: pickString(record, ["start", "from", "startTime"]),
      end: pickString(record, ["end", "to", "endTime"]),
      available: record.available ?? record.isAvailable,
    }))
    .filter((slot): slot is { start: string; end: string; available: JsonValue } =>
      Boolean(slot.start && slot.end && slot.available !== false),
    )
    .filter((slot) => {
      const time = Date.parse(slot.start);

      return Number.isNaN(time) || time > now;
    });

  const slot = slots[0];

  return slot ? { start: slot.start, end: slot.end } : null;
}

export function readCartId(payload: JsonValue) {
  return isRecord(payload) ? pickString(payload, ["shoppingCartId", "cartId", "id"]) : undefined;
}

const validationMessages = new Map<string, string>([
  ["product.offer.stock.max", "Деяких товарів на складі менше, ніж додано; кількість зменшено."],
  ["order.min_total", "Сума замовлення менша за мінімальну для доставки."],
]);

function describeValidation(code: string) {
  return (
    validationMessages.get(code) ??
    "Сільпо додало зауваження до кошика. Перевір його перед оплатою."
  );
}

export type CartSummary = Readonly<{
  productsTotal?: number;
  subtotal?: number;
  discount?: number;
  deliveryTotal?: number;
  total?: number;
  warnings: string[];
}>;

// Totals and error-level validations from silpo_get_shopping_cart_by_id.
export function readCartSummary(payload: JsonValue) {
  const cart = isRecord(payload) && isRecord(payload.cart) ? payload.cart : undefined;
  const calculation = cart && isRecord(cart.calculation) ? cart.calculation : undefined;
  const total = calculation ? pickNumber(calculation, ["totalAfterDiscounts", "total"]) : undefined;
  const delivery = calculation && isRecord(calculation.delivery) ? calculation.delivery : undefined;
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

  return {
    productsTotal: calculation ? pickNumber(calculation, ["productsTotal"]) : undefined,
    subtotal: calculation ? pickNumber(calculation, ["subTotal"]) : undefined,
    discount: calculation ? pickNumber(calculation, ["subDiscount"]) : undefined,
    deliveryTotal: delivery ? pickNumber(delivery, ["total"]) : undefined,
    total,
    warnings,
  } satisfies CartSummary;
}

export function readCheckoutLink(payload: JsonValue) {
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
  oldPrice?: number;
  unit?: string;
  stock?: number;
  weighted?: boolean;
  step?: number;
  imageUrl?: string;
  slug?: string;
  productUrl?: string;
}>;

export type IngredientCandidates = Readonly<{
  ingredient: string;
  quantity: number;
  candidates: readonly ProductCandidate[];
}>;

export const CANDIDATES_PER_INGREDIENT = 3;

function readProductCandidate(record: JsonRecord): ProductCandidate | null {
  const productId = pickString(record, ["productId", "id"]);
  const title = pickString(record, ["name", "title", "productName"]);
  const price = pickNumber(record, ["price", "currentPrice", "priceValue"]);
  const oldPrice = pickNumber(record, ["oldPrice"]);
  const slug = pickString(record, ["slug"]);

  if (!productId || !title || record.available === false) {
    return null;
  }

  return {
    productId,
    companyId: pickString(record, ["companyId"]),
    branchId: pickString(record, ["branchId"]),
    title,
    price,
    oldPrice:
      oldPrice !== undefined && price !== undefined && oldPrice > price ? oldPrice : undefined,
    unit: pickString(record, ["displayRatio", "unit", "measure"]),
    stock: pickNumber(record, ["stock"]),
    weighted: record.weighted === true ? true : undefined,
    step: pickNumber(record, ["step"]),
    imageUrl: pickHttpUrl(record, ["image", "imageUrl"]),
    slug,
    // Verified against silpo_get_product_details: product.url is this route for the returned slug.
    productUrl: slug ? `https://silpo.ua/product/${encodeURIComponent(slug)}` : undefined,
  };
}

function pickHttpUrl(record: JsonRecord, keys: readonly string[]) {
  const value = pickString(record, keys);

  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value);

    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

// Maps a batch result back onto the requested ingredients, by query first and by index second,
// keeping a few available candidates so the model can pick the sensible one.
export function readProductCandidates(
  requests: readonly ProductRequest[],
  payload: JsonValue,
): IngredientCandidates[] {
  const groups = findObjectArray(payload);

  return requests.map((request, index) => {
    const group =
      groups.find((record) => {
        const query = pickString(record, ["query", "searchText", "text"]);

        return query !== undefined && query.toLowerCase() === request.query.toLowerCase();
      }) ?? groups[index];

    const candidates = (group ? findObjectArray(group) : [])
      .map(readProductCandidate)
      .filter((candidate): candidate is ProductCandidate => candidate !== null)
      .slice(0, CANDIDATES_PER_INGREDIENT);

    return { ingredient: request.ingredient, quantity: request.quantity, candidates };
  });
}

export function cartTotal(products: readonly ProductMatch[]) {
  return products.reduce((sum, product) => sum + (product.price ?? 0) * product.quantity, 0);
}
