async function fetchStatistics() {
  try {
    const response = await fetch("/admin/getreport");
    if (!response.ok) throw new Error("Failed to fetch statistics");

    const stats = await response.json();
    console.log("Statistics Data:", stats); // Log dữ liệu từ API

    // Biểu đồ 1: Blockchain vs Registered
    console.log("Creating Blockchain Chart...");
    const blockchainChart = document
      .getElementById("blockchainChart")
      .getContext("2d");
    new Chart(blockchainChart, {
      type: "doughnut",
      data: {
        labels: ["Số lô gạo", "Số Block"],
        datasets: [
          {
            data: [stats.totalBatches, stats.totalBlock], // Đảm bảo sử dụng đúng field từ API
            backgroundColor: ["#4CAF50", "#36A2EB"],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "top",
          },
        },
      },
    });

    // Biểu đồ 2: Donut (Nhà cung cấp và Đơn vị vận chuyển)
    console.log("Creating Donut Chart...");
    const donutCtx = document.getElementById("donutChart").getContext("2d");
    new Chart(donutCtx, {
      type: "doughnut",
      data: {
        labels: ["Nhà sản xuất", "Đơn vị vận chuyển"],
        datasets: [
          {
            data: [stats.suppliers, stats.transporters],
            backgroundColor: ["#FF6384", "#36A2EB"],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "top",
          },
        },
      },
    });

    // Biểu đồ 3: Số lượng Farmers
    console.log("Creating Farmer Chart...");
    const farmerLabel = document.getElementById("farmerChart");
    farmerLabel.textContent = `Tổng số người dùng: ${stats.farmers}`;
    // new Chart(farmerCtx, {
    //   type: "bar",
    //   data: {
    //     labels: ["Tổng số nông dân"],
    //     datasets: [
    //       {
    //         label: "nông dân",
    //         data: [stats.farmers],
    //         backgroundColor: ["#FFC107"],
    //       },
    //     ],
    //   },
    //   options: {
    //     responsive: true,
    //     plugins: {
    //       legend: {
    //         display: false,
    //       },
    //     },
    //     scales: {
    //       y: {
    //         beginAtZero: true,
    //       },
    //     },
    //   },
    // });
  } catch (error) {
    console.error("Error fetching statistics:", error); // Log lỗi
    const farmerLabel = document.getElementById("farmerChart");
    farmerLabel.textContent = "Không thể tải dữ liệu!";
  }
}
async function fetchFarmerStats() {
  try {
    const response = await fetch("/admin/farmer-stats");
    if (!response.ok) throw new Error("Failed to fetch farmer stats");

    const stats = await response.json();
    console.log("Farmer Stats:", stats); // Log dữ liệu từ API

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
  fetchStatistics();
  fetchFarmerStats();
};
