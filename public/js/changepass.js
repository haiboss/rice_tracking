document
  .getElementById("change-password-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById("current-password").value;
    const newPassword = document.getElementById("new-password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    if (newPassword !== confirmPassword) {
      document.getElementById("alert-area").innerHTML = `
                    <div class="alert alert-danger">Mật khẩu mới và xác nhận mật khẩu không khớp!</div>
                `;
      return;
    }

    try {
      const response = await fetch("/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const result = await response.json();
      document.getElementById("alert-area").innerHTML = `
                    <div class="alert alert-${
                      result.success ? "success" : "danger"
                    }">${result.message}</div>
                `;

      if (result.success) {
        document.getElementById("change-password-form").reset();
      }
    } catch (error) {
      console.error("Error changing password:", error);
      document.getElementById("alert-area").innerHTML = `
                    <div class="alert alert-danger">Có lỗi xảy ra. Vui lòng thử lại!</div>
                `;
    }
  });
