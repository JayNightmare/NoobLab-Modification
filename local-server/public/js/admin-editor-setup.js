/**
 * Editor Setup Module
 * Handles CodeMirror editor initialization and markdown conversion
 */

const EditorSetup = (function () {
    "use strict";

    // Editor instances
    let markdownEditor = null;
    let testCodeEditor = null;
    let converter = null;

    /**
     * Initialize CodeMirror editors for markdown and test code
     */
    function initializeEditors() {
        // Initialize markdown editor for intro section
        const markdownTextarea = document.getElementById("ex-intro-markdown");
        if (markdownTextarea && !markdownEditor) {
            markdownEditor = CodeMirror.fromTextArea(markdownTextarea, {
                mode: "markdown",
                lineNumbers: true,
                lineWrapping: true,
                theme: "material-darker",
                indentUnit: 4,
                tabSize: 4,
                indentWithTabs: true,
                extraKeys: { "Ctrl-Space": "autocomplete" },
            });

            // Update preview on change
            markdownEditor.on("change", updateMarkdownPreview);
        }

        // Initialize Java code editor for test conditions
        const testCodeTextarea = document.getElementById("ex-test-code");
        if (testCodeTextarea && !testCodeEditor) {
            // Determine language based on selected module (default to Java)
            const moduleSelect = document.getElementById("module-select");
            const selectedModule =
                moduleSelect?.options[moduleSelect.selectedIndex];
            const isJava =
                !selectedModule || selectedModule.text.includes("Java");

            testCodeEditor = CodeMirror.fromTextArea(testCodeTextarea, {
                mode: isJava ? "text/x-java" : "text/x-python",
                lineNumbers: true,
                lineWrapping: true,
                theme: "material-darker",
                indentUnit: 4,
                tabSize: 4,
                indentWithTabs: true,
                extraKeys: { "Ctrl-Space": "autocomplete" },
            });
        }
    }

    /**
     * Basic markdown to HTML converter
     */
    function basicMarkdownToHtml(markdown) {
        if (!markdown) return "";
        return markdown
            .replace(/^### (.*$)/gim, "<h3>$1</h3>")
            .replace(/^## (.*$)/gim, "<h2>$1</h2>")
            .replace(/^# (.*$)/gim, "<h1>$1</h1>")
            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
            .replace(/\*(.+?)\*/g, "<em>$1</em>")
            .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
            .replace(/`(.+?)`/g, "<code>$1</code>")
            .replace(/\n\n/g, "</p><p>")
            .replace(/\n/g, "<br>")
            .replace(/^(?!<[h|p|pre])(.+)$/gim, "<p>$1</p>");
    }

    /**
     * Initialize markdown converter (using basic converter)
     * @returns {Promise<void>}
     */
    function initializeConverter() {
        return new Promise((resolve) => {
            if (!converter) {
                // Create a converter object with makeHtml method
                converter = {
                    makeHtml: function (markdown) {
                        return basicMarkdownToHtml(markdown);
                    },
                };
                console.log("Markdown converter initialized");
            }
            resolve();
        });
    }

    /**
     * Update the markdown preview panel
     */
    function updateMarkdownPreview() {
        if (!markdownEditor) return;

        // Initialize converter if not already initialized
        if (!converter) {
            converter = {
                makeHtml: function (markdown) {
                    return basicMarkdownToHtml(markdown);
                },
            };
        }

        const markdown = markdownEditor.getValue();
        const html = converter.makeHtml(markdown);

        const previewElement = document.getElementById("intro-preview");
        if (previewElement) {
            previewElement.innerHTML = html;
        }
    }

    /**
     * Handle file upload for test code
     */
    function handleTestFileUpload() {
        const fileInput = document.getElementById("test-file-input");
        const file = fileInput?.files[0];

        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;

            // Set content in editor or textarea
            if (testCodeEditor) {
                testCodeEditor.setValue(content);
            } else {
                document.getElementById("ex-test-code").value = content;
            }

            // Show file info
            const fileInfo = document.getElementById("file-info");
            if (fileInfo) {
                fileInfo.style.display = "block";
                fileInfo.innerHTML = `
                    <strong>📄 ${file.name}</strong><br>
                    <small>${(file.size / 1024).toFixed(2)} KB</small>
                `;
            }
        };

        reader.onerror = () => {
            UIUtils.showAlert("Error reading file", "File Upload Error");
        };

        reader.readAsText(file);
    }

    /**
     * Setup drag and drop for file upload
     */
    function setupFileUpload() {
        const fileUploadArea = document.getElementById("file-upload-area");
        const testFileInput = document.getElementById("test-file-input");

        if (!fileUploadArea || !testFileInput) return;

        // Dragover event
        fileUploadArea.addEventListener("dragover", (event) => {
            event.preventDefault();
            fileUploadArea.classList.add("dragover");
        });

        // Dragleave event
        fileUploadArea.addEventListener("dragleave", () => {
            fileUploadArea.classList.remove("dragover");
        });

        // Drop event
        fileUploadArea.addEventListener("drop", (event) => {
            event.preventDefault();
            fileUploadArea.classList.remove("dragover");

            const files = event.dataTransfer.files;
            if (files.length > 0) {
                testFileInput.files = files;
                handleTestFileUpload();
            }
        });

        // Click to upload
        fileUploadArea.addEventListener("click", () => {
            testFileInput.click();
        });

        // File input change
        testFileInput.addEventListener("change", handleTestFileUpload);
    }

    /**
     * Refresh editors after DOM changes or view switches
     */
    function refreshEditors() {
        if (markdownEditor) {
            markdownEditor.refresh();
        }
        if (testCodeEditor) {
            testCodeEditor.refresh();
        }
    }

    /**
     * Get markdown editor instance
     */
    function getMarkdownEditor() {
        return markdownEditor;
    }

    /**
     * Get test code editor instance
     */
    function getTestCodeEditor() {
        return testCodeEditor;
    }

    /**
     * Get converter instance
     */
    function getConverter() {
        return converter;
    }

    /**
     * Format markdown editor content
     */
    function formatMarkdown() {
        if (!markdownEditor) return;

        const content = markdownEditor.getValue();
        if (!content.trim()) return;

        // Basic markdown formatting
        let formatted = content
            // Normalize heading spacing
            .replace(/^(#{1,6})([^\s#])/gm, "$1 $2")
            // Ensure blank line before headings (except at start)
            .replace(/([^\n])\n(#{1,6} )/g, "$1\n\n$2")
            // Normalize list spacing
            .replace(/^([*-])([^\s])/gm, "$1 $2")
            // Remove trailing whitespace
            .replace(/[ \t]+$/gm, "")
            // Normalize multiple blank lines to max 2
            .replace(/\n{3,}/g, "\n\n")
            // Ensure file ends with single newline
            .replace(/\n*$/, "\n");

        markdownEditor.setValue(formatted);
        UIUtils.showAlert("Markdown formatted successfully", "Format Complete");
    }

    /**
     * Format Java/code editor content
     */
    function formatCode() {
        if (!testCodeEditor) return;

        const content = testCodeEditor.getValue();
        if (!content.trim()) return;

        try {
            // Check if js_beautify is available
            if (typeof js_beautify === "undefined") {
                UIUtils.showAlert(
                    "Code formatter not available",
                    "Format Error"
                );
                return;
            }

            // Beautify the code
            const formatted = js_beautify(content, {
                indent_size: 2,
                indent_char: "\t",
                indent_with_tabs: true,
                preserve_newlines: true,
                max_preserve_newlines: 2,
                jslint_happy: true,
                space_after_anon_function: false,
                brace_style: "collapse",
                keep_array_indentation: false,
                keep_function_indentation: false,
                space_before_conditional: true,
                break_chained_methods: false,
                eval_code: false,
                unescape_strings: false,
                wrap_line_length: 0,
            });

            testCodeEditor.setValue(formatted);
            UIUtils.showAlert("Code formatted successfully", "Format Complete");
        } catch (error) {
            console.error("Formatting error:", error);
            UIUtils.showAlert(
                "Failed to format code: " + error.message,
                "Format Error"
            );
        }
    }

    /**
     * Auto-format current editor based on active editor
     */
    function formatCurrentEditor() {
        // Check which editor is visible/active
        const exerciseEditor = document.getElementById("exercise-editor");
        if (!exerciseEditor || exerciseEditor.style.display === "none") {
            return;
        }

        // Get the active tab or focused editor
        const activeElement = document.activeElement;

        // Check if markdown editor is focused
        if (
            markdownEditor &&
            activeElement.closest(".CodeMirror") ===
                markdownEditor.getWrapperElement()
        ) {
            formatMarkdown();
        }
        // Check if test code editor is focused
        else if (
            testCodeEditor &&
            activeElement.closest(".CodeMirror") ===
                testCodeEditor.getWrapperElement()
        ) {
            formatCode();
        }
        // Default to formatting markdown if no specific editor is focused
        else if (markdownEditor) {
            formatMarkdown();
        }
    }

    // Public API
    return {
        initializeEditors,
        initializeConverter,
        updateMarkdownPreview,
        handleTestFileUpload,
        setupFileUpload,
        refreshEditors,
        getMarkdownEditor,
        getTestCodeEditor,
        getConverter,
        formatMarkdown,
        formatCode,
        formatCurrentEditor,
    };
})();

// Make EditorSetup globally available
window.EditorSetup = EditorSetup;
