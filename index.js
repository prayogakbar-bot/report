import express from "express";
import crypto from "crypto";
import axios from "axios";

const app = express();

/**
 * RAW BODY (WAJIB UNTUK DIGIFLAZZ SIGNATURE)
 */
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SECRET = process.env.DIGIFLAZZ_SECRET;

/**
 * CEK SERVER
 */
app.get("/", (req, res) => {
  res.send("REPORT DIGIFLAZZ AKTIF ✅");
});

/**
 * CALLBACK DIGIFLAZZ
 */
app.post("/report", async (req, res) => {
  try {
    const signature = req.headers["x-hub-signature"];
    const event = req.headers["x-digiflazz-event"];

    // Debug (AMAN)
    console.log("EVENT:", event);
    console.log("SIGNATURE:", signature ? "ADA" : "KOSONG");
    console.log("BODY:", req.body);

    if (!signature) {
      console.warn("❌ Signature tidak ditemukan");
      return res.sendStatus(401);
    }

    /**
     * VALIDASI SIGNATURE
     */
    const hash = crypto
      .createHmac("sha1", SECRET)
      .update(req.rawBody)
      .digest("hex");

    if (signature !== `sha1=${hash}`) {
      console.warn("❌ Signature tidak valid");
      return res.sendStatus(401);
    }

    const data = req.body?.data;
    if (!data) {
      console.warn("❌ Data kosong");
      return res.sendStatus(200);
    }

    /**
     * FILTER STATUS
     */
    if (data.status?.toLowerCase() !== "pending") {
      return res.sendStatus(200);
    }

    /**
     * FORMAT PESAN TELEGRAM
     */
    const message = `
📊 *REPORT TRANSAKSI PENDING*
━━━━━━━━━━━━━━
🆔 Ref ID : ${data.ref_id}
📦 Produk : ${data.buyer_sku_code}
📱 Tujuan : ${data.customer_no}
💰 Harga  : Rp${data.price}
📌 Event  : ${event}
━━━━━━━━━━━━━━
`;

    /**
     * KIRIM KE TELEGRAM
     */
    try {
      await axios.post(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
        {
          chat_id: CHAT_ID,
          text: message,
          parse_mode: "Markdown",
        }
      );
      console.log("✅ Telegram terkirim");
    } catch (tgErr) {
      console.error(
        "❌ Telegram error:",
        tgErr.response?.data || tgErr.message
      );
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("❌ ERROR CALLBACK:", err);
    res.sendStatus(500);
  }
});

/**
 * START SERVER
 */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 REPORT Digiflazz berjalan di port", PORT);
});
