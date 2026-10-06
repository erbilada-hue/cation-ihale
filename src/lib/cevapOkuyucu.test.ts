import { describe, expect, it } from "vitest";
import { CevapSemasi, cevapIstemi, okumayiHizala, type CevapOkumasi } from "./cevapOkuyucu";

const satir = (no: number, ek: Partial<CevapOkumasi["kalemler"][number]> = {}) => ({
  no,
  fiyat_var: true,
  fiyat: "165",
  para_birimi: "TRY" as const,
  kdv: "haric" as const,
  termin: "",
  min_siparis: "",
  odeme_vadesi: "",
  not: "",
  ...ek,
});

describe("cevapIstemi", () => {
  it("kalemleri numaralı yazar ve cevabı ayırır", () => {
    const m = cevapIstemi(
      [
        { kalem_adi: "Fermuar", aciklama: "T-10 separe 75 cm", birim: "adet", para_birimi: "TRY" },
        { kalem_adi: "Ana kumaş", aciklama: "", birim: "m", para_birimi: "USD" },
      ],
      "  fermuar 6,20+kdv  ",
    );
    expect(m).toContain("1. Fermuar – T-10 separe 75 cm (birim: adet, para birimi: TRY)");
    expect(m).toContain("2. Ana kumaş (birim: m, para birimi: USD)");
    expect(m).toContain("<cevap>\nfermuar 6,20+kdv\n</cevap>");
  });
});

describe("okumayiHizala", () => {
  it("her sorulan kalem için bir satır döner, eksikler cevapta yok sayılır", () => {
    const s = okumayiHizala(3, { kalemler: [satir(2, { fiyat: "160-165", kdv: "dahil", termin: "10 gün" })], diger_bilgi: "" }, [
      "TRY",
      "USD",
      "EUR",
    ]);
    expect(s).toHaveLength(3);
    expect(s[0]).toMatchObject({ sira: 0, fiyatVar: false, para_birimi: "TRY", kdv_durumu: "belirsiz" });
    expect(s[1]).toMatchObject({ fiyatVar: true, fiyatMetni: "160-165", kdv_durumu: "dahil", termin: "10 gün" });
    expect(s[2]).toMatchObject({ fiyatVar: false, para_birimi: "EUR" });
  });

  it("geçersiz numaraları atlar, sembol ve KDV ekini temizler", () => {
    const s = okumayiHizala(1, { kalemler: [satir(0), satir(5), satir(1, { fiyat: "₺12,50 +KDV" })], diger_bilgi: "" }, ["TRY"]);
    expect(s).toHaveLength(1);
    expect(s[0].fiyatMetni).toBe("12,50");
  });

  it("fiyat_var=false ise fiyat yok sayılır", () => {
    const s = okumayiHizala(1, { kalemler: [satir(1, { fiyat_var: false, fiyat: "100" })], diger_bilgi: "" }, ["TRY"]);
    expect(s[0]).toMatchObject({ fiyatVar: false, fiyatMetni: "" });
  });

  it("şema geçerli JSON'u kabul eder", () => {
    expect(CevapSemasi.safeParse({ kalemler: [satir(1)], diger_bilgi: "" }).success).toBe(true);
  });
});
