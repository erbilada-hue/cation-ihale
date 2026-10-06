// Yapay zekâ (Claude) çağrıları. Sadece sunucu işlemlerinden ("use server") çağrılır; anahtar ANTHROPIC_API_KEY ortam değişkenindedir.

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

export const AI_MODELI = "claude-opus-5-5";

export type AiSonucu<T> = { hata: string; veri?: undefined } | { hata?: undefined; veri: T };

export function aiHazirMi(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * Metni okuyup verilen şemaya uygun yapılandırılmış sonuç döndürür.
 * Hatalar kullanıcıya gösterilecek sade Türkçe metne çevrilir.
 */
export async function yapilandirilmisOku<S extends z.ZodType>(girdi: {
  sistem: string;
  icerik: Anthropic.Beta.BetaContentBlockParam[] | string;
  sema: S;
  /** Basit okuma için "low"; şartname gibi uzun belgeler için daha yüksek */
  efor?: "low" | "medium" | "high";
  maxTokens?: number;
}): Promise<AiSonucu<z.infer<S>>> {
  if (!aiHazirMi()) {
    return { hata: "Yapay zekâ anahtarı tanımlı değil. Kurulum rehberindeki \"Yapay zekâ anahtarı\" adımını yapın." };
  }
  const client = new Anthropic();
  try {
    const yanit = await client.beta.messages.parse({
      model: AI_MODELI,
      max_tokens: girdi.maxTokens ?? 16000,
      // Model bir isteği reddederse sunucu tarafında yedek modelle tekrar dener
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: girdi.efor ?? "low", format: betaZodOutputFormat(girdi.sema) },
      system: girdi.sistem,
      messages: [{ role: "user", content: girdi.icerik }],
    });
    if (yanit.stop_reason === "refusal") return { hata: "Yapay zekâ bu metni okuyamadı. Bilgileri elle girin." };
    if (yanit.stop_reason === "max_tokens") return { hata: "Metin çok uzun, yapay zekâ okumayı bitiremedi. Daha kısa parçalar halinde deneyin." };
    if (yanit.parsed_output == null) return { hata: "Yapay zekâ cevabı okunamadı. Tekrar deneyin veya bilgileri elle girin." };
    return { veri: yanit.parsed_output as z.infer<S> };
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
      return { hata: "Yapay zekâ anahtarı geçersiz. Vercel'deki ANTHROPIC_API_KEY değerini kontrol edin." };
    }
    if (e instanceof Anthropic.RateLimitError) return { hata: "Yapay zekâ şu an yoğun. Bir dakika sonra tekrar deneyin." };
    if (e instanceof Anthropic.BadRequestError) {
      if (/credit|billing|balance/i.test(e.message)) {
        return { hata: "Yapay zekâ hesabında bakiye kalmamış. Anthropic Console'dan bakiye yükleyin." };
      }
      return { hata: "Yapay zekâ isteği kabul etmedi: " + e.message };
    }
    if (e instanceof Anthropic.APIConnectionError) return { hata: "Yapay zekâya bağlanılamadı. Tekrar deneyin." };
    if (e instanceof Anthropic.APIError) return { hata: `Yapay zekâ hatası (${e.status ?? "?"}). Tekrar deneyin.` };
    throw e;
  }
}
