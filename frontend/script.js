document.addEventListener("DOMContentLoaded", function () {

    document.getElementById("predictBtn")
        .addEventListener("click", function(event) {
            event.preventDefault();
            uploadFile();
        });

});

async function uploadFile() {
    const fileInput = document.getElementById("fileInput");
    const resultText = document.getElementById("result");

    const file = fileInput.files[0];

    if (!file) {
        alert("Upload file first!");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    resultText.innerText = "Processing...";

    try {
        const response = await fetch("http://127.0.0.1:5000/predict", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        resultText.innerText = data.prediction || data.error;

    } catch (error) {
        resultText.innerText = "Server Error!";
    }
}