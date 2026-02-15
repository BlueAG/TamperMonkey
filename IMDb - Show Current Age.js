// ==UserScript==
// @name           IMDb - Show Current Age
// @namespace      https://github.com/BlueAG/TamperMonkey
// @icon           https://www.google.com/s2/favicons?domain=imdb.com
// @version        1.0.1
// @description    Shows current age or "would be" age inside birth-and-death-section
// @author         BlueAG
// @match          https://www.imdb.com/name/nm*
// @grant          none
// @downloadURL    https://github.com/BlueAG/TamperMonkey/blob/main/IMDb%20-%20Show%20Current%20Age.js
// @updateURL      https://raw.githubusercontent.com/BlueAG/TamperMonkey/acc36b4c513361318255c851b49c8cc68240beb0/IMDb%20-%20Show%20Current%20Age.js
// ==/UserScript==

(function() {
    'use strict';

    window.addEventListener('load', function() {
        setTimeout(addAgeText, 1000);
    });

    function addAgeText() {
        // Prevent duplicate
        if (document.getElementById('imdb-age-text')) return;

        // Find birth date span
        const spans = document.querySelectorAll('span.sc-810ac903-2');
        let dateSpan = null;

        spans.forEach(span => {
            const text = span.textContent.trim();
            if (/^[A-Za-z]+ \d{1,2}, \d{4}$/.test(text)) {
                dateSpan = span;
            }
        });

        if (!dateSpan) {
            console.log("[IMDb Age] Birth date span not found");
            return;
        }

        // Calculate age
        const birthStr = dateSpan.textContent.trim();
        const birthDate = new Date(birthStr);
        if (isNaN(birthDate.getTime())) return;

        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        // Deceased detection
        let isDeceased = false;
        spans.forEach(span => {
            if (span.textContent.trim() === 'Died') {
                isDeceased = true;
            }
        });
        if (document.querySelector('[data-testid="birth-and-death-death-age"]')) {
            isDeceased = true;
        }

        // Create age text
        const ageText = document.createElement('span');
        ageText.id = 'imdb-age-text';
        ageText.style.cssText = `
            margin-left: 1px;
            font-size: 1.05em;
            font-weight: 500;
            color: ${isDeceased ? '#c62828' : '#2e7d32'};
        `;

        ageText.textContent = isDeceased
            ? `Current age would be: ${age} years`
            : `Current age: ${age} years`;

        // Find the parent <aside data-testid="birth-and-death-section">
        const sectionAside = dateSpan.closest('[data-testid="birth-and-death-section"]');

        if (sectionAside) {
            // Find the birthdate div
            const birthDiv = sectionAside.querySelector('[data-testid="birth-and-death-birthdate"]');

            if (birthDiv) {
                // Insert AFTER the birth div (so between birth and death)
                birthDiv.insertAdjacentElement('afterend', ageText);
                console.log("[IMDb Age] Age inserted AFTER birth div inside <aside>");
            } else {
                // Fallback: append to the aside
                sectionAside.appendChild(ageText);
                console.log("[IMDb Age] Age appended to <aside> (fallback)");
            }
        } else {
            // Ultimate fallback: just after date span
            dateSpan.insertAdjacentElement('afterend', ageText);
            console.log("[IMDb Age] Age inserted after date span (no aside found)");
        }
    }
})();
