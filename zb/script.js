document.addEventListener('DOMContentLoaded', () => {
    console.log("Script loaded and DOM fully parsed.");

    // const novelFileInput = document.getElementById('novel-file'); // Removed file input
    const novelContentDiv = document.getElementById('novel-content');
    const novelInfoDiv = document.getElementById('novel-info-reader'); // Updated ID from index.html
    const tocList = document.getElementById('toc-list');
    const bgColorInput = document.getElementById('bg-color');
    const mainContentElement = document.querySelector('.main-content'); // Get the main content element
    const guideOverlay = document.getElementById('guide-overlay'); // Get guide elements
    const closeGuideButton = document.getElementById('close-guide');
    const backToBookshelfButton = document.getElementById('back-to-bookshelf-button'); // Added for back button
    const readerTitle = document.getElementById('reader-title'); // Added for reader title

    let fullContent = ''; // Store the full content globally within the scope

    // --- File Input Listener Removed ---

    // --- Event Listener for Background Color Picker ---
    bgColorInput.addEventListener('input', (event) => {
        const newColor = event.target.value;
        if (mainContentElement) {
            mainContentElement.style.backgroundColor = newColor;
        }
        if (novelContentDiv) { // Also update the novel content background
            novelContentDiv.style.backgroundColor = newColor;
        }
    });

    // --- Function to Parse Chapters and Display Content ---
    function parseAndDisplayChapters(text) {
        // Regex to find chapter titles (adjust as needed)
        const chapterRegex = /^(?:第[一二三四五六七八九十百千万\d]+章|Chapter \d+).*$/gm;
        const chapters = [...text.matchAll(chapterRegex)]; // Use matchAll for indices

        tocList.innerHTML = ''; // Clear previous TOC
        novelContentDiv.innerHTML = ''; // Clear previous content

        if (chapters && chapters.length > 0) {
            let lastIndex = 0;
            chapters.forEach((match, index) => {
                const chapterTitle = match[0].trim();
                const chapterStartIndex = match.index;

                // Add content before this chapter
                if (chapterStartIndex > lastIndex) {
                    const preContent = text.substring(lastIndex, chapterStartIndex);
                    const preSpan = document.createElement('span');
                    preSpan.textContent = preContent;
                    novelContentDiv.appendChild(preSpan);
                }

                // Create chapter container
                const chapterSpan = document.createElement('span');
                chapterSpan.id = `chapter-${index}`;

                // Find the end of this chapter (start of next chapter or end of text)
                const nextChapterStartIndex = (index + 1 < chapters.length) ? chapters[index + 1].index : text.length;
                const chapterContent = text.substring(chapterStartIndex, nextChapterStartIndex);
                chapterSpan.textContent = chapterContent; // Add chapter content
                novelContentDiv.appendChild(chapterSpan);

                lastIndex = nextChapterStartIndex;

                // Add to TOC
                const listItem = document.createElement('li');
                const cleanTitle = chapterTitle.split('\n')[0];
                listItem.textContent = cleanTitle;
                listItem.dataset.chapterIndex = index;

                listItem.addEventListener('click', () => {
                    document.querySelectorAll('#toc-list li').forEach(li => li.classList.remove('active'));
                    listItem.classList.add('active');

                    const targetChapterSpan = document.getElementById(`chapter-${index}`);
                    if (targetChapterSpan) {
                        targetChapterSpan.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                    console.log(`Clicked chapter: ${cleanTitle}, scrolling to #chapter-${index}`);
                });

                tocList.appendChild(listItem);
            });

             // Add any remaining content after the last chapter
             if (lastIndex < text.length) {
                const postContent = text.substring(lastIndex);
                const postSpan = document.createElement('span');
                postSpan.textContent = postContent;
                novelContentDiv.appendChild(postSpan);
            }

        } else {
            // No chapters found, display all content
            novelContentDiv.textContent = text;
            const noChaptersItem = document.createElement('li');
            noChaptersItem.textContent = '未找到章节';
            tocList.appendChild(noChaptersItem);
        }
    }

    // --- Guide Logic ---
    function showGuide() {
        if (guideOverlay) {
            guideOverlay.style.display = 'flex';
        }
    }

    function hideGuide() {
        if (guideOverlay) {
            guideOverlay.style.display = 'none';
            localStorage.setItem('hasSeenGuide', 'true');
        }
    }

    if (closeGuideButton) {
        closeGuideButton.addEventListener('click', hideGuide);
    }

    // Check if the guide has been seen before
    if (!localStorage.getItem('hasSeenGuide')) {
        showGuide();
    } else {
         if (guideOverlay) guideOverlay.style.display = 'none'; // Ensure it's hidden if already seen
    }

    // --- Function to load novel from sessionStorage ---
    function loadNovelFromSession() {
        const currentNovelString = sessionStorage.getItem('currentNovel');
        if (currentNovelString) {
            try {
                const novel = JSON.parse(currentNovelString);
                if (novel && novel.title && novel.txtDataUrl) {
                    // 设置标题和信息
                    readerTitle.textContent = novel.title;
                    novelInfoDiv.textContent = `正在阅读: ${novel.title}`;
                    novelContentDiv.innerHTML = '<p>正在加载内容...</p>';
                    tocList.innerHTML = '';

                    // 从 Data URL 加载内容
                    fetch(novel.txtDataUrl)
                        .then(response => response.text())
                        .then(text => {
                            // Decode base64 if necessary (Data URLs often are base64)
                            // Check if the Data URL indicates base64 encoding
                            const base64Marker = ';base64,';
                            const base64Index = novel.txtDataUrl.indexOf(base64Marker);
                            let decodedText = text;
                            if (base64Index > -1) {
                                // The actual base64 data starts after the marker
                                // Note: fetch().text() might already decode some content types,
                                // but for explicit base64 text data, manual decoding is safer.
                                // Let's assume fetch().text() didn't decode base64 for text/plain.
                                // We need the part *after* the marker.
                                // However, fetch(dataUrl).text() *should* handle base64 decoding automatically.
                                // Let's trust fetch first and only decode manually if issues arise.
                                // For simplicity now, we assume fetch handles it.
                                // If not, use: decodedText = atob(text.substring(text.indexOf(',') + 1));
                                // Re-evaluating: fetch().text() *does* decode base64 for data URLs.
                                // So, 'text' should already be the decoded string.
                                fullContent = text; // Use the text directly
                            } else {
                                // If not base64, it might be URL-encoded or plain text
                                fullContent = decodeURIComponent(text.substring(text.indexOf(',') + 1));
                            }
                            parseAndDisplayChapters(fullContent);
                        })
                        .catch(error => {
                            console.error("从 Data URL 加载小说内容出错:", error);
                            novelContentDiv.innerHTML = '<p>加载小说内容时出错。</p>';
                            novelInfoDiv.textContent = '加载失败';
                        });

                    // Optional: Clear the item after loading
                    // sessionStorage.removeItem('currentNovel');
                } else {
                    showDefaultReaderMessage();
                }
            } catch (error) {
                console.error("解析小说数据时出错:", error);
                showDefaultReaderMessage();
            }
        } else {
            showDefaultReaderMessage();
        }
    }

    function showDefaultReaderMessage() {
        readerTitle.textContent = '小说阅读';
        novelInfoDiv.textContent = '未加载小说';
        novelContentDiv.innerHTML = '<p>请从书架选择一本小说开始阅读。</p>';
        tocList.innerHTML = '';
    }

    // --- Event Listener for Back Button ---
    if (backToBookshelfButton) {
        backToBookshelfButton.addEventListener('click', () => {
            window.location.href = 'home.html'; // Navigate to home.html
        });
    }

    // --- Initial Setup ---
    // Set initial background color for the main content area
    if (mainContentElement) {
        mainContentElement.style.backgroundColor = bgColorInput.value;
    }
    // Load novel from session storage on page load
    loadNovelFromSession();
});