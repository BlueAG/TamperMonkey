// ==UserScript==
// @name         Instagram Auto Scroll (Movable)
// @icon         https://www.instagram.com/favicon.ico
// @namespace    https://github.com/BlueAG/TamperMonkey
// @version      1.3
// @description  Auto-scroll through Instagram feed with movable controls
// @author       BlueAG
// @match        https://www.instagram.com/*
// @match        https://instagram.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let autoScrollEnabled = false;
    let scrollSpeed = 2000; // milliseconds between scrolls
    let scrollInterval;
    let controls;
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };

    function createControls() {
        controls = document.createElement('div');
        controls.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px;
            border-radius: 10px;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: 14px;
            min-width: 200px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            cursor: move;
            user-select: none;
        `;

        controls.innerHTML = `
            <div style="margin-bottom: 10px; font-weight: 600; cursor: move; display: flex; justify-content: space-between; align-items: center;">
                <span>Auto Scroll Controls</span>
                <span style="font-size: 12px; opacity: 0.7;">↕️ drag</span>
            </div>
            <button id="toggleScroll" style="background: #0095f6; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; margin-right: 5px; width: 100%; margin-bottom: 8px;">Start Auto Scroll</button>
            <div style="margin-bottom: 8px;">
                <label style="display: block; margin-bottom: 4px; font-size: 12px;">Speed (seconds):</label>
                <input type="range" id="speedSlider" min="1" max="10" value="2" style="width: 100%;">
                <span id="speedValue" style="font-size: 12px;">2s</span>
            </div>
            <div style="font-size: 11px; opacity: 0.7; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 8px;">
                Drag the title bar to move • Scrolls automatically through your feed
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

    function toggleAutoScroll() {
        autoScrollEnabled = !autoScrollEnabled;
        const button = document.getElementById('toggleScroll');

        if (autoScrollEnabled) {
            button.textContent = 'Stop Auto Scroll';
            button.style.background = '#ed4956';
            startAutoScroll();
        } else {
            button.textContent = 'Start Auto Scroll';
            button.style.background = '#0095f6';
            stopAutoScroll();
        }
    }

    function updateSpeed() {
        const slider = document.getElementById('speedSlider');
        const value = document.getElementById('speedValue');
        scrollSpeed = slider.value * 1000; // Convert to milliseconds
        value.textContent = slider.value + 's';

        // Restart scroll with new speed if active
        if (autoScrollEnabled) {
            stopAutoScroll();
            startAutoScroll();
        }
    }

    function startAutoScroll() {
        scrollInterval = setInterval(() => {
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
        }, scrollSpeed);
    }

    function stopAutoScroll() {
        if (scrollInterval) {
            clearInterval(scrollInterval);
            scrollInterval = null;
        }
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
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            if (autoScrollEnabled) {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    if (autoScrollEnabled) {
                        // Restart auto-scroll after user stops manual scrolling
                        stopAutoScroll();
                        startAutoScroll();
                    }
                }, 1000);
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