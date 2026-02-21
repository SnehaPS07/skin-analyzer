function formatResult(data) {
    return `
        <div class="result-card">
            <div class="card-header">
                <h3>🌸 Overall Analysis</h3>
            </div>
            <div class="card-body">
                <p>Based on the analysis, your skin type appears to be <span class="highlight">${data.skinType || 'Normal'}</span> with a <span class="highlight">${data.skinTexture || 'Smooth'}</span> texture.</p>
                <p><strong>Visible Observations:</strong> ${data.skinProblems || 'No significant problems detected.'}</p>
            </div>
        </div>

        <div class="result-card">
            <div class="card-header">
                <h3>✨ Recommendations & Remedies</h3>
            </div>
            <div class="card-body">
                <p>${data.suggestedRemedies || 'Maintain a healthy lifestyle and proper hygiene.'}</p>
            </div>
        </div>

        <div class="result-card">
            <div class="card-header">
                <h3>☀️ Morning Routine</h3>
            </div>
            <div class="card-body">
                <p>${data.morningRoutine || 'Cleanse, apply a gentle moisturizer, and always use sunscreen.'}</p>
            </div>
        </div>

        <div class="result-card">
            <div class="card-header">
                <h3>🌙 Night Routine</h3>
            </div>
            <div class="card-body">
                <p>${data.nightRoutine || 'Cleanse to remove dirt and makeup, then apply a nourishing overnight cream.'}</p>
            </div>
        </div>
    `;
}

function showSample() {
    const sampleData = {
        skinType: "Combination",
        skinTexture: "Slightly rough",
        skinProblems: "There is mild acne visible on the chin area along with a few dark spots on the cheeks.",
        suggestedRemedies: "It is recommended to use a gentle, non-comedogenic cleanser and apply a niacinamide serum to help clear the skin.",
        morningRoutine: "Start your morning by cleansing, followed by a Vitamin C serum, a lightweight moisturizer, and finish with a broad-spectrum SPF 30+.",
        nightRoutine: "In the evening, thoroughly cleanse your face, optionally apply Retinol 2-3 times a week, and use a nourishing moisturizer to hydrate your skin overnight."
    };

    const resultDiv = document.getElementById('result');
    const loading = document.getElementById('loading');
    loading.classList.add('hidden');
    resultDiv.classList.remove('hidden');

    resultDiv.innerHTML = `
        <h2 style="text-align: center; color: #ad1457; margin-bottom: 25px;">✨ Your Skin Analysis</h2>
        ${formatResult(sampleData)}
    `;
}

async function analyzeSkin() {
    const fileInput = document.getElementById("imageInput");
    const resultDiv = document.getElementById("result");
    const loading = document.getElementById("loading");

    if (!fileInput.files[0]) {
        alert("Please upload an image.");
        return;
    }

    loading.classList.remove("hidden");
    resultDiv.classList.add("hidden");

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async function () {
        const base64Image = reader.result.split(",")[1];
        const imageDataUrl = `data:${file.type};base64,${base64Image}`;

        const prompt = `Analyze this facial skin image carefully and provide the output in JSON format.
Write all descriptions in clear, normal sentences without any markdown formatting (no asterisks, bullet points, or hashes).
Respond strictly with valid JSON matching this structure:
{
    "skinType": "The skin type (e.g., Oily, Combination, etc.).",
    "skinTexture": "The skin texture.",
    "skinProblems": "A descriptive sentence explaining visible skin problems.",
    "suggestedRemedies": "A descriptive sentence explaining suggested remedies.",
    "morningRoutine": "A clear, well-written paragraph explaining the recommended morning skincare routine.",
    "nightRoutine": "A clear, well-written paragraph explaining the recommended night skincare routine."
}`;

        try {
            const response = await fetch(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer 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`
                    },
                    body: JSON.stringify({
                        model: "meta-llama/llama-4-scout-17b-16e-instruct",
                        messages: [
                            {
                                role: "user",
                                content: [
                                    {
                                        type: "image_url",
                                        image_url: {
                                            url: imageDataUrl
                                        }
                                    },
                                    {
                                        type: "text",
                                        text: prompt
                                    }
                                ]
                            }
                        ]
                    })
                }
            );

            if (!response.ok) {
                const text = await response.text();
                console.error("API response error:", response.status, text);
                resultDiv.innerHTML = `<div class="result-card"><div class="card-body">API error ${response.status}: ${text}</div></div>`;
                return;
            }

            const data = await response.json();

            if (data.error) {
                console.error('API returned error object:', data.error);
                resultDiv.innerHTML = `<div class="result-card"><div class="card-body">API error: ${data.error.message || JSON.stringify(data.error)}</div></div>`;
                return;
            }

            if (data.choices && data.choices.length > 0) {
                let output = data.choices[0].message.content;
                // Strip markdown backticks if the model wraps JSON in a code block
                output = output.replace(/```json/gi, '').replace(/```/g, '').trim();

                let parsedData;
                try {
                    parsedData = JSON.parse(output);
                } catch (parseError) {
                    console.error('Failed to parse JSON:', parseError, output);
                    resultDiv.innerHTML = `<div class="result-card"><div class="card-body">Error parsing results. Please try again.</div></div>`;
                    return;
                }

                resultDiv.innerHTML = `
                    <h2 style="text-align: center; color: #ad1457; margin-bottom: 25px;">✨ Your Skin Analysis</h2>
                    ${formatResult(parsedData)}
                    `;
            } else {
                console.warn('Unexpected API response shape:', data);
                resultDiv.innerHTML = `<div class="result-card"><div class="card-body">Error analyzing image. Please try again.</div></div>`;
            }
        } catch (err) {
            console.error('Network or parsing error:', err);
            resultDiv.innerHTML = `<div class="result-card"><div class="card-body">Request failed: ${err.message}</div></div>`;
        } finally {
            loading.classList.add("hidden");
            resultDiv.classList.remove("hidden");
        }
    };

    reader.onerror = function (e) {
        console.error('FileReader error', e);
        loading.classList.add("hidden");
        resultDiv.classList.remove("hidden");
        resultDiv.innerHTML = `<div class="result-card"><div class="card-body">Failed to read image file. Please try another image.</div></div>`;
    };

    reader.readAsDataURL(file);
}