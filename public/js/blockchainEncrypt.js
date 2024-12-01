const crypto = require("crypto");
const zlib = require("zlib");

class Block {
  constructor(index, timestamp, data, previousHash = "") {
    this.index = index;
    this.timestamp = timestamp || new Date().toISOString();
    this.data = this.compressAndEncrypt(data); // Nén và mã hóa dữ liệu
    this.previousHash = previousHash;
    this.hash = this.calculateHash();
  }

  // Hàm nén và mã hóa dữ liệu
  compressAndEncrypt(data) {
    const key = crypto.randomBytes(32); // AES-256 key
    const iv = crypto.randomBytes(16); // Initialization vector
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

  // Hàm giải mã và giải nén dữ liệu
  decryptAndDecompress(data) {
    const { encrypted, key, iv } = data;
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(key, "hex"),
      Buffer.from(iv, "hex")
    );

    let decrypted = decipher.update(Buffer.from(encrypted, "hex"));
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return JSON.parse(zlib.gunzipSync(decrypted).toString("utf-8"));
  }

  // Hàm tính toán hash
  calculateHash() {
    const dataString =
      typeof this.data === "string" ? this.data : JSON.stringify(this.data);
    return crypto
      .createHash("sha256")
      .update(this.index + this.timestamp + dataString + this.previousHash)
      .digest("hex");
  }
}

class Blockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
  }

  // Tạo Genesis Block
  createGenesisBlock() {
    return new Block(
      0,
      new Date().toISOString(),
      { message: "Genesis Block" },
      "0"
    );
  }

  // Lấy block mới nhất trong chuỗi
  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  // Thêm block mới vào chuỗi
  addBlock(newBlock) {
    newBlock.previousHash = this.getLatestBlock().hash; // Gán previousHash
    newBlock.hash = newBlock.calculateHash(); // Tính toán hash mới
    this.chain.push(newBlock); // Thêm block vào chuỗi
  }

  // Kiểm tra tính hợp lệ của chuỗi blockchain
  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      // Giải mã và giải nén dữ liệu của block hiện tại
      let decryptedData;
      try {
        decryptedData = currentBlock.decryptAndDecompress(currentBlock.data);
      } catch (error) {
        console.error(
          `Error decrypting data at block index ${currentBlock.index}:`,
          error
        );
        return false;
      }

      // Tính toán lại hash từ dữ liệu đã giải mã
      const recalculatedHash = crypto
        .createHash("sha256")
        .update(
          currentBlock.index +
            currentBlock.timestamp +
            JSON.stringify(decryptedData) +
            currentBlock.previousHash
        )
        .digest("hex");

      // Kiểm tra hash
      if (currentBlock.hash !== recalculatedHash) {
        console.error(`Invalid hash at block index ${currentBlock.index}`);
        return false;
      }

      // Kiểm tra `previousHash` của block hiện tại với `hash` của block trước đó
      if (currentBlock.previousHash !== previousBlock.hash) {
        console.error(
          `Invalid previous hash at block index ${currentBlock.index}`
        );
        return false;
      }
    }

    return true;
  }
}

module.exports = { Block, Blockchain };
