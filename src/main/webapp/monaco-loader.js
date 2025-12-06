var MonacoAdapter = function (monacoInstance, container) {
    this.monaco = monacoInstance;
    this.container = container;
    this.decorations = [];

    // Event listeners
    this.changeListeners = [];

    var self = this;
    this.monaco.onDidChangeModelContent(function (e) {
        self.changeListeners.forEach(function (cb) {
            cb(self);
        });
    });
};

MonacoAdapter.prototype.getValue = function () {
    return this.monaco.getValue();
};

MonacoAdapter.prototype.setValue = function (v) {
    this.monaco.setValue(v);
};

MonacoAdapter.prototype.refresh = function () {
    this.monaco.layout();
};

MonacoAdapter.prototype.focus = function () {
    this.monaco.focus();
};

MonacoAdapter.prototype.setCursor = function (line, ch) {
    // CodeMirror is 0-indexed, Monaco is 1-indexed
    // ch is column (0-indexed in CM, 1-indexed in Monaco)
    // If ch is undefined, default to 1
    var col = ch !== undefined && ch !== null ? ch + 1 : 1;
    this.monaco.setPosition({ lineNumber: line + 1, column: col });
    this.monaco.revealLineInCenter(line + 1);
};

MonacoAdapter.prototype.addLineClass = function (line, where, className) {
    // Monaco uses decorations
    // line is 0-indexed from CM
    var lineNumber = line + 1;

    // We need to map the className to a Monaco class
    // "error" -> red background
    // "background" -> full line

    var options = {};
    if (where === "background") {
        options.isWholeLine = true;
        options.className = className; // CSS class must exist
        // If it's an error, we might want inline decoration too
        if (className === "error") {
            options.glyphMarginClassName = "errorGlyph"; // Needs CSS
        }
    } else if (where === "text") {
        options.inlineClassName = className;
    }

    var newDecorations = [
        {
            range: new monaco.Range(lineNumber, 1, lineNumber, 1),
            options: options,
        },
    ];

    this.decorations = this.monaco.deltaDecorations(
        this.decorations,
        newDecorations
    );
};

MonacoAdapter.prototype.removeLineClass = function (line, where, className) {
    // This is harder because we need to find the specific decoration.
    // For now, let's just clear all decorations if we can't track them easily,
    // or just ignore if it's not critical.
    // But usually removeLineClass is called to clear errors.
    // Let's clear all decorations for that line.

    // Simplified: Clear all decorations (often used to reset state)
    // If we need granular control, we need to track decoration IDs per line.
    this.decorations = this.monaco.deltaDecorations(this.decorations, []);
};

MonacoAdapter.prototype.getOption = function (name) {
    // Map CM options to Monaco options if needed
    if (name === "mode") return "java"; // Placeholder
    return null;
};

MonacoAdapter.prototype.setSize = function (w, h) {
    $(this.container).css({ width: w, height: h });
    this.monaco.layout();
};

MonacoAdapter.prototype.on = function (event, callback) {
    var self = this;
    if (event === "change") {
        this.monaco.onDidChangeModelContent(function (e) {
            callback(self, e);
        });
    } else if (event === "paste") {
        // Monaco 0.44+ supports onDidPaste
        if (this.monaco.onDidPaste) {
            this.monaco.onDidPaste(function (e) {
                // e contains range, languageId
                // NoobLab expects (editor, e) where e is a DOM event or similar with clipboardData
                // This is tricky because Monaco's event is different.
                // We might need to construct a fake event or just pass what we have.
                // The NoobLab handler tries to get clipboardData from e.originalEvent or e.
                // Monaco's event doesn't have clipboardData.
                // We might be able to intercept the DOM paste event on the container.
                // For now, let's try to pass a dummy event if we can't get the real one,
                // or rely on DOM listener below.
            });
        }

        // Better approach for paste: Listen on the DOM node
        var domNode = this.monaco.getDomNode();
        if (domNode) {
            domNode.addEventListener("paste", function (e) {
                callback(self, e);
            });
        }
    } else if (event === "copy" || event === "cut") {
        var domNode = this.monaco.getDomNode();
        if (domNode) {
            domNode.addEventListener(event, function (e) {
                callback(self, e);
            });
        }
    }
};

// Helper to load Monaco
function loadMonaco(callback) {
    if (window.monaco) {
        callback();
        return;
    }

    var script = document.createElement("script");
    script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs/loader.js";
    script.onload = function () {
        require.config({
            paths: {
                vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs",
            },
        });
        require(["vs/editor/editor.main"], function () {
            callback();
        });
    };
    document.body.appendChild(script);
}

function initMonacoWrapper(element, options, callback) {
    loadMonaco(function () {
        // Map CM mode to Monaco language
        var lang = "plaintext";
        var cmMode = options.mode;
        if (cmMode === "text/x-java") lang = "java";
        else if (cmMode === "javascript") lang = "javascript";
        else if (cmMode === "text/html") lang = "html";
        else if (cmMode === "python") lang = "python";
        else if (cmMode === "text/x-c++src") lang = "cpp";

        // Create container if element is a textarea
        var container = element;
        if (element.tagName === "TEXTAREA") {
            container = document.createElement("div");
            container.style.width = "100%";
            container.style.height = "100%";
            element.parentNode.insertBefore(container, element);
            element.style.display = "none";
        }

        var editor = monaco.editor.create(container, {
            value: options.value,
            language: lang,
            theme: "vs-dark", // Default to dark
            automaticLayout: true,
            minimap: { enabled: false },
        });

        var adapter = new MonacoAdapter(editor, container);

        // Sync back to textarea if needed
        if (element.tagName === "TEXTAREA") {
            adapter.on("change", function () {
                element.value = adapter.getValue();
            });
        }

        callback(adapter);
    });
}
