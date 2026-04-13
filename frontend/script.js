document.addEventListener("DOMContentLoaded", function () {

    document.getElementById("predictBtn")
        .addEventListener("click", function (event) {
            event.preventDefault();
            uploadFile();
        });

});

async function uploadFile() {
    const fileInput = document.getElementById("fileInput");
    const resultText = document.getElementById("result");
    const loader = document.getElementById("loader");

    const file = fileInput.files[0];

    if (!file) {
        alert("Please upload a file first!");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    resultText.innerText = "";
    loader.style.display = "block";

    try {
        const response = await fetch("http://127.0.0.1:5000/predict", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        loader.style.display = "none";

        resultText.innerText = data.prediction || data.error;

        // color feedback
        if (data.prediction) {
            resultText.style.color = "lime";
        } else {
            resultText.style.color = "red";
        }

    } catch (error) {
        loader.style.display = "none";
        resultText.innerText = "Server Error!";
        resultText.style.color = "red";
    }
}