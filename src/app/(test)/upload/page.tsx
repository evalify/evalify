"use client"


import { useState } from "react";

export default function Home() {
    const [file, setFile] = useState(null);

    const uploadFile = async () => {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async () => {
            const base64Content = reader.result.split(",")[1]; // Extract base64 content

            const response = await fetch("/api/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fileName: file.name,
                    fileContent: base64Content,
                }),
            });

            const result = await response.json();
            console.log(result);
        };
        reader.readAsDataURL(file);
    };

    return (
        <div>
            <input type="file" onChange={(e) => setFile(e.target.files[0])} />
            <button onClick={uploadFile}>Upload</button>
        </div>
    );
}
