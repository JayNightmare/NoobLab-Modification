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
