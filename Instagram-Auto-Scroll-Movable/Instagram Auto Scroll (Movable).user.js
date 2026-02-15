// ==UserScript==
// @name           Instagram Auto Scroll (Movable)
// @icon           https://www.instagram.com/favicon.ico
// @namespace      https://github.com/BlueAG/TamperMonkey
// @version        1.0.1
// @description    Auto-scroll through Instagram feed with movable controls
// @author         BlueAG
// @license        MIT
// @match          https://www.instagram.com/*
// @match          https://instagram.com/*
// @grant          none
// @downloadURL https://update.greasyfork.org/scripts/566379/Instagram%20Auto%20Scroll%20%28Movable%29.user.js
// @updateURL https://update.greasyfork.org/scripts/566379/Instagram%20Auto%20Scroll%20%28Movable%29.meta.js
// ==/UserScript==

(function() {
    'use strict';

    let autoScrollEnabled = false;
    let scrollSpeed = 500; // milliseconds between scrolls 1000
    let scrollInterval;
    let controls;
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };

    function createControls() {
        controls = document.createElement('div');
        controls.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px;
            border-radius: 10px;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: 14px;
            min-width: 100px;
            backdrop-filter: blur(0px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            cursor: move;
            user-select: none;
        `;

        controls.innerHTML = `
            <div style="margin-bottom: 10px; font-weight: 600; cursor: move; display: flex; justify-content: space-between; align-items: center;">
                <span>Auto Scroll</span>

            </div>
            <button id="toggleScroll" style="background: #0095f6; color: white; border: none; padding: 8px 8px; border-radius: 5px; cursor: pointer; margin-right: 15px; width: 100%; margin-bottom: 8px;">Start</button>

            <div style="margin-bottom: 8px;">
                <label style="display: block; margin-bottom: 4px; font-size: 12px;">Delay (seconds):</label>

                <input type="range" id="speedSlider" min="0.5" max="5.0" step="0.5" value="1.0" style="width: 100%;">

                <span id="speedValue" style="font-size: 12px;">1.0s</span>
            </div>

        `;

        document.body.appendChild(controls);

        // Add event listeners for controls
        document.getElementById('toggleScroll').addEventListener('click', toggleAutoScroll);
        document.getElementById('speedSlider').addEventListener('input', updateSpeed);

        // Make controls draggable
        makeDraggable(controls);
    }

    function makeDraggable(element) {
        const header = element.querySelector('div');

        header.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', stopDrag);

        function startDrag(e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') {
                return; // Don't start drag if clicking on interactive elements
            }

            isDragging = true;
            const rect = element.getBoundingClientRect();
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;

            element.style.transition = 'none';
            element.style.cursor = 'grabbing';
            e.preventDefault();
        }

        function onDrag(e) {
            if (!isDragging) return;

            const x = e.clientX - dragOffset.x;
            const y = e.clientY - dragOffset.y;

            // Keep within viewport bounds
            const maxX = window.innerWidth - element.offsetWidth;
            const maxY = window.innerHeight - element.offsetHeight;

            element.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
            element.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
            element.style.right = 'auto';
        }

        function stopDrag() {
            if (isDragging) {
                isDragging = false;
                element.style.cursor = 'move';

                // Save position to localStorage
                savePosition();
            }
        }

        // Touch support for mobile
        header.addEventListener('touchstart', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;

            isDragging = true;
            const touch = e.touches[0];
            const rect = element.getBoundingClientRect();
            dragOffset.x = touch.clientX - rect.left;
            dragOffset.y = touch.clientY - rect.top;

            element.style.transition = 'none';
            e.preventDefault();
        });

        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;

            const touch = e.touches[0];
            const x = touch.clientX - dragOffset.x;
            const y = touch.clientY - dragOffset.y;

            const maxX = window.innerWidth - element.offsetWidth;
            const maxY = window.innerHeight - element.offsetHeight;

            element.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
            element.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
            element.style.right = 'auto';

            e.preventDefault();
        });

        document.addEventListener('touchend', stopDrag);
    }

    function savePosition() {
        const rect = controls.getBoundingClientRect();
        const position = {
            x: rect.left,
            y: rect.top
        };
        localStorage.setItem('instagramAutoScrollPosition', JSON.stringify(position));
    }

    function loadPosition() {
        if (!controls) return;

        const saved = localStorage.getItem('instagramAutoScrollPosition');
        if (saved) {
            try {
                const position = JSON.parse(saved);
                const maxX = window.innerWidth - controls.offsetWidth;
                const maxY = window.innerHeight - controls.offsetHeight;

                controls.style.left = Math.max(0, Math.min(position.x, maxX)) + 'px';
                controls.style.top = Math.max(0, Math.min(position.y, maxY)) + 'px';
                controls.style.right = 'auto';
            } catch (e) {
                console.log('Could not load saved position');
            }
        }
    }


    // Add these variables at the top with your other declarations
    let scrollTimeout = null;
    let isScrolling = false;
    const SCROLL_ANIMATION_TIME = 300; // Approximate time for smooth scroll in ms

    function toggleAutoScroll() {
        autoScrollEnabled = !autoScrollEnabled;
        const button = document.getElementById('toggleScroll');

        if (autoScrollEnabled) {
            button.textContent = 'Stop';
            button.style.background = '#ed4956';
            startAutoScroll();
        } else {
            button.textContent = 'Start';
            button.style.background = '#0095f6';
            stopAutoScroll();
        }
    }

    function updateSpeed() {
        const slider = document.getElementById('speedSlider');
        const value = document.getElementById('speedValue');

        // Get the value and ensure it's properly formatted
        let speedVal = parseFloat(slider.value);

        // Round to nearest 0.5 to avoid floating point issues
        speedVal = Math.round(speedVal * 2) / 2;

        scrollSpeed = speedVal * 1000; // Convert to milliseconds

        // Format display
        value.textContent = speedVal.toFixed(1) + 's';

        // Update slider to match the rounded value
        slider.value = speedVal;

        // Restart scroll with new speed if active
        if (autoScrollEnabled) {
            stopAutoScroll();
            startAutoScroll();
        }
    }

    function startAutoScroll() {
        function performScroll() {
            if (!autoScrollEnabled) return;

            isScrolling = true;

            // Get the main feed container
            const main = document.querySelector('main') ||
                  document.querySelector('[role="main"]') ||
                  document.querySelector('section main');

            if (main) {
                // Scroll to the next set of posts
                const scrollAmount = window.innerHeight * 0.8;
                window.scrollBy({
                    top: scrollAmount,
                    behavior: 'smooth'
                });
            }

            // Schedule next scroll after scrollSpeed, accounting for animation time
            scrollTimeout = setTimeout(() => {
                isScrolling = false;
                if (autoScrollEnabled) {
                    performScroll();
                }
            }, Math.max(scrollSpeed, SCROLL_ANIMATION_TIME));
        }

        // Start the first scroll
        performScroll();
    }

    function stopAutoScroll() {
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
            scrollTimeout = null;
        }
        isScrolling = false;
    }

    function init() {
        // Wait for page to load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', createControls);
        } else {
            createControls();
        }

        // Load saved position after a short delay to ensure controls are rendered
        setTimeout(loadPosition, 100);

        // Stop auto-scroll when user manually scrolls
        // Track manual scrolling more accurately
        let manualScrollTimer;
        window.addEventListener('scroll', () => {
            if (autoScrollEnabled && !isScrolling) {
                // User manually scrolled
                clearTimeout(manualScrollTimer);
                manualScrollTimer = setTimeout(() => {
                    // User stopped manual scrolling
                    if (autoScrollEnabled) {
                        stopAutoScroll();
                        startAutoScroll();
                    }
                }, 500);
            }
        });

        // Stop auto-scroll when page is hidden
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && autoScrollEnabled) {
                stopAutoScroll();
            }
        });

        // Save position when window is resized
        window.addEventListener('resize', () => {
            if (controls) {
                loadPosition(); // Recalculate position within new viewport
            }
        });
    }

    // Initialize when page loads
    init();
})();