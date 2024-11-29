let map;
let marker; // Lưu trữ marker hiện tại

function showMap(lat, lng) {
  const modal = new bootstrap.Modal(document.getElementById("mapModal"));
  modal.show();

  // Đợi modal hiển thị xong rồi render bản đồ
  setTimeout(() => {
    const mapContainer = document.getElementById("map");

    if (!map) {
      // Nếu map chưa được khởi tạo, tạo mới
      map = new google.maps.Map(mapContainer, {
        center: { lat, lng },
        zoom: 14,
      });

      // Thêm marker đầu tiên
      marker = new google.maps.Marker({
        position: { lat, lng },
        map,
      });
    } else {
      // Nếu map đã khởi tạo, cập nhật vị trí marker và trung tâm bản đồ
      map.setCenter({ lat, lng });

      if (marker) {
        marker.setMap(null); // Xóa marker cũ
      }

      marker = new google.maps.Marker({
        position: { lat, lng },
        map,
      });
    }
  }, 500); // Đợi modal render hoàn chỉnh
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
document.getElementById("search-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const batchCode = document.getElementById("batch-id").value;
  const resultDiv = document.getElementById("result");

  // Gửi yêu cầu đến API tra cứu
  try {
    const response = await fetch(`/blockchain/search/${batchCode}`);
    const result = await response.json();

    if (result.success) {
      // Hiển thị thông tin lô gạo
      resultDiv.innerHTML = `
        <div class="d-flex justify-content-center">
          <div class="card shadow-sm" style="width: 50%; color: black;">
            <div class="card-header bg-primary text-white text-center">
              <h3 class="card-title">Chi tiết lô GẠO</h3>
            </div>
            <div class="card-body">
              <div class="row">
                <!-- Cột bên trái -->
                <div class="col-md-6">
                  <p><strong>Loại:</strong> ${result.data.rice_type}</p>
                  <p><strong>Ngày hết hạn:</strong> ${formatDate(
                    result.data.expiry_date
                  )}</p>
                  <p><strong>Đặt tính:</strong> ${result.data.attributes}</p>
                  <p><strong>Trong lượng bao:</strong> ${
                    result.data.weight
                  } kg</p>
                  <p><strong>Chứng nhận:</strong> ${
                    result.data.certifications
                  }</p>
                </div>
                <!-- Cột bên phải -->
                <div class="col-md-6">
                  <p><strong>Thương hiệu:</strong> ${result.data.brand}</p>
                  <p>
                  <strong>Sản xuất bởi:</strong> ${result.data.productBy}
                  <button 
                    class="btn btn-sm btn-outline-primary" 
                    onclick="showMap(${result.data.latProduct}, ${
        result.data.lngProduct
      })">
                    <i class="bi bi-geo-alt-fill"></i> Map
                  </button>
                  <p>
                    <strong>Nhà phân phối:</strong> ${result.data.transportBy}
                    <button 
                      class="btn btn-sm btn-outline-primary" 
                      onclick="showMap(${result.data.latTransport}, ${
        result.data.lngTransport
      })">
                      <i class="bi bi-geo-alt-fill"></i> Map
                    </button>
                  </p>                  
                  <p>
                  <strong>QR Code:</strong>
                    <img src="${
                      result.qrCode
                    }" alt="QR Code" width="150" height="150">
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
    `;
    } else {
      resultDiv.innerHTML = `
      <div class="card shadow-sm" style="width: 50%;">
      <div class="alert alert-danger">${result.message}</div>
      </div>
      `;
    }
  } catch (error) {
    resultDiv.innerHTML = `<div class="alert alert-danger">${error}</div>`;
  }
});
