const form = document.getElementById('mediaForm');
const urlInput = document.getElementById('urlInput');
const typeSelect = document.getElementById('typeSelect');
const qualitySelect = document.getElementById('qualitySelect');
const qualityField = document.getElementById('qualityField');
const submitButton = document.getElementById('submitButton');
const statusBox = document.getElementById('status');
const result = document.getElementById('result');
const thumbnail = document.getElementById('thumbnail');
const title = document.getElementById('title');
const meta = document.getElementById('meta');
const downloadLink = document.getElementById('downloadLink');

let currentInfo = null;

function showStatus(message, isError = false) {
    statusBox.textContent = message;
    statusBox.classList.toggle('error', isError);
    statusBox.hidden = false;
}

function hideStatus() {
    statusBox.hidden = true;
    statusBox.textContent = '';
    statusBox.classList.remove('error');
}

function formatDuration(totalSeconds) {
    const seconds = Number(totalSeconds) || 0;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remaining = seconds % 60;
    const parts = hours > 0 ? [hours, minutes, remaining] : [minutes, remaining];
    return parts.map((part) => String(part).padStart(2, '0')).join(':');
}

function updateDownloadLink() {
    if (!currentInfo) return;

    const type = typeSelect.value;
    const quality = qualitySelect.value;
    let href = currentInfo.download[type];

    if (type === 'video' && quality) {
        href += `&quality=${encodeURIComponent(quality)}`;
    }

    downloadLink.href = href;
    downloadLink.textContent = type === 'audio' ? 'Descargar audio' : 'Descargar video';
}

function renderInfo(info) {
    currentInfo = info;
    title.textContent = info.title;
    meta.textContent = `${info.author || 'Autor desconocido'} | ${formatDuration(info.duration)}`;

    if (info.thumbnail) {
        thumbnail.src = info.thumbnail;
        thumbnail.hidden = false;
    } else {
        thumbnail.removeAttribute('src');
        thumbnail.hidden = true;
    }

    updateDownloadLink();
    result.hidden = false;
}

async function fetchInfo(url) {
    const response = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || 'No se pudo consultar el video');
    }

    return data;
}

typeSelect.addEventListener('change', () => {
    qualityField.hidden = typeSelect.value === 'audio';
    updateDownloadLink();
});

qualitySelect.addEventListener('change', updateDownloadLink);

form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const url = urlInput.value.trim();
    if (!url) {
        showStatus('Introduce una URL de YouTube', true);
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Consultando...';
    result.hidden = true;
    showStatus('Obteniendo informacion del video...');

    try {
        const info = await fetchInfo(url);
        renderInfo(info);
        hideStatus();
    } catch (error) {
        currentInfo = null;
        showStatus(error.message, true);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Consultar';
    }
});

const menuToggle = document.getElementById('menuToggle');
const navMenu = document.getElementById('navMenu');
const brandReload = document.getElementById('brandReload');
const modal = document.getElementById('infoModal');
const modalCard = modal.querySelector('.modal-card');
const modalTitle = document.getElementById('modalTitle');
const modalClose = document.getElementById('modalClose');
const aboutSection = document.getElementById('aboutSection');
const documentationSection = document.getElementById('documentationSection');
const modalTriggers = document.querySelectorAll('[data-modal]');

let lastFocused = null;

function closeMenu() {
    navMenu.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Abrir menu');
}

function openModal(target) {
    const showDocumentation = target === 'documentation';

    lastFocused = document.activeElement;
    closeMenu();
    modalTitle.textContent = showDocumentation ? 'Documentación' : 'Sobre mí';
    aboutSection.hidden = showDocumentation;
    documentationSection.hidden = !showDocumentation;
    modalCard.scrollTop = 0;
    modal.hidden = false;
    document.body.classList.add('modal-open');
    modalClose.focus({ preventScroll: true });
}

function closeModal() {
    if (modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    if (lastFocused && typeof lastFocused.focus === 'function') {
        lastFocused.focus();
    }
}

menuToggle.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Cerrar menu' : 'Abrir menu');
});

brandReload.addEventListener('click', () => {
    window.location.reload();
});

modalTriggers.forEach((trigger) => {
    trigger.addEventListener('click', () => openModal(trigger.dataset.modal));
});

modalClose.addEventListener('click', closeModal);

modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
});

document.addEventListener('click', (event) => {
    if (!navMenu.classList.contains('open')) return;
    if (navMenu.contains(event.target) || menuToggle.contains(event.target)) return;
    closeMenu();
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        if (!modal.hidden) {
            closeModal();
        } else if (navMenu.classList.contains('open')) {
            closeMenu();
        }
        return;
    }

    if (event.key !== 'Tab' || modal.hidden) return;

    const focusable = Array.from(modal.querySelectorAll('button, a[href]'));
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
});

window.addEventListener('resize', () => {
    if (window.innerWidth > 760) closeMenu();
});
