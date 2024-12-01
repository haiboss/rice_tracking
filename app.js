const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const QRCode = require("qrcode");
const cookieParser = require("cookie-parser");
const db = require("./public/js/db");
const { Block, Blockchain } = require("./public/js/blockchain");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const schedule = require("node-schedule");
const { authenticateToken, authorizeRole } = require("./middleware/auth");

const app = express();
const port = 3000;

// Biến toàn cục blockchain
let blockchain = new Blockchain();

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());
app.set("view engine", "ejs");

// Hàm khởi tạo blockchain
const initializeBlockchain = async () => {
  try {
    const chain = await loadBlockchainFromDatabase();

    if (!chain || chain.length === 0) {
      console.log("Blockchain trống. Tạo Genesis Block...");
      await saveBlockToDatabase(blockchain.chain[0]);
      await saveCheckpointToDB(); // Lưu checkpoint mới
    } else {
      console.log("Tải blockchain từ database...");

      // Kiểm tra tính hợp lệ của dữ liệu từ database
      const isValid = await isBlockchainValid(chain);
      if (!isValid) {
        console.error("Dữ liệu Blockchain không hợp lệ trong database.");
        // Thử khôi phục từ checkpoint
        const checkpoint = await recoverFromCheckpoint();
        if (checkpoint && checkpoint.length > 0) {
          console.warn("Dữ liệu bị hỏng. Đang khôi phục từ checkpoint...");
          blockchain.chain = checkpoint.map(
            (block) =>
              new Block(
                block.index,
                block.timestamp,
                block.data,
                block.previousHash
              )
          );
          console.log("Blockchain đã được khôi phục từ checkpoint.");
        } else {
          console.error(
            "Checkpoint cũng bị hỏng. Tạo lại Genesis Block để hệ thống hoạt động."
          );
          await saveBlockToDatabase(blockchain.chain[0]);
          await saveCheckpointToDB();
        }
      } else {
        console.log("Blockchain hợp lệ.");
        blockchain.chain = chain.map(
          (block) =>
            new Block(
              block.index,
              block.timestamp,
              block.data,
              block.previousHash
            )
        );
      }
    }

    scheduleCheckpoint();
    console.log(
      "Blockchain đã được khởi tạo thành công. Số block:",
      blockchain.chain.length
    );
  } catch (error) {
    console.error("Error initializing blockchain:", error);
    console.log(
      "Không thể khôi phục hoặc tạo lại dữ liệu blockchain. Hệ thống sẽ hoạt động với Genesis Block mới."
    );
    //const genesisBlock = blockchain.createGenesisBlock();
    //blockchain.chain = [genesisBlock];
    await saveBlockToDatabase(blockchain.chain[0]);
    await saveCheckpointToDB();
  }
};

// Trang tra cứu thông tin gạo
app.get("/", (req, res) => {
  db.query("SELECT * FROM rice_batches", (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      res.status(500).send("Internal Server Error");
      return;
    }
    res.render("index", { batches: results });
  });
});
// --------------Checkpoint Block ---------------------------------------
const recoverFromCheckpoint = async () => {
  try {
    const checkpoints = await loadAllCheckpointsFromDB();
    for (const checkpoint of checkpoints) {
      console.log(
        `Đang kiểm tra checkpoint với số block: ${checkpoint.length}`
      );
      const chain = checkpoint.map(
        (block) =>
          new Block(
            block.index,
            block.timestamp,
            block.data,
            block.previousHash
          )
      );
      const tempBlockchain = new Blockchain();
      tempBlockchain.chain = chain;

      if (tempBlockchain.isChainValid()) {
        console.log("Checkpoint hợp lệ. Đang khôi phục blockchain...");
        blockchain.chain = chain;
        return true;
      } else {
        console.warn(
          "Checkpoint không hợp lệ. Tiếp tục kiểm tra checkpoint cũ hơn..."
        );
      }
    }
    console.error("Không có checkpoint hợp lệ. Dừng hệ thống.");
    return false;
  } catch (error) {
    console.error("Lỗi khi khôi phục từ checkpoint:", error);
    throw error;
  }
};
const loadAllCheckpointsFromDB = async () => {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM blockchain_checkpoint ORDER BY created_at DESC",
      (err, results) => {
        if (err) {
          console.error("Lỗi khi tải checkpoint từ database:", err);
          return reject(err);
        }
        try {
          const checkpoints = results.map((row) => {
            return JSON.parse(row.chain_data);
          });
          resolve(checkpoints);
        } catch (error) {
          console.error("Lỗi khi parse checkpoint:", error);
          reject(error);
        }
      }
    );
  });
};

