<%@page contentType="text/html" pageEncoding="UTF-8"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<!DOCTYPE html>

<html>
    <head>
        <meta http-equiv="X-UA-Compatible" content="IE=Edge"/>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
        <title>NoobLab</title>

        <link href="https://fonts.googleapis.com/css?family=Roboto:400,400i,700,700i&display=swap" rel="stylesheet">

        <%-- put current ${pageContext.request.contextPath} into Javascript land --%>
        <script type="text/javascript">
            var contextPath = "${pageContext.request.contextPath}";
            var embed = false;
            var sourceips = [ "${header["X-Forwarded-For"]}","${pageContext.request.remoteHost}" ];
            <c:if test="${embed}">
            embed = true;
            var embedcode = ${embedcode};
            var carolcode = ${embedcarol};
            </c:if>
        </script>

        <%-- JQuery --%>
        <script src="${pageContext.request.contextPath}/jq.js"></script>
        <%-- JQuery Tree --%>
        <script src="${pageContext.request.contextPath}/jqTree.js"></script>

        <%-- our own stuff --%>
        <script type="text/javascript" src="${pageContext.request.contextPath}/nooblab.js?date=09023018"></script>
        <script type="text/javascript" src="${pageContext.request.contextPath}/modern-layout.js"></script>
        <script type="text/javascript" src="${pageContext.request.contextPath}/actions.js"></script>
        <script type="text/javascript" src="${pageContext.request.contextPath}/innerxhtml.js"></script>
        <link rel="stylesheet" href="${pageContext.request.contextPath}/nooblab.css?date=06032018"/>
        <link rel="stylesheet" href="${pageContext.request.contextPath}/css/modern.css"/>
        <link rel="stylesheet" href="${pageContext.request.contextPath}/codemirror/lib/codemirror.css"/>
        <c:forEach items="${cmthemes}" var="cmtheme">
        <link rel="stylesheet" href="${pageContext.request.contextPath}/codemirror/theme/${cmtheme}.css"/>
        </c:forEach>

        <%-- codemirror --%>
        <script src="${pageContext.request.contextPath}/codemirror/lib/codemirror.js"></script>

        <%-- xml for codemirror, needed for HTMl apparently --%>
        <script src="${pageContext.request.contextPath}/codemirror/mode/xml/xml.js"></script>
        <%-- <link rel="stylesheet" href="${pageContext.request.contextPath}/codemirror/mode/xml/xml.css">  --%>
        <%-- javascript highlighting for codemirror --%>
        <script src="${pageContext.request.contextPath}/codemirror/mode/javascript/javascript.js"></script>
        <%-- <link rel="stylesheet" href="${pageContext.request.contextPath}/codemirror/mode/javascript/javascript.css"/>
        <%-- css/html for Codemirror --%>
        <script src="${pageContext.request.contextPath}/codemirror/mode/css/css.js"></script>
        <%-- <link rel="stylesheet" href="${pageContext.request.contextPath}/codemirror/mode/css/css.css"> --%>
        <script src="${pageContext.request.contextPath}/codemirror/mode/htmlmixed/htmlmixed.js"></script>

        <%-- basic highlighting for codemirror --%>
        <script src="${pageContext.request.contextPath}/codemirror/mode/basic/basic.js"></script>
        <%-- <link rel="stylesheet" href="${pageContext.request.contextPath}/codemirror/mode/basic/basic.css"/> --%>
        <%-- java highlighting for codemirror --%>
        <script src="${pageContext.request.contextPath}/codemirror/mode/clike/clike.js"></script>
        <%-- <link rel="stylesheet" href="${pageContext.request.contextPath}/codemirror/mode/clike/clike.css"/> --%>
        <%-- and PHP --%>
        <script src="${pageContext.request.contextPath}/codemirror/mode/php/php.js"></script>
        <%-- and Python --%>
        <script src="${pageContext.request.contextPath}/codemirror/mode/python/python.js"></script>

        <%-- prettyprint --%>
        <%--<script src="${pageContext.request.contextPath}/prettify.js"></script>
        <link rel="stylesheet" href="${pageContext.request.contextPath}/prettify.css"/>--%>

        <%-- javascript code tidy --%>
        <script src="${pageContext.request.contextPath}/jsbeautify.js"></script>

        <%-- appraise --%>
        <script src="${pageContext.request.contextPath}/apprise-1.5.min.js"></script>
        <link rel="stylesheet" href="${pageContext.request.contextPath}/apprise.min.css"/>

        <%-- java runner --%>
        <script type="text/javascript" src="${pageContext.request.contextPath}/java.js?date=09003018"></script>

        <%-- pcode "compiler" --%>
        <script type="text/javascript" src="${pageContext.request.contextPath}/psuedocode.js"></script>

        <%-- C++ --%>
        <script type="text/javascript" src="${pageContext.request.contextPath}/cpp.js"></script>

        <%-- stratified Javascript --%>
        <script type="text/javascript" src="${pageContext.request.contextPath}/oni-apollo.js"></script>
        <script type="text/sjs">
            <%-- basic --%>
            var basic = require("${pageContext.request.contextPath}/basic");
            <%-- carol --%>
            var carol = require("${pageContext.request.contextPath}/carol");
            <%-- java on server side run path --%>
            var javaserver = require("${pageContext.request.contextPath}/javaserver");
        </script>

        <%-- gifpauserxtreme (for animated gifs) --%>
        <script type="text/javascript" src="${pageContext.request.contextPath}/gifpause/libgif.js"></script>

        <%-- graphics library --%>
        <script type="text/javascript" src="${pageContext.request.contextPath}/drawing.js"></script>

        <%-- font awesome --%>
        <link href="//netdna.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css" rel="stylesheet"/>

        <%-- bring watermark client side --%>
        <script type="text/javascript">
            watermark = "${watermark}";
        </script>

        <%-- blockly --%>
        <%-- <script type="text/javascript" src="${pageContext.request.contextPath}/blockly/blockly_compressed.js"></script>

        <script type="text/javascript" src="${pageContext.request.contextPath}/blockly/blocks/colour.js"></script>
        <script type="text/javascript" src="${pageContext.request.contextPath}/blockly/blocks/logic.js"></script>
        <script type="text/javascript" src="${pageContext.request.contextPath}/blockly/blocks/math.js"></script>
        <script type="text/javascript" src="${pageContext.request.contextPath}/blockly/blocks/text.js"></script>
        <script type="text/javascript" src="${pageContext.request.contextPath}/blockly/blocks/loops.js"></script>
        <script type="text/javascript" src="${pageContext.request.contextPath}/blockly/blocks/procedures.js"></script>
        <script type="text/javascript" src="${pageContext.request.contextPath}/blockly/blocks/variables.js"></script>
        <script type="text/javascript" src="${pageContext.request.contextPath}/blockly/blocks/carol.js"></script>

        <script type="text/javascript" src="${pageContext.request.contextPath}/blockly/generators/pcode.js"></script>
        <script type="text/javascript" src="${pageContext.request.contextPath}/blockly/generators/pcode/colour.js"></script>
        <script type="text/javascript" src="${pageContext.request.contextPath}/blockly/generators/pcode/logic.js"></script>
        <script type="text/javascript" src="${pageContext.request.contextPath}/blockly/generators/pcode/math.js"></script>
        <script type="text/javascript" src="${pageContext.request.contextPath}/blockly/generators/pcode/text.js"></script>
        <script type="text/javascript" src="${pageContext.request.contextPath}/blockly/generators/pcode/loops.js"></script>
        <script type="text/javascript" src="${pageContext.request.contextPath}/blockly/generators/pcode/procedures.js"></script>
        <script type="text/javascript" src="${pageContext.request.contextPath}/blockly/generators/pcode/variables.js"></script>
        <script type="text/javascript" src="${pageContext.request.contextPath}/blockly/generators/pcode/carol.js"></script>
        <script type="text/javascript" src="${pageContext.request.contextPath}/blockly/msg/js/en.js"></script> --%>

        <%-- if an alternate style has been provided --%>
        <c:if test="${altstyle != null}">
            <link rel="stylesheet" href="${altstyle}"/>
        </c:if>

    </head>
    <body class="main<c:if test="${embed}"> embed</c:if><c:if test="${altstyle != null}"> altstyle</c:if>">
        <div id="loadingspinner"><iframe border="0" src="${pageContext.request.contextPath}/holding.html"></iframe></div>
        
        <!-- Modern Header -->
        <div class="ide-header">
            <div class="ide-logo">NoobLab <span>Modern</span></div>
            <div class="ide-toolbar">
                <button id="runbutton" onclick="run()">Run</button>
                <button id="stopbutton" onclick="stop()" disabled>Stop</button>
                <button id="clearbutton" onclick="clearEditor()">Clear</button>
                <button id="tidy" onclick="tidyCode()">Format</button>
                <button onclick="window.location.href='${pageContext.request.contextPath}/dashboard_modern.jsp'">Dashboard</button>
            </div>
        </div>

        <div class="ide-container">
            <!-- Sidebar (Lesson Content) -->
            <div class="ide-sidebar">
                <div class="lesson-content">
                    ${contentshtml}
                </div>
            </div>

            <!-- Main Area -->
            <div class="ide-main">
                <!-- Editor -->
                <div class="ide-editor-area">
                    <div id="editor-wrapper">
                        <div id="code-titlebar" style="display:none">[ Code ]</div>
                        <iframe id="code-blockly" src="${pageContext.request.contextPath}/blockly.jsp?language=${requestScope.blocklylang}" style="display:none"></iframe>
                        <div id="code-main"></div>
                        <div id="filetree"></div>
                    </div>
                </div>

                <!-- Output -->
                <div class="ide-output-area">
                    <div class="output-header">
                        <span>Output</span>
                        <span class="maximisebutton fa fa-window-maximize" onclick="maxMinCode()" style="cursor: pointer;"></span>
                    </div>
                    <div class="output-content">
                        <div id="output-main" style="height:100%"><iframe name="outputframe" id="outputframe" allowTransparency="true" frameborder="0"></iframe></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Hidden / Legacy Elements -->
        <div id="content" style="display:none">
             <!-- Legacy content container, might be needed by JS selectors -->
        </div>
        
        <div id="toolbar" style="display:none">
             <!-- Legacy toolbar, we moved buttons to header -->
             <!-- But we need to keep the form -->
            <form id="runform" action="RunPage" method="post" target="outputframe" style="display: none">
                <textarea style="width: 0px; height: 0px; visibility: hidden;" cols="10" rows="10" id="codeinput" name="codeinput"></textarea>
                <textarea style="width: 0px; height: 0px; visibility: hidden;" cols="10" rows="10" id="codefortest" name="codefortest"></textarea>
                <input name="nohalt" id="nohalt" type="hidden"/>
                <input name="filename" id="filename"/>
                <input name="tabs" id="tabs"/>
            </form>
             <input id="loadbutton" type="button" value="Load file" style="display:none"/>
             <input id="savebutton" type="button" value="Save file" onclick ="save()" style="display:none"/>
        </div>

        <div id="usermenu" style="display:none">
             <!-- Legacy user menu, we might need to reimplement its functionality -->
             <!-- For now, keep it hidden but accessible if JS needs it -->
             <div class="extramenu" id="extramenudashboard" onclick="window.location.href='${pageContext.request.contextPath}/dashboard_modern.jsp'">Go to Dashboard</div>
             <div id="openthemechooser" onclick="openThemeChooser()">Change editor theme</div>
        </div>
        
        <div id="themechooser">
            <div class="tbar theme"><div class="close">X</div>Theme Chooser</div>
            <div class="themes">
                <div id="theme-default" class="theme" onclick="selectTheme($(this).text().trim())">(default)</div>
                <c:forEach items="${cmthemes}" var="cmtheme">
                <div id="theme-${cmtheme}" class="theme" onclick="selectTheme($(this).text().trim())">${cmtheme}</div>
                </c:forEach>
            </div>
        </div>
        
        <div id="graphics">
            <svg class="container">
                <rect x="0" y="0" width="100%" height="100%" fill="gray"/>
                <svg class="main" version="1.1" viewBox="0 0 1000 1000" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
                    <rect id="graphicsbackground" width="1000" height="1000" fill="white"/>
                    <clipPath id="clip">
                        <use xlink:href="#graphicsbackground"/>
                    </clipPath>
                    <g clip-path="url(#clip)">
                    </g>
                </svg>
            </svg>
        </div>
        
        <div id="editorRightClick">
            <div class="option" onclick="addGettersAndSetters('getters')">Add getters</div>
            <div class="option" onclick="addGettersAndSetters('setters')">Add setters</div>
            <div class="option" onclick="addGettersAndSetters('both')">Add both getters and setters</div>
        </div>
        
        <img id="embedmedalhighlight" src="${pageContext.request.contextPath}/images/medalgold.png" style="display:none"/>
        
        <!-- Audio -->
        <audio id="winsound">
            <source src="${pageContext.request.contextPath}/images/win.ogg" type="audio/ogg"/>
            <source src="${pageContext.request.contextPath}/images/win.mp3" type="audio/mpeg"/>
        </audio>
        <audio id="failsound">
            <source src="${pageContext.request.contextPath}/images/ouch.ogg" type="audio/ogg"/>
            <source src="${pageContext.request.contextPath}/images/ouch.mp3" type="audio/mpeg"/>
        </audio>

        ${navbar}
        
        <script src="${pageContext.request.contextPath}/monaco-loader.js"></script>
        <script type="text/javascript">
            var stoppit = false;
            var lastFilename = "";
            var openFile = $("#loadbutton").upload({
                    name: 'fileDetails',
                    action: '${pageContext.request.contextPath}/BounceFile',
                    enctype: 'multipart/form-data',
                    params: { wipedir : "true" },
                    autoSubmit: false,
                    onSubmit: function() {},
                    onComplete: function(response) {
                        setTimeout(function()
                        {
                            response = response.replace(/#RET#/g,"\n");
                            // if multitab response
                            if (response.indexOf("***TAB***") != -1 && $("div.parameter#multi").text().trim() == "true")
                            {
                                populateTabs(response);
                                lastcode = response; // levenshtein index code
                            }
                            else
                            {
                                // if multi-tab but single file response
                                if ($("div.parameter#multi").text().trim() == "true")
                                {
                                    // if we only have one tab and it's blank
                                    if ($("div.tab").not(".newtab").length == 1 && editor.getValue().trim().length == 0)
                                    {
                                        // we can overwrite
                                        // use populateTabs with wipe out
                                        populateTabs("***TAB***\n"+lastFilename+"\n***CODE***\n"+response);

                                        //editor.setValue(response);
                                        lastcode = getTabBundleCode();
                                        //$("div.tab.selected").html(lastFilename+'<i class="close fa fa-times" onclick="deleteSelectedEditorTab()"></i>');
                                    }
                                    else // we load into a new tab rather than currently selected one...
                                    {
                                        //addNewTab(true);
                                        //$("div.newtab").click();
                                        //editor.setValue(response);
                                        populateTabs("***TAB***\n"+lastFilename+"\n***CODE***\n"+response,true);
                                        $("div.tab").not(".newtab").last().click();
                                        lastcode = getTabBundleCode();
                                        //$("div.tab.selected").html(lastFilename+'<i class="close fa fa-times" onclick="deleteSelectedEditorTab()"></i>');
                                    }
                                }
                                else // not multitab, just change editor contents
                                {
                                    // check watermarking
                                    var inboundWatermark = response.match(/\<noob\>(.*)\<\/noob\>/);
                                    if (inboundWatermark)
                                    {
                                        inboundWatermark = inboundWatermark[1];
                                        response = response.replace(/\<noob\>(.*)\<\/noob\>/,"");
                                        var sourceUID = getUID(inboundWatermark);
                                        if (sourceUID != getUID()) LOGcheat(sourceUID);
                                    }

                                    if ($("div.parameter#blockly").text().trim() == "true" && lastFilename.slice(-6) == ".bnoob")
                                    {
                                        // blockly file
                                        restoreBlockly(response);
                                    }
                                    else
                                    {
                                        // not blockly - hide/disable it
                                        //$("div.parameter#blockly").remove();
                                        //$("#code-blockly").hide();
                                        //$("#code-blocklytoggle").hide();

                                         // inspect pasted code for not-you watermarks
                                        var source = cheatSource(response);

                                        // strip watermarking from pastedText
                                        response = response.replace(/\t\s+\n/g,"\n");

                                        if (source) LOGcheat(source);

                                        editor.setValue(response);
                                        
                                        if (typeof NoobLabDesktop !== 'undefined') {
                                            NoobLabDesktop.setCode(response);
                                        }
                                        lastcode = response;
                                    }


                                }
                            }
                            LOGload(response);
                        },200);
                    },
                    onSelect: function() {
                        lastFilename = openFile.filename().split(/\\|\//).pop();
                        if ($("div.parameter#multi").text().trim() != "true")
                        {
                            if (confirm("This will replace everything in the editor! Are you sure?")) openFile.submit();
                        } else openFile.submit();
                    }
            });
        </script>
        <script type="text/javascript">
            function initCodeMirror() {
                var cm;
                if ($("div.parameter#language").text().trim() == "basic")
                {
                    cm = CodeMirror(document.getElementById("code-main"),{
                        value: "${codetext}",
                        mode:  "basic",
                        lineNumbers: false
                    });
                }
                else if ($("div.parameter#language").text().trim().slice(0,4) == "java")
                {
                    cm = CodeMirror(document.getElementById("code-main"),{
                        value: "${codetext}",
                        mode: "text/x-java",
                        //tabMode : "shift",
                        lineNumbers: true
                    });
                }
                else if ($("div.parameter#language").text().trim() == "pcode" || $("div.parameter#language").text().trim() == "pcarol")
                {
                    cm = CodeMirror(document.getElementById("code-main"),{
                        value: "${codetext}",
                        mode : "text/plain",
                        tabMode : "shift",
                        lineNumbers: true/*,
                    onKeyEvent : function(a,b){
                        if (stoppit) return;
                        if ($("div.parameter#blockly").text().trim() == "true")
                        {
                            stoppit = true;
                            apprise("Modifying the actual code will disable the visual editor for this workshop! Are you sure?",{verify:true},function(r){
                                if (r)
                                {
                                    // not blockly - hide/disable it
                                    $("div.parameter#blockly").remove();
                                    $("#code-blockly").hide();
                                    $("#code-blocklytoggle").hide();
                                    saveState();
                                }
                                stoppit = false;
                            });
                        }
                    }*/
                    });
                }
                else
                {
                    cm = CodeMirror(document.getElementById("code-main"),{
                        value: "${codetext}",
                        mode:  "javascript",
                        lineNumbers: true
                    });
                }
                return cm;
            }

            // Initialize CodeMirror first (Fallback/Default)
            editor = initCodeMirror();
            
            // Capture listeners attached by nooblab.js
            editor._listeners = [];
            var originalOn = editor.on;
            editor.on = function(event, handler) {
                editor._listeners.push({event: event, handler: handler});
                if (originalOn) originalOn.call(editor, event, handler);
            };

            // Try to upgrade to Monaco
            // We use a timeout to ensure the DOM is fully ready and CM is rendered
            setTimeout(function() {
                if (typeof initMonacoWrapper === 'function') {
                    var currentMode = editor.getOption("mode");
                    var currentValue = editor.getValue();
                    var codeMain = document.getElementById("code-main");
                    
                    initMonacoWrapper(codeMain, {
                        value: currentValue,
                        mode: currentMode
                    }, function(monacoInstance) {
                        // Transfer listeners
                        if (editor._listeners) {
                            editor._listeners.forEach(function(l) {
                                monacoInstance.on(l.event, l.handler);
                            });
                        }
                        
                        // Success! Swap global editor reference
                        // Hide the CodeMirror element
                        $(codeMain).find(".CodeMirror").hide();
                        
                        editor = monacoInstance;
                        console.log("Switched to Monaco Editor");
                    });
                }
            }, 500);
        </script>
    </body>                    </clipPath>
                    <g clip-path="url(#clip)">
                    </g>
                </svg>
            </svg>
        </div>
        <div id="editorRightClick">
            <div class="option" onclick="addGettersAndSetters('getters')">Add getters</div>
            <div class="option" onclick="addGettersAndSetters('setters')">Add setters</div>
            <div class="option" onclick="addGettersAndSetters('both')">Add both getters and setters</div>
        </div>
        <img id="embedmedalhighlight" src="${pageContext.request.contextPath}/images/medalgold.png"/>
        ${navbar}
    </body>
</html>
