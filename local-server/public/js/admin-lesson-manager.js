/**
 * Lesson Management Module
 * Handles all lesson and exercise-related operations
 */

const LessonManager = (function () {
    "use strict";

    const { ipcRenderer } = require("electron");

    // Module state
    let currentModules = [];
    let exerciseToDelete = null;
    let sections = []; // Array to store lesson sections
    let sectionCounter = 0; // Counter for unique section IDs

    /**
     * Load all modules from the backend
     */
    function loadModules() {
        return ipcRenderer.invoke("admin-get-modules").then((modules) => {
            currentModules = modules;

            // Update both module select dropdowns
            const selects = [
                document.getElementById("module-select"),
                document.getElementById("new-module-select"),
            ];

            selects.forEach((select) => {
                if (select) {
                    select.innerHTML =
                        '<option value="">Select Module...</option>';
                    modules.forEach((module) => {
                        const option = document.createElement("option");
                        option.value = module.id;
                        option.textContent = module.title;
                        select.appendChild(option);
                    });
                }
            });

            return modules;
        });
    }

    /**
     * Load exercises for the selected module
     */
    function loadExercises() {
        const moduleId = document.getElementById("module-select").value;
        const module = currentModules.find((m) => m.id === moduleId);
        const select = document.getElementById("exercise-select");

        select.innerHTML = '<option value="">Select Exercise...</option>';

        if (module && module.exercises) {
            module.exercises.forEach((exercise) => {
                const option = document.createElement("option");
                option.value = exercise.exerciseId;
                option.textContent = exercise.title;
                select.appendChild(option);
            });
        }
    }

    /**
     * Load details for the selected exercise
     */
    function loadExerciseDetails() {
        const moduleId = document.getElementById("module-select").value;
        const exerciseId = document.getElementById("exercise-select").value;

        if (!exerciseId) {
            document.getElementById("exercise-editor").style.display = "none";
            return;
        }

        ipcRenderer
            .invoke("admin-get-exercise-details", { moduleId, exerciseId })
            .then((details) => {
                document.getElementById("exercise-editor").style.display =
                    "block";
                document.getElementById("ex-title").value = details.title || "";
                document.getElementById("ex-description").value =
                    details.description || "";
                document.getElementById("ex-medal").value =
                    details.medal || "Bronze";

                // Load sections
                if (details.sections && Array.isArray(details.sections)) {
                    loadSections(details.sections);
                } else if (details.introMarkdown || details.introHtml) {
                    // Legacy: Convert old intro to a section
                    loadSections([
                        {
                            id: "section-1",
                            title: "Introduction",
                            content:
                                details.introMarkdown ||
                                details.introHtml ||
                                "",
                            collapsed: false,
                        },
                    ]);
                } else {
                    loadSections([]);
                }

                // Set test code content
                if (EditorSetup.getTestCodeEditor()) {
                    EditorSetup.getTestCodeEditor().setValue(
                        details.testCode || ""
                    );
                } else {
                    document.getElementById("ex-test-code").value =
                        details.testCode || "";
                }
            });
    }

    /**
     * Save the current exercise
     */
    async function saveExercise() {
        const moduleId = document.getElementById("module-select").value;
        const exerciseId = document.getElementById("exercise-select").value;
        const title = document.getElementById("ex-title").value.trim();
        const description = document
            .getElementById("ex-description")
            .value.trim();
        const medal = document.getElementById("ex-medal").value;

        // Validation
        if (!moduleId || !exerciseId) {
            UIUtils.showAlert(
                "Please select a module and exercise",
                "Validation Error"
            );
            return;
        }

        if (!title) {
            UIUtils.showAlert("Exercise title is required", "Validation Error");
            return;
        }

        // Initialize converter if needed
        await EditorSetup.initializeConverter();

        // Get sections data
        const sectionsData = getSections();

        // Get test code
        const testCodeEditor = EditorSetup.getTestCodeEditor();
        const testCode = testCodeEditor
            ? testCodeEditor.getValue()
            : document.getElementById("ex-test-code").value;

        // Save to backend
        ipcRenderer
            .invoke("admin-save-exercise", {
                moduleId,
                exerciseId,
                title,
                description,
                medal,
                sections: sectionsData,
                testCode,
            })
            .then((response) => {
                if (response.success) {
                    UIUtils.showAlert(
                        "Exercise saved successfully!",
                        "Success"
                    );
                } else {
                    UIUtils.showAlert("Error: " + response.error, "Error");
                }
            })
            .catch((error) => {
                UIUtils.showAlert(
                    "Error saving exercise: " + error.message,
                    "Error"
                );
            });
    }

    /**
     * Create a new exercise
     */
    function submitAddExercise() {
        const moduleId = document.getElementById("new-module-select").value;
        const title = document.getElementById("new-ex-title").value.trim();
        const medal = document.getElementById("new-ex-medal").value;
        const language = document.getElementById("new-ex-language").value;

        // Validation
        if (!moduleId) {
            UIUtils.showAlert(
                "Please select a module first",
                "Validation Error"
            );
            return;
        }

        if (!title) {
            UIUtils.showAlert("Exercise title is required", "Validation Error");
            return;
        }

        ipcRenderer
            .invoke("admin-add-exercise", { moduleId, title, medal, language })
            .then((response) => {
                if (response.success) {
                    UIUtils.showAlert(
                        "Exercise created successfully!",
                        "Success"
                    );
                    // Clear form
                    document.getElementById("new-ex-title").value = "";
                    document.getElementById("new-module-select").value = "";
                    // Reload modules and exercises
                    loadModules();
                    loadExercises();
                } else {
                    UIUtils.showAlert("Error: " + response.error, "Error");
                }
            })
            .catch((error) => {
                UIUtils.showAlert(
                    "Error creating exercise: " + error.message,
                    "Error"
                );
            });
    }

    /**
     * Show delete confirmation modal
     */
    function deleteExercise() {
        const moduleId = document.getElementById("module-select").value;
        const exerciseId = document.getElementById("exercise-select").value;

        if (!moduleId || !exerciseId) {
            UIUtils.showAlert(
                "Please select an exercise to delete",
                "Validation Error"
            );
            return;
        }

        exerciseToDelete = { moduleId, exerciseId };
        document.getElementById("delete-exercise-modal").style.display = "flex";
    }

    /**
     * Close delete confirmation modal
     */
    function closeDeleteModal() {
        document.getElementById("delete-exercise-modal").style.display = "none";
        exerciseToDelete = null;
    }

    /**
     * Confirm and execute exercise deletion
     */
    function confirmDeleteExercise() {
        if (!exerciseToDelete) return;

        const { moduleId, exerciseId } = exerciseToDelete;

        ipcRenderer
            .invoke("admin-delete-exercise", { moduleId, exerciseId })
            .then((response) => {
                if (response.success) {
                    UIUtils.showAlert(
                        "Exercise deleted successfully!",
                        "Success"
                    );
                    document.getElementById("exercise-editor").style.display =
                        "none";
                    closeDeleteModal();
                    loadExercises();
                } else {
                    UIUtils.showAlert("Error: " + response.error, "Error");
                }
            })
            .catch((error) => {
                UIUtils.showAlert(
                    "Error deleting exercise: " + error.message,
                    "Error"
                );
            });
    }

    /**
     * Preview the current exercise
     */
    async function previewExercise() {
        const title =
            document.getElementById("ex-title").value || "Untitled Exercise";

        // Initialize converter if needed
        await EditorSetup.initializeConverter();
        const converter = EditorSetup.getConverter();

        // Get all sections and convert to HTML
        const sectionsData = getSections();
        let sectionsHtml = "";

        if (sectionsData.length > 0) {
            sectionsHtml = sectionsData
                .map((section) => {
                    const contentHtml = converter
                        ? converter.makeHtml(section.content)
                        : section.content;
                    return `
                    <div class="section" style="margin-bottom: 30px;">
                        <h2>${section.title}</h2>
                        ${contentHtml}
                    </div>
                `;
                })
                .join("");
        } else {
            sectionsHtml = "<p><em>No sections added yet.</em></p>";
        }

        // Render preview
        const previewContent = document.getElementById("preview-content");
        previewContent.innerHTML = `
            <h1>${title}</h1>
            ${sectionsHtml}
        `;

        document.getElementById("preview-mode").classList.add("active");
    }

    /**
     * Close preview mode
     */
    function closePreview() {
        document.getElementById("preview-mode").classList.remove("active");
    }

    /**
     * Edit from preview mode (closes preview and scrolls to editor)
     */
    function editFromPreview() {
        closePreview();
        document.getElementById("exercise-editor").scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    }

    /**
     * Get current modules
     */
    function getCurrentModules() {
        return currentModules;
    }

    /**
     * Add a new section
     */
    function addSection() {
        const sectionId = `section-${++sectionCounter}`;
        const section = {
            id: sectionId,
            title: `Section ${sections.length + 1}`,
            content: "",
            collapsed: false,
        };
        sections.push(section);
        renderSections();

        // Focus on the new section's title input
        setTimeout(() => {
            const titleInput = document.getElementById(`${sectionId}-title`);
            if (titleInput) {
                titleInput.focus();
                titleInput.select();
            }
        }, 100);
    }

    /**
     * Delete a section
     */
    async function deleteSection(sectionId) {
        const confirmed = await UIUtils.showConfirm(
            "Are you sure you want to delete this section?",
            "Delete Section"
        );

        if (confirmed) {
            sections = sections.filter((s) => s.id !== sectionId);
            renderSections();
        }
    }

    /**
     * Toggle section collapse
     */
    function toggleSection(sectionId) {
        const section = sections.find((s) => s.id === sectionId);
        if (section) {
            section.collapsed = !section.collapsed;
            const sectionElement = document.getElementById(sectionId);
            if (sectionElement) {
                sectionElement.classList.toggle("collapsed");
            }
        }
    }

    /**
     * Update section title
     */
    function updateSectionTitle(sectionId, title) {
        const section = sections.find((s) => s.id === sectionId);
        if (section) {
            section.title = title;
        }
    }

    /**
     * Update section content
     */
    function updateSectionContent(sectionId, content) {
        const section = sections.find((s) => s.id === sectionId);
        if (section) {
            section.content = content;
            updateSectionPreview(sectionId);
        }
    }

    /**
     * Update section preview
     */
    function updateSectionPreview(sectionId) {
        const section = sections.find((s) => s.id === sectionId);
        if (!section) return;

        const converter = EditorSetup.getConverter();
        if (!converter) return;

        const html = converter.makeHtml(section.content);
        const previewElement = document.getElementById(`${sectionId}-preview`);
        if (previewElement) {
            previewElement.innerHTML = html;
        }
    }

    /**
     * Render all sections in the container
     */
    function renderSections() {
        const container = document.getElementById("sections-container");
        if (!container) return;

        container.innerHTML = "";

        sections.forEach((section, index) => {
            const sectionHtml = `
                <div class="section-item ${
                    section.collapsed ? "collapsed" : ""
                }" id="${section.id}">
                    <div class="section-header" onclick="LessonManager.toggleSection('${
                        section.id
                    }')">
                        <h4>
                            <span class="section-collapse-icon">▼</span>
                            ${section.title}
                        </h4>
                        <div class="section-header-controls" onclick="event.stopPropagation()">
                            <button
                                type="button"
                                class="btn btn-danger"
                                onclick="LessonManager.deleteSection('${
                                    section.id
                                }')"
                                title="Delete Section"
                                style="padding: 5px 10px; font-size: 12px;"
                            >
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                    <div class="section-content">
                        <input
                            type="text"
                            class="section-title-input"
                            id="${section.id}-title"
                            value="${section.title}"
                            placeholder="Section Title"
                            onchange="LessonManager.updateSectionTitle('${
                                section.id
                            }', this.value)"
                        />
                        <div class="section-editor-container">
                            <div class="section-editor-column">
                                <div class="editor-header">
                                    <h4 style="margin: 0; font-size: 14px;">Markdown</h4>
                                    <button
                                        type="button"
                                        class="btn btn-secondary"
                                        onclick="LessonManager.formatSectionContent('${
                                            section.id
                                        }')"
                                        style="padding: 3px 8px; font-size: 11px;"
                                        title="Format Markdown"
                                    >
                                        🎨
                                    </button>
                                </div>
                                <textarea
                                    id="${section.id}-content"
                                    class="section-content-editor"
                                    style="width: 100%; min-height: 200px; background: #2d2d2d; color: #e0e0e0; border: 1px solid #444; border-radius: 3px; padding: 10px; font-family: 'Courier New', monospace;"
                                    oninput="LessonManager.updateSectionContent('${
                                        section.id
                                    }', this.value)"
                                >${section.content}</textarea>
                            </div>
                            <div class="section-editor-column">
                                <h4 style="margin: 0 0 5px 0; font-size: 14px;">Preview</h4>
                                <div class="section-preview" id="${
                                    section.id
                                }-preview"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            container.insertAdjacentHTML("beforeend", sectionHtml);

            // Initialize preview for this section
            updateSectionPreview(section.id);
        });
    }

    /**
     * Format section markdown content
     */
    function formatSectionContent(sectionId) {
        const textarea = document.getElementById(`${sectionId}-content`);
        if (!textarea) return;

        const content = textarea.value.trim();
        if (!content) return;

        // Basic markdown formatting (same as EditorSetup.formatMarkdown)
        let formatted = content
            .replace(/^(#{1,6})([^\s#])/gm, "$1 $2")
            .replace(/([^\n])\n(#{1,6} )/g, "$1\n\n$2")
            .replace(/^([*-])([^\s])/gm, "$1 $2")
            .replace(/[ \t]+$/gm, "")
            .replace(/\n{3,}/g, "\n\n")
            .replace(/\n*$/, "\n");

        textarea.value = formatted;
        updateSectionContent(sectionId, formatted);
    }

    /**
     * Load sections from exercise details
     */
    function loadSections(sectionsData) {
        sections = sectionsData || [];
        sectionCounter = sections.length;

        // Ensure each section has an ID
        sections.forEach((section, index) => {
            if (!section.id) {
                section.id = `section-${++sectionCounter}`;
            }
            if (section.collapsed === undefined) {
                section.collapsed = false;
            }
        });

        renderSections();
    }

    /**
     * Get all sections data
     */
    function getSections() {
        return sections;
    }

    // Public API
    return {
        loadModules,
        loadExercises,
        loadExerciseDetails,
        saveExercise,
        submitAddExercise,
        deleteExercise,
        closeDeleteModal,
        confirmDeleteExercise,
        previewExercise,
        closePreview,
        editFromPreview,
        getCurrentModules,
        addSection,
        deleteSection,
        toggleSection,
        updateSectionTitle,
        updateSectionContent,
        formatSectionContent,
        loadSections,
        getSections,
    };
})();

// Make LessonManager globally available
window.LessonManager = LessonManager;
