import express from "express";
import crypto from "crypto";
import axios from "axios";

const app = express();

// RAW BODY untuk verifikasi signature Digiflazz
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SECRET = process.env.DIGIFLAZZ_SECRET;

// Cek server hidup
app.get("/", (req, res) => {
  res.send("REPORT DIGIFLAZZ AKTIF ✅");
});

// ENDPOINT REPORT
app.post("/report", async (req, res) => {
  const signature = req.headers["x-hub-signature"];
  const event = req.headers["x-digiflazz-event"];

  // 🔐 Validasi signature
  const hash = crypto
    .createHmac("sha1", SECRET)
    .update(req.rawBody)
    .digest("hex");

  if (signature !== `sha1=${hash}`) {
    return res.sendStatus(401);
  }

  const data = req.body?.data;
  if (!data) return res.sendStatus(200);

  // 🔔 HANYA PENDING
  if (data.status?.toLowerCase() === "pending") {
    const message = `
📊 REPORT TRANSAKSI PENDING
━━━━━━━━━━━━━━
🆔 Ref ID : ${data.ref_id}
📦 Produk : ${data.buyer_sku_code}
📱 Tujuan : ${data.customer_no}
💰 Harga  : Rp${data.price}
📌 Event  : ${event}
━━━━━━━━━━━━━━
`;

    await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        chat_id: CHAT_ID,
        text: message
      }
    );
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("REPORT berjalan di port", PORT)
);
