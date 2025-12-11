/**
 * User Management Module - Provides an interface for managing user data in the admin dashboard.
 * This IIFE encapsulates all user-related operations and exposes them through a public API.
 */
const UserManager = (function () {
    "use strict";

    const { ipcRenderer } = require("electron");

    /**
     * Load all users from the backend and populate the table.
     * @returns {Promise<User[]>} A promise that resolves with an array of user objects.
     * @throws {Error} Fired if the IPC call to retrieve users fails.
     */
    function loadUsers() {
        return ipcRenderer.invoke("admin-get-users").then((users) => {
            const tbody = document.querySelector("#users-table tbody");
            tbody.innerHTML = "";
            users.forEach((user) => {
                const tr = document.createElement("tr");
                tr.innerHTML = `  
          <td>${user.username}</td>  
          <td>${user.cohort}</td>  
          <td>  
            <button class="btn btn-primary" onclick="UserManager.editUser('${user.username}', ${user.cohort})">Edit</button>  
            <button class="btn btn-danger" onclick="UserManager.deleteUser('${user.username}')">Delete</button>  
          </td>  
        `;
                tbody.appendChild(tr);
            });
            return users;
        });
    }

    /**
     * Populate the user form with existing user data for editing.
     * @param {string} username - The username of the user to edit.
     * @param {number} cohort - The cohort number of the user to edit.
     */
    function editUser(username, cohort) {
        document.getElementById("user-username").value = username;
        document.getElementById("user-cohort").value = cohort;
        // Clear password field for security
        document.getElementById("user-password").value = "";
    }

    /**
     * Save or update a user based on form input.
     * @throws {Error} Throws if form validation fails or the user save operation encounters an error.
     */
    function saveUser() {
        const username = document.getElementById("user-username").value.trim();
        const password = document.getElementById("user-password").value;
        const cohort = document.getElementById("user-cohort").value;

        // Validation
        if (!username) {
            UIUtils.showAlert("Username is required", "Validation Error");
            return;
        }

        if (!password) {
            UIUtils.showAlert("Password is required", "Validation Error");
            return;
        }

        if (!cohort || cohort < 1) {
            UIUtils.showAlert(
                "Valid cohort number is required",
                "Validation Error"
            );
            return;
        }

        ipcRenderer
            .invoke("admin-save-user", { username, password, cohort })
            .then((response) => {
                if (response.success) {
                    UIUtils.showAlert("User saved successfully!", "Success");
                    clearUserForm();
                    loadUsers();
                } else {
                    UIUtils.showAlert("Error: " + response.error, "Error");
                }
            })
            .catch((error) => {
                UIUtils.showAlert(
                    "Error saving user: " + error.message,
                    "Error"
                );
            });
    }

    /**
     * Delete a user after confirmation
     * @param {string} username - The username of the user to delete
     */
    async function deleteUser(username) {
        // Use UIUtils to show confirmation dialog
        const confirmed = await UIUtils.showConfirm(
            `Are you sure you want to delete the user "${username}"? This action cannot be undone.`,
            "Confirm Delete User"
        );

        if (!confirmed) return;

        try {
            const response = await ipcRenderer.invoke("admin-delete-user", {
                username,
            });

            if (response.success) {
                UIUtils.showAlert("User deleted successfully!", "Success");
                loadUsers();
            } else {
                UIUtils.showAlert("Error: " + response.error, "Error");
            }
        } catch (error) {
            UIUtils.showAlert("Error deleting user: " + error.message, "Error");
        }
    }

    /* * Clear the user form */
    /**
     * Resets the user form to default values.
     * @param {string} username - Clears the username input field.
     * @param {string} password - Clears the password input field.
     * @param {string} cohort - Sets the cohort input field to "1".
     */
    function clearUserForm() {
        document.getElementById("user-username").value = "";
        document.getElementById("user-password").value = "";
        document.getElementById("user-cohort").value = "1";
    }

    /**
     * Filters the user table rows based on a search query.
     * Shows rows that match the query and hides rows that don't.
     * @throws {Error} Throws if an error occurs during filtering.
     */
    function filterUsers() {
        try {
            const query = document
                .getElementById("user-search")
                .value.toLowerCase();
            const rows = document.querySelectorAll("#users-table tbody tr");

            rows.forEach((row) => {
                const username = row.cells[0].textContent.toLowerCase();
                const cohort = row.cells[1].textContent.toLowerCase();

                // Show row if username or cohort matches the search query
                if (username.includes(query) || cohort.includes(query)) {
                    row.style.display = "";
                } else {
                    row.style.display = "none";
                }
            });
        } catch (error) {
            console.error("Error filtering users:", error);
        }
    }

    // Public API
    return {
        loadUsers,
        editUser,
        saveUser,
        clearUserForm,
        filterUsers,
        deleteUser,
    };
})();

// Make UserManager globally available
window.UserManager = UserManager;
