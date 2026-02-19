// ==UserScript==
// @name                Instagram Native Video Controls
// @icon                https://www.instagram.com/favicon.ico
// @author              BlueAG
// @namespace           https://github.com/BlueAG/TamperMonkey/tree/main/Instagram-Video-Controls
// @match               https://www.instagram.com/*
// @grant               GM_getValue
// @grant               GM_setValue
// @grant               GM_addStyle
// @run-at              document-start
// @version             1.2
// @description         Just enable native video controls, keep Instagram's UI
// @license             MIT
// @downloadURL
// @updateURL
// ==/UserScript==

(function() {
    'use strict';

    const savedVolume = GM_getValue('volume', 1);

    // Conditional CSS based on path
    const isReelsPage = () => window.location.pathname.includes('/reels/');

    GM_addStyle(`
        /* Base styles for all pages */
        video::-webkit-media-controls {
            display: flex !important;
            opacity: 1 !important;
            z-index: 100 !important;
        }

        video {
            pointer-events: auto !important;
        }

        div:has(> video) {
            pointer-events: none !important;
        }

        div:has(> video) button,
        div:has(> video) a,
        div:has(> video) [role="button"] {
            pointer-events: auto !important;
        }

        /* Reels-specific adjustment - push native controls down */
        .reels-specific video::-webkit-media-controls-panel {
            transform: translateY(30px) !important;
        }

        /* Alternative: add bottom padding to video container on reels */
        .reels-specific div:has(> video) {
            padding-bottom: 40px !important;
        }
    `);

    function addReelsClass() {
        if (isReelsPage() && !document.body.classList.contains('reels-specific')) {
            document.body.classList.add('reels-specific');
        }
    }

    function setupVideo(video) {
        if (video.hasAttribute('data-simple-controls')) return;
        video.setAttribute('data-simple-controls', 'true');

        video.controls = true;
        video.volume = savedVolume;

        video.addEventListener('volumechange', () => {
            if (!video.muted) {
                GM_setValue('volume', video.volume);
            }
        });

        // Special handling for reels
        if (isReelsPage()) {
            // Ensure the video container has proper spacing
            const container = video.closest('div[style*="position: relative"]') || video.parentElement;
            if (container) {
                container.style.paddingBottom = '40px';
            }

            // Try to find and adjust the reels control bar
            setTimeout(() => {
                const reelsControls = container?.querySelector('div[style*="bottom: 0"]');
                if (reelsControls) {
                    reelsControls.style.zIndex = '101';
                }
            }, 500);
        }
    }

    function processVideos() {
        addReelsClass();
        document.querySelectorAll('video:not([data-simple-controls])').forEach(setupVideo);
    }

    // Watch for path changes (Instagram's SPA navigation)
    let lastPath = location.pathname;
    const navigationObserver = new MutationObserver(() => {
        if (location.pathname !== lastPath) {
            lastPath = location.pathname;
            addReelsClass();
            setTimeout(processVideos, 300);
        }
    });
    navigationObserver.observe(document, { subtree: true, childList: true });

    // Video observer
    const observer = new MutationObserver(processVideos);
    observer.observe(document.body, { childList: true, subtree: true });

    // Initial setup
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', processVideos);
    } else {
        processVideos();
    }

    setInterval(processVideos, 2000);
})();