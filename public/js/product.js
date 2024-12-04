let map, marker;

// Khởi tạo bản đồ Google Maps
function initMap() {
  const defaultLocation = { lat: 10.762622, lng: 106.660172 }; // Tọa độ mặc định (TP.HCM)

  // Khởi tạo bản đồ
  map = new google.maps.Map(document.getElementById("map"), {
    center: defaultLocation,
    zoom: 13,
  });

  // Thêm marker có thể kéo
  marker = new google.maps.Marker({
    position: defaultLocation,
    map: map,
    draggable: true,
  });

  // Cập nhật vĩ độ và kinh độ khi kéo thả marker
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

// Tải danh sách nhà sản xuất
async function loadProducers() {
  try {
    const response = await fetch("/admin/producers");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const producerList = document.getElementById("producer-list");
    producerList.innerHTML = "";

    if (!data || data.length === 0) {
      producerList.innerHTML = `
        <tr>
          <td colspan="6" class="text-center">Không có dữ liệu</td>
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
          <td>
            <button class="btn btn-sm btn-warning" onclick="editProducer(${
              producer.id
            })">Sửa</button>
            <button class="btn btn-sm btn-danger" onclick="deleteProducer(${
              producer.id
            })">Xóa</button>
          </td>
        </tr>
      `;
    });
  } catch (error) {
    console.error("Error fetching producers:", error);

    const producerList = document.getElementById("producer-list");
    producerList.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-danger">Không thể tải dữ liệu. Vui lòng thử lại sau!</td>
      </tr>
    `;
  }
}

// Xóa nhà sản xuất
async function deleteProducer(id) {
  if (!confirm("Bạn có chắc chắn muốn xóa nhà sản xuất này không?")) {
    return;
  }

  try {
    const response = await fetch(`/admin/producer/${id}`, {
      method: "DELETE",
    });

    const result = await response.json();
    alert(result.message);
    loadProducers(); // Tải lại danh sách
  } catch (error) {
    console.error("Error deleting producer:", error);
  }
}

// Chỉnh sửa nhà sản xuất
async function editProducer(id) {
  try {
    const response = await fetch(`/admin/producers/${id}`);
    if (!response.ok) {
      throw new Error("Lỗi khi đọc dữ liệu");
    }

    const producer = await response.json();

    // Điền dữ liệu vào form
    document.getElementById("producer-id").value = producer.id;
    document.getElementById("name").value = producer.name;
    document.getElementById("address").value = producer.address;
    document.getElementById("lat").value = producer.lat;
    document.getElementById("lng").value = producer.lng;
    document.getElementById("cancel-edit").classList.remove("d-none"); // Hiển thị nút Hủy
    document.getElementById("submit-btn").textContent = "Sửa";
    document.getElementById("form-title").textContent = "Sửa Nhà Sản Xuất";
  } catch (error) {
    console.error("Error editing producer:", error);
  }
}

// Đặt lại form
document.getElementById("cancel-edit").addEventListener("click", () => {
  document.getElementById("add-producer-form").reset();
  document.getElementById("producer-id").value = ""; // Xóa ID
  document.getElementById("form-title").textContent = "Thêm Nhà Sản Xuất";
  document.getElementById("cancel-edit").classList.add("d-none"); // Ẩn nút Hủy
});

// Xử lý thêm hoặc cập nhật nhà sản xuất
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("add-producer-form");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const id = document.getElementById("producer-id").value;
      const name = document.getElementById("name").value;
      const address = document.getElementById("address").value;
      const lat = document.getElementById("lat").value;
      const lng = document.getElementById("lng").value;

      const endpoint = id ? `/admin/producer/${id}` : "/admin/add-producer";
      const method = id ? "PUT" : "POST";

      try {
        const response = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, address, lat, lng }),
        });

        const result = await response.json();
        alert(result.message);
        form.reset();
        document.getElementById("producer-id").value = "";
        document.getElementById("cancel-edit").classList.add("d-none"); // Ẩn nút Hủy
        loadProducers(); // Tải lại danh sách
        document.getElementById("form-title").textContent = "Thêm Nhà Sản Xuất";
        document.getElementById("submit-btn").textContent = "Thêm";
      } catch (error) {
        console.error("Error submitting producer:", error);
      }
    });
  } else {
    console.error("Form 'add-producer-form' not found in DOM.");
  }
});

// Tải danh sách khi trang tải
window.onload = loadProducers;
