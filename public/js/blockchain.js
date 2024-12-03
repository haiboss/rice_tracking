const crypto = require("crypto");
class Block {
  constructor(index, timestamp, data, previousHash = "") {
    this.index = index;
    this.timestamp = timestamp || new Date().toISOString();
    this.data = typeof data === "string" ? JSON.stringify(data) : data;
    this.previousHash = previousHash;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    return crypto
      .createHash("sha256")
      .update(
        this.index +
          this.timestamp +
          JSON.stringify(this.data) +
          this.previousHash
      )
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
      // Kiểm tra hash hiện tại
      if (currentBlock.hash !== currentBlock.calculateHash()) {
        console.error(`Invalid hash at block index ${currentBlock.index}`);
        return false;
      }
      // Kiểm tra previousHash
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