const scheduleCheckpoint = () => {
  // Lịch trình chạy mỗi 10 phút
  schedule.scheduleJob("*/20 * * * *", async () => {
    await saveCheckpointToDB(blockchain);
    console.log("Checkpoint đã được lưu tự động (node-schedule).");
  });
};
const saveCheckpointToDB = async () => {
  const checkpointData = JSON.stringify(blockchain.chain);
  db.query(
    "INSERT INTO blockchain_checkpoint (checkpoint_data) VALUES (?)",
    [checkpointData],
    (err) => {
      if (err) {
        console.error("Lỗi khi lưu checkpoint vào DB:", err);
      } else {
        console.log("Checkpoint đã được lưu vào DB.");
      }
    }
  );
};
//--------------------------END Checkpoint --------------------------
const generateQRCode = async (data) => {
  try {
    const qrData = await QRCode.toDataURL(JSON.stringify(data));
    return qrData; // Trả về chuỗi Base64 của QR Code
  } catch (error) {
    console.error("Error generating QR Code:", error);
    throw error;
  }
};
app.get("/blockchain/search/:numBatches", async (req, res) => {
  const { numBatches } = req.params;
  const block = blockchain.chain.find(
    (b) => b.index !== 0 && b.data?.NumBatches === numBatches
  );

  if (!block) {
    return res.status(404).json({
      message: `Không tìm thấy thông tin cho mã số lô gạo: ${numBatches}`,
    });
  }
  const qrCode = await generateQRCode(block.data); // Tạo QR Code từ dữ liệu block
  // Nếu tìm thấy, trả về thông tin block
  res.json({
    success: true,
    data: block.data,
    hash: block.hash,
    qrCode,
  });
});

//--------------------------------API login/logout/phân quyền -------------------------------------
// đăng nhập
app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  // Kiểm tra thông tin từ cơ sở dữ liệu
  db.query("SELECT * FROM users WHERE email = ?", [email], (err, rows) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }

    if (rows.length === 0) {
      return res
        .status(401)
        .json({ message: "Địa chỉ email và mật khẩu không hợp lệ" }); // Email không tồn tại
    }

    const user = rows[0];

    // So sánh mật khẩu đã băm
    bcrypt.compare(password, user.password, (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Internal server error" });
      }

      if (!result) {
        return res
          .status(401)
          .json({ message: "Địa chỉ email và mật khẩu không hợp lệ" }); // Mật khẩu sai
      }

      // Tạo token JWT khi thông tin chính xác
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        "Vnpt#@123456!",
        { expiresIn: "1h" }
      );

      res.cookie("token", token, { httpOnly: true });

      // Điều hướng theo vai trò
      if (user.role === "admin") {
        return res.redirect("/admin");
      } else if (user.role === "farmer") {
        return res.redirect("/farmer");
      } else {
        return res.status(403).json({ message: "Không có quyền truy cập" });
      }
    });
  });
});

