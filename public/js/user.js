async function loadUsers() {
  try {
    const response = await fetch("/admin/users");
    const users = await response.json();
    const userList = document.getElementById("user-list");
    userList.innerHTML = "";

    users.forEach((user) => {
      userList.innerHTML += `
            <tr>
              <td>${user.id}</td>
              <td>${user.name}</td>
              <td>${user.email}</td>
              <td>${user.role}</td>
              <td>${user.isEnable ? "Enabled" : "Disabled"}</td>
              <td>
                <button class="btn btn-sm btn-warning" onclick="editUser(${
                  user.id
                })">Sửa</button>
                <button class="btn btn-sm btn-danger" onclick="deleteUser(${
                  user.id
                })">Khóa</button>
              </td>
            </tr>
          `;
    });
  } catch (error) {
    console.error("Error loading users:", error);
  }
}

async function submitUser(event) {
  event.preventDefault();
  const id = document.getElementById("user-id").value;
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const role = document.getElementById("role").value;
  const isEnable = document.getElementById("isEnable").value;

  const endpoint = id ? `/admin/users/${id}` : "/admin/users";
  const method = id ? "PUT" : "POST";

  try {
    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role, isEnable }),
    });

    const result = await response.json();
    alert(result.message);
    document.getElementById("user-form").reset();
    document.getElementById("cancel-edit").classList.add("d-none");
    document.getElementById("form-title").textContent = "Thêm mới tài khoản";
    document.getElementById("action").textContent = "Thêm";
    loadUsers();
  } catch (error) {
    console.error("Error submitting user:", error);
  }
}

async function editUser(id) {
  try {
    const response = await fetch(`/admin/users/${id}`);
    const user = await response.json();

    document.getElementById("user-id").value = user.id;
    document.getElementById("name").value = user.name;
    document.getElementById("email").value = user.email;
    document.getElementById("role").value = user.role;
    document.getElementById("isEnable").value = user.isEnable;
    document.getElementById("form-title").textContent = "Sửa tài khoản";
    document.getElementById("action").textContent = "Sửa";
    document.getElementById("cancel-edit").classList.remove("d-none");
  } catch (error) {
    console.error("Error editing user:", error);
  }
}

async function deleteUser(id) {
  if (!confirm("Bạn có muốn khóa tài khoan này không?")) return;

  try {
    const response = await fetch(`/admin/users/${id}`, { method: "DELETE" });
    const result = await response.json();
    alert(result.message);
    loadUsers();
  } catch (error) {
    console.error("Error deleting user:", error);
  }
}

document.getElementById("user-form").addEventListener("submit", submitUser);
document.getElementById("cancel-edit").addEventListener("click", () => {
  document.getElementById("user-form").reset();
  document.getElementById("cancel-edit").classList.add("d-none");
  document.getElementById("form-title").textContent = "Thêm mới tài khoản";
  document.getElementById("action").textContent = "Thêm";
});

// Load users when the page loads
window.onload = loadUsers;
