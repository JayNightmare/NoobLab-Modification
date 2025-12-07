/**
 * Modern Layout Adapter for NoobLab
 * Overrides legacy layout functions when the modern Flexbox layout is active.
 */

(function () {
    // Check if we are in the modern layout
    var isModernLayout = document.querySelector(".ide-container") !== null;

    if (isModernLayout) {
        console.log(
            "Modern Layout detected. Overriding legacy layout functions."
        );

        // Override resizeSplit to do nothing (let Flexbox handle it)
        window.resizeSplit = function (width) {
            // Optional: Implement modern resizing logic here if needed
            // For now, we rely on CSS Flexbox
            // We might want to update the 'compressed' class on topnav if needed
            if (window.innerWidth < 480) {
                $("div#topnav").addClass("compressed");
            } else {
                $("div#topnav").removeClass("compressed");
            }
        };

        // Override resize to only handle non-layout tasks
        var originalResize = window.resize;
        window.resize = function () {
            // Call original resize if it does things other than layout (like resizing iframes)
            // But we want to prevent it from messing with #content and #editor-wrapper styles

            // We still need to resize fake docs (iframes)
            if (typeof resizeFakeDocs === "function") {
                resizeFakeDocs();
            }

            // We still need to resize Carols (visual programming elements)
            if (typeof resizeCarols === "function") {
                resizeCarols();
            }

            // Do NOT call resizeSplit or manually set CSS on #content/#editor-wrapper
        };

        // Override maxMinCode to toggle a class on the container instead of manual CSS
        window.maxMinCode = function (outputheight, force) {
            var container = document.querySelector(".ide-container");
            var editorArea = document.querySelector(".ide-editor-area");
            var outputArea = document.querySelector(".ide-output-area");

            // Toggle a 'maximized' class on the editor area
            // This requires CSS support for .ide-editor-area.maximized

            // For now, let's just toggle the output area visibility
            if (outputArea.style.display === "none") {
                outputArea.style.display = "flex";
                // Restore editor height/flex
                editorArea.style.flex = "1";
            } else {
                outputArea.style.display = "none";
                // Maximize editor
                editorArea.style.flex = "100";
            }

            // Trigger a resize event for CodeMirror/Monaco
            if (typeof editor !== "undefined" && editor.refresh)
                editor.refresh();
            if (typeof editor !== "undefined" && editor.layout) editor.layout();
        };

        // Override maxMinCodeWeb (alias)
        window.maxMinCodeWeb = window.maxMinCode;

        // Modern content prep: hide parameter metadata and collapse sections by default
        $(document).ready(function () {
            var lessonContent = document.querySelector(".lesson-content");
            if (!lessonContent) return;

            // Hide raw parameter blocks (language, courseNo, etc.)
            $(lessonContent).find(".parameter").hide();

            // Ensure only the first section shows by default
            var sections = Array.from(
                lessonContent.querySelectorAll(".section")
            );
            if (sections.length === 0) return;

            // Build a simple tab-like nav for sections
            var tabBar = document.createElement("div");
            tabBar.className = "section-tab-bar";

            // Lightweight styling to avoid CSS file edits
            var tabStyles = document.createElement("style");
            tabStyles.textContent =
                ".section-tab-bar{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;}" +
                ".section-tab-bar .section-tab{border:1px solid #d0d7de;background:#f6f8fa;padding:6px 10px;border-radius:6px;cursor:pointer;font-size:0.9rem;}" +
                ".section-tab-bar .section-tab.active{background:#0f62fe;border-color:#0f62fe;color:#fff;}";
            document.head.appendChild(tabStyles);

            var tabButtons = [];
            var activateSection = function (index) {
                sections.forEach(function (section, idx) {
                    if (idx === index) {
                        section.classList.add("selected");
                        section.style.display = "block";
                    } else {
                        section.classList.remove("selected");
                        section.style.display = "none";
                    }
                });

                tabButtons.forEach(function (btn, idx) {
                    if (idx === index) {
                        btn.classList.add("active");
                    } else {
                        btn.classList.remove("active");
                    }
                });

                // Preserve hash navigation support
                var targetHash = "#" + (index + 1);
                if (document.location.hash !== targetHash) {
                    history.replaceState(null, "", targetHash);
                }
            };

            sections.forEach(function (section, index) {
                // Use the first heading as the label, fall back to a generic title
                var heading = section.querySelector("h1, h2, h3, h4");
                var label = heading
                    ? heading.textContent.trim()
                    : "Section " + (index + 1);

                var btn = document.createElement("button");
                btn.type = "button";
                btn.className = "section-tab";
                btn.textContent = label || "Section " + (index + 1);
                btn.addEventListener("click", function () {
                    activateSection(index);
                });
                tabButtons.push(btn);
                tabBar.appendChild(btn);

                // Collapse all sections initially; activation happens after loop
                section.classList.remove("selected");
                section.style.display = "none";
            });

            // Inject the tab bar at the top of lesson content
            lessonContent.insertBefore(tabBar, lessonContent.firstChild);

            // Activate the first section (or hash-indexed section if present)
            var initialIndex = 0;
            if (document.location.hash && document.location.hash.length > 1) {
                var parsed = parseInt(
                    document.location.hash.replace("#", ""),
                    10
                );
                if (
                    !isNaN(parsed) &&
                    parsed >= 1 &&
                    parsed <= sections.length
                ) {
                    initialIndex = parsed - 1;
                }
            }
            activateSection(initialIndex);
        });

        // Fix for #content selector usage in legacy code
        // Many functions look for #content to scroll or find elements.
        // In modern layout, the content is in .ide-sidebar .lesson-content
        // We can't easily change all selectors, but we can try to proxy or ensure
        // the hidden #content doesn't break things.

        // Actually, the legacy code uses #content for the scrolling area.
        // Our .ide-sidebar is the scrolling area.
        // We might need to ensure that interactions with #content are redirected or handled.
        // Since we kept a hidden #content div, legacy code won't crash, but it might not scroll the right thing.

        // We can try to sync scroll? Or just accept that legacy scroll logic (like auto-scroll to section)
        // might need manual updates if it targets #content.

        // Let's try to make .ide-sidebar the "scroll target" for key functions if possible.
        // But since we can't easily intercept jQuery selectors, we'll leave it for now.
        // The user can scroll manually.
    }
})();