// logout
app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});
app.get("/user/changepass", (req, res) => {
  res.render("changepass");
});
app.post("/user/change-password", authenticateToken, async (req, res) => {
  const userEmail = req.user.email; // Email từ token
  const { currentPassword, newPassword } = req.body;

  try {
    // Lấy mật khẩu hiện tại từ cơ sở dữ liệu
    db.query(
      "SELECT password FROM users WHERE email = ?",
      [userEmail],
      async (err, rows) => {
        if (err) {
          console.error("Error fetching user:", err);
          return res
            .status(500)
            .json({ success: false, message: "Internal server error" });
        }

        if (rows.length === 0) {
          return res
            .status(404)
            .json({ success: false, message: "Người dùng không tồn tại" });
        }

        const storedPassword = rows[0].password;

        // Kiểm tra mật khẩu hiện tại
        const isMatch = await bcrypt.compare(currentPassword, storedPassword);
        if (!isMatch) {
          return res
            .status(400)
            .json({ success: false, message: "Mật khẩu hiện tại không đúng" });
        }

        // Mã hóa mật khẩu mới
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Cập nhật mật khẩu mới
        db.query(
          "UPDATE users SET password = ? WHERE email = ?",
          [hashedPassword, userEmail],
          (err) => {
            if (err) {
              console.error("Error updating password:", err);
              return res
                .status(500)
                .json({ success: false, message: "Không thể đổi mật khẩu" });
            }
            res.json({ success: true, message: "Đổi mật khẩu thành công" });
          }
        );
      }
    );
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ success: false, message: "Có lỗi xảy ra" });
  }
});
//--------------------------------END API login/logout/phân quyền -------------------------------------

app.get("/farmer", authenticateToken, authorizeRole("farmer"), (req, res) => {
  res.render("farmer");
});
app.get("/admin", authenticateToken, authorizeRole("admin"), (req, res) => {
  res.render("admin");
});
//--------------------------------------------------
//-----------------------------API quản lý thông tin lô gạo------------------------
// Lấy danh sách lô gạo
app.get(
  "/farmer/batches",
  authenticateToken,
  authorizeRole("farmer"),
  (req, res) => {
    const farmerEmail = req.user.email;
    const page = parseInt(req.query.page) || 1; // Trang hiện tại
    const limit = parseInt(req.query.limit) || 10; // Số dòng mỗi trang
    const offset = (page - 1) * limit;

    db.query(
      `SELECT 
          r.id,
          r.rice_type,
          r.expiry_date,
          r.attributes,
          r.weight,
          r.certifications,
          r.brand,
          p.name AS productBy,
          t.name AS transportBy,
          r.blockchain_hash,
          r.NumBatches,
          r.region_code
        FROM 
          rice_batches AS r
        JOIN 
          producers AS p ON r.produced_by = p.id
        JOIN 
          transporters AS t ON r.transported_by = t.id
        WHERE 
          r.email = ?
        LIMIT ? OFFSET ?`,
      [farmerEmail, limit, offset],
      (err, rows) => {
        if (err) {
          console.error("Database query error:", err);
          return res
            .status(500)
            .json({ message: "Failed to load rice batches" });
        }

        db.query(
          `SELECT COUNT(*) AS total FROM rice_batches WHERE email = ?`,
          [farmerEmail],
          (countErr, countResult) => {
            if (countErr) {
              console.error("Database count error:", countErr);
              return res
                .status(500)
                .json({ message: "Failed to count rice batches" });
            }

            const total = countResult[0].total;
            res.json({
              rows,
              total,
              page,
              totalPages: Math.ceil(total / limit),
            });
          }
        );
      }
    );
  }
);

