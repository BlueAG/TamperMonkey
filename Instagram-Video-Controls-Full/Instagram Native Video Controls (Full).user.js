// ==UserScript==
// @name                Instagram Native Video Controls (Full)
// @icon                https://www.instagram.com/favicon.ico
// @author              BlueAG
// @namespace           https://github.com/BlueAG/TamperMonkey/tree/main/Instagram-Video-Controls-Full
// @match               https://www.instagram.com/*
// @grant               GM_getValue
// @grant               GM_setValue
// @grant               GM_addStyle
// @run-at              document-start
// @version             2.0
// @description         Full Advanced conversion of Instagram video controls extension
// @license             MIT
// ==/UserScript==

(function() {
    'use strict';

    const savedVolume = GM_getValue('volume', 1);
    const processedVideos = new WeakSet();
    const heightOfHtml5Controls = '70px';

    // Add CSS
    GM_addStyle(`
        video[data-native-controls][controls]::-webkit-media-controls {
            display: flex !important;
        }
        video {
            pointer-events: auto !important;
        }
        .ctrls4insta-fade-button {
            opacity: 0.7;
            transition: opacity 0.2s ease;
        }
        .ctrls4insta-fade-button:hover {
            opacity: 1;
        }
    `);

    function isReelsPage() {
        return window.location.pathname.toLowerCase().startsWith('/reels/');
    }

    function isStoriesPage() {
        return window.location.pathname.toLowerCase().startsWith('/stories/');
    }

    function getVideoCoveringButtons(root, video) {
        const videoRect = video.getBoundingClientRect();
        return Array.from(root.querySelectorAll('[role="button"], [role="presentation"]')).filter(el => {
            const rect = el.getBoundingClientRect();
            // Check if element covers most of the video
            return Math.abs(rect.width - videoRect.width) < 100 &&
                   Math.abs(rect.height - videoRect.height) < 100;
        });
    }

    function getEstimatedComponentRoot(video) {
        let elem = video;
        for (let i = 0; i < 4; i++) {
            elem = elem.parentElement;
            if (!elem) break;
            if (getVideoCoveringButtons(elem, video).length > 0) {
                return elem;
            }
        }
        return video.parentElement?.parentElement?.parentElement?.parentElement;
    }

    function findVolumeButton(container, video) {
        const buttons = container.querySelectorAll('button:has(svg)');
        const videoRect = video.getBoundingClientRect();

        return Array.from(buttons).find(button => {
            const rect = button.getBoundingClientRect();
            // Check if button is in bottom third of video
            const inBottomThird = rect.bottom <= videoRect.bottom &&
                                 rect.top >= videoRect.bottom - (videoRect.height / 3);
            // Check if it's audio button by aria-label or path
            const hasAudioLabel = button.getAttribute('aria-label')?.toLowerCase().includes('audio');
            return inBottomThird && (hasAudioLabel || button.querySelector('path[d*="M1.5 13.3"]'));
        });
    }

    function modifyVideo(video) {
        if (processedVideos.has(video)) return;
        processedVideos.add(video);

        // Mark as processed
        video.dataset.nativeControls = 'true';
        video.controls = true;
        video.setAttribute('controlsList', '');
        video.volume = savedVolume;

        // Save volume changes
        video.addEventListener('volumechange', () => {
            if (!video.muted) {
                GM_setValue('volume', video.volume);
            }
        });

        // Find component root
        const componentRoot = getEstimatedComponentRoot(video);
        if (!componentRoot) return;

        // Hide play button overlays
        componentRoot.querySelectorAll('.videoSpritePlayButton').forEach(el => {
            if (el.parentNode) el.parentNode.style.visibility = 'hidden';
        });

        // Handle reels special structure
        const videoSiblings = Array.from(video.parentElement?.children || []);
        const divInstanceKey = videoSiblings.find(el =>
            el.matches('[data-instancekey]') &&
            el.querySelector('div[data-instancekey] > div[data-visualcompletion] div[role=presentation]')
        );

        if (divInstanceKey) {
            // New reels GUI style
            const visualCompletion = divInstanceKey.querySelector('div[data-visualcompletion]');
            if (visualCompletion) {
                const presentation = visualCompletion.querySelector('div[role=presentation]');
                if (presentation) {
                    visualCompletion.style.bottom = heightOfHtml5Controls;
                    visualCompletion.style.height = `calc(100% - ${heightOfHtml5Controls})`;
                    // Don't modify presentation on reels (avoid double spacing)
                    if (!isReelsPage()) {
                        presentation.style.bottom = heightOfHtml5Controls;
                    }
                }
            }

            // Fade buttons
            findVolumeButton(divInstanceKey, video)?.parentElement?.classList.add('ctrls4insta-fade-button');

            // Fix reels gradient
            if (isReelsPage()) {
                divInstanceKey.querySelectorAll('.xutac5l').forEach(el => {
                    el.style.backgroundImage = 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.2) 98%, rgba(0,0,0,0) 100%)';
                });
            }
        } else {
            // Old GUI style
            const playButton = Array.from(componentRoot.querySelectorAll('[role="button"][aria-label="Play"]')).find(btn => {
                const rect = btn.getBoundingClientRect();
                const parentRect = btn.parentElement?.getBoundingClientRect();
                return rect.width >= 80 && rect.height >= 80 &&
                       parentRect && rect.width < parentRect.width * 0.8;
            });

            if (playButton?.parentElement) {
                playButton.parentElement.style.bottom = heightOfHtml5Controls;
            }

            const controlButton = componentRoot.querySelector('[role="button"][aria-label="Control"]');
            if (controlButton && !controlButton.closest('[data-instancekey]')) {
                controlButton.style.bottom = heightOfHtml5Controls;
            }

            // Raise and fade buttons
            findVolumeButton(componentRoot, video)?.parentElement?.classList.add('ctrls4insta-fade-button');
        }

        // Handle stories
        if (isStoriesPage()) {
            // Hide overlays that pause videos
            if (video.parentElement) {
                Array.from(video.parentElement.children)
                    .filter(el => el !== video)
                    .forEach(el => el.style.visibility = 'hidden');
            }
        }

        console.log('Video controls enabled');
    }

    function processVideos() {
        document.querySelectorAll('video:not([data-native-controls])').forEach(modifyVideo);
    }

    // Watch for new videos
    const observer = new MutationObserver((mutations) => {
        let shouldProcess = false;
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeName === 'VIDEO' || node.querySelector?.('video')) {
                    shouldProcess = true;
                }
            });
        });
        if (shouldProcess) {
            setTimeout(processVideos, 100);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Initial processing
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', processVideos);
    } else {
        processVideos();
    }

    // Periodic check
    setInterval(processVideos, 2000);

    // Handle navigation
    let lastUrl = location.href;
    new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            setTimeout(processVideos, 500);
        }
    }).observe(document, { subtree: true, childList: true });
})();