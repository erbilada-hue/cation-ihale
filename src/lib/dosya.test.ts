import { describe, expect, it } from "vitest";
import { depoAdi, kucukBoyut } from "./dosya";

describe("kucukBoyut", () => {
  it("uzun kenarı 2000 pikseli geçen fotoğrafı oranını koruyarak küçültür", () => {
    expect(kucukBoyut(4000, 3000)).toEqual({ genislik: 2000, yukseklik: 1500 });
    expect(kucukBoyut(3024, 4032)).toEqual({ genislik: 1500, yukseklik: 2000 });
  });
  it("küçük resme dokunmaz", () => {
    expect(kucukBoyut(800, 600)).toEqual({ genislik: 800, yukseklik: 600 });
    expect(kucukBoyut(2000, 1000)).toEqual({ genislik: 2000, yukseklik: 1000 });
  });
});

describe("depoAdi", () => {
  it("Türkçe harf ve boşlukları depoya uygun hale getirir", () => {
    expect(depoAdi("Ön görünüm ışıklı.jpg")).toBe("On-gorunum-isikli.jpg");
  });
});