// Lấy chi tiết lô gạo
app.get(
  "/farmer/batches/:id",
  authenticateToken,
  authorizeRole("farmer"),
  (req, res) => {
    const { id } = req.params;
    const farmerEmail = req.user.email; // Email của farmer được xác định từ token
    db.query(
      "SELECT * FROM rice_batches WHERE id = ? AND email = ?",
      [id, farmerEmail],
      (err, rows) => {
        if (err || rows.length === 0)
          return res.status(404).json({ message: "Không tìm thấy lô gạo" });
        res.json(rows[0]);
      }
    );
  }
);
// Thêm lô gạo
app.post(
  "/farmer/batches",
  authenticateToken,
  authorizeRole("farmer"),
  (req, res) => {
    const {
      rice_type,
      expiry_date,
      attributes,
      weight,
      certifications,
      brand,
      produced_by,
      transported_by,
      region_code,
    } = req.body;
    const farmerEmail = req.user.email; // Email của farmer được xác định từ token

    db.query(
      "INSERT INTO rice_batches (rice_type, expiry_date, attributes, weight, certifications, brand, produced_by, transported_by, email, blockchain_hash,region_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL,?)",
      [
        rice_type,
        expiry_date,
        attributes,
        weight,
        certifications,
        brand,
        produced_by,
        transported_by,
        farmerEmail,
        region_code,
      ],
      (err) => {
        if (err)
          return res
            .status(500)
            .json({ message: "Có lỗi xãy ra khi thêm lô gạo" });
        res.json({ message: "Thêm mới lô gạo thành công" });
      }
    );
  }
);
// Sửa lô gạo
app.put(
  "/farmer/batches/:id",
  authenticateToken,
  authorizeRole("farmer"),
  (req, res) => {
    const { id } = req.params;
    const {
      rice_type,
      expiry_date,
      attributes,
      weight,
      certifications,
      brand,
      produced_by,
      transported_by,
      region_code,
    } = req.body;
    const farmerEmail = req.user.email; // Email của farmer được xác định từ token

    db.query(
      "UPDATE rice_batches SET rice_type = ?, expiry_date = ?, attributes = ?, weight = ?, certifications = ?, brand = ?, produced_by = ?, transported_by = ?, region_code=? WHERE id = ? AND email = ?  AND blockchain_hash IS NULL",
      [
        rice_type,
        expiry_date,
        attributes,
        weight,
        certifications,
        brand,
        produced_by,
        transported_by,
        region_code,
        id,
        farmerEmail,
      ],
      (err) => {
        if (err)
          return res
            .status(500)
            .json({ message: "Có lỗi sãy ra khi cập nhận lô gạo" });
        res.json({ message: "Cập nhật thành công lô gạo" });
      }
    );
  }
);
// Xóa lô gạo
app.delete(
  "/farmer/batches/:id",
  authenticateToken,
  authorizeRole("farmer"),
  (req, res) => {
    const { id } = req.params;
    const farmerEmail = req.user.email; // Email của farmer được xác định từ token

    db.query(
      "DELETE FROM rice_batches WHERE id = ? AND email = ? AND blockchain_hash IS NULL",
      [id, farmerEmail],
      (err) => {
        if (err)
          return res
            .status(500)
            .json({ message: "Có lỗi xãy ra khi xóa lô gạo" });
        res.json({ message: "lô gạo được xóa thành công" });
      }
    );
  }
);
const saveBlockToDatabase = async (block) => {
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO blockchain (\`index\`, timestamp, data, previousHash, hash) VALUES (?, ?, ?, ?, ?)`;
    const values = [
      block.index,
      new Date(block.timestamp).toISOString().slice(0, 19).replace("T", " "), // Chuyển đổi timestamp
      JSON.stringify(block.data), // Chuyển đổi data sang JSON string
      block.previousHash,
      block.hash,
    ];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("Error inserting block into database:", err);
        return reject(err);
      }
      resolve(result);
    });
  });
};

