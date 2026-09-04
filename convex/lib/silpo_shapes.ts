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

// Maps a batch result back onto the requested ingredients, by index first and by query second.
export function shapeProductMatches(requests: readonly ProductRequest[], payload: unknown) {
  const groups = findObjectArray(payload);

  return requests.map((request, index): ProductMatch => {
    const group =
      groups.find((record) => {
        const query = pickString(record, ["query", "searchText", "text", "name"]);

        return query !== undefined && query.toLowerCase() === request.query.toLowerCase();
      }) ?? groups[index];
    const products = group ? findObjectArray(group) : [];
    const product =
      products.find((record) => pickString(record, ["productId", "id"]) !== undefined) ??
      (group && pickString(group, ["productId"]) !== undefined ? group : undefined);

    if (!product) {
      return { ingredient: request.ingredient, quantity: request.quantity };
    }

    return {
      ingredient: request.ingredient,
      quantity: request.quantity,
      productId: pickString(product, ["productId", "id"]),
      companyId: pickString(product, ["companyId"]),
      title: pickString(product, ["title", "name", "productName"]),
      price: pickNumber(product, ["price", "currentPrice", "priceValue"]),
      unit: pickString(product, ["unit", "measure", "weightUnit"]),
    };
  });
}

export function cartTotal(products: readonly ProductMatch[]) {
  return products.reduce((sum, product) => sum + (product.price ?? 0) * product.quantity, 0);
}
