// src/js/imageProcessor.js

async function generateSignature() {
    const kid = "36ccfe00-78fc-4cab-9c5b-5460b0c78513";
    const algorithm = "sha256";
    const timestamp = Math.floor(Date.now() / 1000);
    const validity = 90;
    const userId = "";

    const data = kid + timestamp + validity + userId;
    const hash = CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);
    return `kid=${kid}&algorithm=${algorithm}&timestamp=${timestamp}&validity=${validity}&userId=${userId}&value=${hash}`;
}

async function processImage(file, customSignature = null) {
    try {
        // Generate a signature immediately if none is provided
        const signature = customSignature || await generateSignature();
        
        if (!signature) {
            throw new Error('No valid signature available for image processing');
        }
        
        const base64Image = await getBase64(file);
        
        const requestBody = {
            advanceToolType: "upload_and_ask",
            isVip: true,
            max_tokens: 2000000,
            messages: [{
                content: [
                    {
                        image_url: {
                            url: base64Image
                        },
                        type: "image_url"
                    },
                    {
                        text: "Please provide a detailed description of this image, focusing on key visual elements, colors, subjects, and context. The description should be organized, comprehensive, and written in a way that helps visually impaired users understand the image content clearly. Format the description in readable paragraphs.",
                        type: "text"
                    }
                ],
                role: "user"
            }],
            stream: true
        };

        console.log('Sending image for analysis with signature');
        
        const response = await fetch('https://api.startnest.uk/api/completions/v2/stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'authorization': `Signature ${signature}`,
                'chatmodel': 'gpt_4o',
                'isvip': 'true'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        let analysis = '';
        const reader = response.body.getReader();

        while (true) {
            const {value, done} = await reader.read();
            if (done) break;
            
            const text = new TextDecoder().decode(value);
            const lines = text.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data:')) {
                    try {
                        const jsonStr = line.slice(5);
                        if (jsonStr.includes('[DONE]')) continue;
                        
                        const json = JSON.parse(jsonStr);
                        if (json.choices && json.choices[0].message && json.choices[0].message.content) {
                            analysis += json.choices[0].message.content;
                        }
                    } catch (e) {
                        // Skip invalid JSON or parse errors
                        console.debug('Skipping invalid JSON chunk');
                        continue;
                    }
                }
            }
        }

        console.log('Image analysis completed successfully');
        return analysis;
    } catch (error) {
        console.error("Error processing image:", error);
        throw new Error("Failed to process image: " + error.message);
    }
}

function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}