const loadBlockchainFromDatabase = async () => {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT 
        b.index,
        b.timestamp,
        b.data,
        b.previousHash,
        b.hash 
      FROM blockchain b ORDER BY b.index ASC`,
      (err, rows) => {
        if (err) {
          console.error("Error querying blockchain from database:", err);
          return reject(err);
        }

        try {
          const chain = rows.map((row) => {
            let parsedData;

            // Kiểm tra và parse JSON từ cột `data`
            if (typeof row.data === "string") {
              try {
                parsedData = JSON.parse(row.data);
              } catch (error) {
                console.error("Invalid JSON data in row:", row.data);
                throw new Error("Invalid JSON data in database");
              }
            } else {
              parsedData = row.data;
            }

            // Tạo thể hiện của lớp Block
            return new Block(
              row.index,
              row.timestamp,
              parsedData,
              row.previousHash
            );
          });

          resolve(chain);
        } catch (error) {
          console.error("Error processing blockchain data:", error);
          reject(error);
        }
      }
    );
  });
};

const isBlockchainValid = async (chain) => {
  for (let i = 1; i < chain.length; i++) {
    const currentBlock = chain[i];
    const previousBlock = chain[i - 1];

    if (
      currentBlock.hash !==
      new Block(
        currentBlock.index,
        currentBlock.timestamp,
        currentBlock.data,
        currentBlock.previousHash
      ).calculateHash()
    ) {
      return false;
    }

    if (currentBlock.previousHash !== previousBlock.hash) {
      return false;
    }
  }
  return true;
};

// Duyệt lô gạo cho vào BlockChain
app.put(
  "/farmer/batches/:id/approve",
  authenticateToken,
  authorizeRole("farmer"),
  async (req, res) => {
    const { id } = req.params;
    const farmerEmail = req.user.email;

    db.query(
      `SELECT 
          r.id,
          r.rice_type,
          r.expiry_date,
          r.attributes,
          r.weight,
          r.certifications,
          r.brand,
          p.name AS productBy,
          p.lat AS latProduct,
          p.lng AS lngProduct,
          t.name AS transportBy,
          t.lat AS latTransport,
          t.lng AS lngTransport,
          r.blockchain_hash,
          r.region_code
        FROM 
          rice_batches AS r
        JOIN 
          producers AS p ON r.produced_by = p.id
        JOIN 
          transporters AS t ON r.transported_by = t.id
        WHERE 
          r.id = ? AND r.email = ?`,
      [id, farmerEmail],
      async (err, rows) => {
        if (err) {
          console.error("Error fetching batch:", err);
          return res
            .status(500)
            .json({ message: "Có lỗi khi duyệt lô gạo " + err });
        }

        if (rows.length === 0) {
          return res.status(404).json({ message: "Không tìm thấy lô gạo" });
        }

        const batch = rows[0];

        try {
          // Tạo mã số tra cứu duy nhất
          const numBatches = `RICE-${Date.now()}-${id}`;
          const data = {
            ...batch,
            NumBatches: numBatches,
          };
          // Lấy hash từ block cuối cùng
          const latestHash = blockchain.getLatestBlock()?.hash || "0";

          // Tạo block mới
          const newBlock = new Block(
            blockchain.chain.length,
            new Date().toISOString(),
            data,
            latestHash
          );

          // Thêm block vào cơ sở dữ liệu
          await saveBlockToDatabase(newBlock);

          // Thêm block vào chuỗi blockchain trong bộ nhớ
          blockchain.addBlock(newBlock);

          // Cập nhật blockchain_hash và NumBatches vào cơ sở dữ liệu
          db.query(
            "UPDATE rice_batches SET blockchain_hash = ?, NumBatches = ? WHERE id = ?",
            [newBlock.hash, numBatches, id],
            (err) => {
              if (err) {
                return res
                  .status(500)
                  .json({ message: "Có lỗi khi duyệt lô gạo lưu vào DB" });
              }

              res.json({
                message: "Phê duyệt lô gạo thành công",
                blockchainHash: newBlock.hash,
                numBatches,
              });
            }
          );
        } catch (error) {
          res.status(500).json({
            message: "Có lỗi khi thêm lô gạo vào Chuỗi BlockChain " + error,
          });
        }
      }
    );
  }
);

//-----------------------------END ------------------------------------------------
//--------------------------------END API nhà cung cấp-----------------------------
app.get(
  "/admin/add-producer",
  authenticateToken,
  authorizeRole("admin"),
  (req, res) => {
    res.render("add-producer");
  }
);
// lấy danh sách nhà cung cấp
app.get("/admin/producers", authenticateToken, (req, res) => {
  const sql = "SELECT id, name, address,lat,lng FROM producers";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Database Error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Không tìm thấy thông tin" });
    }
    // Trả về mảng trống nếu không có dữ liệu
    res.json(results || []);
  });
});

// Route xử lý thêm nhà sản xuất
app.post(
  "/admin/add-producer",
  authenticateToken,
  authorizeRole("admin"),
  (req, res) => {
    const { name, address, lat, lng } = req.body;

    if (!name || !address || !lat || !lng) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });
    }

    const sql =
      "INSERT INTO producers (name, address, lat, lng) VALUES (?, ?, ?, ?)";
    const values = [name, address, parseFloat(lat), parseFloat(lng)];

    db.query(sql, values, (err) => {
      if (err) {
        console.error("Database Error:", err);
        return res
          .status(500)
          .json({ success: false, message: "Failed to add producer." });
      }
      res.json({ success: true, message: "Producer added successfully." });
    });
  }
);
//--------------------------------END API Nhà cung cấp -----------------------------
//--------------------------------API đơn vị vận chuyển --------------------------------------
app.get(
  "/admin/add-transporter",
  authenticateToken,
  authorizeRole("admin"),
  (req, res) => {
    res.render("add-transporter");
  }
);
//API Lấy Danh Sách Nhà Vận Chuyển
app.get("/admin/transporters", authenticateToken, (req, res) => {
  const sql = "SELECT id, name, address,lat,lng FROM transporters";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Database Error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Không tìm thấy thông tin" });
    }
    res.json(results || []);
  });
});
// lấy chi tiết đơn vị vận chuyển
app.get(
  "/admin/transporters/:id",
  authenticateToken,
  authorizeRole("admin"),
  (req, res) => {
    const { id } = req.params;

    db.query("SELECT * FROM transporters WHERE id = ?", [id], (err, rows) => {
      if (err) {
        console.error("Error fetching transporter by ID:", err);
        return res
          .status(500)
          .json({ message: "Có lỗi khi lấy thông tin nhà vận chuyển" });
      }

      if (rows.length === 0) {
        return res.status(404).json({ message: "Không tìm thấy thông tin" });
      }

      res.json(rows[0]); // Trả về thông tin nhà vận chuyển
    });
  }
);
// xóa đơn vị
app.delete(
  "/admin/transporters/:id",
  authenticateToken,
  authorizeRole("admin"),
  (req, res) => {
    const { id } = req.params;

    db.query("DELETE FROM transporters WHERE id = ?", [id], (err, result) => {
      if (err) {
        console.error("Error deleting transporter:", err);
        return res.status(500).json({ message: "Có lỗi khi xóa " + err });
      }

      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ message: "Không tìm thấy đơn vị vận chuyển" });
      }

      res.json({ message: "Xóa thành công đơn vị vận chuyển" });
    });
  }
);
app.put(
  "/admin/transporters/:id",
  authenticateToken,
  authorizeRole("admin"),
  (req, res) => {
    const { id } = req.params;
    const { name, address, lat, lng } = req.body;

    db.query(
      `UPDATE transporters 
         SET name = ?, address = ?, lat = ?, lng = ? 
         WHERE id = ?`,
      [name, address, lat, lng, id],
      (err, result) => {
        if (err) {
          console.error("Error updating transporter:", err);
          return res
            .status(500)
            .json({ message: "Failed to update transporter" });
        }

        if (result.affectedRows === 0) {
          return res
            .status(404)
            .json({ message: "Không tìm thấy đo8n vị vận chuyển" });
        }

        res.json({ message: "Cập nhật thành công đơn vị vận chuyển" });
      }
    );
  }
);

// Thêm mới nhà vận chuyển
app.post(
  "/admin/transporters",
  authenticateToken,
  authorizeRole("admin"),
  (req, res) => {
    const { name, address, lat, lng } = req.body;

    if (!name || !address || !lat || !lng) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cập nhật đầy đủ thông tin.",
      });
    }

    const sql =
      "INSERT INTO transporters (name, address, lat, lng) VALUES (?, ?, ?, ?)";
    const values = [name, address, parseFloat(lat), parseFloat(lng)];

    db.query(sql, values, (err) => {
      if (err) {
        console.error("Database Error:", err);
        return res
          .status(500)
          .json({ success: false, message: "Có lỗi khi thêm mới" });
      }
      res.json({ success: true, message: "Thêm mới thành công" });
    });
  }
);
// sửa đơn vị
app.put(
  "/admin/transporters/:id",
  authenticateToken,
  authorizeRole("admin"),
  (req, res) => {
    const { id } = req.params;
    const { name, address, lat, lng } = req.body;

    db.query(
      `UPDATE transporters 
         SET name = ?, address = ?, lat = ?, lng = ? 
         WHERE id = ?`,
      [name, address, lat, lng, id],
      (err, result) => {
        if (err) {
          console.error("Error updating transporter:", err);
          return res.status(500).json({ message: "Có lỗi khi cập nhật" });
        }

        if (result.affectedRows === 0) {
          return res
            .status(404)
            .json({ message: "Không tìm thấy nhà cung cấp" });
        }

        res.json({ message: "Cập nhật thành công" });
      }
    );
  }
);

//--------------------------------END API đơn vị vận chuyển -----------------------------
//----------------------------API report -------------------------------------------------
const getRiceBatchStatsByFarmer = async () => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        f.email AS farmer_email,
        f.name AS farmer_name,
        COUNT(r.id) AS total_batches,
        SUM(CASE WHEN r.blockchain_hash IS NOT NULL THEN 1 ELSE 0 END) AS approved_batches
      FROM 
        users AS f
      LEFT JOIN 
        rice_batches AS r ON f.email = r.email
      WHERE role ='farmer'
      GROUP BY 
        f.email, f.name
    `;

    db.query(sql, (err, results) => {
      if (err) {
        console.error("Error fetching rice batch stats:", err);
        return reject(err);
      }
      resolve(results);
    });
  });
};
// lấy tổng số blockchain
function getBlockchainStatistics() {
  const totalBlock = blockchain.chain.length;
  console.log(totalBlock);
  return totalBlock;
}
// Hàm lấy số liệu từ MySQL
async function getMySQLStatistics() {
  try {
    const totalBatches = await new Promise((resolve, reject) => {
      db.query("SELECT COUNT(*) AS total FROM rice_batches", (err, rows) => {
        if (err) return reject(err);
        resolve(rows[0].total);
      });
    });

    const suppliers = await new Promise((resolve, reject) => {
      db.query("SELECT COUNT(*) AS suppliers FROM producers", (err, rows) => {
        if (err) return reject(err);
        resolve(rows[0].suppliers);
      });
    });

    const transporters = await new Promise((resolve, reject) => {
      db.query(
        "SELECT COUNT(*) AS transporters FROM transporters",
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows[0].transporters);
        }
      );
    });

    const farmers = await new Promise((resolve, reject) => {
      db.query(
        "SELECT COUNT(*) AS farmers FROM users WHERE role ='farmer'",
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows[0].farmers);
        }
      );
    });

    return { totalBatches, suppliers, transporters, farmers };
  } catch (error) {
    throw new Error("Có lỗi khi báo cáo");
  }
}
async function getStatistics() {
  try {
    const mysqlStats = await getMySQLStatistics();
    const totalBlock = getBlockchainStatistics();

    return {
      totalBatches: mysqlStats.totalBatches,
      suppliers: mysqlStats.suppliers,
      transporters: mysqlStats.transporters,
      farmers: mysqlStats.farmers,
      totalBlock: totalBlock,
    };
  } catch (error) {
    console.error("Error in getStatistics:", error);
    throw error;
  }
}
app.get("/admin/report", (req, res) => {
  res.render("report");
});
app.get(
  "/admin/getreport",
  authenticateToken,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const stats = await getStatistics();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ success: false, message: "Có lỗi khi báo cáo." });
    }
  }
);
app.get(
  "/farmer/GetReport",
  authenticateToken,
  authorizeRole("farmer"),
  (req, res) => {
    res.render("reportByuser");
  }
);
app.get(
  "/admin/farmer-stats",
  authenticateToken,
  authorizeRole("admin"),
  async (req, res) => {
    try {
      const stats = await getRiceBatchStatsByFarmer();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching farmer stats:", error);
      res.status(500).json({ message: "Failed to fetch farmer stats" });
    }
  }
);
app.get(
  "/farmer/farmer-stats",
  authenticateToken,
  authorizeRole("farmer"),
  async (req, res) => {
    const farmerEmail = req.user.email;
    console.log(farmerEmail);
    if (!farmerEmail) {
      return res
        .status(400)
        .json({ message: "Email không được cung cấp trong cookie" });
    }

    try {
      const sql = `
        SELECT 
          f.email AS farmer_email,
          f.name AS farmer_name,
          COUNT(r.id) AS total_batches,
          SUM(CASE WHEN r.blockchain_hash IS NOT NULL THEN 1 ELSE 0 END) AS approved_batches
        FROM 
          users AS f
        LEFT JOIN 
          rice_batches AS r ON f.email = r.email
        WHERE r.email = ?
        GROUP BY 
          f.email, f.name
      `;

      db.query(sql, [farmerEmail], (err, results) => {
        if (err) {
          console.error("Error fetching farmer details:", err);
          return res.status(500).json({ message: "Đã có lỗi xãy ra " + err });
        }

        if (results.length === 0) {
          return res.status(404).json({ message: "Không có lô gạo" });
        }

        res.json(results);
      });
    } catch (error) {
      res.status(500).json({ message: "Đã có lỗi xãy ra " + err });
    }
  }
);
//----------------------------END API report -------------------------------------------------
/*
async function hashPassword() {
  const password = "Vnpt#@123456!";
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log("Hashed Password:", hashedPassword);
}
hashPassword();
*/

