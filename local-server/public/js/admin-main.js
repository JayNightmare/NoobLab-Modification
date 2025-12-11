/**
 * Admin Dashboard Main Module
 * Handles initialization and coordinates between modules
 */

(function () {
    "use strict";

    /**
     * Initialize the admin dashboard
     */
    function init() {
        console.log("Initializing Admin Dashboard...");

        // Wait for DOM to be fully loaded
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", initializeApp);
        } else {
            initializeApp();
        }
    }

    /**
     * Main initialization function called when DOM is ready
     */
    async function initializeApp() {
        // Initialize showdown converter (wait for it to load)
        await EditorSetup.initializeConverter();

        // Setup UI event handlers
        UIUtils.setupModalHandlers();

        // Setup file upload functionality
        EditorSetup.setupFileUpload();

        // Load initial data for the active view (users by default)
        UserManager.loadUsers();

        // Setup navigation event listeners
        setupNavigationHandlers();

        // Setup global keyboard shortcuts
        setupKeyboardShortcuts();

        console.log("Admin Dashboard initialized successfully");
    }

    /**
     * Setup navigation handlers for sidebar
     */
    function setupNavigationHandlers() {
        const navItems = document.querySelectorAll(".nav-item");

        navItems.forEach((item, index) => {
            // First item: Users & Cohorts
            if (index === 0) {
                item.addEventListener("click", () =>
                    UIUtils.switchView("users")
                );
            }
            // Second item: Lessons & Tests
            else if (index === 1) {
                item.addEventListener("click", () =>
                    UIUtils.switchView("lessons")
                );
            }
            // Third item: Preview as Test User
            else if (index === 2) {
                item.addEventListener("click", UIUtils.previewAsTestUser);
            }
            // Last item: Logout
            else if (item.textContent.toLowerCase().includes("logout")) {
                item.addEventListener("click", UIUtils.logout);
            }
        });
    }

    /**
     * Setup keyboard shortcuts
     */
    function setupKeyboardShortcuts() {
        document.addEventListener("keydown", (event) => {
            // Ctrl/Cmd + S to save (prevent default browser save)
            if ((event.ctrlKey || event.metaKey) && event.key === "s") {
                event.preventDefault();

                // Determine which save function to call based on active view
                const activeView = document.querySelector(
                    ".view-section.active"
                );
                if (activeView) {
                    if (activeView.id === "users-view") {
                        UserManager.saveUser();
                    } else if (activeView.id === "lessons-view") {
                        const exerciseEditor =
                            document.getElementById("exercise-editor");
                        if (
                            exerciseEditor &&
                            exerciseEditor.style.display !== "none"
                        ) {
                            LessonManager.saveExercise();
                        }
                    }
                }
            }

            // Escape to close modals and preview
            if (event.key === "Escape") {
                // Close preview if active
                const previewMode = document.getElementById("preview-mode");
                if (previewMode && previewMode.classList.contains("active")) {
                    LessonManager.closePreview();
                    return;
                }

                // Close any open modals
                UIUtils.closeAlertModal();
                LessonManager.closeDeleteModal();
            }

            // Ctrl/Cmd + P to preview (when in lesson editor)
            if ((event.ctrlKey || event.metaKey) && event.key === "p") {
                const activeView = document.querySelector(
                    ".view-section.active"
                );
                if (activeView && activeView.id === "lessons-view") {
                    event.preventDefault();
                    const exerciseEditor =
                        document.getElementById("exercise-editor");
                    if (
                        exerciseEditor &&
                        exerciseEditor.style.display !== "none"
                    ) {
                        LessonManager.previewExercise();
                    }
                }
            }

            // Shift + Alt + F to format code (when in lesson editor)
            if (event.shiftKey && event.altKey && event.key === "F") {
                const activeView = document.querySelector(
                    ".view-section.active"
                );
                if (activeView && activeView.id === "lessons-view") {
                    event.preventDefault();
                    const exerciseEditor =
                        document.getElementById("exercise-editor");
                    if (
                        exerciseEditor &&
                        exerciseEditor.style.display !== "none"
                    ) {
                        EditorSetup.formatCurrentEditor();
                    }
                }
            }
        });
    }

    /**
     * Expose global functions that HTML onclick handlers reference
     */
    function exposeGlobalHandlers() {
        // Navigation
        window.switchView = UIUtils.switchView;
        window.logout = UIUtils.logout;
        window.previewAsTestUser = UIUtils.previewAsTestUser;

        // User Management
        window.saveUser = UserManager.saveUser;
        window.editUser = UserManager.editUser;

        // Lesson Management
        window.loadExercises = LessonManager.loadExercises;
        window.loadExerciseDetails = LessonManager.loadExerciseDetails;
        window.saveExercise = LessonManager.saveExercise;
        window.submitAddExercise = LessonManager.submitAddExercise;
        window.deleteExercise = LessonManager.deleteExercise;
        window.confirmDeleteExercise = LessonManager.confirmDeleteExercise;
        window.closeDeleteModal = LessonManager.closeDeleteModal;
        window.previewExercise = LessonManager.previewExercise;
        window.closePreview = LessonManager.closePreview;
        window.editFromPreview = LessonManager.editFromPreview;

        // Editor
        window.handleTestFileUpload = EditorSetup.handleTestFileUpload;

        // UI Utils
        window.closeAlertModal = UIUtils.closeAlertModal;
        window.closeAddModal = function () {
            UIUtils.hideModal("add-exercise-modal");
        };
    }

    // Expose global handlers immediately
    exposeGlobalHandlers();

    // Initialize the application
    init();
})();
