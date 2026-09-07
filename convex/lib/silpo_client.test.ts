import { describe, expect, test } from "bun:test";

import { parseVerifiedSilpoProfile } from "./silpo_client";

describe("parseVerifiedSilpoProfile", () => {
  test("uses only a successful profile identifier as account identity", () => {
    expect(
      parseVerifiedSilpoProfile({
        success: true,
        profile: {
          id: "customer-42",
          phone: "380505080405",
          firstName: "Оля",
          email: "olya@example.com",
        },
      }),
    ).toEqual({
      accountSubject: "customer-42",
      profile: { name: "Оля", phone: "+380 50 508 04 05", email: "olya@example.com" },
    });
  });

  test("fails closed for a missing success flag, missing id, or non-string id", () => {
    expect(parseVerifiedSilpoProfile({ profile: { id: "customer-42" } })).toBeNull();
    expect(parseVerifiedSilpoProfile({ success: true, profile: {} })).toBeNull();
    expect(parseVerifiedSilpoProfile({ success: true, profile: { id: 42 } })).toBeNull();
    expect(
      parseVerifiedSilpoProfile({ success: false, profile: { id: "customer-42" } }),
    ).toBeNull();
  });
});
