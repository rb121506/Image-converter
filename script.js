// ImageFlow - Image Converter Application
// All processing happens locally in the browser

class ImageConverter {
    constructor() {
        this.images = [];
        this.convertedImages = [];
        this.totalSavedBytes = 0;
        
        this.initializeElements();
        this.attachEventListeners();
        this.loadPresets();
    }

    initializeElements() {
        // Upload elements
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');
        this.browseBtn = document.getElementById('browseBtn');

        // Options elements
        this.optionsSection = document.getElementById('optionsSection');
        this.outputFormat = document.getElementById('outputFormat');
        this.qualitySlider = document.getElementById('quality');
        this.qualityValue = document.getElementById('qualityValue');
        this.enableResize = document.getElementById('enableResize');
        this.resizeInputs = document.getElementById('resizeInputs');
        this.resizeWidth = document.getElementById('resizeWidth');
        this.resizeHeight = document.getElementById('resizeHeight');
        this.maintainAspect = document.getElementById('maintainAspect');

        // Preview elements
        this.previewSection = document.getElementById('previewSection');
        this.originalPreview = document.getElementById('originalPreview');
        this.convertedPreview = document.getElementById('convertedPreview');
        this.originalInfo = document.getElementById('originalInfo');
        this.convertedInfo = document.getElementById('convertedInfo');

        // Image list elements
        this.imageListSection = document.getElementById('imageListSection');
        this.imageList = document.getElementById('imageList');
        this.clearAllBtn = document.getElementById('clearAllBtn');
        this.convertAllBtn = document.getElementById('convertAllBtn');
        this.downloadAllBtn = document.getElementById('downloadAllBtn');

        // Stats elements
        this.totalImages = document.getElementById('totalImages');
        this.convertedCount = document.getElementById('convertedCount');
        this.savedSpace = document.getElementById('savedSpace');

        // UI elements
        this.toast = document.getElementById('toast');
        this.toastMessage = document.getElementById('toastMessage');
        this.loadingOverlay = document.getElementById('loadingOverlay');
    }

