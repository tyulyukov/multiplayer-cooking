import type { Doc } from "../_generated/dataModel";
import type { SilpoClient } from "./silpo_client";
import { chooseTimeslot, type ProductRequest } from "./silpo_shapes";

export async function findSilpoProducts(
  client: SilpoClient,
  cart: NonNullable<Doc<"silpoConnections">["cart"]>,
  items: readonly ProductRequest[],
  now = Date.now(),
): Promise<unknown> {
  let timeslot = cart.timeslot;

  if (!(Date.parse(timeslot.start) > now)) {
    const available = chooseTimeslot(
      await client.callTool("silpo_get_time_slots", {
        branchId: cart.branchId,
        deliveryTypes: [cart.deliveryType],
        start: new Date(now).toISOString().replace(/\.\d{3}Z$/, "Z"),
        limit: 20,
      }),
      now,
    );

    if (!available) {
      throw new Error("Немає вільних слотів доставки. Спробуй пізніше.");
    }

    timeslot = available;
  }

  return client.callTool("silpo_find_products_batch", {
    products: items.map((item) => item.query),
    branchId: cart.branchId,
    deliveryType: cart.deliveryType,
    timeslotStart: timeslot.start,
    timeslotEnd: timeslot.end,
    limit: 5,
  });
}
