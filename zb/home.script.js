document.addEventListener('DOMContentLoaded', () => {
    const bookshelfGrid = document.getElementById('bookshelf-grid');
    const addNovelButton = document.getElementById('add-novel-button');
    const novelFileInput = document.getElementById('add-novel-file');
    const coverFileInput = document.getElementById('add-cover-file');
    const noNovelsMessage = document.getElementById('no-novels-message');

    let novels = JSON.parse(localStorage.getItem('novels')) || [];
    let selectedNovelFile = null;

    // --- Function to display novels on the bookshelf ---
    function displayNovels() {
        bookshelfGrid.innerHTML = ''; // Clear existing grid
        if (novels.length === 0) {
            noNovelsMessage.style.display = 'block';
            bookshelfGrid.appendChild(noNovelsMessage);
        } else {
            noNovelsMessage.style.display = 'none';
            novels.forEach((novel, index) => {
                const card = document.createElement('div');
                card.classList.add('novel-card');
                card.dataset.index = index; // Store index for later use

                const cover = document.createElement('img');
                cover.classList.add('novel-cover');
                cover.src = novel.coverPath || 'placeholder-cover.svg'; // Use SVG placeholder if no cover
                cover.alt = novel.title + ' Cover';
                cover.onerror = () => { cover.src = 'placeholder-cover.svg'; }; // Fallback SVG placeholder

                const title = document.createElement('p');
                title.classList.add('novel-title');
                title.textContent = novel.title;

                // --- Add Delete Button --- START
                const deleteButton = document.createElement('button');
                deleteButton.classList.add('delete-novel-button');
                deleteButton.textContent = 'X';
                deleteButton.dataset.index = index; // Store index for deletion

                deleteButton.addEventListener('click', (event) => {
                    event.stopPropagation(); // Prevent card click event
                    const novelIndexToDelete = parseInt(event.target.dataset.index, 10);
                    const novelToDelete = novels[novelIndexToDelete];

                    if (confirm(`确定要删除《${novelToDelete.title}》吗？`)) {
                        novels.splice(novelIndexToDelete, 1); // Remove from array
                        localStorage.setItem('novels', JSON.stringify(novels)); // Update local storage
                        displayNovels(); // Refresh the bookshelf
                    }
                });
                // --- Add Delete Button --- END

                card.appendChild(cover);
                card.appendChild(title);
                card.appendChild(deleteButton); // Append delete button

                // Click event to go to reader view (on the card itself, not the button)
                card.addEventListener('click', (event) => {
                    // Ensure the click is not on the delete button
                    if (event.target !== deleteButton) {
                        sessionStorage.setItem('currentNovel', JSON.stringify(novel));
                        window.location.href = 'index.html'; // Navigate to reader page
                    }
                });

                bookshelfGrid.appendChild(card);
            });
        }
    }

    // --- Event Listener for Add Novel Button ---
    addNovelButton.addEventListener('click', () => {
        novelFileInput.click(); // Trigger hidden novel file input
    });

    // --- Event Listener for Novel File Input ---
    novelFileInput.addEventListener('change', (event) => {
        selectedNovelFile = event.target.files[0];
        if (selectedNovelFile && selectedNovelFile.type === 'text/plain') {
            // Ask user if they want to add a cover, or proceed without one
            // For simplicity, we'll directly prompt for cover, but handle cancellation
            coverFileInput.click();
        } else if (selectedNovelFile) {
            alert('请选择一个 .txt 格式的小说文件。');
            selectedNovelFile = null;
            novelFileInput.value = ''; // Reset input
        }
    });

    // --- Function to add novel (with or without cover) ---
    function addNovel(novelFile, coverDataUrl = null) {
        const novelTitle = novelFile.name.replace(/\.txt$/i, ''); // Extract title
        const txtReader = new FileReader();

        txtReader.onload = (txtEvent) => {
            const newNovel = {
                id: Date.now().toString(),
                title: novelTitle,
                coverPath: coverDataUrl || 'placeholder-cover.svg', // Use placeholder if no cover
                txtDataUrl: txtEvent.target.result // Store text content as Data URL
            };

            novels.push(newNovel);
            try { // Add try-catch here
                localStorage.setItem('novels', JSON.stringify(novels));
                displayNovels(); // Update the bookshelf
            } catch (e) {
                console.error("Error saving novels to localStorage:", e);
                alert(`无法保存小说列表。可能是存储空间已满。错误: ${e.message}`);
                // Optional: Remove the just added novel if saving failed
                novels.pop(); 
            }

            // Reset inputs
            selectedNovelFile = null;
            novelFileInput.value = '';
            coverFileInput.value = '';
        };
        txtReader.onerror = () => {
            alert('读取小说文件内容时出错。');
            // Reset inputs even on error
            selectedNovelFile = null;
            novelFileInput.value = '';
            coverFileInput.value = '';
        };
        txtReader.readAsDataURL(novelFile); // Read TXT as Data URL
    }

    // --- Event Listener for Cover File Input ---
    coverFileInput.addEventListener('change', (event) => {
        const coverFile = event.target.files[0]; // Might be undefined if cancelled

        if (!selectedNovelFile) {
            console.warn("Cover selected/cancelled without a novel file being selected first.");
            // Reset inputs if needed
            novelFileInput.value = '';
            coverFileInput.value = '';
            return; // Exit if no novel file is staged
        }

        // Case 1: User selected a valid cover file
        if (coverFile && coverFile.type.startsWith('image/')) {
            const coverReader = new FileReader();
            coverReader.onload = (e) => {
                addNovel(selectedNovelFile, e.target.result); // Add with cover Data URL
            };
            coverReader.onerror = () => {
                alert('读取封面文件时出错。将使用默认封面。');
                addNovel(selectedNovelFile, null); // Add with placeholder cover on error
            };
            coverReader.readAsDataURL(coverFile);
        }
        // Case 2: User selected an invalid file type for cover
        else if (coverFile) { // coverFile exists but is not a valid image
            alert('请选择一个图片格式的封面文件。将使用默认封面。');
            addNovel(selectedNovelFile, null); // Add with placeholder cover
            coverFileInput.value = ''; // Reset cover input only
        }
        // Case 3: User cancelled cover selection (coverFile is undefined)
        else { // coverFile is undefined, meaning cancellation
             console.log('未选择封面或取消选择，使用默认封面。');
             addNovel(selectedNovelFile, null); // Add with placeholder cover
             // No need to reset coverFileInput.value here, as it's already empty from cancellation
        }
    });

    // --- Initial Display ---
    displayNovels();
});