//-----------------------------API quản lý tài khoản-------------------------------------------
app.get(
  "/admin/user",
  authenticateToken,
  authorizeRole("admin"),
  (req, res) => {
    res.render("users");
  }
);
// Lấy danh sách người dùng
app.get(
  "/admin/users",
  authenticateToken,
  authorizeRole("admin"),
  (req, res) => {
    db.query(
      "SELECT id, name, email, role, isEnable FROM users",
      (err, rows) => {
        if (err)
          return res.status(500).json({ message: "Lỗi khi tải danh sách" });
        res.json(rows);
      }
    );
  }
);

// Lấy chi tiết người dùng
app.get(
  "/admin/users/:id",
  authenticateToken,
  authorizeRole("admin"),
  (req, res) => {
    const { id } = req.params;
    db.query("SELECT * FROM users WHERE id = ?", [id], (err, rows) => {
      if (err || rows.length === 0)
        return res.status(404).json({ message: "Không tìm thấy tài khoản" });
      res.json(rows[0]);
    });
  }
);

// Thêm người dùng
app.post(
  "/admin/users",
  authenticateToken,
  authorizeRole("admin"),
  (req, res) => {
    const { name, email, password, role, isEnable } = req.body;
    db.query(
      "INSERT INTO users (name, email, password, role, isEnable) VALUES (?, ?, ?, ?, ?)",
      [name, email, password, role, isEnable],
      (err) => {
        if (err) return res.status(500).json({ message: "Lỗi thêm tài khoản" });
        res.json({ message: "Thêm tài khoản thành công" });
      }
    );
  }
);

