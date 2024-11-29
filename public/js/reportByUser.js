async function fetchFarmerStats() {
  try {
    const response = await fetch("/farmer/farmer-stats");
    if (!response.ok) throw new Error("Có lỗi xãy ra ");

    const stats = await response.json();
    const tableBody = document.getElementById("farmer-stats-table");
    tableBody.innerHTML = "";

    if (stats.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center">Không có dữ liệu</td>
        </tr>
      `;
      return;
    }

    stats.forEach((farmer) => {
      tableBody.innerHTML += `
        <tr>
          <td>${farmer.farmer_email}</td>
          <td>${farmer.farmer_name}</td>
          <td>${farmer.total_batches}</td>
          <td>${farmer.approved_batches}</td>
        </tr>
      `;
    });
  } catch (error) {
    console.error("Error fetching farmer stats:", error);
  }
}
window.onload = () => {
  fetchFarmerStats();
};
