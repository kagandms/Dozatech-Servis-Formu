(function registerServicePdfTemplates() {
    const COLORS = {
        ink: [24, 35, 52],
        muted: [104, 119, 137],
        line: [222, 230, 237],
        paper: [255, 255, 255],
        pale: [245, 249, 251],
        teal: [0, 153, 174],
        tealPale: [226, 247, 249],
        blue: [0, 75, 145],
        bluePale: [230, 242, 251],
        cyan: [0, 166, 203],
        indigo: [50, 82, 165],
        green: [24, 145, 100],
        red: [200, 57, 72]
    };

    /**
     * Creates the selected brand's service PDF.
     * @param {object} options Form data, checklists, and brand images.
     * @returns {{blob: Blob}} The generated PDF as a browser Blob.
     */
    function createServicePdf(options) {
        const doc = createPdfDocument(options);
        const theme = getTheme(options.brand);
        const page = { width: 210, height: 297, left: 14, right: 196 };
        const layout = createPageLayout(doc, options, page, theme);
        drawServiceSections(doc, options, page, theme, layout);
        drawSignatures(doc, options, page, theme);
        drawFooters(doc, options.brand, page);
        return { blob: doc.output('blob') };
    }

    function createPdfDocument(options) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ format: 'a4', unit: 'mm' });
        if (options.fontBase64) {
            doc.addFileToVFS('Roboto-Regular.ttf', options.fontBase64);
            doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
            doc.setFont('Roboto');
        }

        return doc;
    }

    function getTheme(brand) {
        if (brand === 'unilever') return { primary: COLORS.blue, pale: COLORS.bluePale, section: COLORS.cyan };
        return { primary: COLORS.teal, pale: COLORS.tealPale, section: COLORS.indigo };
    }

    function createPageLayout(doc, options, page, theme) {
        let y = 0;

        const drawHeader = () => {
            if (options.brand === 'unilever') drawUnileverHeader(doc, options, page);
            if (options.brand === 'dozatech') drawDozaTechHeader(doc, options, page);
            y = 53;
            drawCustomerPanel(doc, options, page, theme);
            y = 82;
        };

        const addContentPage = () => {
            doc.addPage();
            drawHeader();
        };

        const ensureSpace = (currentY, height) => {
            if (currentY + height > page.height - 72) {
                addContentPage();
                return y;
            }
            return currentY;
        };

        drawHeader();
        return { ensureSpace, getStartY: () => y };
    }

    function drawServiceSections(doc, options, page, theme, layout) {
        const startY = layout.getStartY();
        let y = drawChecklistGroup(doc, options, {
            count: options.machineCount,
            states: options.machineStates,
            items: options.machineChecklist,
            title: 'BULAŞIK MAKİNELERİ',
            itemTitle: 'Bulaşık Makinesi',
            color: theme.primary,
            page,
            y: startY,
            ensureSpace: layout.ensureSpace
        });
        y = drawChecklistGroup(doc, options, {
            count: options.pumpCount,
            states: options.pumpStates,
            items: options.pumpChecklist,
            title: 'DOZAJ POMPALARI',
            itemTitle: 'Dozaj Pompası',
            color: theme.section,
            page,
            y,
            ensureSpace: layout.ensureSpace
        });
        return drawNotes(doc, options.notes, page, y, layout.ensureSpace, theme);
    }

    function drawDozaTechHeader(doc, options, page) {
        doc.setFillColor(...COLORS.paper);
        doc.rect(0, 0, page.width, page.height, 'F');
        doc.setFillColor(...COLORS.teal);
        doc.rect(0, 0, page.width, 3, 'F');
        addContainedImage(doc, options.logoData, 14, 10, 43, 19);
        doc.setTextColor(...COLORS.ink);
        doc.setFontSize(18);
        doc.text('TEKNİK SERVİS FORMU', 196, 17, { align: 'right' });
        doc.setTextColor(...COLORS.muted);
        doc.setFontSize(9);
        doc.text('Endüstriyel mutfak servis kaydı', 196, 24, { align: 'right' });
        doc.setDrawColor(...COLORS.line);
        doc.line(14, 34, 196, 34);
        drawMeta(doc, options, page, COLORS.teal);
    }

    function drawUnileverHeader(doc, options, page) {
        doc.setFillColor(...COLORS.paper);
        doc.rect(0, 0, page.width, page.height, 'F');
        doc.setFillColor(...COLORS.blue);
        doc.rect(0, 0, page.width, 31, 'F');
        doc.setFillColor(...COLORS.cyan);
        doc.rect(0, 31, page.width, 3, 'F');
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(13, 5, 35, 22, 2, 2, 'F');
        addContainedImage(doc, options.logoData, 16, 6, 29, 20);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.text('SERVİS FORMU', 196, 14, { align: 'right' });
        doc.setFontSize(9);
        doc.text('Unilever Profesyonel', 196, 21, { align: 'right' });
        drawMeta(doc, options, page, COLORS.cyan);
    }

    function drawMeta(doc, options, page, accent) {
        doc.setTextColor(...COLORS.muted);
        doc.setFontSize(8);
        doc.text(`TARİH  ${options.date}`, 14, 43);
        doc.text(`SAAT  ${options.time}`, 76, 43);
        doc.setTextColor(...accent);
        doc.setFontSize(8);
        doc.text('SERVİS KAYDI', 196, 43, { align: 'right' });
    }

    function drawCustomerPanel(doc, options, page, theme) {
        doc.setFillColor(...theme.pale);
        doc.roundedRect(page.left, 53, page.right - page.left, 22, 3, 3, 'F');
        doc.setFillColor(...theme.primary);
        doc.roundedRect(page.left, 53, 2, 22, 1, 1, 'F');
        doc.setTextColor(...COLORS.muted);
        doc.setFontSize(7.5);
        doc.text('MÜŞTERİ', 21, 61);
        doc.setTextColor(...COLORS.ink);
        doc.setFontSize(12);
        doc.text(options.customerName || 'Müşteri adı belirtilmedi', 21, 69);
    }

    function drawChecklistGroup(doc, options, group) {
        if (!group.count) return group.y;
        const itemHeight = 8 + Math.ceil(group.items.length / 2) * 6 + 5;
        group.y = group.ensureSpace(group.y, 12 + itemHeight + 4);
        group.y = drawSectionTitle(doc, group.title, group.count, group.page, group.y, group.color);

        for (let index = 1; index <= group.count; index += 1) {
            group.y = group.ensureSpace(group.y, itemHeight + 5);
            group.y = drawChecklistCard(doc, {
                title: `${group.itemTitle} ${index}`,
                items: group.items,
                state: group.states[index] || {},
                page: group.page,
                y: group.y,
                color: group.color
            });
        }
        return group.y + 2;
    }

    function drawSectionTitle(doc, title, count, page, y, color) {
        doc.setTextColor(...COLORS.ink);
        doc.setFontSize(10);
        doc.text(`${title}  ·  ${count}`, page.left, y + 4);
        doc.setDrawColor(...color);
        doc.setLineWidth(.7);
        doc.line(page.left, y + 7, page.left + 47, y + 7);
        return y + 12;
    }

    function drawChecklistCard(doc, options) {
        const rowCount = Math.ceil(options.items.length / 2);
        const height = 8 + rowCount * 6 + 3;
        doc.setFillColor(...COLORS.paper);
        doc.setDrawColor(...COLORS.line);
        doc.roundedRect(options.page.left, options.y, options.page.right - options.page.left, height, 2, 2, 'FD');
        doc.setFillColor(...options.color);
        doc.roundedRect(options.page.left, options.y, options.page.right - options.page.left, 8, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8.5);
        doc.text(options.title, options.page.left + 5, options.y + 5.5);

        options.items.forEach((item, index) => {
            const column = index % 2;
            const row = Math.floor(index / 2);
            const x = options.page.left + 5 + column * 89;
            const rowY = options.y + 12 + row * 6;
            drawStatus(doc, options.state[item.id], x, rowY - 1.1);
            doc.setTextColor(...COLORS.ink);
            doc.setFontSize(7.4);
            doc.text(item.label, x + 5, rowY);
        });
        return options.y + height + 4;
    }

    function drawStatus(doc, status, x, y) {
        const color = status === 'ok' ? COLORS.green : status === 'fail' ? COLORS.red : COLORS.muted;
        const mark = status === 'ok' ? 'V' : status === 'fail' ? 'X' : '·';
        doc.setFillColor(...color);
        doc.circle(x + 1.4, y + 1.3, 1.7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(6.2);
        doc.text(mark, x + 1.4, y + 2.1, { align: 'center' });
    }

    function drawNotes(doc, notes, page, y, ensureSpace, theme) {
        if (!notes) return y;
        doc.setFontSize(8.5);
        const lines = doc.splitTextToSize(notes, page.right - page.left - 12);
        const height = Math.max(17, lines.length * 4.3 + 9);
        y = ensureSpace(y, height + 12);
        doc.setTextColor(...COLORS.ink);
        doc.setFontSize(10);
        doc.text('SERVİS NOTU', page.left, y + 4);
        y += 8;
        doc.setFillColor(...COLORS.pale);
        doc.setDrawColor(...COLORS.line);
        doc.roundedRect(page.left, y, page.right - page.left, height, 2, 2, 'FD');
        doc.setFillColor(...theme.primary);
        doc.roundedRect(page.left, y, 2, height, 1, 1, 'F');
        doc.setTextColor(...COLORS.ink);
        doc.setFontSize(8.5);
        doc.text(lines, page.left + 6, y + 6);
        return y + height + 5;
    }

    function drawSignatures(doc, options, page, theme) {
        const top = page.height - 65;
        doc.setDrawColor(...COLORS.line);
        doc.line(page.left, top, page.right, top);
        doc.setTextColor(...COLORS.muted);
        doc.setFontSize(8);
        if (options.brand === 'dozatech') {
            doc.text('SERVİS TEKNİSYENİ', 53, top + 6, { align: 'center' });
            addContainedImage(doc, options.stampData, 16, top + 8, 74, 45);
        } else {
            doc.text('SERVİS TEKNİSYENİ', 53, top + 6, { align: 'center' });
            doc.setTextColor(...COLORS.ink);
            doc.setFontSize(9);
            doc.text('Ahmet Durmuş', 53, top + 18, { align: 'center' });
            doc.setDrawColor(...theme.primary);
            doc.line(22, top + 39, 84, top + 39);
        }
        doc.setTextColor(...COLORS.muted);
        doc.setFontSize(8);
        doc.text('MÜŞTERİ', 151, top + 6, { align: 'center' });
        doc.setDrawColor(...theme.primary);
        doc.line(119, top + 39, 183, top + 39);
        doc.setTextColor(...COLORS.ink);
        doc.setFontSize(9);
        if (options.customerName) doc.text(options.customerName, 151, top + 45, { align: 'center', maxWidth: 70 });
    }

    function drawFooters(doc, brand, page) {
        const pages = doc.getNumberOfPages();
        for (let pageNumber = 1; pageNumber <= pages; pageNumber += 1) {
            doc.setPage(pageNumber);
            if (brand === 'unilever') {
                doc.setFillColor(...COLORS.blue);
                doc.rect(0, page.height - 8, page.width, 8, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(7);
                doc.text('Unilever Profesyonel  ·  Servis Formu', 14, page.height - 3);
                doc.text(`${pageNumber} / ${pages}`, 196, page.height - 3, { align: 'right' });
                continue;
            }
            doc.setDrawColor(...COLORS.line);
            doc.line(14, page.height - 10, 196, page.height - 10);
            doc.setTextColor(...COLORS.muted);
            doc.setFontSize(7);
            doc.text('DozaTech  ·  Endüstriyel Mutfak Çözümleri', 14, page.height - 5);
            doc.text(`${pageNumber} / ${pages}`, 196, page.height - 5, { align: 'right' });
        }
    }

    function addContainedImage(doc, imageData, x, y, maxWidth, maxHeight) {
        if (!imageData) return;
        const image = doc.getImageProperties(imageData);
        const ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
        const width = image.width * ratio;
        const height = image.height * ratio;
        doc.addImage(imageData, image.fileType || 'PNG', x + (maxWidth - width) / 2, y + (maxHeight - height) / 2, width, height);
    }

    window.createServicePdf = createServicePdf;
})();
