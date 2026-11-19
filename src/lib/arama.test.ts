import { describe, expect, it } from "vitest";
import { aramaEslesir, sadelestir } from "./arama";

describe("aramaEslesir", () => {
  const metinler = ["İstanbul Belediyesi Kışlık Mont", "Castrol", "Polar yelek", "YKK fermuar"];
  it("Türkçe harf ve büyük harf farkını önemsemez", () => {
    expect(aramaEslesir(metinler, "istanbul")).toBe(true);
    expect(aramaEslesir(metinler, "KISLIK")).toBe(true);
    expect(aramaEslesir(metinler, "kışlık")).toBe(true);
  });
  it("her kelime farklı alanda geçebilir, hepsi geçmeli", () => {
    expect(aramaEslesir(metinler, "castrol fermuar")).toBe(true);
    expect(aramaEslesir(metinler, "castrol tişört")).toBe(false);
  });
  it("boş arama her şeyi gösterir", () => {
    expect(aramaEslesir(metinler, "  ")).toBe(true);
  });
  it("sadelestir", () => {
    expect(sadelestir("  Şapka-Bere  ")).toBe("sapkabere");
  });
});
