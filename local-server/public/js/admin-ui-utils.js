/**
 * UI Utilities Module
 * Handles modals, alerts, and general UI interactions
 */

const UIUtils = (function () {
    "use strict";

    /**
     * Show an alert modal with a message
     * @param {string} message - The message to display
     * @param {string} title - The title of the alert (default: 'Alert')
     */
    function showAlert(message, title = "Alert") {
        const alertModal = document.getElementById("alert-modal");
        const alertTitle = document.getElementById("alert-title");
        const alertMessage = document.getElementById("alert-message");

        if (alertModal && alertTitle && alertMessage) {
            alertTitle.textContent = title;
            alertMessage.textContent = message;
            alertModal.style.display = "flex";
        } else {
            // Fallback to browser alert if modal not found
            alert(`${title}: ${message}`);
        }
    }

    /**
     * Close the alert modal
     */
    function closeAlertModal() {
        const alertModal = document.getElementById("alert-modal");
        if (alertModal) {
            alertModal.style.display = "none";
        }
    }

    /**
     * Show a modal by ID
     * @param {string} modalId - The ID of the modal to show
     */
    function showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = "flex";
        }
    }

    /**
     * Hide a modal by ID
     * @param {string} modalId - The ID of the modal to hide
     */
    function hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = "none";
        }
    }

    /**
     * Switch between different views in the dashboard
     * @param {string} viewName - The name of the view to switch to ('users' or 'lessons')
     */
    function switchView(viewName) {
        // Hide all view sections
        document.querySelectorAll(".view-section").forEach((section) => {
            section.classList.remove("active");
        });

        // Remove active class from all nav items
        document.querySelectorAll(".nav-item").forEach((item) => {
            item.classList.remove("active");
        });

        // Show the selected view
        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.classList.add("active");
        }

        // Add active class to the clicked nav item
        const navItems = document.querySelectorAll(".nav-item");
        navItems.forEach((item) => {
            if (item.textContent.toLowerCase().includes(viewName)) {
                item.classList.add("active");
            }
        });

        // Load data based on view
        if (viewName === "users") {
            UserManager.loadUsers();
        } else if (viewName === "lessons") {
            LessonManager.loadModules();
            // Initialize converter first, then editors after a short delay to ensure DOM is ready
            EditorSetup.initializeConverter().then(() => {
                setTimeout(() => {
                    EditorSetup.initializeEditors();
                    EditorSetup.refreshEditors();
                }, 100);
            });
        }
    }

    /**
     * Show confirmation dialog using a modal
     * @param {string} message - The confirmation message
     * @param {string} title - The dialog title
     * @returns {Promise<boolean>} Promise that resolves to true if confirmed, false if cancelled
     */
    function showConfirm(message, title) {
        return new Promise((resolve) => {
            const modal = document.getElementById("confirm-modal");
            const modalTitle = document.getElementById("confirm-title");
            const modalMessage = document.getElementById("confirm-message");
            const confirmBtn = document.getElementById("confirm-yes-btn");
            const cancelBtn = document.getElementById("confirm-no-btn");

            if (
                modal &&
                modalTitle &&
                modalMessage &&
                confirmBtn &&
                cancelBtn
            ) {
                modalTitle.textContent = title ? title : "Confirm";
                modalMessage.textContent = message;
                modal.style.display = "flex";

                // Clean up previous event listeners
                const newConfirmBtn = confirmBtn.cloneNode(true);
                const newCancelBtn = cancelBtn.cloneNode(true);
                confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
                cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

                newConfirmBtn.onclick = () => {
                    modal.style.display = "none";
                    resolve(true);
                };

                newCancelBtn.onclick = () => {
                    modal.style.display = "none";
                    resolve(false);
                };
            } else {
                // Fallback to browser confirm if modal not found
                const result = confirm(`${title}: ${message}`);
                resolve(result);
            }
        });
    }

    /*
     * Close confirm modal
     */
    function closeConfirmModal() {
        const modal = document.getElementById("confirm-modal");
        if (modal) {
            modal.style.display = "none";
        }
    }

    /**
     * Handle logout action
     */
    function logout() {
        // Optionally show confirmation
        if (confirm("Are you sure you want to logout?")) {
            window.location.href = "admin-login.html";
        }
    }

    /**
     * Handle preview as test user
     */
    function previewAsTestUser() {
        const { ipcRenderer } = require("electron");
        ipcRenderer.send("admin-preview-test-user");
    }

    /**
     * Setup click handlers for modal close buttons
     */
    function setupModalHandlers() {
        // Close modal when clicking outside content
        document.querySelectorAll(".modal").forEach((modal) => {
            modal.addEventListener("click", (event) => {
                if (event.target === modal) {
                    modal.style.display = "none";
                }
            });
        });
    }

    /**
     * Show loading indicator
     * @param {string} message - Loading message (optional)
     */
    function showLoading(message = "Loading...") {
        // Create a simple loading overlay if it doesn't exist
        let loadingOverlay = document.getElementById("loading-overlay");

        if (!loadingOverlay) {
            loadingOverlay = document.createElement("div");
            loadingOverlay.id = "loading-overlay";
            loadingOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
            `;

            const loadingContent = document.createElement("div");
            loadingContent.style.cssText = `
                background: #1e1e1e;
                padding: 30px;
                border-radius: 8px;
                text-align: center;
                color: #e0e0e0;
            `;
            loadingContent.innerHTML = `
                <div class="spinner" style="
                    border: 4px solid #333;
                    border-top: 4px solid #007acc;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 15px;
                "></div>
                <p id="loading-message">${message}</p>
            `;

            loadingOverlay.appendChild(loadingContent);
            document.body.appendChild(loadingOverlay);

            // Add spinner animation
            const style = document.createElement("style");
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        } else {
            loadingOverlay.querySelector("#loading-message").textContent =
                message;
            loadingOverlay.style.display = "flex";
        }
    }

    /**
     * Hide loading indicator
     */
    function hideLoading() {
        const loadingOverlay = document.getElementById("loading-overlay");
        if (loadingOverlay) {
            loadingOverlay.style.display = "none";
        }
    }

    // Public API
    return {
        showAlert,
        closeAlertModal,
        showModal,
        hideModal,
        switchView,
        showConfirm,
        closeConfirmModal,
        logout,
        previewAsTestUser,
        setupModalHandlers,
        showLoading,
        hideLoading,
    };
})();

// Make UIUtils globally available
window.UIUtils = UIUtils;
