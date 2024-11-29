let map, marker;
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

// Hàm tải danh sách nhà vận chuyển
async function loadTransporters() {
  try {
    const response = await fetch("/admin/transporters");

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    const transporterList = document.getElementById("transporter-list");
    transporterList.innerHTML = "";

    if (!data || data.length === 0) {
      transporterList.innerHTML = `
        <tr>
          <td colspan="6" class="text-center">Không có dữ liệu</td>
        </tr>
      `;
      return;
    }

    data.forEach((transporter, index) => {
      transporterList.innerHTML += `
        <tr>
          <td>${index + 1}</td>
          <td>${transporter.name}</td>
          <td>${transporter.address}</td>
          <td>${transporter.lat}</td>
          <td>${transporter.lng}</td>
          <td>
            <button class="btn btn-sm btn-warning" onclick="editTransporter(${
              transporter.id
            })">Sửa</button>
            <button class="btn btn-sm btn-danger" onclick="deleteTransporter(${
              transporter.id
            })">Xóa</button>
          </td>
        </tr>
      `;
    });
  } catch (error) {
    console.error("Error fetching transporters:", error);

    const transporterList = document.getElementById("transporter-list");
    transporterList.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-danger">Không thể tải dữ liệu. Vui lòng thử lại sau!</td>
      </tr>
    `;
  }
}
async function deleteTransporter(id) {
  if (!confirm("Bạn có chắc chắn muốn xóa đơn vị vận chuyển này không?")) {
    return;
  }

  try {
    const response = await fetch(`/admin/transporters/${id}`, {
      method: "DELETE",
    });

    const result = await response.json();
    alert(result.message);
    loadTransporters(); // Tải lại danh sách
  } catch (error) {
    console.error("Error deleting transporter:", error);
  }
}
async function editTransporter(id) {
  try {
    const response = await fetch(`/admin/transporters/${id}`);
    if (!response.ok) {
      throw new Error("Failed to fetch transporter");
    }

    const transporter = await response.json();

    // Điền dữ liệu vào form
    document.getElementById("transporter-id").value = transporter.id;
    document.getElementById("name").value = transporter.name;
    document.getElementById("address").value = transporter.address;
    document.getElementById("lat").value = transporter.lat;
    document.getElementById("lng").value = transporter.lng;
    document.getElementById("cancel-edit").classList.remove("d-none"); // Hiển thị nút Hủy
    document.getElementById("form-title").textContent = "Sửa Đơn Vị Vận Chuyển";
  } catch (error) {
    console.error("Error editing transporter:", error);
  }
}
document.getElementById("cancel-edit").addEventListener("click", () => {
  // Đặt lại form
  document.getElementById("transporter-form").reset();
  document.getElementById("transporter-id").value = ""; // Xóa ID
  document.getElementById("form-title").textContent = "Thêm Đơn Vị Vận Chuyển";
  document.getElementById("cancel-edit").classList.add("d-none"); // Ẩn nút Hủy
});
// Xử lý thêm nhà vận chuyển
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("transporter-form");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const id = document.getElementById("transporter-id").value;
      const name = document.getElementById("name").value;
      const address = document.getElementById("address").value;
      const lat = document.getElementById("lat").value;
      const lng = document.getElementById("lng").value;

      const endpoint = id ? `/admin/transporters/${id}` : "/admin/transporters";
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
        document.getElementById("transporter-id").value = "";
        document.getElementById("cancel-edit").classList.add("d-none"); // Ẩn nút Hủy
        loadTransporters(); // Tải lại danh sách
        document.getElementById("form-title").textContent =
          "Thêm Đơn Vị Vận Chuyển";
      } catch (error) {
        console.error("Error submitting transporter:", error);
      }
    });
  } else {
    console.error("Form 'transporter-form' not found in DOM.");
  }
});
// Tải danh sách khi trang tải
window.onload = loadTransporters;
