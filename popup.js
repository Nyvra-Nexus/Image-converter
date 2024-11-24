// Get DOM elements
const imageInput = document.getElementById('imageInput');
const formatSelect = document.getElementById('formatSelect');
const convertBtn = document.getElementById('convertBtn');
const downloadList = document.getElementById('downloadList');
const compression = document.getElementById('enableCompression');
const progressBar = document.getElementById('progressBar');
const downloadAllButton = document.getElementById('downloadAllButton');

// Function to compress image
async function compressImage(file) {
    const options = {
        maxSizeMB: 1, // Maximum file size in MB
        // maxWidthOrHeight: 1920, // Resize to this dimension while maintaining aspect ratio
        useWebWorker: true,
        onProgress: (percentage) => {
            progressBar.value = Math.min(percentage, 100);
        }
    };

    try {
        const compressedFile = await imageCompression(file, options);
        return compressedFile;
    } catch (error) {
        throw new Error(`Compression failed: ${error.message}`);
    }
}

// Function to convert image
async function convertImage(file, format, enableCompression) {
    if (enableCompression) {
        file = await compressImage(file); // Compress the image before conversion
    }

    const reader = new FileReader();

    return new Promise((resolve, reject) => {
        reader.onload = async (event) => {
            const img = new Image();
            img.src = event.target.result;

            img.onload = async () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                if (format === 'svg') {
                    const svgString = await canvg.Canvg.from(ctx, canvas).getSvg();
                    const blob = new Blob([svgString], { type: 'image/svg+xml' });
                    progressBar.value = 100;
                    resolve(blob);
                } else {
                    canvas.toBlob((blob) => {
                        progressBar.value = 100;
                        resolve(blob);
                    }, `image/${format}`);
                }
            };
        };

        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

function getFileNameWithoutExtension(fileName) {
    const lastDotIndex = fileName.lastIndexOf('.');

    if (lastDotIndex === -1 || lastDotIndex === 0) {
        return fileName;
    }

    return fileName.substring(0, lastDotIndex);
}

// Handle Convert Button Click
convertBtn.addEventListener('click', async () => {
    const files = imageInput.files;
    const format = formatSelect.value;
    const enableCompression = compression.checked;

    if (!files || files.length == 0) {
        alert('Please select an image.');
        return;
    }


    try {
        progressBar.value = 0;
        progressBar.style.display = 'block';
        const convertedFiles = [];

        for (let i = 0; i < files.length; i++) {
            const name = getFileNameWithoutExtension(files[i].name);
            const blob = await convertImage(files[i], format, enableCompression);
            const url = URL.createObjectURL(blob);
            convertedFiles.push({ name: `${name}.${format}`, blob });


            const anchorTag = document.createElement('a');
            anchorTag.href = url;
            anchorTag.download = `${name}.${format}`;
            anchorTag.style.display = 'block';
            anchorTag.textContent = `${name}.${format}`;

            const listItem = document.createElement('li');
            listItem.appendChild(anchorTag);
            downloadList.appendChild(listItem);
        }

        if (convertedFiles.length > 1) {
            downloadAllButton.style.display = 'block';
            downloadAllButton.onclick = async () => {
                const zip = new JSZip();

                convertedFiles.forEach(file => {
                    zip.file(file.name, file.blob);
                });

                const zipBlob = await zip.generateAsync({ type: 'blob' });
                const zipUrl = URL.createObjectURL(zipBlob);
                const tempLink = document.createElement('a');
                tempLink.href = zipUrl;
                tempLink.download = 'files.zip';
                tempLink.click();

                URL.revokeObjectURL(zipUrl);
            }
        } else {
            downloadAllButton.style.display = 'none';
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    } finally {
        progressBar.value = 0;
        progressBar.style.display = 'none';
    }
});
