document
  .querySelector('[data-bs-toggle="collapse"]')
  .addEventListener("click", function () {
    const formContainer = document.getElementById("batch-form-container");
    const isCollapsed = formContainer.classList.contains("show"); // Kiểm tra trạng thái hiển thị

    if (isCollapsed) {
      this.textContent = "Hiện"; // Đổi nội dung nút
    } else {
      this.textContent = "Ẩn"; // Đổi nội dung nút
    }
  });

// Tải danh sách Producers và Transporters
async function loadProducersAndTransporters() {
  try {
    const producerResponse = await fetch("/admin/producers");
    const transporterResponse = await fetch("/admin/transporters");
    const producers = await producerResponse.json();
    const transporters = await transporterResponse.json();

    const producerSelect = document.getElementById("produced_by");
    const transporterSelect = document.getElementById("transported_by");

    producers.forEach((producer) => {
      const option = document.createElement("option");
      option.value = producer.id;
      option.textContent = producer.name;
      producerSelect.appendChild(option);
    });

    transporters.forEach((transporter) => {
      const option = document.createElement("option");
      option.value = transporter.id;
      option.textContent = transporter.name;
      transporterSelect.appendChild(option);
    });
  } catch (error) {
    console.error("Error loading producers and transporters:", error);
  }
}

let currentPage = 1;
const limit = 10;

