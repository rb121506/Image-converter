// ImageFlow - Image Converter Application
// All processing happens locally in the browser

// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

class ImageConverter {
    constructor() {
        this.images = [];
        this.convertedImages = [];
        this.totalSavedBytes = 0;
        
        // AI Models
        this.cocoModel = null;
        this.segmenter = null;
        this.aiModelsLoaded = false;
        this.selectedBgColor = 'transparent';
        this.currentAiResult = null;
        
        // PDF
        this.pdfDocument = null;
        this.pdfPages = [];
        this.selectedPdfPages = new Set();
        
        // Editor
        this.editorCanvas = null;
        this.editorCtx = null;
        this.currentEditImage = null;
        this.originalImageData = null;
        this.editHistory = [];
        this.historyIndex = -1;
        this.maxHistorySteps = 50;
        this.isCropping = false;
        this.cropBox = { x: 0, y: 0, width: 0, height: 0 };
        
        // Theme
        this.isDarkMode = true;
        
        // Sortable instance
        this.sortable = null;
        
        // Watermark
        this.watermarkCanvas = null;
        this.watermarkCtx = null;
        this.watermarkSourceImage = null;
        this.watermarkImage = null;
        this.watermarkPosition = 'center';
        this.watermarkType = 'text';
        
        // OCR
        this.ocrImage = null;
        this.ocrWorker = null;
        
        // Comparison
        this.compareBeforeImage = null;
        this.compareAfterImage = null;
        
        // Social Templates
        this.socialSourceImage = null;
        this.socialCanvas = null;
        this.socialCtx = null;
        this.selectedTemplate = null;
        
        // Fullscreen Preview
        this.currentFullscreenIndex = 0;
        
        this.initializeElements();
        this.attachEventListeners();
        this.loadPresets();
        this.initializeAI();
        this.initializeKeyboardShortcuts();
        this.initializeClipboard();
        this.loadThemePreference();
        this.initializeWatermark();
        this.initializeOCR();
        this.initializeComparison();
        this.initializeSocialTemplates();
        this.initializeFullscreenPreview();
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
        
        // AI elements
        this.aiStatus = document.getElementById('aiStatus');
        this.removeBgBtn = document.getElementById('removeBgBtn');
        this.detectObjectsBtn = document.getElementById('detectObjectsBtn');
        this.upscaleBtn = document.getElementById('upscaleBtn');
        this.aiResultSection = document.getElementById('aiResultSection');
        this.aiResultCanvas = document.getElementById('aiResultCanvas');
        this.aiResultInfo = document.getElementById('aiResultInfo');
        this.detectedObjectsSection = document.getElementById('detectedObjectsSection');
        this.detectedObjectsList = document.getElementById('detectedObjectsList');
        
        // PDF elements
        this.pdfToolsSection = document.getElementById('pdf-tools');
        this.pdfPagesGrid = document.getElementById('pdfPagesGrid');
        this.pdfOptions = document.getElementById('pdfOptions');
        this.selectAllPages = document.getElementById('selectAllPages');
        this.selectedPagesCount = document.getElementById('selectedPagesCount');
        this.extractPdfBtn = document.getElementById('extractPdfBtn');
        
        // Editor elements
        this.editorSection = document.getElementById('editor');
        this.editorCanvas = document.getElementById('editorCanvas');
        this.editorCtx = this.editorCanvas ? this.editorCanvas.getContext('2d') : null;
        this.cropOverlay = document.getElementById('cropOverlay');
        this.cropBoxEl = document.getElementById('cropBox');
        
        // Theme toggle
        this.themeToggle = document.getElementById('themeToggle');
        this.shortcutsBtn = document.getElementById('shortcutsBtn');
        this.shortcutsModal = document.getElementById('shortcutsModal');
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

        // AI buttons
        this.removeBgBtn.addEventListener('click', () => this.removeBackground());
        this.detectObjectsBtn.addEventListener('click', () => this.detectObjects());
        this.upscaleBtn.addEventListener('click', () => this.upscaleImage());
        
        // Background color selection
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', () => this.selectBgColor(btn));
        });
        
        document.getElementById('customBgColor').addEventListener('input', (e) => {
            this.selectedBgColor = e.target.value;
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
        });
        
        // AI result actions
        document.getElementById('downloadAiResult').addEventListener('click', () => this.downloadAiResult());
        document.getElementById('useAsSource').addEventListener('click', () => this.useAiResultAsSource());
        
        // PDF events
        this.outputFormat.addEventListener('change', () => this.handleFormatChange());
        this.selectAllPages.addEventListener('change', () => this.toggleAllPages());
        this.extractPdfBtn.addEventListener('click', () => this.extractPdfPages());
        
        // Theme toggle
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        // Shortcuts modal
        this.shortcutsBtn.addEventListener('click', () => this.showShortcutsModal());
        document.getElementById('closeShortcutsModal').addEventListener('click', () => this.hideShortcutsModal());
        this.shortcutsModal.addEventListener('click', (e) => {
            if (e.target === this.shortcutsModal) this.hideShortcutsModal();
        });
        
        // Editor events
        document.getElementById('closeEditorBtn')?.addEventListener('click', () => this.closeEditor());
        document.getElementById('undoBtn')?.addEventListener('click', () => this.undo());
        document.getElementById('redoBtn')?.addEventListener('click', () => this.redo());
        document.getElementById('cropBtn')?.addEventListener('click', () => this.startCrop());
        document.getElementById('rotateLeftBtn')?.addEventListener('click', () => this.rotate(-90));
        document.getElementById('rotateRightBtn')?.addEventListener('click', () => this.rotate(90));
        document.getElementById('flipHBtn')?.addEventListener('click', () => this.flip('horizontal'));
        document.getElementById('flipVBtn')?.addEventListener('click', () => this.flip('vertical'));
        document.getElementById('applyCropBtn')?.addEventListener('click', () => this.applyCrop());
        document.getElementById('cancelCropBtn')?.addEventListener('click', () => this.cancelCrop());
        document.getElementById('resetAdjustmentsBtn')?.addEventListener('click', () => this.resetAdjustments());
        document.getElementById('resetEditorBtn')?.addEventListener('click', () => this.resetToOriginal());
        document.getElementById('saveEditorBtn')?.addEventListener('click', () => this.saveEditorChanges());
        document.getElementById('downloadEditorBtn')?.addEventListener('click', () => this.downloadFromEditor());
        document.getElementById('smartCropBtn')?.addEventListener('click', () => this.smartCrop());
        document.getElementById('restoreBtn')?.addEventListener('click', () => this.restoreImage());
        
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => this.applyFilter(btn.dataset.filter));
        });
        
        // Adjustment sliders
        ['brightness', 'contrast', 'saturation', 'blur', 'sharpness'].forEach(adj => {
            const slider = document.getElementById(`${adj}Slider`);
            const valueEl = document.getElementById(`${adj}Value`);
            if (slider) {
                slider.addEventListener('input', () => {
                    valueEl.textContent = slider.value;
                    this.applyAdjustments();
                });
            }
        });

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
        
        // Preview image zoom
        this.originalPreview?.addEventListener('click', () => {
            if (this.originalPreview.src && this.images.length > 0) {
                this.openFullscreen(this.images[0].id);
            }
        });
        
        this.convertedPreview?.addEventListener('click', () => {
            if (this.convertedPreview.src && this.images.length > 0) {
                this.openFullscreen(this.images[0].id);
            }
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
            file.type.match(/^image\/(png|jpeg|webp)$/) || file.type === 'application/pdf'
        );

        if (files.length > 0) {
            this.processFiles(files);
        } else {
            this.showToast('Please drop PNG, JPG, WebP images or PDF files', 'error');
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
            // Check if it's a PDF
            if (file.type === 'application/pdf') {
                await this.processPdf(file);
                continue;
            }
            
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
        this.showToast(`Added ${files.length} file(s)`);
    }
    
    async processPdf(file) {
        this.showLoading(true);
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            this.pdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            this.pdfPages = [];
            this.selectedPdfPages = new Set();
            
            // Render all pages
            this.pdfPagesGrid.innerHTML = '<div class="pdf-loading"><div class="pdf-loading-spinner"></div><span>Loading PDF pages...</span></div>';
            this.pdfToolsSection.style.display = 'block';
            
            const totalPages = this.pdfDocument.numPages;
            this.pdfPagesGrid.innerHTML = '';
            
            for (let i = 1; i <= totalPages; i++) {
                const page = await this.pdfDocument.getPage(i);
                const scale = 0.5; // Thumbnail scale
                const viewport = page.getViewport({ scale });
                
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                
                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;
                
                this.pdfPages.push({
                    pageNum: i,
                    canvas: canvas,
                    width: page.getViewport({ scale: 1 }).width,
                    height: page.getViewport({ scale: 1 }).height
                });
                
                // Create page item
                const pageItem = document.createElement('div');
                pageItem.className = 'pdf-page-item selected';
                pageItem.dataset.page = i;
                pageItem.innerHTML = `
                    <div class="pdf-page-preview"></div>
                    <div class="pdf-page-number">Page ${i}</div>
                    <div class="pdf-page-info">${Math.round(page.getViewport({ scale: 1 }).width)} × ${Math.round(page.getViewport({ scale: 1 }).height)} px</div>
                `;
                pageItem.querySelector('.pdf-page-preview').appendChild(canvas);
                pageItem.addEventListener('click', () => this.togglePageSelection(pageItem, i));
                
                this.pdfPagesGrid.appendChild(pageItem);
                this.selectedPdfPages.add(i);
            }
            
            this.updateSelectedCount();
            this.selectAllPages.checked = true;
            
            // Scroll to PDF section
            this.pdfToolsSection.scrollIntoView({ behavior: 'smooth' });
            
            this.showToast(`Loaded PDF with ${totalPages} page(s)`);
            
        } catch (error) {
            console.error('Error processing PDF:', error);
            this.showToast('Failed to process PDF', 'error');
        }
        
        this.showLoading(false);
    }
    
    togglePageSelection(pageItem, pageNum) {
        pageItem.classList.toggle('selected');
        
        if (this.selectedPdfPages.has(pageNum)) {
            this.selectedPdfPages.delete(pageNum);
        } else {
            this.selectedPdfPages.add(pageNum);
        }
        
        this.updateSelectedCount();
        this.selectAllPages.checked = this.selectedPdfPages.size === this.pdfPages.length;
    }
    
    toggleAllPages() {
        const selectAll = this.selectAllPages.checked;
        
        document.querySelectorAll('.pdf-page-item').forEach((item, index) => {
            const pageNum = index + 1;
            if (selectAll) {
                item.classList.add('selected');
                this.selectedPdfPages.add(pageNum);
            } else {
                item.classList.remove('selected');
                this.selectedPdfPages.delete(pageNum);
            }
        });
        
        this.updateSelectedCount();
    }
    
    updateSelectedCount() {
        this.selectedPagesCount.textContent = `${this.selectedPdfPages.size} page(s) selected`;
    }
    
    async extractPdfPages() {
        if (this.selectedPdfPages.size === 0) {
            this.showToast('Please select at least one page', 'error');
            return;
        }
        
        this.showLoading(true);
        
        const format = document.getElementById('extractFormat').value;
        const scale = parseFloat(document.getElementById('extractScale').value);
        const mimeType = `image/${format}`;
        
        try {
            const sortedPages = Array.from(this.selectedPdfPages).sort((a, b) => a - b);
            
            for (const pageNum of sortedPages) {
                const page = await this.pdfDocument.getPage(pageNum);
                const viewport = page.getViewport({ scale });
                
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                
                // White background for JPEG
                if (format === 'jpeg') {
                    context.fillStyle = 'white';
                    context.fillRect(0, 0, canvas.width, canvas.height);
                }
                
                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;
                
                // Convert to image
                const dataUrl = canvas.toDataURL(mimeType, 0.92);
                const blob = await (await fetch(dataUrl)).blob();
                
                // Add to images list
                this.images.push({
                    id: Date.now() + Math.random(),
                    file: null,
                    name: `PDF_Page_${pageNum}.${format === 'jpeg' ? 'jpg' : format}`,
                    size: blob.size,
                    type: mimeType,
                    dataUrl: dataUrl,
                    dimensions: { width: canvas.width, height: canvas.height },
                    status: 'pending',
                    converted: null
                });
            }
            
            this.updateUI();
            this.showToast(`Extracted ${sortedPages.length} page(s) as images`);
            
            // Scroll to image list
            this.imageListSection.scrollIntoView({ behavior: 'smooth' });
            
        } catch (error) {
            console.error('Error extracting PDF pages:', error);
            this.showToast('Failed to extract pages', 'error');
        }
        
        this.showLoading(false);
    }
    
    handleFormatChange() {
        const isPdf = this.outputFormat.value === 'pdf';
        this.pdfOptions.style.display = isPdf ? 'block' : 'none';
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
        
        // Enable/disable AI buttons based on loaded images
        if (this.aiModelsLoaded) {
            this.enableAiButtons(true);
        } else {
            this.upscaleBtn.disabled = this.images.length === 0;
        }
    }

    renderImageList() {
        this.imageList.innerHTML = this.images.map(image => `
            <div class="image-item" data-id="${image.id}">
                <div class="drag-handle" title="Drag to reorder">
                    <i class="fas fa-grip-vertical"></i>
                </div>
                <div class="image-item-preview" onclick="converter.openFullscreen('${image.id}')" title="Click to zoom">
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
                        <button class="btn btn-secondary" onclick="event.stopPropagation(); converter.openEditor('${image.id}')" title="Edit image">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-secondary use-for-watermark" onclick="event.stopPropagation(); converter.loadWatermarkSource(converter.images.find(i => i.id == '${image.id}').dataUrl)" title="Use for Watermark">
                            <i class="fas fa-stamp"></i>
                        </button>
                        ${image.status === 'converted' 
                            ? `<button class="btn btn-success" onclick="event.stopPropagation(); converter.downloadImage('${image.id}')">
                                <i class="fas fa-download"></i> Download
                               </button>`
                            : `<button class="btn btn-primary" onclick="event.stopPropagation(); converter.convertSingle('${image.id}')">
                                <i class="fas fa-sync-alt"></i> Convert
                               </button>`
                        }
                        <button class="btn btn-secondary" onclick="event.stopPropagation(); converter.removeImage('${image.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Initialize sortable for drag-to-reorder
        this.initializeSortable();
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
        // Check if PDF output is selected
        if (this.outputFormat.value === 'pdf') {
            await this.convertToPdf();
            return;
        }
        
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
        
        // Show success animation
        this.showSuccessAnimation();
        this.showToast('All images converted!');
    }
    
    async convertToPdf() {
        if (this.images.length === 0) {
            this.showToast('Please upload images first', 'error');
            return;
        }
        
        this.showLoading(true);
        
        try {
            const { jsPDF } = window.jspdf;
            const pageSize = document.getElementById('pdfPageSize').value;
            const orientationSetting = document.getElementById('pdfOrientation').value;
            const combineAll = document.getElementById('pdfCombine').checked;
            
            if (combineAll) {
                // Create single PDF with all images
                let pdf = null;
                
                for (let i = 0; i < this.images.length; i++) {
                    const image = this.images[i];
                    const img = new Image();
                    
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = reject;
                        img.src = image.dataUrl;
                    });
                    
                    // Determine orientation
                    let orientation = orientationSetting;
                    if (orientation === 'auto') {
                        orientation = img.width > img.height ? 'landscape' : 'portrait';
                    }
                    
                    // Create PDF or add page
                    if (i === 0) {
                        if (pageSize === 'fit') {
                            pdf = new jsPDF({
                                orientation: orientation,
                                unit: 'px',
                                format: [img.width, img.height]
                            });
                        } else {
                            pdf = new jsPDF({
                                orientation: orientation,
                                unit: 'mm',
                                format: pageSize
                            });
                        }
                    } else {
                        if (pageSize === 'fit') {
                            pdf.addPage([img.width, img.height], orientation);
                        } else {
                            pdf.addPage(pageSize, orientation);
                        }
                    }
                    
                    // Calculate dimensions to fit page
                    const pageWidth = pdf.internal.pageSize.getWidth();
                    const pageHeight = pdf.internal.pageSize.getHeight();
                    
                    let imgWidth, imgHeight, x, y;
                    
                    if (pageSize === 'fit') {
                        imgWidth = img.width;
                        imgHeight = img.height;
                        x = 0;
                        y = 0;
                    } else {
                        const ratio = Math.min(pageWidth / img.width, pageHeight / img.height);
                        imgWidth = img.width * ratio * 0.9; // 90% of page
                        imgHeight = img.height * ratio * 0.9;
                        x = (pageWidth - imgWidth) / 2;
                        y = (pageHeight - imgHeight) / 2;
                    }
                    
                    pdf.addImage(image.dataUrl, 'JPEG', x, y, imgWidth, imgHeight);
                }
                
                // Save combined PDF
                pdf.save('imageflow_combined.pdf');
                this.showToast('PDF created with all images!');
                
            } else {
                // Create separate PDFs for each image
                for (const image of this.images) {
                    const img = new Image();
                    
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = reject;
                        img.src = image.dataUrl;
                    });
                    
                    let orientation = orientationSetting;
                    if (orientation === 'auto') {
                        orientation = img.width > img.height ? 'landscape' : 'portrait';
                    }
                    
                    let pdf;
                    if (pageSize === 'fit') {
                        pdf = new jsPDF({
                            orientation: orientation,
                            unit: 'px',
                            format: [img.width, img.height]
                        });
                        pdf.addImage(image.dataUrl, 'JPEG', 0, 0, img.width, img.height);
                    } else {
                        pdf = new jsPDF({
                            orientation: orientation,
                            unit: 'mm',
                            format: pageSize
                        });
                        
                        const pageWidth = pdf.internal.pageSize.getWidth();
                        const pageHeight = pdf.internal.pageSize.getHeight();
                        const ratio = Math.min(pageWidth / img.width, pageHeight / img.height);
                        const imgWidth = img.width * ratio * 0.9;
                        const imgHeight = img.height * ratio * 0.9;
                        const x = (pageWidth - imgWidth) / 2;
                        const y = (pageHeight - imgHeight) / 2;
                        
                        pdf.addImage(image.dataUrl, 'JPEG', x, y, imgWidth, imgHeight);
                    }
                    
                    const fileName = image.name.replace(/\.[^/.]+$/, '') + '.pdf';
                    pdf.save(fileName);
                }
                
                this.showToast(`Created ${this.images.length} PDF file(s)!`);
            }
            
        } catch (error) {
            console.error('Error creating PDF:', error);
            this.showToast('Failed to create PDF', 'error');
        }
        
        this.showLoading(false);
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
    
    // ==================== AI FEATURES ====================
    
    async initializeAI() {
        try {
            this.updateAiStatus('loading', 'Loading AI models... This may take a moment.');
            
            // Load COCO-SSD model for object detection
            this.cocoModel = await cocoSsd.load();
            console.log('COCO-SSD model loaded');
            
            // Load Body Segmentation model for background removal
            const segmenterConfig = {
                runtime: 'mediapipe',
                solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation',
                modelType: 'general'
            };
            
            this.segmenter = await bodySegmentation.createSegmenter(
                bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation,
                segmenterConfig
            );
            console.log('Segmentation model loaded');
            
            this.aiModelsLoaded = true;
            this.updateAiStatus('ready', 'AI models loaded and ready!');
            this.enableAiButtons(true);
            
        } catch (error) {
            console.error('Error loading AI models:', error);
            this.updateAiStatus('error', 'Failed to load AI models. Please refresh the page.');
        }
    }
    
    updateAiStatus(status, message) {
        const indicator = this.aiStatus.querySelector('.ai-status-indicator');
        const text = this.aiStatus.querySelector('span');
        
        indicator.className = 'ai-status-indicator';
        if (status === 'loading') indicator.classList.add('loading');
        if (status === 'error') indicator.classList.add('error');
        
        text.textContent = message;
    }
    
    enableAiButtons(enable) {
        const hasImage = this.images.length > 0;
        this.removeBgBtn.disabled = !enable || !hasImage;
        this.detectObjectsBtn.disabled = !enable || !hasImage;
        this.upscaleBtn.disabled = !hasImage; // Upscaling doesn't need AI model
    }
    
    selectBgColor(btn) {
        document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedBgColor = btn.dataset.color;
    }
    
    async removeBackground() {
        if (this.images.length === 0) {
            this.showToast('Please upload an image first', 'error');
            return;
        }
        
        if (!this.segmenter) {
            this.showToast('AI model not loaded yet', 'error');
            return;
        }
        
        this.showLoading(true);
        
        try {
            const image = this.images[0];
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = image.dataUrl;
            });
            
            // Get segmentation mask
            const segmentation = await this.segmenter.segmentPeople(img);
            
            // Create canvas for output
            const canvas = this.aiResultCanvas;
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Draw background color
            if (this.selectedBgColor === 'transparent') {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            } else {
                ctx.fillStyle = this.selectedBgColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            
            // Draw original image
            ctx.drawImage(img, 0, 0);
            
            // Get image data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = imageData.data;
            
            // Apply mask
            if (segmentation.length > 0 && segmentation[0].mask) {
                const maskData = await segmentation[0].mask.toImageData();
                const mask = maskData.data;
                
                for (let i = 0; i < pixels.length; i += 4) {
                    const maskIndex = i;
                    const maskValue = mask[maskIndex]; // Mask value (0-255)
                    
                    if (maskValue < 128) { // Background pixel
                        if (this.selectedBgColor === 'transparent') {
                            pixels[i + 3] = 0; // Make transparent
                        } else {
                            // Apply background color
                            const color = this.hexToRgb(this.selectedBgColor);
                            pixels[i] = color.r;
                            pixels[i + 1] = color.g;
                            pixels[i + 2] = color.b;
                            pixels[i + 3] = 255;
                        }
                    }
                }
                
                ctx.putImageData(imageData, 0, 0);
            }
            
            // Show result
            this.showAiResult('Background Removal', {
                originalSize: image.size,
                dimensions: `${canvas.width} × ${canvas.height}`,
                bgColor: this.selectedBgColor === 'transparent' ? 'Transparent' : this.selectedBgColor
            });
            
            this.showToast('Background removed successfully!');
            
        } catch (error) {
            console.error('Background removal error:', error);
            this.showToast('Failed to remove background', 'error');
        }
        
        this.showLoading(false);
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 255, g: 255, b: 255 };
    }
    
    async detectObjects() {
        if (this.images.length === 0) {
            this.showToast('Please upload an image first', 'error');
            return;
        }
        
        if (!this.cocoModel) {
            this.showToast('AI model not loaded yet', 'error');
            return;
        }
        
        this.showLoading(true);
        
        try {
            const image = this.images[0];
            const img = new Image();
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = image.dataUrl;
            });
            
            // Detect objects
            const predictions = await this.cocoModel.detect(img);
            
            // Draw on canvas
            const canvas = this.aiResultCanvas;
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Draw original image
            ctx.drawImage(img, 0, 0);
            
            const showLabels = document.getElementById('showLabels').checked;
            const showConfidence = document.getElementById('showConfidence').checked;
            
            // Draw bounding boxes
            const colors = ['#667eea', '#f093fb', '#4ade80', '#fbbf24', '#f87171', '#00d4ff'];
            
            predictions.forEach((prediction, index) => {
                const [x, y, width, height] = prediction.bbox;
                const color = colors[index % colors.length];
                
                // Draw box
                ctx.strokeStyle = color;
                ctx.lineWidth = 3;
                ctx.strokeRect(x, y, width, height);
                
                // Draw label background
                if (showLabels) {
                    const label = showConfidence 
                        ? `${prediction.class} (${Math.round(prediction.score * 100)}%)`
                        : prediction.class;
                    
                    ctx.font = 'bold 16px Inter, sans-serif';
                    const textWidth = ctx.measureText(label).width;
                    
                    ctx.fillStyle = color;
                    ctx.fillRect(x, y - 25, textWidth + 10, 25);
                    
                    ctx.fillStyle = 'white';
                    ctx.fillText(label, x + 5, y - 7);
                }
            });
            
            // Show detected objects list
            this.showDetectedObjects(predictions);
            
            // Show result
            this.showAiResult('Object Detection', {
                objectsFound: predictions.length,
                dimensions: `${canvas.width} × ${canvas.height}`
            });
            
            this.showToast(`Detected ${predictions.length} object(s)!`);
            
        } catch (error) {
            console.error('Object detection error:', error);
            this.showToast('Failed to detect objects', 'error');
        }
        
        this.showLoading(false);
    }
    
    showDetectedObjects(predictions) {
        this.detectedObjectsSection.style.display = predictions.length > 0 ? 'block' : 'none';
        
        const objectIcons = {
            person: 'fa-user',
            car: 'fa-car',
            dog: 'fa-dog',
            cat: 'fa-cat',
            bird: 'fa-dove',
            chair: 'fa-chair',
            laptop: 'fa-laptop',
            phone: 'fa-mobile-alt',
            book: 'fa-book',
            bottle: 'fa-wine-bottle',
            cup: 'fa-mug-hot',
            default: 'fa-cube'
        };
        
        this.detectedObjectsList.innerHTML = predictions.map(pred => {
            const icon = objectIcons[pred.class] || objectIcons.default;
            const confidence = Math.round(pred.score * 100);
            
            return `
                <div class="detected-object-item">
                    <div class="object-icon">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="object-info">
                        <div class="object-name">${pred.class}</div>
                        <div class="object-confidence">${confidence}% confidence</div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    async upscaleImage() {
        if (this.images.length === 0) {
            this.showToast('Please upload an image first', 'error');
            return;
        }
        
        this.showLoading(true);
        
        try {
            const image = this.images[0];
            const img = new Image();
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = image.dataUrl;
            });
            
            const scaleFactor = parseInt(document.getElementById('upscaleFactor').value);
            const enhanceDetails = document.getElementById('enhanceDetails').checked;
            
            const newWidth = img.width * scaleFactor;
            const newHeight = img.height * scaleFactor;
            
            // Create canvas for upscaled image
            const canvas = this.aiResultCanvas;
            const ctx = canvas.getContext('2d');
            canvas.width = newWidth;
            canvas.height = newHeight;
            
            // Enable image smoothing for better quality
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // Draw upscaled image
            ctx.drawImage(img, 0, 0, newWidth, newHeight);
            
            // Apply sharpening if enhance details is enabled
            if (enhanceDetails) {
                this.applySharpening(ctx, newWidth, newHeight);
            }
            
            // Show result
            this.showAiResult('Image Upscaling', {
                originalDimensions: `${img.width} × ${img.height}`,
                newDimensions: `${newWidth} × ${newHeight}`,
                scaleFactor: `${scaleFactor}x`,
                enhanced: enhanceDetails ? 'Yes' : 'No'
            });
            
            this.showToast(`Image upscaled to ${scaleFactor}x!`);
            
        } catch (error) {
            console.error('Upscaling error:', error);
            this.showToast('Failed to upscale image', 'error');
        }
        
        this.showLoading(false);
    }
    
    applySharpening(ctx, width, height) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const tempData = new Uint8ClampedArray(data);
        
        // Sharpening kernel
        const kernel = [
            0, -1, 0,
            -1, 5, -1,
            0, -1, 0
        ];
        
        const kernelSize = 3;
        const half = Math.floor(kernelSize / 2);
        
        for (let y = half; y < height - half; y++) {
            for (let x = half; x < width - half; x++) {
                let r = 0, g = 0, b = 0;
                
                for (let ky = 0; ky < kernelSize; ky++) {
                    for (let kx = 0; kx < kernelSize; kx++) {
                        const px = x + kx - half;
                        const py = y + ky - half;
                        const idx = (py * width + px) * 4;
                        const kIdx = ky * kernelSize + kx;
                        
                        r += tempData[idx] * kernel[kIdx];
                        g += tempData[idx + 1] * kernel[kIdx];
                        b += tempData[idx + 2] * kernel[kIdx];
                    }
                }
                
                const idx = (y * width + x) * 4;
                data[idx] = Math.min(255, Math.max(0, r));
                data[idx + 1] = Math.min(255, Math.max(0, g));
                data[idx + 2] = Math.min(255, Math.max(0, b));
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
    
    showAiResult(operation, info) {
        this.aiResultSection.style.display = 'block';
        this.currentAiResult = {
            operation,
            canvas: this.aiResultCanvas
        };
        
        let infoHtml = `<h4>${operation}</h4>`;
        
        for (const [key, value] of Object.entries(info)) {
            const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            infoHtml += `<p><span class="label">${label}:</span> <span class="value">${value}</span></p>`;
        }
        
        this.aiResultInfo.innerHTML = infoHtml;
        
        // Scroll to result
        this.aiResultSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    downloadAiResult() {
        if (!this.currentAiResult) return;
        
        const canvas = this.aiResultCanvas;
        const format = this.selectedBgColor === 'transparent' ? 'image/png' : 'image/png';
        
        const link = document.createElement('a');
        link.download = `imageflow_${this.currentAiResult.operation.toLowerCase().replace(' ', '_')}.png`;
        link.href = canvas.toDataURL(format);
        link.click();
        
        this.showToast('Download started!');
    }
    
    async useAiResultAsSource() {
        if (!this.currentAiResult) return;
        
        const canvas = this.aiResultCanvas;
        const dataUrl = canvas.toDataURL('image/png');
        
        // Create a new image entry
        const newImage = {
            id: Date.now() + Math.random(),
            file: null,
            name: `AI_Result_${Date.now()}.png`,
            size: Math.round(dataUrl.length * 0.75), // Approximate size
            type: 'image/png',
            dataUrl: dataUrl,
            dimensions: { width: canvas.width, height: canvas.height },
            status: 'pending',
            converted: null
        };
        
        // Add to beginning of images array
        this.images.unshift(newImage);
        
        this.updateUI();
        this.showToast('AI result added as new source image!');
    }
    
    // ==================== THEME ====================
    
    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        document.body.classList.toggle('light-mode', !this.isDarkMode);
        
        const icon = this.themeToggle.querySelector('i');
        icon.className = this.isDarkMode ? 'fas fa-moon' : 'fas fa-sun';
        
        localStorage.setItem('imageflow-theme', this.isDarkMode ? 'dark' : 'light');
        this.showToast(`Switched to ${this.isDarkMode ? 'dark' : 'light'} mode`);
    }
    
    loadThemePreference() {
        const savedTheme = localStorage.getItem('imageflow-theme');
        if (savedTheme === 'light') {
            this.isDarkMode = false;
            document.body.classList.add('light-mode');
            this.themeToggle.querySelector('i').className = 'fas fa-sun';
        }
    }
    
    // ==================== KEYBOARD SHORTCUTS ====================
    
    initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                return;
            }
            
            const ctrl = e.ctrlKey || e.metaKey;
            
            // Global shortcuts
            if (ctrl && e.key === 'o') {
                e.preventDefault();
                this.fileInput.click();
            }
            
            if (ctrl && e.key === 'Enter') {
                e.preventDefault();
                this.convertAll();
            }
            
            if (e.key === 'Delete' && this.images.length > 0) {
                e.preventDefault();
                this.removeImage(this.images[0].id);
            }
            
            // Editor shortcuts
            if (this.editorSection && this.editorSection.style.display !== 'none') {
                if (ctrl && e.key === 'z') {
                    e.preventDefault();
                    this.undo();
                }
                
                if (ctrl && e.key === 'y') {
                    e.preventDefault();
                    this.redo();
                }
                
                if (ctrl && e.key === 's') {
                    e.preventDefault();
                    this.saveEditorChanges();
                }
                
                if (ctrl && e.key === 'd') {
                    e.preventDefault();
                    this.downloadFromEditor();
                }
                
                if (e.key === 'c' && !ctrl) {
                    this.startCrop();
                }
                
                if (e.key === 'q') {
                    this.rotate(-90);
                }
                
                if (e.key === 'e') {
                    this.rotate(90);
                }
                
                if (e.key === 'h') {
                    this.flip('horizontal');
                }
                
                if (e.key === 'v' && !ctrl) {
                    this.flip('vertical');
                }
                
                if (e.key === 'Escape') {
                    if (this.isCropping) {
                        this.cancelCrop();
                    } else {
                        this.closeEditor();
                    }
                }
            }
        });
    }
    
    showShortcutsModal() {
        this.shortcutsModal.classList.add('show');
    }
    
    hideShortcutsModal() {
        this.shortcutsModal.classList.remove('show');
    }
    
    // ==================== CLIPBOARD ====================
    
    initializeClipboard() {
        document.addEventListener('paste', async (e) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            
            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    if (file) {
                        await this.processFiles([file]);
                        this.showToast('Image pasted from clipboard!');
                    }
                    break;
                }
            }
        });
    }
    
    // ==================== DRAG TO REORDER ====================
    
    initializeSortable() {
        if (this.sortable) {
            this.sortable.destroy();
        }
        
        const imageListEl = document.getElementById('imageList');
        if (imageListEl && this.images.length > 1) {
            this.sortable = new Sortable(imageListEl, {
                animation: 150,
                handle: '.drag-handle',
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                onEnd: (evt) => {
                    const oldIndex = evt.oldIndex;
                    const newIndex = evt.newIndex;
                    
                    // Reorder images array
                    const [movedItem] = this.images.splice(oldIndex, 1);
                    this.images.splice(newIndex, 0, movedItem);
                    
                    this.updateStats();
                }
            });
        }
    }
    
    // ==================== IMAGE EDITOR ====================
    
    openEditor(imageId) {
        const image = this.images.find(img => img.id == imageId);
        if (!image) return;
        
        this.currentEditImage = image;
        this.editHistory = [];
        this.historyIndex = -1;
        
        // Load image to canvas
        const img = new Image();
        img.onload = () => {
            this.editorCanvas.width = img.width;
            this.editorCanvas.height = img.height;
            this.editorCtx.drawImage(img, 0, 0);
            
            // Store original
            this.originalImageData = this.editorCtx.getImageData(0, 0, img.width, img.height);
            
            // Save initial state
            this.saveToHistory();
            
            // Update editor info
            document.getElementById('editorDimensions').textContent = `${img.width} × ${img.height}`;
            document.getElementById('editorFormat').textContent = image.type.split('/')[1].toUpperCase();
            
            // Reset adjustments
            this.resetAdjustments();
            
            // Show editor
            this.editorSection.style.display = 'block';
            this.editorSection.scrollIntoView({ behavior: 'smooth' });
        };
        img.src = image.dataUrl;
    }
    
    closeEditor() {
        this.editorSection.style.display = 'none';
        this.currentEditImage = null;
        this.isCropping = false;
        this.cropOverlay.style.display = 'none';
        document.getElementById('cropOptions').style.display = 'none';
    }
    
    saveToHistory() {
        // Remove any future states if we're not at the end
        if (this.historyIndex < this.editHistory.length - 1) {
            this.editHistory = this.editHistory.slice(0, this.historyIndex + 1);
        }
        
        // Save current state
        const imageData = this.editorCtx.getImageData(0, 0, this.editorCanvas.width, this.editorCanvas.height);
        this.editHistory.push({
            imageData: imageData,
            width: this.editorCanvas.width,
            height: this.editorCanvas.height
        });
        
        // Limit history size
        if (this.editHistory.length > this.maxHistorySteps) {
            this.editHistory.shift();
        } else {
            this.historyIndex++;
        }
        
        this.updateHistoryUI();
    }
    
    updateHistoryUI() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        const historyInfo = document.getElementById('historyInfo');
        
        undoBtn.disabled = this.historyIndex <= 0;
        redoBtn.disabled = this.historyIndex >= this.editHistory.length - 1;
        
        if (this.historyIndex === 0) {
            historyInfo.textContent = 'No changes';
        } else {
            historyInfo.textContent = `${this.historyIndex} change(s)`;
        }
    }
    
    undo() {
        if (this.historyIndex <= 0) return;
        
        this.historyIndex--;
        const state = this.editHistory[this.historyIndex];
        
        this.editorCanvas.width = state.width;
        this.editorCanvas.height = state.height;
        this.editorCtx.putImageData(state.imageData, 0, 0);
        
        document.getElementById('editorDimensions').textContent = `${state.width} × ${state.height}`;
        this.updateHistoryUI();
        this.showToast('Undo');
    }
    
    redo() {
        if (this.historyIndex >= this.editHistory.length - 1) return;
        
        this.historyIndex++;
        const state = this.editHistory[this.historyIndex];
        
        this.editorCanvas.width = state.width;
        this.editorCanvas.height = state.height;
        this.editorCtx.putImageData(state.imageData, 0, 0);
        
        document.getElementById('editorDimensions').textContent = `${state.width} × ${state.height}`;
        this.updateHistoryUI();
        this.showToast('Redo');
    }
    
    rotate(degrees) {
        const canvas = this.editorCanvas;
        const ctx = this.editorCtx;
        
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        if (Math.abs(degrees) === 90) {
            tempCanvas.width = canvas.height;
            tempCanvas.height = canvas.width;
        } else {
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
        }
        
        tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
        tempCtx.rotate((degrees * Math.PI) / 180);
        tempCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
        
        canvas.width = tempCanvas.width;
        canvas.height = tempCanvas.height;
        ctx.drawImage(tempCanvas, 0, 0);
        
        document.getElementById('editorDimensions').textContent = `${canvas.width} × ${canvas.height}`;
        this.saveToHistory();
        this.showToast(`Rotated ${degrees > 0 ? 'right' : 'left'}`);
    }
    
    flip(direction) {
        const canvas = this.editorCanvas;
        const ctx = this.editorCtx;
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        if (direction === 'horizontal') {
            tempCtx.translate(canvas.width, 0);
            tempCtx.scale(-1, 1);
        } else {
            tempCtx.translate(0, canvas.height);
            tempCtx.scale(1, -1);
        }
        
        tempCtx.drawImage(canvas, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(tempCanvas, 0, 0);
        
        this.saveToHistory();
        this.showToast(`Flipped ${direction}`);
    }
    
    startCrop() {
        this.isCropping = true;
        this.cropOverlay.style.display = 'block';
        document.getElementById('cropOptions').style.display = 'block';
        document.getElementById('cropBtn').classList.add('active');
        
        // Initialize crop box
        const containerRect = this.editorCanvas.parentElement.getBoundingClientRect();
        const canvasRect = this.editorCanvas.getBoundingClientRect();
        
        // Position crop box relative to canvas
        const padding = 50;
        this.cropBox = {
            x: padding,
            y: padding,
            width: canvasRect.width - padding * 2,
            height: canvasRect.height - padding * 2
        };
        
        this.updateCropBox();
        this.initCropHandlers();
    }
    
    updateCropBox() {
        const box = this.cropBoxEl;
        box.style.left = `${this.cropBox.x}px`;
        box.style.top = `${this.cropBox.y}px`;
        box.style.width = `${this.cropBox.width}px`;
        box.style.height = `${this.cropBox.height}px`;
    }
    
    initCropHandlers() {
        const box = this.cropBoxEl;
        let isDragging = false;
        let isResizing = false;
        let resizeHandle = null;
        let startX, startY, startBox;
        
        const onMouseDown = (e) => {
            e.preventDefault();
            startX = e.clientX;
            startY = e.clientY;
            startBox = { ...this.cropBox };
            
            if (e.target.classList.contains('crop-handle')) {
                isResizing = true;
                resizeHandle = e.target.className.split(' ')[1];
            } else if (e.target === box) {
                isDragging = true;
            }
        };
        
        const onMouseMove = (e) => {
            if (!isDragging && !isResizing) return;
            
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            const containerRect = this.cropOverlay.getBoundingClientRect();
            
            if (isDragging) {
                this.cropBox.x = Math.max(0, Math.min(containerRect.width - this.cropBox.width, startBox.x + dx));
                this.cropBox.y = Math.max(0, Math.min(containerRect.height - this.cropBox.height, startBox.y + dy));
            } else if (isResizing) {
                const aspectSelect = document.getElementById('cropAspect');
                const aspectRatio = aspectSelect.value;
                
                switch (resizeHandle) {
                    case 'se':
                        this.cropBox.width = Math.max(50, startBox.width + dx);
                        this.cropBox.height = Math.max(50, startBox.height + dy);
                        break;
                    case 'nw':
                        this.cropBox.x = startBox.x + dx;
                        this.cropBox.y = startBox.y + dy;
                        this.cropBox.width = startBox.width - dx;
                        this.cropBox.height = startBox.height - dy;
                        break;
                    case 'ne':
                        this.cropBox.y = startBox.y + dy;
                        this.cropBox.width = startBox.width + dx;
                        this.cropBox.height = startBox.height - dy;
                        break;
                    case 'sw':
                        this.cropBox.x = startBox.x + dx;
                        this.cropBox.width = startBox.width - dx;
                        this.cropBox.height = startBox.height + dy;
                        break;
                    case 'n':
                        this.cropBox.y = startBox.y + dy;
                        this.cropBox.height = startBox.height - dy;
                        break;
                    case 's':
                        this.cropBox.height = startBox.height + dy;
                        break;
                    case 'e':
                        this.cropBox.width = startBox.width + dx;
                        break;
                    case 'w':
                        this.cropBox.x = startBox.x + dx;
                        this.cropBox.width = startBox.width - dx;
                        break;
                }
                
                // Apply aspect ratio constraint
                if (aspectRatio !== 'free') {
                    const [w, h] = aspectRatio.split(':').map(Number);
                    const ratio = w / h;
                    this.cropBox.height = this.cropBox.width / ratio;
                }
            }
            
            this.updateCropBox();
        };
        
        const onMouseUp = () => {
            isDragging = false;
            isResizing = false;
        };
        
        box.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        
        // Store cleanup function
        this.cropCleanup = () => {
            box.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }
    
    applyCrop() {
        const canvasRect = this.editorCanvas.getBoundingClientRect();
        const scaleX = this.editorCanvas.width / canvasRect.width;
        const scaleY = this.editorCanvas.height / canvasRect.height;
        
        // Calculate actual crop coordinates
        const cropX = Math.round(this.cropBox.x * scaleX);
        const cropY = Math.round(this.cropBox.y * scaleY);
        const cropWidth = Math.round(this.cropBox.width * scaleX);
        const cropHeight = Math.round(this.cropBox.height * scaleY);
        
        // Get cropped image data
        const imageData = this.editorCtx.getImageData(cropX, cropY, cropWidth, cropHeight);
        
        // Resize canvas and put cropped data
        this.editorCanvas.width = cropWidth;
        this.editorCanvas.height = cropHeight;
        this.editorCtx.putImageData(imageData, 0, 0);
        
        document.getElementById('editorDimensions').textContent = `${cropWidth} × ${cropHeight}`;
        
        this.cancelCrop();
        this.saveToHistory();
        this.showToast('Crop applied');
    }
    
    cancelCrop() {
        this.isCropping = false;
        this.cropOverlay.style.display = 'none';
        document.getElementById('cropOptions').style.display = 'none';
        document.getElementById('cropBtn').classList.remove('active');
        
        if (this.cropCleanup) {
            this.cropCleanup();
        }
    }
    
    // ==================== FILTERS ====================
    
    applyFilter(filterName) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filterName);
        });
        
        // Restore from last history state
        if (this.historyIndex >= 0) {
            const state = this.editHistory[this.historyIndex];
            this.editorCanvas.width = state.width;
            this.editorCanvas.height = state.height;
            this.editorCtx.putImageData(state.imageData, 0, 0);
        }
        
        if (filterName === 'none') {
            return;
        }
        
        const imageData = this.editorCtx.getImageData(0, 0, this.editorCanvas.width, this.editorCanvas.height);
        const data = imageData.data;
        
        switch (filterName) {
            case 'grayscale':
                for (let i = 0; i < data.length; i += 4) {
                    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    data[i] = data[i + 1] = data[i + 2] = avg;
                }
                break;
            case 'sepia':
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i], g = data[i + 1], b = data[i + 2];
                    data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
                    data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
                    data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
                }
                break;
            case 'invert':
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = 255 - data[i];
                    data[i + 1] = 255 - data[i + 1];
                    data[i + 2] = 255 - data[i + 2];
                }
                break;
            case 'vintage':
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i], g = data[i + 1], b = data[i + 2];
                    data[i] = Math.min(255, r * 0.5 + g * 0.5 + b * 0.1 + 40);
                    data[i + 1] = Math.min(255, r * 0.3 + g * 0.6 + b * 0.1 + 20);
                    data[i + 2] = Math.min(255, r * 0.2 + g * 0.3 + b * 0.3);
                }
                break;
            case 'cold':
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Math.max(0, data[i] - 20);
                    data[i + 2] = Math.min(255, data[i + 2] + 30);
                }
                break;
            case 'warm':
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Math.min(255, data[i] + 30);
                    data[i + 2] = Math.max(0, data[i + 2] - 20);
                }
                break;
            case 'dramatic':
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = this.clamp((data[i] - 128) * 1.5 + 128);
                    data[i + 1] = this.clamp((data[i + 1] - 128) * 1.5 + 128);
                    data[i + 2] = this.clamp((data[i + 2] - 128) * 1.5 + 128);
                }
                break;
        }
        
        this.editorCtx.putImageData(imageData, 0, 0);
        this.saveToHistory();
        this.showToast(`Applied ${filterName} filter`);
    }
    
    clamp(value) {
        return Math.max(0, Math.min(255, value));
    }
    
    // ==================== ADJUSTMENTS ====================
    
    applyAdjustments() {
        // Get values
        const brightness = parseInt(document.getElementById('brightnessSlider').value);
        const contrast = parseInt(document.getElementById('contrastSlider').value);
        const saturation = parseInt(document.getElementById('saturationSlider').value);
        const blur = parseInt(document.getElementById('blurSlider').value);
        const sharpness = parseInt(document.getElementById('sharpnessSlider').value);
        
        // Restore original
        if (this.historyIndex >= 0) {
            const state = this.editHistory[this.historyIndex];
            this.editorCtx.putImageData(state.imageData, 0, 0);
        }
        
        // Apply CSS filters for preview
        const filters = [];
        if (brightness !== 0) filters.push(`brightness(${100 + brightness}%)`);
        if (contrast !== 0) filters.push(`contrast(${100 + contrast}%)`);
        if (saturation !== 0) filters.push(`saturate(${100 + saturation}%)`);
        if (blur > 0) filters.push(`blur(${blur}px)`);
        
        this.editorCanvas.style.filter = filters.join(' ');
        
        // Apply sharpness via convolution (on save)
        this.pendingAdjustments = { brightness, contrast, saturation, blur, sharpness };
    }
    
    resetAdjustments() {
        ['brightness', 'contrast', 'saturation', 'blur', 'sharpness'].forEach(adj => {
            const slider = document.getElementById(`${adj}Slider`);
            const value = document.getElementById(`${adj}Value`);
            if (slider && value) {
                slider.value = 0;
                value.textContent = '0';
            }
        });
        
        this.editorCanvas.style.filter = '';
        this.pendingAdjustments = null;
        
        // Reset filter selection
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === 'none');
        });
    }
    
    resetToOriginal() {
        if (!this.originalImageData) return;
        
        this.editorCanvas.width = this.originalImageData.width;
        this.editorCanvas.height = this.originalImageData.height;
        this.editorCtx.putImageData(this.originalImageData, 0, 0);
        
        this.editHistory = [];
        this.historyIndex = -1;
        this.saveToHistory();
        
        this.resetAdjustments();
        
        document.getElementById('editorDimensions').textContent = 
            `${this.originalImageData.width} × ${this.originalImageData.height}`;
        
        this.showToast('Reset to original');
    }
    
    // ==================== SMART CROP ====================
    
    async smartCrop() {
        if (!this.cocoModel) {
            this.showToast('AI model not loaded yet', 'error');
            return;
        }
        
        this.showLoading(true);
        
        try {
            // Detect objects
            const predictions = await this.cocoModel.detect(this.editorCanvas);
            
            if (predictions.length === 0) {
                this.showToast('No objects detected for smart crop', 'error');
                this.showLoading(false);
                return;
            }
            
            // Find bounding box that contains all detected objects
            let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
            
            predictions.forEach(pred => {
                const [x, y, width, height] = pred.bbox;
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x + width);
                maxY = Math.max(maxY, y + height);
            });
            
            // Add padding
            const padding = 50;
            minX = Math.max(0, minX - padding);
            minY = Math.max(0, minY - padding);
            maxX = Math.min(this.editorCanvas.width, maxX + padding);
            maxY = Math.min(this.editorCanvas.height, maxY + padding);
            
            const cropWidth = maxX - minX;
            const cropHeight = maxY - minY;
            
            // Apply crop
            const imageData = this.editorCtx.getImageData(minX, minY, cropWidth, cropHeight);
            this.editorCanvas.width = cropWidth;
            this.editorCanvas.height = cropHeight;
            this.editorCtx.putImageData(imageData, 0, 0);
            
            document.getElementById('editorDimensions').textContent = `${cropWidth} × ${cropHeight}`;
            this.saveToHistory();
            this.showToast(`Smart cropped to ${predictions.length} object(s)`);
            
        } catch (error) {
            console.error('Smart crop error:', error);
            this.showToast('Smart crop failed', 'error');
        }
        
        this.showLoading(false);
    }
    
    // ==================== IMAGE RESTORATION ====================
    
    async restoreImage() {
        this.showLoading(true);
        
        try {
            const imageData = this.editorCtx.getImageData(0, 0, this.editorCanvas.width, this.editorCanvas.height);
            const data = imageData.data;
            
            // Auto-enhance: Histogram equalization
            const histogram = new Array(256).fill(0);
            for (let i = 0; i < data.length; i += 4) {
                const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
                histogram[gray]++;
            }
            
            // Calculate CDF
            const cdf = new Array(256);
            cdf[0] = histogram[0];
            for (let i = 1; i < 256; i++) {
                cdf[i] = cdf[i - 1] + histogram[i];
            }
            
            // Normalize CDF
            const cdfMin = cdf.find(v => v > 0);
            const totalPixels = data.length / 4;
            const lut = cdf.map(v => Math.round((v - cdfMin) / (totalPixels - cdfMin) * 255));
            
            // Apply enhancement
            for (let i = 0; i < data.length; i += 4) {
                // Auto-levels with some color preservation
                const r = data[i], g = data[i + 1], b = data[i + 2];
                const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
                const newGray = lut[gray];
                const factor = gray > 0 ? newGray / gray : 1;
                
                data[i] = this.clamp(r * factor);
                data[i + 1] = this.clamp(g * factor);
                data[i + 2] = this.clamp(b * factor);
            }
            
            // Apply slight sharpening
            this.editorCtx.putImageData(imageData, 0, 0);
            this.applySharpeningToCanvas(this.editorCtx, this.editorCanvas.width, this.editorCanvas.height, 0.5);
            
            // Reduce noise (simple blur + edge preserve)
            const finalImageData = this.editorCtx.getImageData(0, 0, this.editorCanvas.width, this.editorCanvas.height);
            this.simpleDenoiseFilter(finalImageData);
            this.editorCtx.putImageData(finalImageData, 0, 0);
            
            this.saveToHistory();
            this.showToast('Image restored and enhanced!');
            
        } catch (error) {
            console.error('Restore error:', error);
            this.showToast('Restoration failed', 'error');
        }
        
        this.showLoading(false);
    }
    
    applySharpeningToCanvas(ctx, width, height, amount = 1) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const tempData = new Uint8ClampedArray(data);
        
        const kernel = [
            0, -amount, 0,
            -amount, 1 + 4 * amount, -amount,
            0, -amount, 0
        ];
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let r = 0, g = 0, b = 0;
                for (let ky = 0; ky < 3; ky++) {
                    for (let kx = 0; kx < 3; kx++) {
                        const idx = ((y + ky - 1) * width + (x + kx - 1)) * 4;
                        const k = kernel[ky * 3 + kx];
                        r += tempData[idx] * k;
                        g += tempData[idx + 1] * k;
                        b += tempData[idx + 2] * k;
                    }
                }
                const idx = (y * width + x) * 4;
                data[idx] = this.clamp(r);
                data[idx + 1] = this.clamp(g);
                data[idx + 2] = this.clamp(b);
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
    
    simpleDenoiseFilter(imageData) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const tempData = new Uint8ClampedArray(data);
        
        // Simple median-like filter
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                
                // Check if pixel is significantly different from neighbors
                const neighbors = [
                    ((y - 1) * width + x) * 4,
                    ((y + 1) * width + x) * 4,
                    (y * width + x - 1) * 4,
                    (y * width + x + 1) * 4
                ];
                
                for (let c = 0; c < 3; c++) {
                    const centerVal = tempData[idx + c];
                    const neighborAvg = neighbors.reduce((sum, nIdx) => sum + tempData[nIdx + c], 0) / 4;
                    
                    // If difference is too large, blend with neighbors
                    if (Math.abs(centerVal - neighborAvg) > 30) {
                        data[idx + c] = Math.round(centerVal * 0.6 + neighborAvg * 0.4);
                    }
                }
            }
        }
    }
    
    // ==================== SAVE & DOWNLOAD ====================
    
    saveEditorChanges() {
        if (!this.currentEditImage) return;
        
        // Apply pending CSS filters to actual pixels
        if (this.pendingAdjustments) {
            this.applyPendingAdjustmentsToPixels();
        }
        
        const dataUrl = this.editorCanvas.toDataURL('image/png');
        
        this.currentEditImage.dataUrl = dataUrl;
        this.currentEditImage.dimensions = {
            width: this.editorCanvas.width,
            height: this.editorCanvas.height
        };
        this.currentEditImage.status = 'pending';
        this.currentEditImage.converted = null;
        
        this.updateUI();
        this.showToast('Changes saved!');
    }
    
    applyPendingAdjustmentsToPixels() {
        if (!this.pendingAdjustments) return;
        
        const { sharpness } = this.pendingAdjustments;
        
        // Create temp canvas without CSS filters
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.editorCanvas.width;
        tempCanvas.height = this.editorCanvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Draw with filters
        tempCtx.filter = this.editorCanvas.style.filter || 'none';
        tempCtx.drawImage(this.editorCanvas, 0, 0);
        
        // Get processed image data
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        
        // Apply sharpness
        if (sharpness > 0) {
            this.applySharpeningToPixels(imageData, sharpness / 100);
        }
        
        // Clear CSS filter and draw processed image
        this.editorCanvas.style.filter = '';
        this.editorCtx.putImageData(imageData, 0, 0);
        
        this.pendingAdjustments = null;
    }
    
    applySharpeningToPixels(imageData, amount) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const tempData = new Uint8ClampedArray(data);
        
        const kernel = [
            0, -amount, 0,
            -amount, 1 + 4 * amount, -amount,
            0, -amount, 0
        ];
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let r = 0, g = 0, b = 0;
                for (let ky = 0; ky < 3; ky++) {
                    for (let kx = 0; kx < 3; kx++) {
                        const idx = ((y + ky - 1) * width + (x + kx - 1)) * 4;
                        const k = kernel[ky * 3 + kx];
                        r += tempData[idx] * k;
                        g += tempData[idx + 1] * k;
                        b += tempData[idx + 2] * k;
                    }
                }
                const idx = (y * width + x) * 4;
                data[idx] = this.clamp(r);
                data[idx + 1] = this.clamp(g);
                data[idx + 2] = this.clamp(b);
            }
        }
    }
    
    downloadFromEditor() {
        if (!this.editorCanvas) return;
        
        // Apply pending adjustments first
        if (this.pendingAdjustments) {
            this.applyPendingAdjustmentsToPixels();
        }
        
        const format = this.outputFormat.value === 'pdf' ? 'png' : this.outputFormat.value;
        const mimeType = format === 'jpeg' ? 'image/jpeg' : `image/${format}`;
        const quality = parseInt(this.qualitySlider.value) / 100;
        
        const dataUrl = this.editorCanvas.toDataURL(mimeType, quality);
        const link = document.createElement('a');
        link.download = `imageflow_edited.${format === 'jpeg' ? 'jpg' : format}`;
        link.href = dataUrl;
        link.click();
        
        this.showToast('Download started!');
    }
    
    // ==================== WATERMARK TOOL ====================
    
    initializeWatermark() {
        this.watermarkCanvas = document.getElementById('watermarkCanvas');
        this.watermarkCtx = this.watermarkCanvas ? this.watermarkCanvas.getContext('2d') : null;
        
        // Tab switching
        document.querySelectorAll('.watermark-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.watermark-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.watermark-tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                this.watermarkType = tab.dataset.tab;
                document.getElementById(`${tab.dataset.tab}WatermarkOptions`).classList.add('active');
                this.updateWatermarkPreview();
            });
        });
        
        // Position buttons
        document.querySelectorAll('.position-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.position-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.watermarkPosition = btn.dataset.position;
                this.updateWatermarkPreview();
            });
        });
        
        // Text watermark options
        ['watermarkText', 'watermarkFontSize', 'watermarkColor', 'watermarkFontFamily', 'watermarkOpacity'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => {
                    if (id === 'watermarkFontSize') {
                        document.getElementById('watermarkFontSizeValue').textContent = el.value + 'px';
                    }
                    if (id === 'watermarkOpacity') {
                        document.getElementById('watermarkOpacityValue').textContent = el.value + '%';
                    }
                    this.updateWatermarkPreview();
                });
            }
        });
        
        // Image watermark upload
        const uploadWatermarkBtn = document.getElementById('uploadWatermarkBtn');
        const watermarkImageInput = document.getElementById('watermarkImageInput');
        
        if (uploadWatermarkBtn && watermarkImageInput) {
            uploadWatermarkBtn.addEventListener('click', () => watermarkImageInput.click());
            watermarkImageInput.addEventListener('change', (e) => this.handleWatermarkImageUpload(e));
        }
        
        // Image scale slider
        const scaleSlider = document.getElementById('watermarkImageScale');
        if (scaleSlider) {
            scaleSlider.addEventListener('input', () => {
                document.getElementById('watermarkImageScaleValue').textContent = scaleSlider.value + '%';
                this.updateWatermarkPreview();
            });
        }
        
        // Tile checkbox
        const tileCheckbox = document.getElementById('watermarkTile');
        if (tileCheckbox) {
            tileCheckbox.addEventListener('change', () => this.updateWatermarkPreview());
        }
        
        // Apply and download buttons
        document.getElementById('applyWatermarkBtn')?.addEventListener('click', () => this.applyWatermark());
        document.getElementById('downloadWatermarkedBtn')?.addEventListener('click', () => this.downloadWatermarked());
        
        // Load image from main image list when available
        this.setupWatermarkImageSource();
    }
    
    setupWatermarkImageSource() {
        // Allow clicking on any image in the list to use as watermark source
        const imageListEl = document.getElementById('imageList');
        if (imageListEl) {
            imageListEl.addEventListener('click', (e) => {
                const imageItem = e.target.closest('.image-item');
                if (imageItem && e.target.closest('.use-for-watermark')) {
                    const id = imageItem.dataset.id;
                    const image = this.images.find(img => img.id == id);
                    if (image) {
                        this.loadWatermarkSource(image.dataUrl);
                    }
                }
            });
        }
    }
    
    loadWatermarkSource(dataUrl) {
        const img = new Image();
        img.onload = () => {
            this.watermarkSourceImage = img;
            document.getElementById('watermarkNoImage').style.display = 'none';
            document.getElementById('applyWatermarkBtn').disabled = false;
            this.updateWatermarkPreview();
        };
        img.src = dataUrl;
    }
    
    handleWatermarkImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                this.watermarkImage = img;
                document.getElementById('watermarkImageName').textContent = file.name;
                this.updateWatermarkPreview();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    updateWatermarkPreview() {
        if (!this.watermarkSourceImage || !this.watermarkCtx) return;
        
        const canvas = this.watermarkCanvas;
        const ctx = this.watermarkCtx;
        const img = this.watermarkSourceImage;
        
        // Set canvas size
        const maxSize = 600;
        let width = img.width;
        let height = img.height;
        
        if (width > maxSize || height > maxSize) {
            const ratio = Math.min(maxSize / width, maxSize / height);
            width *= ratio;
            height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw source image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Apply watermark
        const opacity = parseInt(document.getElementById('watermarkOpacity').value) / 100;
        ctx.globalAlpha = opacity;
        
        const tile = document.getElementById('watermarkTile').checked;
        
        if (this.watermarkType === 'text') {
            this.drawTextWatermark(ctx, width, height, tile);
        } else if (this.watermarkType === 'image' && this.watermarkImage) {
            this.drawImageWatermark(ctx, width, height, tile);
        }
        
        ctx.globalAlpha = 1;
    }
    
    drawTextWatermark(ctx, width, height, tile) {
        const text = document.getElementById('watermarkText').value || '© ImageFlow';
        const fontSize = parseInt(document.getElementById('watermarkFontSize').value);
        const color = document.getElementById('watermarkColor').value;
        const fontFamily = document.getElementById('watermarkFontFamily').value;
        
        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Add text shadow for visibility
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        if (tile) {
            const textWidth = ctx.measureText(text).width + 50;
            const textHeight = fontSize + 30;
            
            for (let y = textHeight / 2; y < height; y += textHeight) {
                for (let x = textWidth / 2; x < width; x += textWidth) {
                    ctx.fillText(text, x, y);
                }
            }
        } else {
            const pos = this.getWatermarkPosition(width, height, ctx.measureText(text).width, fontSize);
            ctx.fillText(text, pos.x, pos.y);
        }
        
        ctx.shadowColor = 'transparent';
    }
    
    drawImageWatermark(ctx, canvasWidth, canvasHeight, tile) {
        const scale = parseInt(document.getElementById('watermarkImageScale').value) / 100;
        const wmWidth = this.watermarkImage.width * scale;
        const wmHeight = this.watermarkImage.height * scale;
        
        if (tile) {
            const spacingX = wmWidth + 30;
            const spacingY = wmHeight + 30;
            
            for (let y = 0; y < canvasHeight; y += spacingY) {
                for (let x = 0; x < canvasWidth; x += spacingX) {
                    ctx.drawImage(this.watermarkImage, x, y, wmWidth, wmHeight);
                }
            }
        } else {
            const pos = this.getWatermarkPosition(canvasWidth, canvasHeight, wmWidth, wmHeight);
            ctx.drawImage(this.watermarkImage, pos.x - wmWidth / 2, pos.y - wmHeight / 2, wmWidth, wmHeight);
        }
    }
    
    getWatermarkPosition(canvasWidth, canvasHeight, elementWidth, elementHeight) {
        const padding = 20;
        const positions = {
            'top-left': { x: padding + elementWidth / 2, y: padding + elementHeight / 2 },
            'top-center': { x: canvasWidth / 2, y: padding + elementHeight / 2 },
            'top-right': { x: canvasWidth - padding - elementWidth / 2, y: padding + elementHeight / 2 },
            'middle-left': { x: padding + elementWidth / 2, y: canvasHeight / 2 },
            'center': { x: canvasWidth / 2, y: canvasHeight / 2 },
            'middle-right': { x: canvasWidth - padding - elementWidth / 2, y: canvasHeight / 2 },
            'bottom-left': { x: padding + elementWidth / 2, y: canvasHeight - padding - elementHeight / 2 },
            'bottom-center': { x: canvasWidth / 2, y: canvasHeight - padding - elementHeight / 2 },
            'bottom-right': { x: canvasWidth - padding - elementWidth / 2, y: canvasHeight - padding - elementHeight / 2 }
        };
        
        return positions[this.watermarkPosition] || positions['center'];
    }
    
    applyWatermark() {
        if (!this.watermarkSourceImage) return;
        
        // Create full resolution canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = this.watermarkSourceImage;
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const opacity = parseInt(document.getElementById('watermarkOpacity').value) / 100;
        ctx.globalAlpha = opacity;
        
        const tile = document.getElementById('watermarkTile').checked;
        
        if (this.watermarkType === 'text') {
            // Scale font size proportionally
            const scale = img.width / this.watermarkCanvas.width;
            const fontSize = parseInt(document.getElementById('watermarkFontSize').value) * scale;
            const color = document.getElementById('watermarkColor').value;
            const fontFamily = document.getElementById('watermarkFontFamily').value;
            const text = document.getElementById('watermarkText').value || '© ImageFlow';
            
            ctx.font = `${fontSize}px ${fontFamily}`;
            ctx.fillStyle = color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 4 * scale;
            ctx.shadowOffsetX = 2 * scale;
            ctx.shadowOffsetY = 2 * scale;
            
            if (tile) {
                const textWidth = ctx.measureText(text).width + 50 * scale;
                const textHeight = fontSize + 30 * scale;
                
                for (let y = textHeight / 2; y < img.height; y += textHeight) {
                    for (let x = textWidth / 2; x < img.width; x += textWidth) {
                        ctx.fillText(text, x, y);
                    }
                }
            } else {
                const pos = this.getWatermarkPosition(img.width, img.height, ctx.measureText(text).width, fontSize);
                ctx.fillText(text, pos.x, pos.y);
            }
        } else if (this.watermarkType === 'image' && this.watermarkImage) {
            const scalePercent = parseInt(document.getElementById('watermarkImageScale').value) / 100;
            const wmWidth = this.watermarkImage.width * scalePercent * (img.width / this.watermarkCanvas.width);
            const wmHeight = this.watermarkImage.height * scalePercent * (img.width / this.watermarkCanvas.width);
            
            if (tile) {
                const spacingX = wmWidth + 30;
                const spacingY = wmHeight + 30;
                
                for (let y = 0; y < img.height; y += spacingY) {
                    for (let x = 0; x < img.width; x += spacingX) {
                        ctx.drawImage(this.watermarkImage, x, y, wmWidth, wmHeight);
                    }
                }
            } else {
                const pos = this.getWatermarkPosition(img.width, img.height, wmWidth, wmHeight);
                ctx.drawImage(this.watermarkImage, pos.x - wmWidth / 2, pos.y - wmHeight / 2, wmWidth, wmHeight);
            }
        }
        
        ctx.globalAlpha = 1;
        
        // Store result
        this.watermarkedResult = canvas.toDataURL('image/png');
        document.getElementById('downloadWatermarkedBtn').disabled = false;
        this.showToast('Watermark applied!');
    }
    
    downloadWatermarked() {
        if (!this.watermarkedResult) return;
        
        const link = document.createElement('a');
        link.download = 'imageflow_watermarked.png';
        link.href = this.watermarkedResult;
        link.click();
        
        this.showToast('Download started!');
    }
    
    // ==================== OCR TEXT EXTRACTION ====================
    
    initializeOCR() {
        const ocrDropZone = document.getElementById('ocrDropZone');
        const ocrFileInput = document.getElementById('ocrFileInput');
        
        if (ocrDropZone && ocrFileInput) {
            ocrDropZone.addEventListener('click', () => ocrFileInput.click());
            ocrDropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                ocrDropZone.style.borderColor = 'var(--primary-color)';
            });
            ocrDropZone.addEventListener('dragleave', () => {
                ocrDropZone.style.borderColor = '';
            });
            ocrDropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                ocrDropZone.style.borderColor = '';
                const file = e.dataTransfer.files[0];
                if (file && file.type.startsWith('image/')) {
                    this.loadOCRImage(file);
                }
            });
            
            ocrFileInput.addEventListener('change', (e) => {
                if (e.target.files[0]) {
                    this.loadOCRImage(e.target.files[0]);
                }
            });
        }
        
        document.getElementById('extractTextBtn')?.addEventListener('click', () => this.extractText());
        document.getElementById('copyOcrText')?.addEventListener('click', () => this.copyOCRText());
        document.getElementById('downloadOcrText')?.addEventListener('click', () => this.downloadOCRText());
        document.getElementById('clearOcrImage')?.addEventListener('click', () => this.clearOCRImage());
    }
    
    loadOCRImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.getElementById('ocrImage');
            img.src = e.target.result;
            this.ocrImage = e.target.result;
            
            document.getElementById('ocrDropZone').style.display = 'none';
            document.getElementById('ocrPreview').style.display = 'flex';
            document.getElementById('extractTextBtn').disabled = false;
            document.getElementById('ocrResult').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
    
    async extractText() {
        if (!this.ocrImage) return;
        
        const progressEl = document.getElementById('ocrProgress');
        const progressFill = document.getElementById('ocrProgressFill');
        const progressText = document.getElementById('ocrProgressText');
        const resultEl = document.getElementById('ocrResult');
        
        progressEl.style.display = 'block';
        resultEl.style.display = 'none';
        document.getElementById('extractTextBtn').disabled = true;
        
        const language = document.getElementById('ocrLanguage').value;
        
        try {
            const result = await Tesseract.recognize(
                this.ocrImage,
                language,
                {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            const progress = Math.round(m.progress * 100);
                            progressFill.style.width = progress + '%';
                            progressText.textContent = `Recognizing text... ${progress}%`;
                        } else {
                            progressText.textContent = m.status.charAt(0).toUpperCase() + m.status.slice(1) + '...';
                        }
                    }
                }
            );
            
            const text = result.data.text;
            const confidence = Math.round(result.data.confidence);
            
            document.getElementById('ocrTextOutput').value = text;
            document.getElementById('ocrCharCount').textContent = text.length;
            document.getElementById('ocrWordCount').textContent = text.trim().split(/\s+/).filter(w => w).length;
            document.getElementById('ocrConfidence').textContent = confidence;
            
            progressEl.style.display = 'none';
            resultEl.style.display = 'block';
            document.getElementById('extractTextBtn').disabled = false;
            
            this.showToast('Text extraction complete!');
            
        } catch (error) {
            console.error('OCR Error:', error);
            progressText.textContent = 'Error: ' + error.message;
            document.getElementById('extractTextBtn').disabled = false;
            this.showToast('OCR failed: ' + error.message, 'error');
        }
    }
    
    clearOCRImage() {
        // Reset the OCR image
        this.ocrImage = null;
        document.getElementById('ocrImage').src = '';
        
        // Show drop zone, hide preview
        document.getElementById('ocrDropZone').style.display = 'flex';
        document.getElementById('ocrPreview').style.display = 'none';
        
        // Reset file input
        document.getElementById('ocrFileInput').value = '';
        
        // Disable extract button
        document.getElementById('extractTextBtn').disabled = true;
        
        // Hide progress and results
        document.getElementById('ocrProgress').style.display = 'none';
        document.getElementById('ocrResult').style.display = 'none';
        
        // Clear text output
        document.getElementById('ocrTextOutput').value = '';
        document.getElementById('ocrCharCount').textContent = '0';
        document.getElementById('ocrWordCount').textContent = '0';
        document.getElementById('ocrConfidence').textContent = '0';
        
        this.showToast('OCR cleared - ready for new image');
    }
    
    copyOCRText() {
        const text = document.getElementById('ocrTextOutput').value;
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('Text copied to clipboard!');
        });
    }
    
    downloadOCRText() {
        const text = document.getElementById('ocrTextOutput').value;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'extracted_text.txt';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        
        this.showToast('Text file downloaded!');
    }
    
    // ==================== IMAGE COMPARISON SLIDER ====================
    
    initializeComparison() {
        const beforeDrop = document.getElementById('compareBeforeDrop');
        const afterDrop = document.getElementById('compareAfterDrop');
        const beforeInput = document.getElementById('compareBeforeInput');
        const afterInput = document.getElementById('compareAfterInput');
        
        if (beforeDrop && beforeInput) {
            beforeDrop.addEventListener('click', () => beforeInput.click());
            this.setupComparisonDrop(beforeDrop, beforeInput, 'before');
            beforeInput.addEventListener('change', (e) => this.loadComparisonImage(e.target.files[0], 'before'));
        }
        
        if (afterDrop && afterInput) {
            afterDrop.addEventListener('click', () => afterInput.click());
            this.setupComparisonDrop(afterDrop, afterInput, 'after');
            afterInput.addEventListener('change', (e) => this.loadComparisonImage(e.target.files[0], 'after'));
        }
        
        document.getElementById('swapComparisonBtn')?.addEventListener('click', () => this.swapComparisonImages());
        document.getElementById('resetComparisonBtn')?.addEventListener('click', () => this.resetComparison());
        
        // Initialize slider
        this.initComparisonSlider();
    }
    
    setupComparisonDrop(dropEl, inputEl, type) {
        dropEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropEl.style.borderColor = 'var(--primary-color)';
        });
        dropEl.addEventListener('dragleave', () => {
            dropEl.style.borderColor = '';
        });
        dropEl.addEventListener('drop', (e) => {
            e.preventDefault();
            dropEl.style.borderColor = '';
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.loadComparisonImage(file, type);
            }
        });
    }
    
    loadComparisonImage(file, type) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            
            if (type === 'before') {
                this.compareBeforeImage = dataUrl;
                document.getElementById('compareBeforeThumb').src = dataUrl;
                document.getElementById('compareBeforeThumb').style.display = 'block';
                document.getElementById('compareBeforeDrop').style.display = 'none';
            } else {
                this.compareAfterImage = dataUrl;
                document.getElementById('compareAfterThumb').src = dataUrl;
                document.getElementById('compareAfterThumb').style.display = 'block';
                document.getElementById('compareAfterDrop').style.display = 'none';
            }
            
            this.updateComparisonSlider();
        };
        reader.readAsDataURL(file);
    }
    
    updateComparisonSlider() {
        const container = document.getElementById('comparisonSliderContainer');
        const swapBtn = document.getElementById('swapComparisonBtn');
        const resetBtn = document.getElementById('resetComparisonBtn');
        
        if (this.compareBeforeImage && this.compareAfterImage) {
            document.getElementById('comparisonBeforeImg').src = this.compareBeforeImage;
            document.getElementById('comparisonAfterImg').src = this.compareAfterImage;
            container.style.display = 'block';
            swapBtn.disabled = false;
            resetBtn.disabled = false;
            
            // Reset slider position
            this.setComparisonPosition(50);
        }
    }
    
    initComparisonSlider() {
        const handle = document.getElementById('comparisonHandle');
        const wrapper = document.getElementById('comparisonWrapper');
        
        if (!handle || !wrapper) return;
        
        let isDragging = false;
        
        const startDrag = (e) => {
            isDragging = true;
            e.preventDefault();
        };
        
        const doDrag = (e) => {
            if (!isDragging) return;
            
            const rect = wrapper.getBoundingClientRect();
            const x = (e.type.includes('touch') ? e.touches[0].clientX : e.clientX) - rect.left;
            const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
            
            this.setComparisonPosition(percentage);
        };
        
        const stopDrag = () => {
            isDragging = false;
        };
        
        handle.addEventListener('mousedown', startDrag);
        handle.addEventListener('touchstart', startDrag);
        document.addEventListener('mousemove', doDrag);
        document.addEventListener('touchmove', doDrag);
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchend', stopDrag);
        
        // Click anywhere on wrapper to move slider
        wrapper.addEventListener('click', (e) => {
            if (e.target === handle || e.target.closest('.comparison-handle')) return;
            const rect = wrapper.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = (x / rect.width) * 100;
            this.setComparisonPosition(percentage);
        });
    }
    
    setComparisonPosition(percentage) {
        const beforeEl = document.getElementById('comparisonBefore');
        const handle = document.getElementById('comparisonHandle');
        
        if (beforeEl && handle) {
            beforeEl.style.width = percentage + '%';
            handle.style.left = percentage + '%';
        }
    }
    
    swapComparisonImages() {
        const temp = this.compareBeforeImage;
        this.compareBeforeImage = this.compareAfterImage;
        this.compareAfterImage = temp;
        
        document.getElementById('compareBeforeThumb').src = this.compareBeforeImage;
        document.getElementById('compareAfterThumb').src = this.compareAfterImage;
        
        this.updateComparisonSlider();
        this.showToast('Images swapped!');
    }
    
    resetComparison() {
        this.compareBeforeImage = null;
        this.compareAfterImage = null;
        
        document.getElementById('compareBeforeThumb').style.display = 'none';
        document.getElementById('compareAfterThumb').style.display = 'none';
        document.getElementById('compareBeforeDrop').style.display = 'flex';
        document.getElementById('compareAfterDrop').style.display = 'flex';
        document.getElementById('comparisonSliderContainer').style.display = 'none';
        document.getElementById('swapComparisonBtn').disabled = true;
        document.getElementById('resetComparisonBtn').disabled = true;
        
        this.showToast('Comparison reset');
    }
    
    // ==================== SOCIAL MEDIA TEMPLATES ====================
    
    initializeSocialTemplates() {
        const socialDropZone = document.getElementById('socialDropZone');
        const socialFileInput = document.getElementById('socialFileInput');
        
        this.socialCanvas = document.getElementById('socialCanvas');
        this.socialCtx = this.socialCanvas ? this.socialCanvas.getContext('2d') : null;
        
        if (socialDropZone && socialFileInput) {
            socialDropZone.addEventListener('click', () => socialFileInput.click());
            socialDropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                socialDropZone.style.borderColor = 'var(--primary-color)';
            });
            socialDropZone.addEventListener('dragleave', () => {
                socialDropZone.style.borderColor = '';
            });
            socialDropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                socialDropZone.style.borderColor = '';
                const file = e.dataTransfer.files[0];
                if (file && file.type.startsWith('image/')) {
                    this.loadSocialImage(file);
                }
            });
            
            socialFileInput.addEventListener('change', (e) => {
                if (e.target.files[0]) {
                    this.loadSocialImage(e.target.files[0]);
                }
            });
        }
        
        // Template buttons
        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', () => this.selectTemplate(btn));
        });
        
        document.getElementById('downloadSocialBtn')?.addEventListener('click', () => this.downloadSocialImage());
    }
    
    loadSocialImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.socialSourceImage = img;
                document.getElementById('socialDropZone').style.display = 'none';
                document.getElementById('socialPreview').style.display = 'flex';
                
                // Enable template buttons
                document.querySelectorAll('.template-btn').forEach(btn => {
                    btn.disabled = false;
                });
                
                // Apply first selected template or default
                if (this.selectedTemplate) {
                    this.applyTemplate();
                } else {
                    // Show original
                    this.socialCanvas.width = img.width;
                    this.socialCanvas.height = img.height;
                    this.socialCtx.drawImage(img, 0, 0);
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    selectTemplate(btn) {
        document.querySelectorAll('.template-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        this.selectedTemplate = {
            platform: btn.dataset.platform,
            type: btn.dataset.type,
            width: parseInt(btn.dataset.width),
            height: parseInt(btn.dataset.height)
        };
        
        document.getElementById('selectedPlatform').textContent = 
            `${this.selectedTemplate.platform.charAt(0).toUpperCase() + this.selectedTemplate.platform.slice(1)} ${this.selectedTemplate.type.charAt(0).toUpperCase() + this.selectedTemplate.type.slice(1)}`;
        document.getElementById('selectedSize').textContent = 
            `${this.selectedTemplate.width} × ${this.selectedTemplate.height}`;
        document.getElementById('socialExportOptions').style.display = 'flex';
        
        if (this.socialSourceImage) {
            this.applyTemplate();
        }
    }
    
    applyTemplate() {
        if (!this.socialSourceImage || !this.selectedTemplate) return;
        
        const { width: targetWidth, height: targetHeight } = this.selectedTemplate;
        const img = this.socialSourceImage;
        
        this.socialCanvas.width = targetWidth;
        this.socialCanvas.height = targetHeight;
        
        // Calculate cover fit (fill entire area, crop if needed)
        const imgRatio = img.width / img.height;
        const targetRatio = targetWidth / targetHeight;
        
        let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;
        
        if (imgRatio > targetRatio) {
            // Image is wider - crop sides
            sWidth = img.height * targetRatio;
            sx = (img.width - sWidth) / 2;
        } else {
            // Image is taller - crop top/bottom
            sHeight = img.width / targetRatio;
            sy = (img.height - sHeight) / 2;
        }
        
        this.socialCtx.drawImage(
            img,
            sx, sy, sWidth, sHeight,
            0, 0, targetWidth, targetHeight
        );
        
        this.showToast(`Resized for ${this.selectedTemplate.platform} ${this.selectedTemplate.type}`);
    }
    
    downloadSocialImage() {
        if (!this.socialCanvas || !this.selectedTemplate) return;
        
        const link = document.createElement('a');
        link.download = `${this.selectedTemplate.platform}_${this.selectedTemplate.type}_${this.selectedTemplate.width}x${this.selectedTemplate.height}.png`;
        link.href = this.socialCanvas.toDataURL('image/png');
        link.click();
        
        this.showToast('Download started!');
    }
    
    // ==================== FULLSCREEN PREVIEW ====================
    
    initializeFullscreenPreview() {
        const preview = document.getElementById('fullscreenPreview');
        const closeBtn = document.getElementById('fullscreenClose');
        const prevBtn = document.getElementById('fullscreenPrev');
        const nextBtn = document.getElementById('fullscreenNext');
        const editBtn = document.getElementById('fullscreenEdit');
        const downloadBtn = document.getElementById('fullscreenDownload');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeFullscreen());
        }
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.navigateFullscreen(-1));
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.navigateFullscreen(1));
        }
        
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                const image = this.images[this.currentFullscreenIndex];
                if (image) {
                    this.closeFullscreen();
                    this.openEditor(image.id);
                }
            });
        }
        
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                const image = this.images[this.currentFullscreenIndex];
                if (image) {
                    this.downloadSingleImage(image);
                }
            });
        }
        
        // Close on background click
        if (preview) {
            preview.addEventListener('click', (e) => {
                if (e.target === preview) {
                    this.closeFullscreen();
                }
            });
        }
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!document.getElementById('fullscreenPreview')?.classList.contains('active')) return;
            
            if (e.key === 'Escape') {
                this.closeFullscreen();
            } else if (e.key === 'ArrowLeft') {
                this.navigateFullscreen(-1);
            } else if (e.key === 'ArrowRight') {
                this.navigateFullscreen(1);
            }
        });
    }
    
    openFullscreen(imageId) {
        const index = this.images.findIndex(img => img.id == imageId);
        if (index === -1) return;
        
        this.currentFullscreenIndex = index;
        this.updateFullscreenImage();
        
        document.getElementById('fullscreenPreview').classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    closeFullscreen() {
        document.getElementById('fullscreenPreview').classList.remove('active');
        document.body.style.overflow = '';
    }
    
    navigateFullscreen(direction) {
        const newIndex = this.currentFullscreenIndex + direction;
        
        if (newIndex >= 0 && newIndex < this.images.length) {
            this.currentFullscreenIndex = newIndex;
            this.updateFullscreenImage();
        }
    }
    
    updateFullscreenImage() {
        const image = this.images[this.currentFullscreenIndex];
        if (!image) return;
        
        const imgEl = document.getElementById('fullscreenImage');
        imgEl.src = image.dataUrl;
        
        document.getElementById('fullscreenName').textContent = image.name;
        document.getElementById('fullscreenDimensions').textContent = 
            `${image.dimensions.width} × ${image.dimensions.height}`;
        document.getElementById('fullscreenSize').textContent = this.formatFileSize(image.size);
        
        // Update navigation visibility
        document.getElementById('fullscreenPrev').style.opacity = 
            this.currentFullscreenIndex > 0 ? '0.7' : '0.2';
        document.getElementById('fullscreenNext').style.opacity = 
            this.currentFullscreenIndex < this.images.length - 1 ? '0.7' : '0.2';
    }
    
    downloadSingleImage(image) {
        const link = document.createElement('a');
        link.download = image.name;
        link.href = image.converted ? image.converted.dataUrl : image.dataUrl;
        link.click();
        this.showToast('Download started!');
    }
    
    // ==================== SUCCESS ANIMATIONS ====================
    
    showSuccessAnimation() {
        const animation = document.getElementById('successAnimation');
        if (!animation) return;
        
        // Reset and show
        animation.style.display = 'flex';
        animation.innerHTML = `
            <div class="success-checkmark">
                <i class="fas fa-check"></i>
            </div>
            <div class="success-ring"></div>
        `;
        
        // Trigger confetti
        this.triggerConfetti();
        
        // Hide after animation
        setTimeout(() => {
            animation.style.display = 'none';
        }, 1500);
    }
    
    triggerConfetti() {
        const container = document.getElementById('confettiContainer');
        if (!container) return;
        
        const colors = ['#667eea', '#764ba2', '#f093fb', '#4ade80', '#fbbf24', '#f87171', '#00d4ff'];
        const confettiCount = 50;
        
        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 0.5 + 's';
            confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
            
            // Random shapes
            const shapes = ['50%', '0%', '30%'];
            confetti.style.borderRadius = shapes[Math.floor(Math.random() * shapes.length)];
            
            // Random sizes
            const size = Math.random() * 10 + 5;
            confetti.style.width = size + 'px';
            confetti.style.height = size + 'px';
            
            container.appendChild(confetti);
            
            // Remove after animation
            setTimeout(() => {
                confetti.remove();
            }, 4000);
        }
    }
    
    // Override showToast to add micro-animation
    showToast(message, type = 'success') {
        const toast = this.toast;
        const icon = toast.querySelector('i');
        
        // Set icon based on type
        if (type === 'error') {
            icon.className = 'fas fa-exclamation-circle';
            toast.style.borderColor = 'var(--error-color)';
        } else if (type === 'warning') {
            icon.className = 'fas fa-exclamation-triangle';
            toast.style.borderColor = 'var(--warning-color)';
        } else {
            icon.className = 'fas fa-check-circle';
            toast.style.borderColor = 'var(--success-color)';
        }
        
        this.toastMessage.textContent = message;
        toast.classList.add('show');
        
        // Add bounce animation
        toast.style.animation = 'none';
        toast.offsetHeight; // Trigger reflow
        toast.style.animation = 'toastSlide 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
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