    attachEventListeners() {
        // Drag and drop
        this.dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.dropZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.dropZone.addEventListener('drop', (e) => this.handleDrop(e));
        this.dropZone.addEventListener('click', () => this.fileInput.click());

        // File input
        this.browseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.fileInput.click();
        });
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Options
        this.qualitySlider.addEventListener('input', () => {
            this.qualityValue.textContent = this.qualitySlider.value;
        });

        this.enableResize.addEventListener('change', () => {
            this.resizeInputs.style.display = this.enableResize.checked ? 'flex' : 'none';
        });

        this.resizeWidth.addEventListener('input', () => this.handleResizeInput('width'));
        this.resizeHeight.addEventListener('input', () => this.handleResizeInput('height'));

        // Presets
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => this.applyPreset(btn.dataset.preset));
        });

        // Action buttons
        this.clearAllBtn.addEventListener('click', () => this.clearAll());
        this.convertAllBtn.addEventListener('click', () => this.convertAll());
        this.downloadAllBtn.addEventListener('click', () => this.downloadAll());

        // Smooth scroll for nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });
    }

    loadPresets() {
        this.presets = {
            web: {
                format: 'webp',
                quality: 80,
                resize: false,
                maxWidth: 1920,
                maxHeight: 1080
            },
            social: {
                format: 'jpeg',
                quality: 85,
                resize: true,
                maxWidth: 1200,
                maxHeight: 1200
            },
            print: {
                format: 'png',
                quality: 100,
                resize: false
            },
            thumbnail: {
                format: 'webp',
                quality: 75,
                resize: true,
                maxWidth: 300,
                maxHeight: 300
            }
        };
    }

    applyPreset(presetName) {
        const preset = this.presets[presetName];
        if (!preset) return;

        // Update UI
        this.outputFormat.value = preset.format;
        this.qualitySlider.value = preset.quality;
        this.qualityValue.textContent = preset.quality;
        this.enableResize.checked = preset.resize;
        this.resizeInputs.style.display = preset.resize ? 'flex' : 'none';

        if (preset.resize) {
            this.resizeWidth.value = preset.maxWidth || '';
            this.resizeHeight.value = preset.maxHeight || '';
        }

        // Update preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.preset === presetName);
        });

        this.showToast(`Applied ${presetName} preset`);

        // Re-convert if there are images
        if (this.images.length > 0) {
            this.updatePreview(this.images[0]);
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        this.dropZone.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        this.dropZone.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        this.dropZone.classList.remove('dragover');

        const files = Array.from(e.dataTransfer.files).filter(file => 
            file.type.match(/^image\/(png|jpeg|webp)$/)
        );

        if (files.length > 0) {
            this.processFiles(files);
        } else {
            this.showToast('Please drop PNG, JPG, or WebP images', 'error');
        }
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            this.processFiles(files);
        }
        // Reset input so same file can be selected again
        this.fileInput.value = '';
    }

    async processFiles(files) {
        for (const file of files) {
            const imageData = await this.readFile(file);
            const dimensions = await this.getImageDimensions(imageData);
            
            this.images.push({
                id: Date.now() + Math.random(),
                file: file,
                name: file.name,
                size: file.size,
                type: file.type,
                dataUrl: imageData,
                dimensions: dimensions,
                status: 'pending',
                converted: null
            });
        }

        this.updateUI();
        this.showToast(`Added ${files.length} image(s)`);
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    getImageDimensions(dataUrl) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                resolve({ width: img.width, height: img.height });
            };
            img.src = dataUrl;
        });
    }

    updateUI() {
        // Show/hide sections
        this.optionsSection.style.display = this.images.length > 0 ? 'block' : 'none';
        this.imageListSection.style.display = this.images.length > 0 ? 'block' : 'none';
        this.previewSection.style.display = this.images.length > 0 ? 'block' : 'none';

        // Update image list
        this.renderImageList();

        // Update preview with first image
        if (this.images.length > 0) {
            this.updatePreview(this.images[0]);
        }

        // Update stats
        this.updateStats();

        // Show/hide download all button
        const hasConverted = this.images.some(img => img.status === 'converted');
        this.downloadAllBtn.style.display = hasConverted ? 'inline-flex' : 'none';
    }

    renderImageList() {
        this.imageList.innerHTML = this.images.map(image => `
            <div class="image-item" data-id="${image.id}">
                <div class="image-item-preview">
                    <img src="${image.dataUrl}" alt="${image.name}">
                    <span class="image-item-status status-${image.status}">${this.getStatusText(image.status)}</span>
                </div>
                <div class="image-item-info">
                    <div class="image-item-name" title="${image.name}">${image.name}</div>
                    <div class="image-item-details">
                        ${image.dimensions.width} × ${image.dimensions.height} • ${this.formatFileSize(image.size)}
                        ${image.converted ? ` → ${this.formatFileSize(image.converted.size)}` : ''}
                    </div>
                    <div class="image-item-actions">
                        ${image.status === 'converted' 
                            ? `<button class="btn btn-success" onclick="converter.downloadImage('${image.id}')">
                                <i class="fas fa-download"></i> Download
                               </button>`
                            : `<button class="btn btn-primary" onclick="converter.convertSingle('${image.id}')">
                                <i class="fas fa-sync-alt"></i> Convert
                               </button>`
                        }
                        <button class="btn btn-secondary" onclick="converter.removeImage('${image.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    getStatusText(status) {
        const statusTexts = {
            pending: 'Pending',
            converting: 'Converting...',
            converted: 'Ready',
            error: 'Error'
        };
        return statusTexts[status] || status;
    }

    async updatePreview(image) {
        // Original preview
        this.originalPreview.src = image.dataUrl;
        this.originalInfo.innerHTML = `
            <p><span class="label">Format:</span> <span class="value">${image.type.split('/')[1].toUpperCase()}</span></p>
            <p><span class="label">Dimensions:</span> <span class="value">${image.dimensions.width} × ${image.dimensions.height}</span></p>
            <p><span class="label">Size:</span> <span class="value">${this.formatFileSize(image.size)}</span></p>
        `;

        // Generate preview conversion
        const converted = await this.convertImage(image, true);
        if (converted) {
            this.convertedPreview.src = converted.dataUrl;
            const sizeDiff = image.size - converted.size;
            const percentReduction = ((sizeDiff / image.size) * 100).toFixed(1);
            
            this.convertedInfo.innerHTML = `
                <p><span class="label">Format:</span> <span class="value">${this.outputFormat.value.toUpperCase()}</span></p>
                <p><span class="label">Dimensions:</span> <span class="value">${converted.dimensions.width} × ${converted.dimensions.height}</span></p>
                <p><span class="label">Size:</span> <span class="value">${this.formatFileSize(converted.size)}</span></p>
                ${sizeDiff > 0 
                    ? `<p><span class="label">Saved:</span> <span class="value size-reduction">${this.formatFileSize(sizeDiff)} (${percentReduction}%)</span></p>`
                    : sizeDiff < 0 
                        ? `<p><span class="label">Note:</span> <span class="value" style="color: var(--warning-color);">Size increased by ${this.formatFileSize(Math.abs(sizeDiff))}</span></p>`
                        : ''
                }
            `;
        }
    }

    async convertImage(image, preview = false) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Calculate dimensions
                let targetWidth = img.width;
                let targetHeight = img.height;

                if (this.enableResize.checked) {
                    const maxWidth = parseInt(this.resizeWidth.value) || img.width;
                    const maxHeight = parseInt(this.resizeHeight.value) || img.height;

                    if (this.maintainAspect.checked) {
                        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
                        if (ratio < 1) {
                            targetWidth = Math.round(img.width * ratio);
                            targetHeight = Math.round(img.height * ratio);
                        }
                    } else {
                        targetWidth = maxWidth;
                        targetHeight = maxHeight;
                    }
                }

                canvas.width = targetWidth;
                canvas.height = targetHeight;

                // Draw image
                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

                // Get format and quality
                const format = `image/${this.outputFormat.value}`;
                const quality = parseInt(this.qualitySlider.value) / 100;

                // Convert to blob
                canvas.toBlob((blob) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        resolve({
                            dataUrl: reader.result,
                            blob: blob,
                            size: blob.size,
                            dimensions: { width: targetWidth, height: targetHeight },
                            format: this.outputFormat.value,
                            name: this.getNewFileName(image.name)
                        });
                    };
                    reader.readAsDataURL(blob);
                }, format, quality);
            };
            img.src = image.dataUrl;
        });
    }

    getNewFileName(originalName) {
        const baseName = originalName.replace(/\.[^/.]+$/, '');
        const extension = this.outputFormat.value === 'jpeg' ? 'jpg' : this.outputFormat.value;
        return `${baseName}_converted.${extension}`;
    }

    async convertSingle(id) {
        const image = this.images.find(img => img.id == id);
        if (!image) return;

        image.status = 'converting';
        this.renderImageList();

        try {
            const converted = await this.convertImage(image);
            image.converted = converted;
            image.status = 'converted';
            
            // Update saved space
            const saved = image.size - converted.size;
            if (saved > 0) {
                this.totalSavedBytes += saved;
            }
            
            this.showToast('Image converted successfully!');
        } catch (error) {
            image.status = 'error';
            this.showToast('Failed to convert image', 'error');
        }

        this.updateUI();
    }

    async convertAll() {
        this.showLoading(true);

        for (const image of this.images) {
            if (image.status !== 'converted') {
                image.status = 'converting';
                try {
                    const converted = await this.convertImage(image);
                    image.converted = converted;
                    image.status = 'converted';
                    
                    const saved = image.size - converted.size;
                    if (saved > 0) {
                        this.totalSavedBytes += saved;
                    }
                } catch (error) {
                    image.status = 'error';
                }
            }
        }

        this.showLoading(false);
        this.updateUI();
        this.showToast('All images converted!');
    }

    downloadImage(id) {
        const image = this.images.find(img => img.id == id);
        if (!image || !image.converted) return;

        const link = document.createElement('a');
        link.href = image.converted.dataUrl;
        link.download = image.converted.name;
        link.click();

        this.showToast('Download started!');
    }

    async downloadAll() {
        const convertedImages = this.images.filter(img => img.status === 'converted');
        if (convertedImages.length === 0) return;

        if (convertedImages.length === 1) {
            this.downloadImage(convertedImages[0].id);
            return;
        }

        // Download each image with a small delay
        for (let i = 0; i < convertedImages.length; i++) {
            setTimeout(() => {
                this.downloadImage(convertedImages[i].id);
            }, i * 500);
        }

        this.showToast(`Downloading ${convertedImages.length} images...`);
    }

    removeImage(id) {
        const index = this.images.findIndex(img => img.id == id);
        if (index > -1) {
            this.images.splice(index, 1);
            this.updateUI();
            this.showToast('Image removed');
        }
    }

    clearAll() {
        this.images = [];
        this.totalSavedBytes = 0;
        this.updateUI();
        
        // Hide sections
        this.optionsSection.style.display = 'none';
        this.imageListSection.style.display = 'none';
        this.previewSection.style.display = 'none';
        
        this.showToast('All images cleared');
    }

    handleResizeInput(dimension) {
        if (!this.maintainAspect.checked || this.images.length === 0) return;

        const image = this.images[0];
        const aspectRatio = image.dimensions.width / image.dimensions.height;

        if (dimension === 'width' && this.resizeWidth.value) {
            this.resizeHeight.value = Math.round(parseInt(this.resizeWidth.value) / aspectRatio);
        } else if (dimension === 'height' && this.resizeHeight.value) {
            this.resizeWidth.value = Math.round(parseInt(this.resizeHeight.value) * aspectRatio);
        }
    }

    updateStats() {
        this.totalImages.textContent = this.images.length;
        this.convertedCount.textContent = this.images.filter(img => img.status === 'converted').length;
        this.savedSpace.textContent = this.formatFileSize(this.totalSavedBytes);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showToast(message, type = 'success') {
        this.toastMessage.textContent = message;
        this.toast.classList.toggle('error', type === 'error');
        this.toast.querySelector('i').className = type === 'error' 
            ? 'fas fa-exclamation-circle' 
            : 'fas fa-check-circle';
        
        this.toast.classList.add('show');
        setTimeout(() => {
            this.toast.classList.remove('show');
        }, 3000);
    }

    showLoading(show) {
        this.loadingOverlay.classList.toggle('show', show);
    }
}

// Initialize the application
let converter;
document.addEventListener('DOMContentLoaded', () => {
    converter = new ImageConverter();
});

// Prevent default drag behavior on window
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => e.preventDefault());