// Sửa người dùng
app.put(
  "/admin/users/:id",
  authenticateToken,
  authorizeRole("admin"),
  (req, res) => {
    const { id } = req.params;
    const { name, email, password, role, isEnable } = req.body;

    const fields = [];
    const values = [];

    if (name) {
      fields.push("name = ?");
      values.push(name);
    }
    if (email) {
      fields.push("email = ?");
      values.push(email);
    }
    if (password) {
      fields.push("password = ?");
      values.push(password);
    }
    if (role) {
      fields.push("role = ?");
      values.push(role);
    }
    if (isEnable !== undefined) {
      fields.push("isEnable = ?");
      values.push(isEnable);
    }

    values.push(id);

    db.query(
      `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
      values,
      (err) => {
        if (err)
          return res.status(500).json({ message: "Lỗi cập nhật tài khoản" });
        res.json({ message: "Cập nhật thành công" });
      }
    );
  }
);

// Xóa người dùng
app.delete(
  "/admin/users/:id",
  authenticateToken,
  authorizeRole("admin"),
  (req, res) => {
    const { id } = req.params;
    db.query("Update users set isEnable =0 WHERE id = ?", [id], (err) => {
      if (err) return res.status(500).json({ message: "Lỗi xóa tài khoản" });
      res.json({ message: "Đã khóa tài khoản" });
    });
  }
);
//-----------------------------END API quản lý tài khoản-------------------------------------------
initializeBlockchain().then(() => {
  app.listen(port, () => {
    console.log("Server is running on http://localhost:3000");
  });
});