async function loadBatches(page = 1) {
  try {
    const response = await fetch(`/farmer/batches?page=${page}&limit=${limit}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const { rows: batches, total, totalPages } = await response.json();

    const batchList = document.getElementById("batch-list");
    batchList.innerHTML = "";

    if (!Array.isArray(batches)) {
      throw new Error("Batches is not an array");
    }

    batches.forEach((batch) => {
      batchList.innerHTML += `
                <tr>
                  <td>${batch.id}</td>
                  <td>${
                    batch.NumBatches ? batch.NumBatches : "n/a"
                  }</td>                  
                  <td>${batch.rice_type}</td>
                  <td>${batch.attributes}</td>
                  <td>${formatDate(batch.expiry_date)}</td>
                  <td>${batch.weight}</td>
                  <td>${batch.certifications}</td>
                  <td>${batch.brand}</td>
                  <td>${batch.region_code}</td>
                  <td>${batch.productBy}</td>
                  <td>${batch.transportBy}</td>                  
                  <td>
                  ${
                    batch.blockchain_hash
                      ? `<i class="bi bi-eye-fill text-primary" role="button" onclick="viewQRCode('${batch.id}')"></i>`
                      : "Pending"
                  }
                  </td>
                  <td>
                    <button class="btn btn-sm btn-warning" onclick="editBatch(${
                      batch.id
                    })" ${batch.blockchain_hash ? "disabled" : ""}>Sửa</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteBatch(${
                      batch.id
                    })" ${batch.blockchain_hash ? "disabled" : ""}>Xóa</button>
                    <button class="btn btn-sm btn-success" onclick="approveBatch(${
                      batch.id
                    })" ${
        batch.blockchain_hash ? "disabled" : ""
      }>Duyệt</button>
                  </td>
                </tr>
            `;
    });

    updatePagination(totalPages, page);
  } catch (error) {
    console.error("Error loading batches:", error);
  }
}

function updatePagination(totalPages, currentPage) {
  const pagination = document.getElementById("pagination");
  pagination.innerHTML = "";

  for (let page = 1; page <= totalPages; page++) {
    const button = document.createElement("button");
    button.className = "btn btn-primary mx-1";
    button.textContent = page;
    button.disabled = page === currentPage;
    button.addEventListener("click", () => {
      currentPage = page;
      loadBatches(page);
    });
    pagination.appendChild(button);
  }
}
const viewQRCode = async (batchId) => {
  try {
    // Gọi API backend để lấy thông tin lô gạo
    const response = await fetch(`/farmer/batches/${batchId}`);
    if (!response.ok) {
      throw new Error("Không thể tải thông tin lô gạo.");
    }

    const batch = await response.json();

    // Tạo QR code từ thông tin lô gạo
    // const qrCodeData = JSON.stringify({
    //   id: batch.id,
    //   NumBatches: batch.NumBatches,
    //   rice_type: batch.rice_type,
    //   attributes: batch.attributes,
    //   expiry_date: batch.expiry_date,
    //   weight: batch.weight,
    //   certifications: batch.certifications,
    //   brand: batch.brand,
    //   regionCode: batch.region_code,
    //   productBy: batch.productBy,
    //   productLat: batch.latProduct,
    //   productLng: batch.lngProduct,
    //   transportBy: batch.transportBy,
    //   transportLat: batch.latTransport,
    //   transportLng: batch.lngTransport,
    // });
    const qrCodeData = `
      Địa chỉ tra cứu: http://localhost:3000
      Mã lô gạo: ${batch.NumBatches}
      Loại Gạo: ${batch.rice_type}
      Thương hiệu: ${batch.brand}
      Chứng nhận: ${batch.certifications}
    `;

    const qrCode = await QRCode.toDataURL(qrCodeData); // Sử dụng thư viện QRCode.js để tạo QRCode

    // Hiển thị QR code trong modal
    const qrcodeImage = document.getElementById("qrcodeImage");
    qrcodeImage.src = qrCode;

    const qrcodeModal = new bootstrap.Modal(
      document.getElementById("qrcodeModal")
    );
    qrcodeModal.show();
  } catch (error) {
    console.error("Error fetching batch or generating QRCode:", error);
    alert("Không thể tạo QRCode. Vui lòng thử lại!");
  }
};

async function editBatch(id) {
  try {
    const response = await fetch(`/farmer/batches/${id}`); // Lấy chi tiết lô gạo
    if (!response.ok) {
      throw new Error(`Failed to fetch batch with id ${id}`);
    }

    const batch = await response.json(); // Dữ liệu chi tiết của lô gạo

    // Điền dữ liệu vào form
    document.getElementById("batch-id").value = batch.id;
    document.getElementById("rice_type").value = batch.rice_type;
    document.getElementById("expiry_date").value = formatDate(
      batch.expiry_date
    );
    document.getElementById("attributes").value = batch.attributes;
    document.getElementById("weight").value = batch.weight;
    document.getElementById("certifications").value = batch.certifications;
    document.getElementById("brand").value = batch.brand;
    document.getElementById("produced_by").value = batch.produced_by;
    document.getElementById("transported_by").value = batch.transported_by;
    document.getElementById("region_code").value = batch.region_code;

    // Cập nhật giao diện
    document.getElementById("form-title").textContent = "Edit Rice Batch";
    document.getElementById("cancel-edit").classList.remove("d-none");
  } catch (error) {
    console.error("Error editing batch:", error);
  }
}
async function deleteBatch(id) {
  if (!confirm("Are you sure you want to delete this batch?")) {
    return; // Người dùng từ chối xóa
  }

  try {
    const response = await fetch(`/farmer/batches/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(`Failed to delete batch with id ${id}`);
    }

    const result = await response.json();
    alert(result.message); // Hiển thị thông báo kết quả
    loadBatches(); // Cập nhật lại danh sách lô gạo
  } catch (error) {
    console.error("Error deleting batch:", error);
  }
}
async function approveBatch(id) {
  if (!confirm("Bạn có chắc chắn muốn phê duyệt lô gạo này vào Blockchain?")) {
    return;
  }

  try {
    const response = await fetch(`/farmer/batches/${id}/approve`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
    });

    const result = await response.json();
    alert(result.message);

    if (response.ok) {
      loadBatches(); // Tải lại danh sách lô gạo
    }
  } catch (error) {
    console.error("Error approving batch:", error);
  }
}
async function submitBatch(event) {
  event.preventDefault();
  const id = document.getElementById("batch-id").value;
  const rice_type = document.getElementById("rice_type").value;
  const expiry_date = document.getElementById("expiry_date").value;
  const attributes = document.getElementById("attributes").value;
  const weight = document.getElementById("weight").value;
  const certifications = document.getElementById("certifications").value;
  const brand = document.getElementById("brand").value;
  const produced_by = document.getElementById("produced_by").value;
  const transported_by = document.getElementById("transported_by").value;
  const region_code = document.getElementById("region_code").value;
  const endpoint = id ? `/farmer/batches/${id}` : "/farmer/batches";
  const method = id ? "PUT" : "POST";

  try {
    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rice_type,
        expiry_date,
        attributes,
        weight,
        certifications,
        brand,
        produced_by,
        transported_by,
        region_code,
      }),
    });

    const result = await response.json();
    alert(result.message);
    document.getElementById("batch-form").reset();
    document.getElementById("cancel-edit").classList.add("d-none");
    document.getElementById("form-title").textContent = "Add Rice Batch";
    loadBatches();
  } catch (error) {
    console.error("Error submitting batch:", error);
  }
}

document.getElementById("batch-form").addEventListener("submit", submitBatch);
document.getElementById("cancel-edit").addEventListener("click", () => {
  document.getElementById("batch-form").reset();
  document.getElementById("cancel-edit").classList.add("d-none");
  document.getElementById("form-title").textContent = "Add Rice Batch";
});
function formatDate(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
// Tải dữ liệu khi trang tải
window.onload = () => {
  loadProducersAndTransporters();
  loadBatches();
};
