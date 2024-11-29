let map, marker;

function initMap() {
  // Tọa độ mặc định
  const defaultLocation = { lat: 10.762622, lng: 106.660172 };

  // Khởi tạo bản đồ
  map = new google.maps.Map(document.getElementById("map"), {
    center: defaultLocation,
    zoom: 13,
  });

  // Tạo marker
  marker = new google.maps.Marker({
    position: defaultLocation,
    map: map,
    draggable: true, // Cho phép kéo marker
  });

  // Điền tọa độ mặc định vào input
  document.getElementById("lat").value = defaultLocation.lat;
  document.getElementById("lng").value = defaultLocation.lng;

  // Lắng nghe sự kiện kéo thả marker
  marker.addListener("dragend", (event) => {
    const position = event.latLng;
    document.getElementById("lat").value = position.lat().toFixed(6);
    document.getElementById("lng").value = position.lng().toFixed(6);
  });

  // Lắng nghe sự kiện click trên bản đồ
  map.addListener("click", (event) => {
    const position = event.latLng;
    marker.setPosition(position);
    document.getElementById("lat").value = position.lat().toFixed(6);
    document.getElementById("lng").value = position.lng().toFixed(6);
  });
}

// Hàm tải danh sách nhà sản xuất
async function loadProducers() {
  try {
    const response = await fetch("/admin/producers");
    const data = await response.json();

    const producerList = document.getElementById("producer-list");
    producerList.innerHTML = "";

    if (!data || data.length === 0) {
      producerList.innerHTML = `
            <tr>
              <td colspan="5" class="text-center">Không có dữ liệu</td>
            </tr>
          `;
      return;
    }

    data.forEach((producer, index) => {
      producerList.innerHTML += `
            <tr>
              <td>${index + 1}</td>
              <td>${producer.name}</td>
              <td>${producer.address}</td>
              <td>${producer.lat}</td>
              <td>${producer.lng}</td>
            </tr>
          `;
    });
  } catch (error) {
    console.error("Error fetching producers:", error);
  }
}

// Xử lý thêm nhà sản xuất
document
  .getElementById("add-producer-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value;
    const address = document.getElementById("address").value;
    const lat = document.getElementById("lat").value;
    const lng = document.getElementById("lng").value;

    const response = await fetch("/admin/add-producer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, address, lat, lng }),
    });

    const result = await response.json();

    // Hiển thị thông báo
    const alertArea = document.getElementById("alert-area");
    alertArea.innerHTML = `
        <div class="alert alert-${
          result.success ? "success" : "danger"
        } alert-dismissible fade show" role="alert">
          ${result.message}
          <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
      `;

    // Cập nhật danh sách nếu thành công
    if (result.success) {
      loadProducers();
      document.getElementById("add-producer-form").reset();
    }
  });

// Tải danh sách khi trang tải
window.onload = loadProducers;
