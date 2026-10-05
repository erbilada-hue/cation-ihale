import { describe, expect, it } from "vitest";
import { supabaseAdresiniDuzelt } from "./env";

describe("supabaseAdresiniDuzelt", () => {
  it.each([
    ["https://abc.supabase.co", "https://abc.supabase.co"],
    ["abc.supabase.co", "https://abc.supabase.co"],
    [" https://abc.supabase.co/ ", "https://abc.supabase.co"],
    ["https://abc.supabase.co/rest/v1/", "https://abc.supabase.co"],
    ['"https://abc.supabase.co"', "https://abc.supabase.co"],
  ])("%s → %s", (girdi, beklenen) => {
    expect(supabaseAdresiniDuzelt(girdi)).toBe(beklenen);
  });

  it("adres olmayan değeri reddeder", () => {
    expect(supabaseAdresiniDuzelt("eyJhbGciOiJIUzI1NiJ9")).toBeNull();
    expect(supabaseAdresiniDuzelt("")).toBeNull();
  });
});
