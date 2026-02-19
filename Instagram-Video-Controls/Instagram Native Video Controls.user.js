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
// @version             1.0
// @description         Just enable native video controls, keep Instagram's UI
// @license             MIT
// @downloadURL
// @updateURL
// ==/UserScript==

(function() {
    'use strict';

    // Store volume setting
    const savedVolume = GM_getValue('volume', 1);

    // Simple CSS to ensure controls are visible but don't break Instagram's UI
    GM_addStyle(`
        /* Allow native controls to show */
        video::-webkit-media-controls {
            display: flex !important;
            opacity: 1 !important;
            z-index: 100 !important;
        }

        /* Don't hide Instagram's controls, just let both coexist */
        video {
            pointer-events: auto !important;
        }

        /* Make sure the video container doesn't block clicks */
        div:has(> video) {
            pointer-events: none !important;
        }

        /* But let clicks pass through to Instagram's buttons */
        div:has(> video) button,
        div:has(> video) a,
        div:has(> video) [role="button"] {
            pointer-events: auto !important;
        }
    `);

    function setupVideo(video) {
        // Skip if already processed
        if (video.hasAttribute('data-simple-controls')) return;
        video.setAttribute('data-simple-controls', 'true');

        // Just enable controls, nothing else
        video.controls = true;

        // Apply saved volume
        video.volume = savedVolume;

        // Save volume changes
        video.addEventListener('volumechange', () => {
            if (!video.muted) {
                GM_setValue('volume', video.volume);
            }
        });

        // Don't hide anything, don't click any buttons, don't modify Instagram's UI
        console.log('Controls enabled on video');
    }

    // Find and process videos
    function processVideos() {
        document.querySelectorAll('video:not([data-simple-controls])').forEach(setupVideo);
    }

    // Watch for new videos
    const observer = new MutationObserver(() => {
        processVideos();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Initial processing
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', processVideos);
    } else {
        processVideos();
    }

    // Periodic check for any missed videos
    setInterval(processVideos, 2000);

    console.log('Instagram Native Controls initialized');
})();