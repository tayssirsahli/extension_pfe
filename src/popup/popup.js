import axios from "axios";

const backendUrl = "http://localhost:5000"; // Replace with your NestJS backend URL

function showButtons() {
    document.getElementById("save-btn").style.display = "block";
    document.getElementById("save-csv-btn").style.display = "block";
    document.getElementById("save-db-btn").style.display = "block";
    document.getElementById("deselect-btn").style.display = "block";
}

function extractTableData() {
    const rows = [];
    document.querySelectorAll("#data-table-post tbody tr").forEach((row) => {
        const cells = row.querySelectorAll("td");
        rows.push({
            author: cells[0]?.textContent.trim() || null,
            text: cells[1]?.textContent.trim() || null,
            image: cells[2]?.querySelector("img")?.src || null,
            comments: cells[3]?.textContent.trim() || null,
            hashtags: cells[4]?.textContent.trim() || null,
            title: cells[5]?.textContent.trim() || null,
            platform: cells[6]?.textContent.trim() || null,

        });
    });
    return rows;
}

document.getElementById("save-btn").addEventListener("click", () => {
    const rows = extractTableData();
    if (rows.length === 0) {
        alert("No data to save!");
        return;
    }

    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scraped_data.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});

document.getElementById("save-csv-btn").addEventListener("click", () => {
    const rows = extractTableData();
    if (rows.length === 0) {
        alert("No data to save!");
        return;
    }

    let csvContent = "Author,Text,Image,Comments\n";
    rows.forEach((row) => {
        csvContent += `${row.author},${row.text},${row.image},${row.comments},${row.hashtags},${row.title},${row.platform}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scraped_data.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});

document.getElementById("save-db-btn").addEventListener("click", async () => {
    const rows = extractTableData();
    if (rows.length === 0) {
        alert("No data to save!");
        return;
    }

    // Transform rows to match the backend's expected structure
    const dataToSend = rows.map((row) => ({
        author: row.author,
        selected_text: row.text,
        image_url: row.image,
        comments: row.comments,
        hashtags: row.hashtags,
        title: row.title,
        platform: row.platform,
    }));
    console.log("Received data:", dataToSend);

    try {
        const response = await axios.post(`${backendUrl}/scraped-data/add`, dataToSend);
        alert("Data saved to database successfully!");
        console.log(response.data);
    } catch (error) {
        console.error("Error saving data to database:", error.response?.data || error.message);
        

        const errorMessage = error.response?.data?.message || error.message;

        if (errorMessage) {
            alert("Session expired or not logged in. Redirecting to sign-in...");
            chrome.tabs.create({ url: "http://localhost:5174/signin" });
        } else {
            alert("Error saving data: " + errorMessage);
        }
    }
});

document.getElementById("deselect-btn").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0].id;
        chrome.tabs.sendMessage(tabId, { action: "deselectText" }, (response) => {
            if (response?.success) {
                const tbody = document.querySelector("#data-table-post tbody");
                tbody.innerHTML = "";
                document.getElementById("data-table-post").style.display = "none";
                document.getElementById("no-data").style.display = "block";
                alert("Text deselected successfully.");
            }
        });
    });
});

document.getElementById("select-post-btn").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0].id;
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ["content.js"],
        });
        chrome.tabs.sendMessage(tabId, { action: "enablePostSelection" });
    });
});

chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "postSelected") {
        const data = [request.data];
        updateTablePost(data);
        showButtons();
    }
});

function updateTablePost(data) {
    const tbody = document.querySelector("#data-table-post tbody");
    tbody.innerHTML = "";

    data.forEach((item) => {
        const row = document.createElement("tr");
        row.innerHTML = `
      <td>${item.author || "N/A"}</td>
      <td>${item.text || "N/A"}</td>
      <td>${item.image ? `<img src="${item.image}" style="max-width: 100px; max-height: 100px;" />` : "N/A"}</td>
      <td>${item.comments || "N/A"}</td>
      <td>${item.hashtags ? item.hashtags.join(", ") : "N/A"}
      <td>${item.title || "N/A"}
      <td>${item.platform || "N/A"}
    `;
        tbody.appendChild(row);
    });

    document.getElementById("data-table-post").style.display = "table";
    document.getElementById("no-data").style.display = "none";
}
