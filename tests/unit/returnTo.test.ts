import { describe, expect, it } from "vitest";
import { buildLoginUrl, sanitizeReturnTo } from "@/lib/client/ui/return-to";

describe("returnTo", () => {
  it("builds login url with encoded return path", () => {
    expect(buildLoginUrl("/lobby")).toBe("/?returnTo=%2Flobby");
    expect(buildLoginUrl("/room/abc-123")).toBe("/?returnTo=%2Froom%2Fabc-123");
  });

  it("rejects open redirects", () => {
    expect(sanitizeReturnTo("https://evil.com")).toBeNull();
    expect(sanitizeReturnTo("//evil.com")).toBeNull();
    expect(sanitizeReturnTo("/")).toBeNull();
    expect(sanitizeReturnTo("/admin")).toBeNull();
  });

  it("allows lobby and room paths", () => {
    expect(sanitizeReturnTo("/lobby")).toBe("/lobby");
    expect(sanitizeReturnTo("/room/x")).toBe("/room/x");
  });
});
