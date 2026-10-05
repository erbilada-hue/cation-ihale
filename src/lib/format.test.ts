import { describe, expect, it } from "vitest";
import { paraYaz, sayiOku } from "./format";

describe("paraYaz", () => {
  it("Türkçe binlik ayracı ve ₺ kullanır", () => {
    expect(paraYaz(1234.56)).toBe("₺1.234,56");
    expect(paraYaz(null)).toBe("—");
  });
});

describe("sayiOku", () => {
  it.each([
    ["1.234,56", 1234.56],
    ["12,5", 12.5],
    ["12.5", 12.5],
    ["1.000", 1000],
    ["4000", 4000],
    ["₺ 160,00", 160],
    ["%5", 5],
    ["", null],
  ])("%s → %s", (girdi, beklenen) => {
    expect(sayiOku(girdi)).toBe(beklenen);
  });

  it("okunamayan metinde NaN döner", () => {
    expect(sayiOku("abc")).toBeNaN();
  });
});
