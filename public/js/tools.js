const crypto = require("crypto");
const zlib = require("zlib");

class Tools {
  // Hàm nén và mã hóa
  compressAndEncrypt(data) {
    const key = crypto.randomBytes(32); // Khóa AES-256
    const iv = crypto.randomBytes(16); // Vector khởi tạo
    const compressed = zlib.gzipSync(JSON.stringify(data)); // Nén dữ liệu

    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(compressed);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return {
      encrypted: encrypted.toString("hex"),
      key: key.toString("hex"),
      iv: iv.toString("hex"),
    };
  }

  // Hàm giải mã và giải nén
  decryptAndDecompress({ encrypted, key, iv }) {
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(key, "hex"),
      Buffer.from(iv, "hex")
    );

    let decrypted = decipher.update(Buffer.from(encrypted, "hex"));
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return JSON.parse(zlib.gunzipSync(decrypted).toString("utf8"));
  }
}

module.exports = Tools; // Đảm bảo xuất đúng lớp
