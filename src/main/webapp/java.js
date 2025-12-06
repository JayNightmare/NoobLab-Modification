var javaruntimeerror = false;
var lastExitStatus = 0;
var javaSuccessfulRun = standardJavaSuccessfulRun;
var javaRuntimeError = standardJavaRuntimeError;
var numTestMon;

var javaFailTips = [];
var javaTestCount = 0;

var alternateScanner;

$.getScript(contextPath + "/confetti.js");

$.get(contextPath + "/newdoppio/Scanner.java", function (result) {
    alternateScanner = result;
});

function writeBase64(base64, path, name) {
    var fd = outputframe.fs.openSync(path + name, "w");
    var buff = new outputframe.Buffer(base64, "base64");
    outputframe.fs.writeSync(fd, buff, 0, buff.length, 0);
    outputframe.fs.closeSync(fd);
}

// automatically runs once (new) Doppio has finished loading...
function postDoppio() {
    // automatically run any file-system automatic uploads
    $("div.javafs-file.automatic").each(function () {
        pushToJFS("auto", this);
    });
}

function getMainsPkgs(codeTabs) {
    //var codeTabs = getTabBundleCode(true)[0];
    var mainsPkgs = [];
    $.each(codeTabs, function (i, codeTab) {
        var className = getClassName(codeTab);
        if (hasMain(codeTab))
            mainsPkgs.push([className, getPackageName(codeTab)]);
    });
    return mainsPkgs;
}

function getDirectories(filename) {
    var fs = outputframe.fs;
    var stats = fs.lstatSync(filename),
        info = {
            name: filename.split("/").pop(),
            fullname: filename,
            path: filename.substring(0, filename.lastIndexOf("/")) /*,
            name: path.basename(filename) */,
        };

    if (stats.isDirectory()) {
        info.type = "folder";
        info.children = fs.readdirSync(filename).map(function (child) {
            return getDirectories(filename + "/" + child);
        });
    } else {
        // Assuming it's a file. In real life it could be a symlink or
        // something else!
        info.type = "file";
    }
    return info;
}

function updateFileTree(startup) {
    $("#filetree").tree("destroy");
    // get a file listing from the "file system"
    var files = getDirectories("/tmp/myfiles");
    var data = [
        {
            name: "(my Java files)",
            children: files.children,
            fullname: "/tmp/myfiles",
            type: "root",
        },
    ];
    $("#filetree").tree({
        data: data,
        autoOpen: "auto",
        closedIcon: "+",
        openedIcon: "-",
        onCreateLi: function (node, li) {
            li.addClass(node.type);
            li.attr("data-fullname", node.fullname);
            var controls = $(
                '<div class="controls"><i class="fa fa-binoculars display" onclick="displayFileFromJavaFS(this)"></i> <i class="fa fa-plus-square addfile" onclick="addFileToJavaFS(this); return false" title="Upload file"></i> <i class="fa fa-folder addfolder" title="Add folder" onclick="addFolderToJavaFS(this)"><span>+</span></i> <i class="fa fa-trash delete" title="Delete file/directory" onclick="deleteFileOrFolderJavaFS(this)"></i></div>'
            );
            li.find("div").append(controls);
        },
    });
    if (!startup) {
        var topnode = $("#filetree").tree(
            "getNodeByHtmlElement",
            $("#filetree li").eq(0)
        );
        $("#filetree").tree("selectNode", topnode);
    } else {
        var li = $("#filetree").find("li[data-fullname='" + startup + "']");
        var topnode = $("#filetree").tree("getNodeByHtmlElement", li);
        $("#filetree").tree("selectNode", topnode);
    }
}

function deleteFileOrFolderJavaFS(source) {
    var li = $(source).closest("li");
    var targetNode = $("#filetree").tree("getNodeByHtmlElement", li);
    var targetname = targetNode.fullname;
    var filename = targetNode.name;

    apprise(
        "This will delete " +
            filename +
            " and, if it's a directory, everything in it! Are you sure?",
        { confirm: true },
        function (r) {
            if (r) {
                if (targetNode.type == "file")
                    outputframe.fs.unlinkSync(targetname);
                if (targetNode.type == "folder")
                    deleteFolderRecursive(targetname);
            }
            updateFileTree();
        }
    );

    function deleteFolderRecursive(path) {
        var fs = outputframe.fs;
        if (fs.existsSync(path)) {
            fs.readdirSync(path).forEach(function (file, index) {
                var curPath = path + "/" + file;
                if (fs.lstatSync(curPath).isDirectory()) {
                    // recurse
                    deleteFolderRecursive(curPath);
                } else {
                    // delete file
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(path);
        }
    }
}

function displayFileFromJavaFS(source) {
    var li = $(source).closest("li");
    var targetNode = $("#filetree").tree("getNodeByHtmlElement", li);
    var targetname = targetNode.fullname;
    outputframe.runShellCommand("cat " + targetname);
    updateFileTree(targetname);
}

function toggleJFS() {
    $("#filetree").toggle();
    if ($("#filetree").is(":visible")) {
        $("input#toggleJFS").val("Hide Java FS");
    } else {
        $("input#toggleJFS").val("Show Java FS");
    }
    updateFileTree();
}

function addFileToJavaFS(source) {
    var li = $(source).closest("li");
    var targetNode = $("#filetree").tree("getNodeByHtmlElement", li);
    var dirname = targetNode.fullname;

    // create file input and then click it
    $("body").append(
        '<input type="file" id="tempfilejava" style="display: none"/>'
    );
    $("input#tempfilejava").on("change", function () {
        var file = $("input#tempfilejava")[0].files[0];
        var filename = $("input#tempfilejava")
            .val()
            .split("/")
            .pop()
            .split("\\")
            .pop();
        var reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function (e) {
            var base64 = e.target.result.toString();
            base64 = base64.split(",").pop();
            // upload file to targetdir
            writeBase64(base64, dirname + "/", filename);
            updateFileTree(dirname + "/", filename);
        };
    });
    $("input#tempfilejava").click();
}

function addFolderToJavaFS(source) {
    var li = $(source).closest("li");
    var targetNode = $("#filetree").tree("getNodeByHtmlElement", li);
    var dirname = targetNode.fullname;
    apprise(
        "Enter the folder name you want to create:",
        { input: true },
        function (r) {
            if (r) {
                outputframe.fs.mkdirSync(dirname + "/" + r);
                updateFileTree(dirname + "/", r);
            }
        }
    );
}

function pushToJFS(noprompt, source) {
    if (!source) source = this;
    var files = [];
    var basedir = $(source).attr("data-basedir");
    $(source)
        .find("pre")
        .each(function () {
            var obj = {};
            obj.filename = $(this).attr("data-filename");
            obj.data = $(this).text().trim();
            files.push(obj);
        });

    if (noprompt === "auto") {
        performUpload("auto");
    } else {
        var msg =
            "This will create a folder called <b>" +
            basedir +
            "</b> in your <b>myfiles</b> directory which will contain a file called <b>" +
            files[0].filename +
            "</b>. Are you sure?";
        if (files.length > 1) {
            msg =
                "This will create a folder called <b>" +
                basedir +
                "</b> in your <b>myfiles</b> directory which will contain the following files:<p>";
            for (var i = 0; i < files.length; i++) {
                msg += "<b>" + files[i].filename + "</b><br/>";
            }
            msg += "&nbsp;<br/>Are you sure?";
        }
        apprise(msg, { confirm: true }, performUpload);
    }

    function performUpload(r) {
        if (r) {
            if (!outputframe.fs.existsSync("/myfiles/" + basedir))
                outputframe.fs.mkdirSync("/myfiles/" + basedir);
            for (var i = 0; i < files.length; i++) {
                var base64 = $.base64.encode(files[i].data);
                writeBase64(
                    base64,
                    "/myfiles/" + basedir + "/",
                    files[i].filename
                );
            }
            updateFileTree();
            if (r === true)
                setTimeout(function () {
                    apprise(
                        "File(s) successfully pushed to your Java file system in <b>/myfiles/" +
                            basedir +
                            "</b>."
                    );
                }, 50);
        }
    }
}

function runjava() {
    // PN: HACK ON 15/01/2021
    // Check to see if they are creating a scanner in a code block in a pidgin mode exercise
    if (
        editor.getValue().match(/\{[\s\S]*.*new Scanner/) &&
        $("div#multi").text().trim() != "true"
    ) {
        var x = confirm(
            "Your code appears to create multiple Scanner objects which almost certainly is not what you want, and will make it seem as if you are not winning medals when you should be. You should usually only create one instance of Scanner towards the very start of your program and reuse this single instance as you need it. Click OK to ignore this and run the code anyway, but don't expect it to win any medals if you do...!"
        );
        if (!x) return;
    }

    // clear anything left over from tests
    javaSuccessfulRun = standardJavaSuccessfulRun;
    javaRuntimeError = standardJavaRuntimeError;
    $("div#output-main div.status").remove();

    if (numTestMon) {
        clearInterval(numTestMon);
        numTestMon = undefined;
    }

    // reset and show console
    if (!newdoppio) {
        $("div#console pre", outputframe.document).show();
    }

    if (editorfontsize) {
        $("iframe#outputframe")
            .contents()
            .find("body")
            .css("font-size", editorfontsize + "px");
    }

    // JQuery console is as glitchy as hell. If at first you don't succeed...
    //$("div#main pre",outputframe.document).text("");
    if (!newdoppio) {
        if (outputframe.controller) {
            outputframe.controller.reset();
            outputframe.controller.reset();
            outputframe.controller.reset();
        }
    } else {
        // not sure why we need the reset/blur/focus combo - focus doesn't seem to work without the preceding blur - but hey ho
        outputframe.globalTerm.reset();
        outputframe.globalTerm.blur();
        outputframe.globalTerm.focus();
    }

    var codeMess = getTabBundleCode();
    if (
        codeMess.match(/import\s*java.awt/) ||
        codeMess.match(/import\s*javax.swing/)
    ) {
        apprise(
            "This code tries to use graphical libraries that are not supported in NoobLab." +
                "You cannot run this code in this environment. If this message was unexpected, please speak to your tutor."
        );
        return;
    }

    var codeTabs = getTabBundleCode(true)[0];

    if ($("div.parameter#multi").text().trim() != "true") {
        var code = codeTabs[0];
        if (!code.match(/\s*class\s*/) && !code.match(/\s*void\s*main/)) {
            // pigin Java :-) Wrap a class/main around it
            code =
                "import java.util.Scanner; public class Pigin { public static void main(String[] args) { " +
                code +
                "\n} }";
            codeTabs[0] = code;
        }
    }

    var mainsPkgs = getMainsPkgs(codeTabs);
    if (mainsPkgs.length == 0) {
        apprise(
            "None of the classes in the editor appear to have a <i>main</i> method. This code cannot be run without one."
        );
        return;
    }

    $.each(codeTabs, function (i, codeTab) {
        $("div#code-titlebar div.tab")
            .eq(i)
            .contents()
            .eq(0)
            .replaceWith(getClassName(codeTab) + ".java");
    });

    saveState();
    if (mainsPkgs.length == 1) {
        // easy... can use our one and only
        $("div.status", outputframe.window.document).remove();
        actuallyDoRunJava(codeTabs, mainsPkgs[0]);
        return;
    }
    // otherwise, it's ambiguous
    // so does the currently selected tab have a main?
    var currentCode = editor.getValue();
    if (hasMain(currentCode)) {
        apprise(
            "You have several main methods across different classes in your project. Do you want to run the main method in " +
                "the class currently selected in the editor (<i>" +
                getClassName(currentCode) +
                "</i>)?",
            { verify: true },
            function (r) {
                if (r) {
                    $("div.status", outputframe.window.document).remove();
                    actuallyDoRunJava(codeTabs, getClassName(currentCode));
                }
            }
        );
        return;
    }
    // otherwise, ambiguous, and you don't have a main selected
    var mainList = "";
    $.each(mainsPkgs, function (i, mainPkg) {
        mainList += mainPkg[0] + "<br/>";
    });
    apprise(
        "You have several main methods across different classes in your project:<br/>" +
            mainList +
            "<br/>" +
            "Select one of these classes in the editor in order to indicate which main method you wish to run."
    );
}

function actuallyDoRunJava(codeFiles, main, actuallyRun) {
    javaFailTips = [];
    javaTestCount = 0;
    if (main[1] != undefined) {
        main[1] += ".";
    } else {
        main[1] = "";
    }
    main = main[1] + main[0];
    main = main.replace(/\./g, "/");
    if (actuallyRun == undefined) actuallyRun = true;

    LOGrun(getTabBundleCode());

    disableRun();

    // remove any "files" already in Doppio
    //outputframe.doCommand("rm *");
    if (!newdoppio) {
        outputframe.doCommand("clear_cache");
    } else {
        // if newdoppio, go through each codefile and modify to introduce a
        // clear screen as first line of main.
        //
        // Also, check for combination of Scanner and File. If both used,
        // we need to switch to using NoobLab.FileScanner.
        var alternateScannerNeeded = false;
        for (var i = 0; i < codeFiles.length; i++) {
            // not sure why we need the reset/blur/focus combo, but hey ho
            codeFiles[i] = codeFiles[i].replace(
                /(public\s*static\s*void\s*main[\s\S]*?{)/,
                '$1doppio.JavaScript.eval("globalTerm.reset(); globalTerm.blur(); globalTerm.focus()");'
            );

            if (
                codeFiles[i].indexOf("File") != -1 &&
                codeFiles[i].indexOf("Scanner") != -1
            ) {
                codeFiles[i] = codeFiles[i].replace(
                    /\bScanner/g,
                    "Nooblab.Scanner"
                );
                codeFiles[i] = codeFiles[i].replace(
                    /java.util.NoobLab.Scanner/g,
                    "java.util.Scanner"
                );
                alternateScannerNeeded = true;
            }
        }
        if (alternateScannerNeeded) codeFiles.push(alternateScanner);
    }

    // The following ugly hack is dedicated to Bob Hambrook.
    // RIP mate. 5th November 2014.

    // inject "code" class for accessing the Java code from the Java code
    // my brain hurts
    // inject Code
    var codeIncludesClass = function () {
        /*

package Java;
import java.lang.reflect.*;

public class Code
{
  public static String getRaw()
  {
     String stuff = "SARRIESBOB";
     stuff = stuff.replaceAll("CAPTAINCLIMAX",System.getProperty("line.separator")+"***ENDOFCLASS***"+System.getProperty("line.separator"));
     stuff = stuff.replaceAll("FUCKTHEPANTOMINE",System.getProperty("line.separator"));
     stuff = stuff.replaceAll("BASEBALLCAP",""+'"');
     return stuff;
  }

  public static String[] getClasses()
  {
     return getRaw().split(System.getProperty("line.separator")+"...ENDOFCLASS..."+System.getProperty("line.separator"));
  }

   public static boolean classExists(String clazz) {
  try {
   Object target = Class.forName(clazz);
   return true;
  } catch (Exception e) {
   return false;
  }
 }

 public static boolean validEncapsulation(String clazz) {
  if (!classExists(clazz)) return false;
  try {
   if (Class.forName(clazz).getFields().length > 0) return false;
  } catch (ClassNotFoundException e) {
   return false;
  }
  return true;
 }

 public static int getNumberOfConstructors(String clazz) {
  if (!classExists(clazz)) return -1;
  try {
   return Class.forName("Citizen").getConstructors().length;
  } catch (ClassNotFoundException e) {
   return -1;
  }
 }

 public static boolean classHasConstructor(String clazz, String conSig) {
  if (!classExists(clazz)) return false;
  conSig = verbosifyString(conSig);
  try {
   Constructor[] constructors = Class.forName(clazz).getConstructors();
   for (Constructor constructor: constructors) {
    if (constructor.toString().equals("public " + clazz + "(" + conSig + ")")) return true;
   }
  } catch (ClassNotFoundException e) {}
  return false;
 }

 public static boolean classHasDefaultConstructor(String clazz) {
  return classHasConstructor(clazz, "");
 }

 public static boolean classHasMethod(String clazz, String methodSig, String returnType) {
  if (!classExists(clazz)) return false;
  methodSig = verbosifyString(methodSig);
  returnType = verbosifyString(returnType);
  try {
   Method[] methods = Class.forName(clazz).getMethods();
   for (Method method: methods) {
    if (method.toString().equals("public " + returnType + " " + clazz + "." + methodSig)) return true;
   }
  } catch (Exception e) {}
  return false;
 }

 public static boolean classHasMethod(String clazz, String methodSig) {
  return classHasMethod(clazz, methodSig, "void");
 }

 public static Object callMethod(Object instance, String methodName) {
  try {
   return instance.getClass().getMethod(methodName).invoke(instance);
  } catch (Exception e) {
   return false;
  }
 }

 public static Object callMethod(Object instance, String methodName, Object param) {
  try {
   return instance.getClass().getMethod(methodName, devolve(param.getClass())).invoke(instance, param);
  } catch (Exception e) {
   e.printStackTrace();
   return false;
  }
 }

 public static Object callMethod(Object instance, String methodName, Object param, String clazz) {
  try {
   return instance.getClass().getMethod(methodName,Class.forName(clazz) ).invoke(instance, param);
  } catch (Exception e) {
   e.printStackTrace();
   return false;
  }
 }

 public static Object callMethod(Object instance, String methodName, Object[] params) {
  Class[] paramType = new Class[params.length];
  for (int i = 0; i < params.length; i++) {
   paramType[i] = devolve(params[i].getClass());
  }

  try {
   return instance.getClass().getMethod(methodName, (Class[]) paramType).invoke(instance, params);
  } catch (Exception e) {
   e.printStackTrace();
   return false;
  }
 }

 private static String verbosifyString(String s) {
  if (s.contains("String") && !s.contains("java.lang.String")) {
   s = s.replace("String", "java.lang.String");
  }
  return s;
 }

 private static Class devolve(Class o) {
  if (o == Integer.class) o = Integer.TYPE;
  if (o == Byte.class) o = Byte.TYPE;
  if (o == Short.class) o = Short.TYPE;
  if (o == Long.class) o = Long.TYPE;
  if (o == Float.class) o = Integer.TYPE;
  if (o == Double.class) o = Double.TYPE;
  if (o == Boolean.class) o = Boolean.TYPE;
  if (o == Character.class) o = Character.TYPE;
  return o;
 }

 public static Object createObject(String clazz) {
  if (!classExists(clazz)) return null;
  try {
   return Class.forName(clazz).newInstance();
  } catch (Exception e) {}
  return null;
 }

 public static Object createObject(String clazz, Object param) {
  if (!classExists(clazz)) return null;
  try {
   return Class.forName(clazz).getDeclaredConstructor(devolve(param.getClass())).newInstance(param);
  } catch (Exception e) {}
  return null;
 }

 public static Object createObject(String clazz, Object param, String override) {
  if (!classExists(clazz)) return null;
  try {
   return Class.forName(clazz).getDeclaredConstructor(Class.forName(override)).newInstance(param);
  } catch (Exception e) {}
  return null;
 }

 public static Object createObject(String clazz, Object[] params) {
  if (!classExists(clazz)) return null;
  Class[] paramTypes = new Class[params.length];
  for (int i = 0; i < params.length; i++) {
   paramTypes[i] = devolve(params[i].getClass());
  }
  try {
   return Class.forName(clazz).getDeclaredConstructor(paramTypes).newInstance(params);
  } catch (Exception e) {}
  return null;
 }

 public static Object[] testGettersAndSetters(String[] classNames, java.util.ArrayList attribs)
 {
    for (String className : classNames)
    {
      if (Java.Code.classExists(className.toLowerCase()))
      {
        return(new Object[]{false,"You were asked to create a '"+className+"' class - check your capitalisation!"});
      }
      if (!Java.Code.classExists(className))
      {
        return(new Object[]{false,"You were asked to create a '"+className+"' class but don't seem to have it"});
      }
      if (!Java.Code.validEncapsulation(className))
      {
        return(new Object[]{false,className+" seems to have public attriutes. Whither encaspulation?"});
      }
      if (!Java.Code.classHasDefaultConstructor(className))
      {
        return(new Object[]{false,className+" does not seem to have the default constructor. Have you added a constructor that wasn't asked for in the exercise?"});
      }
    }

    for (int i = 0; i < attribs.size(); i++)
    {
      String targetClass = classNames[i];

      Object instance = null;
      try
      {
        instance = Java.Code.createObject(targetClass);
      }
      catch (Exception e)
      {
        return(new Object[]{false,"I tried to create an instance of "+targetClass+" but wasn't able to. Maybe you have messed with its constructors - we didn't ask for any parameterised constructors in this exercise."});
      }

      String[] attribList = (String[])attribs.get(i);

      for (String attrib : attribList)
      {
        String attribType = "java.lang.String";
        if (attrib.contains(":"))
        {
          String[] splitted = attrib.split(":");
          attrib = splitted[0];
          attribType = splitted[1];
        }
        if (attribType.equals("String[]")) attribType = "java.lang.String[]";
        String cappedFirst = attrib.substring(0, 1).toUpperCase() + attrib.substring(1);
        String setter = "set"+cappedFirst+"("+attribType+")";
        if (!Java.Code.classHasMethod(targetClass,setter))
        {
          return(new Object[]{false,targetClass+" does not seem to have a correct setter for the attribute "+attrib});
        }

        String getter = attribType.equals("boolean") ? "is"+cappedFirst+"()" : "get"+cappedFirst+"()";
        if (!Java.Code.classHasMethod(targetClass,getter,attribType))
        {
          String feedback = targetClass+" does not seem to have a correct getter for the attribute "+attrib;
          if (attribType.equals("boolean"))
          {
            feedback += "However... note that when you're dealing with booleans, the 'getter' shouldn't be called getWhatever; rather, it should be called isWhatever... :-) ... maybe that's your problem?";
          }
          return(new Object[]{false,feedback});
        }

        try
        {
          if (attribType.equals("java.lang.String")) Java.Code.callMethod(instance,"set"+cappedFirst,"bums");
          if (attribType.equals("int")) Java.Code.callMethod(instance,"set"+cappedFirst,17);
          if (attribType.equals("double")) Java.Code.callMethod(instance,"set"+cappedFirst,17.5);
          if (attribType.equals("boolean"))
          {
            Java.Code.callMethod(instance,"set"+cappedFirst,true);
          }
        }
        catch (Exception e)
        {
          return(new Object[]{false,"I tried to use the setter for "+attrib+" in "+targetClass+" but something went wrong."});
        }

        try
        {
          if (attribType.equals("java.lang.String"))
          {
            String res = (String)Java.Code.callMethod(instance,"get"+cappedFirst);
            if (!"bums".equals(res))
            {
              return(new Object[]{false,"I tried to set a value for "+attrib+" in "+targetClass+" but when I tried to read it back with the getter I didn't get what I expected."});
            }
          }
          if (attribType.equals("int"))
          {
            int res = (Integer)Java.Code.callMethod(instance,"get"+cappedFirst);
            if (res != 17)
            {
              return(new Object[]{false,"I tried to set a value for "+attrib+" in "+targetClass+" but when I tried to read it back with the getter I didn't get what I expected."});
            }
          }
          if (attribType.equals("double"))
          {
            double res = (Double)Java.Code.callMethod(instance,"get"+cappedFirst);
            if (res != 17.5)
            {
              return(new Object[]{false,"I tried to set a value for "+attrib+" in "+targetClass+" but when I tried to read it back with the getter I didn't get what I expected."});
            }
          }
          if (attribType.equals("boolean"))
          {
            boolean res = (Boolean)Java.Code.callMethod(instance,"is"+cappedFirst);
            if (!res)
            {
              return(new Object[]{false,"I tried to set a value for "+attrib+" in "+targetClass+" but when I tried to read it back with the getter I didn't get what I expected."});
            }
          }
        }
        catch (Exception e)
        {
          return(new Object[]{false,"I tried to use the getter and setters for "+attrib+" in "+targetClass+" but something went wrong."});
        }

      }

    }
    return new Object[] { true };

 }

}

*/
    }
        .toString()
        .match(/[^]*\/\*([^]*)\*\/[^]*\}$/)[1];

    var bobbifiedCode = getTabBundleCode(true)[0]
        .join("CAPTAINCLIMAX")
        .replace(/\n/g, "FUCKTHEPANTOMINE")
        .replace(/"/g, "BASEBALLCAP")
        .replace(/\r/g, "");
    codeIncludesClass = codeIncludesClass.replace(/SARRIESBOB/, bobbifiedCode);
    codeFiles.push(codeIncludesClass);

    /*if (newdoppio)
    {
        // push JS eval through
        codeFiles.push('package doppio;public class JavaScript { public static native String eval(String jsCode);}');
    }*/

    var noOfFiles = codeFiles.length;
    var filesBack = 0;

    // push code first
    status("Compiling...");

    $.ajax({
        data: {
            mode: "compile",
            code: codeFiles,
            newdoppio: newdoppio ? true : false,
            // main : main,
            // mainPkg : mainPkg
        },
        type: "POST",
        url: contextPath + "/JavaRunner",
        // code successfully pushed... now try and pull it back and push it into
        // the Doppio file system.
        success: function (data) {
            if (data.indexOf("**ERROR**") != -1) {
                if (data.indexOf("**NEWJAVA**") == -1) {
                    var msg = data.split(":");
                    msg.shift();
                    msg.shift();
                    var className = msg.shift().split("/").pop();
                    var lineno = parseInt(msg.shift());
                    var details = data
                        .split(/\.java:\d+:/)[1]
                        .replace(/<|>/gi, function (m) {
                            return "&" + (m == ">" ? "g" : "l") + "t;";
                        })
                        .replace(/\n/g, "<br/>");
                } else {
                    var msg = data.split(":");
                    var className = msg[1]
                        .split("/")
                        .pop()
                        .replace(".java", "");
                    var lineno = msg[1].match(/line ([0-9]*) in/)[1];
                    var details = data.split("error:")[1].trim();
                    details = details.replace(/\n/g, "<br/>");
                }
                if (details.indexOf("FUCKTHEPANTOMINE") != -1)
                    details =
                        "Something went seriously wrong internally with this medal test.<br/>Please report this error to your lecturer.<br/>Be sure to include a copy of your code.";
                status(
                    "Error on line " +
                        lineno +
                        " in class " +
                        className +
                        "<br/>" +
                        details,
                    "error"
                );
                if (
                    className + ".java" !=
                    $("div.tab.selected").text().trim()
                ) {
                    // switch to the right tab for the error
                    $("div.tab")
                        .not(".newtab")
                        .contents()
                        .filter(function () {
                            return (
                                this.nodeType === 3 &&
                                $(this).text().trim() == className + ".java"
                            ); //Node.TEXT_NODE
                        })
                        .parent()
                        .click();
                    // frell me, JQuery is bloody awesome
                }

                if (newdoppio) {
                    $("div#output-main div.status").remove();
                }

                LOGsyntaxError(
                    "Error in line " +
                        lineno +
                        " of " +
                        className +
                        ", " +
                        details
                );
                editor.focus();
                editor.setCursor(parseInt(lineno) - 1);
                //editor.setLineClass(parseInt(lineno)-1,"error");
                editor.addLineClass(
                    parseInt(lineno) - 1,
                    "background",
                    "error"
                );
                enableRun();
            } else {
                var classes = data.split(":");

                classes.pop(); // remove empty last

                // Clear anything in the /tmp directory...
                if (newdoppio)
                    outputframe.fs.getRootFS().mntMap["/tmp"].empty();

                $.each(classes, function (i, clas) {
                    $.ajax({
                        data: { classfile: clas },
                        type: "POST",
                        url: contextPath + "/GetClass",
                        success: function (classBin) {
                            if (!newdoppio)
                                classBin = $.base64.decode(classBin);
                            var name = clas.replace(/\./g, "/");
                            //clas.split(".").pop();
                            if (newdoppio) {
                                // create directories if they don't already exist...
                                var dirs = name.split(/\//g);
                                name = dirs.pop(); // remove last non-dir
                                var path = "";
                                for (var i = 0; i < dirs.length; i++) {
                                    try {
                                        outputframe.fs.mkdirSync(
                                            "/tmp/" + path + dirs[i]
                                        );
                                    } catch (e) {}
                                    path = path + dirs[i] + "/";
                                }

                                writeBase64(
                                    classBin,
                                    "/tmp/" + path,
                                    name + ".class"
                                );
                            } else {
                                outputframe.node.fs.writeFileSync(
                                    name + ".class",
                                    classBin,
                                    true
                                );
                            }
                            filesBack++;
                            if (noOfFiles == filesBack && actuallyRun) {
                                status("");
                                try {
                                    if (newdoppio) {
                                        // check to see if we have /tmp/doppio/Graphics.class
                                        if (
                                            !outputframe.fs.existsSync(
                                                "/tmp/com/nooblab/Graphics.class"
                                            )
                                        ) {
                                            $.post(
                                                contextPath + "/GetClass",
                                                {
                                                    internal: "true",
                                                    classfile:
                                                        "com.nooblab.Graphics",
                                                },
                                                function (classBin) {
                                                    outputframe.runShellCommand(
                                                        "mkdir /tmp/com"
                                                    );
                                                    outputframe.runShellCommand(
                                                        "mkdir /tmp/com/nooblab"
                                                    );
                                                    writeBase64(
                                                        classBin,
                                                        "/tmp/",
                                                        "Graphics.class"
                                                    );
                                                    // not sure why I can't put it straight into the dir... but hey...
                                                    outputframe.runShellCommand(
                                                        "mv /tmp/Graphics.class /tmp/com/nooblab/Graphics.class"
                                                    );
                                                    finalPhaseRunJava();
                                                }
                                            );
                                        } else {
                                            finalPhaseRunJava();
                                        }

                                        function finalPhaseRunJava() {
                                            outputframe.runShellCommand(
                                                "cd /tmp"
                                            );
                                            outputframe.runShellCommand(
                                                "java " + main,
                                                function () {
                                                    outputframe.globalTerm.writeln(
                                                        ""
                                                    );
                                                    javaSuccessfulRun();
                                                }
                                            );
                                        }
                                    } else {
                                        // Latest codemirror cocks up focus
                                        setTimeout(function () {
                                            outputframe.focus();
                                            $(
                                                "div#console pre",
                                                outputframe.document
                                            ).click();
                                        }, 500);
                                        outputframe.doCommand("java " + main);
                                    }
                                } catch (e) {
                                    status(
                                        "Untrapped Doppio Error! :-( - usually this happens if you have a null pointer somewhere. The full error is in the browser console.",
                                        "error"
                                    );
                                }
                            }
                        },
                    });
                });
            }
        },
    });
}

function hasMain(code) {
    // is there a main in the currently selected class?
    if (code.match(/static\s*void\s*main\s*\(\s*String/)) return true;
    // otherwise
    return false;
}

function getClassName(code) {
    try {
        return code
            .match(/(class|interface)\s*[a-z|A-Z|0-9]*/)[0]
            .split(/\s/)
            .pop();
    } catch (e) {
        return undefined;
    }
}

function getPackageName(code) {
    try {
        return code
            .match(/package\s*[a-z|A-Z|\.]*/)[0]
            .split(/\s/)
            .pop();
    } catch (e) {
        return undefined;
    }
}

function standardJavaSuccessfulRun() {
    if (newdoppio) {
        var consoletext = getConsoleText();
        if (consoletext.indexOf("Exception in thread") != -1) {
            var errorText = consoletext.match(
                /(Exception in thread [\s\S]*)/g
            )[0];
            standardJavaRuntimeError(errorText);
            return;
        }
    }

    if (javaruntimeerror) {
        javaruntimeerror = false;
        return;
    } // otherwise
    if (newdoppio && lastExitStatus != 0) {
        lastExitStatus = 0;
        status("User aborted execution with the 'stop' button.", "error");
        LOGbreak();
    } else {
        LOGrunSuccess();
        status("Execution completed.", "success");
    }
    enableRun();
}

function standardJavaRuntimeError(errorText) {
    if (errorText.indexOf("BREAKBREAKBREAK") != -1) {
        errorText = "User aborted execution with the 'stop' button.";
        LOGbreak();
    } else {
        /*
        errorText = errorText
                        .replace(/\t/g,"  ")
                        .replace("at Pigin.main(Pigin.java","(while running your NoobLab code")
                        .replace("from DynamicJavaSourceCodeObject",""); */
        try {
            var junk = newdoppio
                ? errorText.split(/\n/)
                : errorText.split(/\t/);
            var junk2 = junk[1].replace("at ", "").split("(");
            var className = junk2[0].split(".")[0].trim();
            var methodName = junk2[0].split(".")[1].split("(")[0].trim();
            var lineNumber = junk2[1].split(":")[1].replace(")", "").trim();
            var errorBlurb = junk[0]
                .trim()
                .replace(":", "")
                .split('"')[2]
                .trim();

            if ($("div.parameter#multi").text().trim() != "true") {
                //(className == "Pigin")
                if (
                    className == "java" &&
                    errorBlurb.indexOf("java.util.NoSuchElementException") !=
                        -1 &&
                    errorBlurb.indexOf("bad input") != -1
                ) {
                    // someone's probably typed text into a nextInt scanner...
                    lineNumber = errorBlurb.split("line")[1].trim();
                    errorBlurb =
                        "Bad input (did you enter text into Scanner.nextInt, perhaps?)";
                }
                errorText = "Runtime error on line " + lineNumber + "<br/>";
            } else {
                errorText =
                    "Runtime error on line " +
                    lineNumber +
                    ", in class " +
                    className +
                    ", in method " +
                    methodName +
                    "<br/>";
            }
            errorText += errorBlurb;

            if (className + ".java" != $("div.tab.selected").text().trim()) {
                // switch to the right tab for the error
                $("div.tab")
                    .not(".newtab")
                    .contents()
                    .filter(function () {
                        return (
                            this.nodeType === 3 &&
                            $(this).text() == className + ".java"
                        ); //Node.TEXT_NODE
                    })
                    .parent()
                    .click();
                // frell me, JQuery is bloody awesome
            }

            editor.focus();
            editor.setCursor(parseInt(lineNumber) - 1);
            editor.addLineClass(
                parseInt(lineNumber) - 1,
                "background",
                "error"
            );
        } catch (e) {
            (console.error || console.log).call(console, e.stack || e);
        }

        //editor.setLineClass(parseInt(lineNumber)-1,"error");
        enableRun();

        LOGerror(errorText);
    }
    status("<pre>" + errorText + "</pre>", "error");
    enableRun();
    javaruntimeerror = false;
}

function status(msg, type) {
    msg = msg.replace("in class Pigin", "in program");
    if (type == undefined) type = "success";
    if (!newdoppio) {
        $("div#console", outputframe.document).find("div.status").remove();
        if (status == "") return;
        $("div#console", outputframe.document).append(
            '<div class="status ' + type + '">' + msg + "</div>"
        );
        $("div#main", outputframe.document).scrollTop(
            $("div#main", outputframe.document)[0].scrollHeight
        );
    } else {
        if (type.indexOf("wipe") != -1) $("div#output-main div.status").empty();
        if (type.indexOf("border") != -1) {
            // we can't actually do a writeln to the term, as we have a border and
            // quite possibly a medal/imagery going on too.
            // So, we'll just overlay a status div into div#output-main
            if ($("div#output-main div.status").length == 0) {
                var statusdiv = $('<div class="status"></div>');
                statusdiv.css({
                    border: "2px solid black",
                    position: "absolute",
                    top: "5px",
                    left: "5px",
                    right: "5px",
                    padding: "10px",
                    "background-color": "white",
                    "font-weight": "bold",
                });
                $("div#output-main").append(statusdiv);
            }
            var newmsg = $("<div>" + msg + "</div>");
            if (type.indexOf("error") != -1) {
                newmsg.css("color", "red");
            } else {
                newmsg.css("color", "green");
            }
            if (type.indexOf("test") != -1) newmsg.addClass("test");
            $("div#output-main div.status").append(newmsg);
            return;
        }

        msg = msg.split(/<br.>/);
        var newmsg = "";
        $.each(msg, function (i, one) {
            one = one.replace(/\s*$/, "");
            newmsg += one + "\r\n";
        });
        newmsg = newmsg.trim();
        newmsg = newmsg.replace(/(<([^>]+)>)/gi, "");

        if (newmsg.indexOf("Pigin") != -1) {
            // clean up errors on first line...
            newmsg = newmsg.replace(
                'import java.util.Scanner; public class Pigin { public static void main(String[] args) {doppio.JavaScript.eval("globalTerm.reset()");',
                ""
            );
            newmsg = newmsg.replace(
                "                                                                                                                                    ",
                ""
            );
        } else {
            newmsg = newmsg.replace(
                '{doppio.JavaScript.eval("globalTerm.reset()");',
                ""
            );
            newmsg = newmsg.replace(
                "                                              ",
                ""
            );
        }
        if (type == "success") {
            outputframe.globalTerm.writeln("\033[1;3;32m" + newmsg + "\033[0m");
        } else {
            outputframe.globalTerm.writeln("\033[1;3;31m" + newmsg + "\033[0m");
        }
    }
}

var lasttestlink = 0;

var JavaTestManager_Deprecated = {
    init: function () {
        $(".testCase").each(function () {
            var id = $(this)[0].id;
            if ($(this).find("div.id").length != 0) {
                id = $(this).find("div.id").text().trim();
            }
            if (id == undefined) id = "";

            var medal = undefined;
            if ($(this).find("div.medalType").length != 0) {
                medal = $(this).find("div.medalType").text().trim();
                if ($(this).find("div.medalDesc").length != 0) {
                    medal +=
                        ":" +
                        $(this).find("div.medalDesc").text().trim() +
                        ":" +
                        id;
                } else {
                    medal += ":" + id;
                }
            }
            if (medal != undefined) $(this).attr("data-medal", medal);
            $(this).attr("data-id", id);

            var linkText = ">>> Click here to test your code <<<";
            if (medal != undefined) {
                linkText = linkText.replace(
                    "code",
                    "code for a " + medal.split(":")[0] + " medal"
                );
                linkText = linkText.replace("ribbon medal", "ribbon");
            }

            $(this).text(linkText);

            // Add override/hide buttons
            $(this).append(
                '<span class="override"><br/><input type="password"/><button>Override</button><button>Hide</button></div>'
            );

            $(this)
                .find("input")
                .click(function (e) {
                    e.stopPropagation();
                });

            $(this)
                .find("button")
                .eq(0)
                .click(function (e) {
                    e.stopPropagation();
                    var inp = $(this).parent().find("input").val();
                    $.get(
                        contextPath + "/OverrideCheck?pw=" + inp,
                        function (res) {
                            if (res == "good") {
                                LOGtestStart(id, "", true, medal);
                                JavaTestManager.onSuccess("1/1", medal);
                            }
                        }
                    );
                });

            $(this)
                .find("button")
                .eq(1)
                .click(function (e) {
                    e.stopPropagation();
                    $(this).parent().find("button,br,input").hide();
                })
                .click(); // Hide by default

            $(this).css({
                border: "1px solid black",
                background: "white",
                cursor: "pointer",
                padding: "5px",
                fontWeight: "bold",
                textAlign: "center",
            });

            $(this).click(function (e) {
                // Handle hidden override option
                if (e.shiftKey) {
                    $(this).find("button,br,input").show();
                    return;
                }

                JavaTestManager.run(this);
            });
        });
    },

    parseTest: function (element) {
        var el = $(element);
        var testData = {
            id: el.attr("data-id"),
            medal: el.attr("data-medal"),
            tests: [],
            codeIncludes: [],
        };

        // Parse individual tests
        el.find(".test").each(function () {
            var testObj = {
                code: $(this).hasClass("code")
                    ? $(this).text().trim()
                    : $(this).find(".code").text().trim(),
                inputs: [],
                runMain: $(this).hasClass("runmain"),
            };

            $(this)
                .find(".inputTest")
                .each(function () {
                    testObj.inputs.push($(this).text().trim());
                });

            testData.tests.push(testObj);
        });

        // Parse code includes
        el.find(".codeIncludes").each(function () {
            testData.codeIncludes.push({
                text: $(this).text().trim(),
                feedback: $(this).attr("data-feedback"),
            });
        });

        return testData;
    },

    generateHarness: function (testData, classname) {
        var harness =
            "import java.io.ByteArrayOutputStream;\\n" +
            "import java.io.ByteArrayInputStream;\\n" +
            "import java.io.PrintStream;\\n" +
            "import java.io.InputStream;\\n" +
            "import java.io.IOException;\\n" +
            "import java.lang.reflect.*;\\n" +
            "public class NoobLabTester {\\n" +
            "    static ByteArrayOutputStream baos = new ByteArrayOutputStream();\\n" +
            "    public static PrintStream oldSysOut = System.out;\\n" +
            "    public static InputStream oldSysIn = System.in;\\n" +
            "    public static void main(String[] args) throws IOException {\\n" +
            "        int noOfTests = " +
            testData.tests.length +
            ";\\n" +
            "        int testsPassed = 0;\\n";

        // Code includes logic
        var userCode = getTabBundleCode(false); // Get all code for checking includes
        var offset = "";

        var extraTests = 0;

        testData.codeIncludes.forEach(function (inc) {
            extraTests++;
            var mustInclude = inc.text;
            var notEqual = "false";
            if (mustInclude.charAt(0) == "!") {
                mustInclude = mustInclude.substring(1);
                notEqual = "true";
            } else if (mustInclude.charAt(0) == "#") {
                mustInclude = mustInclude.substring(1);
                notEqual = "regex";
            }

            var passed = false;
            if (notEqual == "true") {
                if (userCode.indexOf(mustInclude) == -1) passed = true;
            } else if (notEqual == "false") {
                if (userCode.indexOf(mustInclude) != -1) passed = true;
            } else if (notEqual == "regex") {
                if (userCode.search(new RegExp(mustInclude)) != -1)
                    passed = true;
            }

            if (passed) {
                offset += "testsPassed++; ";
                if (!newdoppio) offset += 'oldSysOut.println("TESTCOUNT"); ';
                else
                    offset +=
                        'doppio.JavaScript.eval("parent.javaTestCount++"); ';
            } else {
                if (!newdoppio) offset += 'oldSysOut.println("TESTCOUNT"); ';
                else
                    offset +=
                        'doppio.JavaScript.eval("parent.javaTestCount++"); ';
                if (inc.feedback) {
                    if (!newdoppio)
                        offset +=
                            'oldSysOut.println("FailTip:' +
                            inc.feedback.replace(/"/g, '\\\\"') +
                            '"); ';
                    else
                        offset +=
                            "doppio.JavaScript.eval(\"parent.javaFailTips.push(\\'" +
                            inc.feedback.replace(/'/g, "\\\\\\'") +
                            "\\')\"); ";
                }
            }
        });

        harness += "        noOfTests += " + extraTests + ";\\n";
        harness += "        " + offset + "\\n";

        harness +=
            "        PrintStream ps = new PrintStream(baos);\\n" +
            "        System.setOut(ps);\\n";

        // Generate test calls
        for (var i = 0; i < testData.tests.length; i++) {
            harness += "        if (test" + i + "()) testsPassed++;\\n";
        }

        harness +=
            "        System.out.flush();\\n" +
            "        System.setOut(oldSysOut);\\n";

        // Result reporting
        if (!newdoppio) {
            harness +=
                '        System.out.println("NOOBLABTESTSTART:"+testsPassed+"/"+noOfTests+":NOOBLABTESTEND");\\n';
        } else {
            harness +=
                '        doppio.JavaScript.eval("parent.javaTestData = \\\'"+testsPassed+"/"+noOfTests+"\\\'");\\n';
        }

        // Medal reporting
        if (testData.medal) {
            if (!newdoppio) {
                harness +=
                    '        if (testsPassed == noOfTests) System.out.println("NOOBLABMEDALSTART:' +
                    testData.medal +
                    ':NOOBLABMEDALEND");\\n';
            } else {
                harness +=
                    "        if (testsPassed == noOfTests) doppio.JavaScript.eval(\"parent.javaTestMedal=\\'" +
                    testData.medal.replace(/'/g, "\\\\\\'") +
                    "\\'\");\\n";
            }
        }

        harness += "    }\\n"; // End main

        // Helper methods
        harness +=
            "    public static String consoleOutput() { return baos.toString(); }\\n" +
            '    public static String[] consoleOutputAsLines() { return consoleOutput().split("\\\\\\\\r\\\\\\\\n?|\\\\\\\\n"); }\\n';

        // Generate test methods
        for (var i = 0; i < testData.tests.length; i++) {
            var test = testData.tests[i];
            harness +=
                "    public static boolean test" +
                i +
                "() throws IOException {\\n";

            if (!newdoppio)
                harness += '        oldSysOut.println("TESTCOUNT");\\n';
            else
                harness +=
                    '        doppio.JavaScript.eval("parent.javaTestCount++");\\n';

            var inputStr =
                test.inputs.join("\\\\n") +
                "\\\\nrandom\\\\nrandom\\\\nrandom\\\\nrandom";
            harness += '        String inputValues = "' + inputStr + '";\\n';
            harness +=
                "        ByteArrayInputStream bais = new ByteArrayInputStream(inputValues.trim().getBytes());\\n" +
                "        System.setIn(bais);\\n";

            var shouldCallMain = true;
            if (
                !test.runMain &&
                $("div.parameter#multi").text().trim() == "true"
            ) {
                shouldCallMain = false;
            }

            if (shouldCallMain) {
                harness += "        " + classname + ".main(new String[5]);\\n";
            }

            var testCode = js_beautify(test.code);
            harness += "        " + testCode + "\\n";

            harness +=
                "        bais.close();\\n" +
                "        System.setIn(oldSysIn);\\n" +
                "        return false;\\n" +
                "    }\\n";
        }

        harness += "}\\n";
        return harness;
    },

    run: function (element) {
        var testData = this.parseTest(element);

        // Reset state
        if (numTestMon) {
            clearInterval(numTestMon);
            numTestMon = undefined;
        }
        javaTestCount = 0;
        javaFailTips = [];
        javaTestData = undefined;
        javaTestMedal = undefined;

        // Prepare user code
        var codeFiles = getTabBundleCode(true)[0];
        var code = editor.getValue();

        // Pigin Java wrapping
        if ($("div.parameter#multi").text().trim() != "true") {
            if (!code.match(/\s*class\s*/) && !code.match(/\s*void\s*main/)) {
                code =
                    "import java.util.Scanner; public class Pigin { public static void main(String[] args) { " +
                    code +
                    "\\n} }";
                codeFiles[0] = code;
            }
        }

        var mainsPkgs = getMainsPkgs(codeFiles);
        if (mainsPkgs.length == 0) {
            apprise(
                "This code can't run. There doesn't appear to be a main method."
            );
            return;
        }
        if (mainsPkgs.length != 1) {
            apprise(
                "This code can't be tested. It appears as if there's more than one main method."
            );
            return;
        }

        var classname = mainsPkgs[0][0];
        var packig = mainsPkgs[0][1];
        if (packig) classname = packig + "." + classname;

        // Generate harness
        var harness = this.generateHarness(testData, classname);

        codeFiles.push(harness);

        // Setup callbacks
        javaSuccessfulRun = this.onSuccess;
        javaRuntimeError = this.onError;

        // UI Updates
        LOGtestStart(
            testData.id,
            getTabBundleCode(),
            undefined,
            testData.medal
        );

        if (!newdoppio) {
            if (outputframe.controller) outputframe.controller.reset();
            $("div#console pre", outputframe.document).hide();
        } else {
            outputframe.globalTerm.reset();
            outputframe.globalTerm.focus();
            $("div#output-main div.status").remove();
            status("Testing...", "border test");
        }

        // Start progress monitor
        if (!newdoppio) {
            status("Testing... test number 0", "border test wipe");
            numTestMon = setInterval(function () {
                try {
                    var doneNum = getConsoleText()
                        .trim()
                        .match(/TESTCOUNT/g).length;
                    status(
                        "Testing... test number " + doneNum,
                        "border test wipe"
                    );
                } catch (e) {}
            }, 500);
        } else {
            numTestMon = setInterval(function () {
                status(
                    "Testing... test number " + javaTestCount,
                    "border test wipe"
                );
            }, 500);
        }

        actuallyDoRunJava(codeFiles, ["NoobLabTester", undefined], true);
    },

    onSuccess: function (mark, medal) {
        clearInterval(numTestMon);
        numTestMon = undefined;
        enableRun();

        if (newdoppio) {
            $("div#output-main div.status div.test").remove();
            var consoletext = getConsoleText();
            if (consoletext.indexOf("Exception in thread") != -1) {
                var errorText = consoletext.match(
                    /(Exception in thread [\s\S]*)/g
                )[0];
                $("div#output-main div.status").remove();
                JavaTestManager.onError(errorText);
                return;
            }
        }

        // Parse results
        if (medal == undefined) {
            if (newdoppio) {
                try {
                    medal = javaTestMedal;
                } catch (e) {}
                javaTestMedal = undefined;
            } else {
                var m = getConsoleText()
                    .replace(/\n/g, "")
                    .match(/NOOBLABMEDALSTART:(.*?):NOOBLABMEDALEND/);
                if (m) medal = m[1];
            }
        }

        if (mark == undefined) {
            if (newdoppio) {
                mark = javaTestData;
                javaTestData = undefined;
            } else {
                var m = getConsoleText()
                    .trim()
                    .replace(/\n/g, "")
                    .match(/NOOBLABTESTSTART:(.*?):NOOBLABTESTEND/);
                mark = m ? m[1] : "0/1";
            }
        }

        if (!mark) mark = "0/1";
        var parts = mark.split("/");
        var score = parseInt(parts[0]);
        var max = parseInt(parts[1]);

        var msg = "";
        var failtips = newdoppio
            ? javaFailTips
            : getConsoleText()
                  .trim()
                  .match(/FailTip:(.*)/g);

        if (failtips) {
            $.each(failtips, function () {
                var tip = this.toString().replace("FailTip:", "");
                msg +=
                    '<p style="margin-top: 0px; color: black;">Feedback: ' +
                    tip +
                    "</p>";
            });
        }

        var type = "error border";
        if (score == max) {
            msg +=
                "Well done! Your work successfully passed all the tests for this exercise!";
            type = "success border";
            LOGtestPassed(medal);
        } else {
            msg +=
                "Sorry! Your work is not a correct solution to the exercise.";
            LOGtestFailed(score + "/" + max);
        }

        if (medal) {
            var medalData = medal.split(":");
            var medalName = medalData[1];
            var medalType =
                medalData[0] == "ribbon"
                    ? medalData[0]
                    : medalData[0] + " medal";
            msg +=
                '<p style="text-align: center"><img src="' +
                contextPath +
                "/images/medal" +
                medalData[0] +
                '.png"/></p>';
            msg +=
                "Passing this test awards you a " +
                medalType +
                ' for the "' +
                medalName +
                '" challenge!';

            // Find the last clicked test link to get ID
            // We can store it in JavaTestManager.currentTestId or similar, or just use the global lasttestlink if it's still valid.
            // The init function sets the click handler but doesn't set lasttestlink.
            // Let's assume we can pass it or store it.
            // For now, I'll rely on the fact that the user just clicked it.
            if (lasttestlink) {
                var id = $(lasttestlink).attr("data-id");
                LOGmedal(medal, id);
                howDoYouFeelAbout(
                    lasttestlink,
                    "Well done! Your code was good enough for a medal!",
                    medalType
                );
            }
        }

        status(msg, type);
    },

    onError: function (error) {
        javaruntimeerror = false;
        enableRun();
        clearInterval(numTestMon);

        var msg = "Sorry! Your code threw a runtime error during the test.";
        status(msg, "error border");
        console.log(error);
        LOGtestFailed("RuntimeError:" + error, "error border");

        // Reset callback
        javaRuntimeError = standardJavaRuntimeError;
    },
};

function getConsoleText() {
    if (!newdoppio) {
        return $("div#console", outputframe.document).text().trim();
    } else {
        var text = "";
        var rawlines = outputframe.globalTerm.lines;
        for (var i = 0; i < rawlines.length; i++) {
            var currentraw = rawlines[i];
            var textline = "";
            for (var x = 0; x < currentraw.length; x++) {
                textline += currentraw[x][1];
            }
            textline = textline.replace(/\u00A0/g, " ");
            textline = textline.replace(/\s*$/, "");
            textline += "\n";
            text += textline;
        }
        return text.trim();
    }
}

var JavaTestManager = {
    init: function () {
        $(".testCase").each(function () {
            var id = $(this)[0].id;
            if ($(this).find("div.id").length != 0) {
                id = $(this).find("div.id").text().trim();
            }
            if (id == undefined) id = "";

            var medal = undefined;
            if ($(this).find("div.medalType").length != 0) {
                medal = $(this).find("div.medalType").text().trim();
                if ($(this).find("div.medalDesc").length != 0) {
                    medal +=
                        ":" +
                        $(this).find("div.medalDesc").text().trim() +
                        ":" +
                        id;
                } else {
                    medal += ":" + id;
                }
            }
            if (medal != undefined) $(this).attr("data-medal", medal);
            $(this).attr("data-id", id);

            var linkText = ">>> Click here to test your code <<<";
            if (medal != undefined) {
                linkText = linkText.replace(
                    "code",
                    "code for a " + medal.split(":")[0] + " medal"
                );
                linkText = linkText.replace("ribbon medal", "ribbon");
            }

            $(this).text(linkText);

            $(this).append(
                '<span class="override"><br/><input type="password"/><button>Override</button><button>Hide</button></div>'
            );

            $(this)
                .find("input")
                .click(function (e) {
                    e.stopPropagation();
                });

            $(this)
                .find("button")
                .eq(0)
                .click(function (e) {
                    e.stopPropagation();
                    var inp = $(this).parent().find("input").val();
                    $.get(
                        contextPath + "/OverrideCheck?pw=" + inp,
                        function (res) {
                            if (res == "good") {
                                LOGtestStart(id, "", true, medal);
                                JavaTestManager.onSuccess("1/1", medal);
                            }
                        }
                    );
                });

            $(this)
                .find("button")
                .eq(1)
                .click(function (e) {
                    e.stopPropagation();
                    $(this).parent().find("button,br,input").hide();
                })
                .click();

            $(this).css({
                border: "1px solid black",
                background: "white",
                cursor: "pointer",
                padding: "5px",
                fontWeight: "bold",
                textAlign: "center",
            });

            $(this).click(function (e) {
                if (e.shiftKey) {
                    $(this).find("button,br,input").show();
                    return;
                }
                lasttestlink = this;
                JavaTestManager.run(this);
            });
        });
    },

    parseTest: function (element) {
        var el = $(element);
        var testData = {
            id: el.attr("data-id"),
            medal: el.attr("data-medal"),
            tests: [],
            codeIncludes: [],
        };

        el.find(".test").each(function () {
            var testObj = {
                code: $(this).hasClass("code")
                    ? $(this).text().trim()
                    : $(this).find(".code").text().trim(),
                inputs: [],
                runMain: $(this).hasClass("runmain"),
            };

            $(this)
                .find(".inputTest")
                .each(function () {
                    testObj.inputs.push($(this).text().trim());
                });

            testData.tests.push(testObj);
        });

        el.find(".codeIncludes").each(function () {
            testData.codeIncludes.push({
                text: $(this).text().trim(),
                feedback: $(this).attr("data-feedback"),
            });
        });

        return testData;
    },

    generateHarness: function (testData, classname) {
        var harness =
            "import java.io.ByteArrayOutputStream;\n" +
            "import java.io.ByteArrayInputStream;\n" +
            "import java.io.PrintStream;\n" +
            "import java.io.InputStream;\n" +
            "import java.io.IOException;\n" +
            "import java.lang.reflect.*;\n" +
            "public class NoobLabTester {\n" +
            "    static ByteArrayOutputStream baos = new ByteArrayOutputStream();\n" +
            "    public static PrintStream oldSysOut = System.out;\n" +
            "    public static InputStream oldSysIn = System.in;\n" +
            "    public static void main(String[] args) throws IOException {\n" +
            "        int noOfTests = " +
            testData.tests.length +
            ";\n" +
            "        int testsPassed = 0;\n";

        var userCode = getTabBundleCode(false);
        var offset = "";
        var extraTests = 0;

        testData.codeIncludes.forEach(function (inc) {
            extraTests++;
            var mustInclude = inc.text;
            var notEqual = "false";
            if (mustInclude.charAt(0) == "!") {
                mustInclude = mustInclude.substring(1);
                notEqual = "true";
            } else if (mustInclude.charAt(0) == "#") {
                mustInclude = mustInclude.substring(1);
                notEqual = "regex";
            }

            var passed = false;
            if (notEqual == "true") {
                if (userCode.indexOf(mustInclude) == -1) passed = true;
            } else if (notEqual == "false") {
                if (userCode.indexOf(mustInclude) != -1) passed = true;
            } else if (notEqual == "regex") {
                if (userCode.search(new RegExp(mustInclude)) != -1)
                    passed = true;
            }

            if (passed) {
                offset += "testsPassed++; ";
                if (!newdoppio) offset += 'oldSysOut.println("TESTCOUNT"); ';
                else
                    offset +=
                        'doppio.JavaScript.eval("parent.javaTestCount++"); ';
            } else {
                if (!newdoppio) offset += 'oldSysOut.println("TESTCOUNT"); ';
                else
                    offset +=
                        'doppio.JavaScript.eval("parent.javaTestCount++"); ';
                if (inc.feedback) {
                    if (!newdoppio)
                        offset +=
                            'oldSysOut.println("FailTip:' +
                            inc.feedback.replace(/"/g, '\\"') +
                            '"); ';
                    else
                        offset +=
                            "doppio.JavaScript.eval(\"parent.javaFailTips.push('" +
                            inc.feedback.replace(/'/g, "\\'") +
                            "')\"); ";
                }
            }
        });

        harness += "        noOfTests += " + extraTests + ";\n";
        harness += "        " + offset + "\n";

        harness +=
            "        PrintStream ps = new PrintStream(baos);\n" +
            "        System.setOut(ps);\n";

        for (var i = 0; i < testData.tests.length; i++) {
            harness += "        if (test" + i + "()) testsPassed++;\n";
        }

        harness +=
            "        System.out.flush();\n" +
            "        System.setOut(oldSysOut);\n";

        if (!newdoppio) {
            harness +=
                '        System.out.println("NOOBLABTESTSTART:"+testsPassed+"/"+noOfTests+":NOOBLABTESTEND");\n';
        } else {
            harness +=
                '        doppio.JavaScript.eval("parent.javaTestData = \'"+testsPassed+"/"+noOfTests+"\'");\n';
        }

        if (testData.medal) {
            if (!newdoppio) {
                harness +=
                    '        if (testsPassed == noOfTests) System.out.println("NOOBLABMEDALSTART:' +
                    testData.medal +
                    ':NOOBLABMEDALEND");\n';
            } else {
                harness +=
                    "        if (testsPassed == noOfTests) doppio.JavaScript.eval(\"parent.javaTestMedal='" +
                    testData.medal.replace(/'/g, "\\'") +
                    "'\");\n";
            }
        }

        harness += "    }\n";

        harness +=
            "    public static String consoleOutput() { return baos.toString(); }\n" +
            '    public static String[] consoleOutputAsLines() { return consoleOutput().split("\\r\\n?|\\n"); }\n';

        for (var i = 0; i < testData.tests.length; i++) {
            var test = testData.tests[i];
            harness +=
                "    public static boolean test" +
                i +
                "() throws IOException {\n";

            if (!newdoppio)
                harness += '        oldSysOut.println("TESTCOUNT");\n';
            else
                harness +=
                    '        doppio.JavaScript.eval("parent.javaTestCount++");\n';

            var inputStr =
                test.inputs.join("\n") + "\nrandom\nrandom\nrandom\nrandom";
            harness += '        String inputValues = "' + inputStr + '";\n';
            harness +=
                "        ByteArrayInputStream bais = new ByteArrayInputStream(inputValues.trim().getBytes());\n" +
                "        System.setIn(bais);\n";

            var shouldRunMain =
                test.runMain ||
                $("div.parameter#multi").text().trim() != "true";
            if (shouldRunMain) {
                harness += "        " + classname + ".main(new String[5]);\n";
            }

            var testCode = js_beautify(test.code);
            harness += "        " + testCode + "\n";

            harness +=
                "        bais.close();\n" +
                "        System.setIn(oldSysIn);\n" +
                "        return false;\n" +
                "    }\n";
        }

        harness += "}\n";
        return harness;
    },

    run: function (element) {
        var testData = this.parseTest(element);

        if (numTestMon) {
            clearInterval(numTestMon);
            numTestMon = undefined;
        }
        javaTestCount = 0;
        javaFailTips = [];
        javaTestData = undefined;
        javaTestMedal = undefined;

        var codeFiles = getTabBundleCode(true)[0];
        var code = editor.getValue();

        if ($("div.parameter#multi").text().trim() != "true") {
            if (!code.match(/\s*class\s*/) && !code.match(/\s*void\s*main/)) {
                code =
                    "import java.util.Scanner; public class Pigin { public static void main(String[] args) { " +
                    code +
                    "\n} }";
                codeFiles[0] = code;
            }
        }

        var mainsPkgs = getMainsPkgs(codeFiles);
        if (mainsPkgs.length == 0) {
            apprise(
                "This code can't run. There doesn't appear to be a main method."
            );
            return;
        }
        if (mainsPkgs.length != 1) {
            apprise(
                "This code can't be tested. It appears as if there's more than one main method."
            );
            return;
        }

        var classname = mainsPkgs[0][0];
        var packig = mainsPkgs[0][1];
        if (packig) classname = packig + "." + classname;

        var harness = this.generateHarness(testData, classname);

        codeFiles.push(harness);

        javaSuccessfulRun = this.onSuccess;
        javaRuntimeError = this.onError;

        LOGtestStart(
            testData.id,
            getTabBundleCode(),
            undefined,
            testData.medal
        );

        if (!newdoppio) {
            if (outputframe.controller) outputframe.controller.reset();
            $("div#console pre", outputframe.document).hide();
        } else {
            outputframe.globalTerm.reset();
            outputframe.globalTerm.focus();
            $("div#output-main div.status").remove();
            status("Testing...", "border test");
        }

        if (!newdoppio) {
            status("Testing... test number 0", "border test wipe");
            numTestMon = setInterval(function () {
                try {
                    var doneNum = getConsoleText()
                        .trim()
                        .match(/TESTCOUNT/g).length;
                    status(
                        "Testing... test number " + doneNum,
                        "border test wipe"
                    );
                } catch (e) {}
            }, 500);
        } else {
            numTestMon = setInterval(function () {
                status(
                    "Testing... test number " + javaTestCount,
                    "border test wipe"
                );
            }, 500);
        }

        actuallyDoRunJava(codeFiles, ["NoobLabTester", undefined], true);
    },

    onSuccess: function (mark, medal) {
        clearInterval(numTestMon);
        numTestMon = undefined;
        enableRun();

        if (newdoppio) {
            $("div#output-main div.status").remove();
            var consoletext = getConsoleText();
            if (consoletext.indexOf("Exception in thread") != -1) {
                var errorText = consoletext.match(
                    /(Exception in thread [\s\S]*)/g
                )[0];
                $("div#output-main div.status").remove();
                JavaTestManager.onError(errorText);
                return;
            }
        }

        if (medal == undefined) {
            if (newdoppio) {
                try {
                    medal = javaTestMedal;
                } catch (e) {}
                javaTestMedal = undefined;
            } else {
                var m = getConsoleText()
                    .replace(/\n/g, "")
                    .match(/NOOBLABMEDALSTART:(.*?):NOOBLABMEDALEND/);
                if (m) medal = m[1];
            }
        }

        if (mark == undefined) {
            if (newdoppio) {
                mark = javaTestData;
                javaTestData = undefined;
            } else {
                var m = getConsoleText()
                    .trim()
                    .replace(/\n/g, "")
                    .match(/NOOBLABTESTSTART:(.*?):NOOBLABTESTEND/);
                mark = m ? m[1] : "0/1";
            }
        }

        if (!mark) mark = "0/1";
        var parts = mark.split("/");
        var score = parseInt(parts[0]);
        var max = parseInt(parts[1]);

        var msg = "";
        var failtips = newdoppio
            ? javaFailTips
            : getConsoleText()
                  .trim()
                  .match(/FailTip:(.*)/g);

        if (failtips) {
            $.each(failtips, function () {
                var tip = this.toString().replace("FailTip:", "");
                msg +=
                    '<p style="margin-top: 0px; color: black;">Feedback: ' +
                    tip +
                    "</p>";
            });
        }

        var type = "error border";
        if (score == max) {
            msg +=
                "Well done! Your work successfully passed all the tests for this exercise!";
            type = "success border";
            LOGtestPassed(medal);
        } else {
            msg +=
                "Sorry! Your work is not a correct solution to the exercise.";
            LOGtestFailed(score + "/" + max);
        }

        if (medal) {
            var medalData = medal.split(":");
            var medalName = medalData[1];
            var medalType =
                medalData[0] == "ribbon"
                    ? medalData[0]
                    : medalData[0] + " medal";
            msg +=
                '<p style="text-align: center"><img src="' +
                contextPath +
                "/images/medal" +
                medalData[0] +
                '.png"/></p>';
            msg +=
                "Passing this test awards you a " +
                medalType +
                ' for the "' +
                medalName +
                '" challenge!';

            if (score == max) {
                apprise(msg, { animate: true });
                if (typeof confetti !== "undefined" && confetti.start) {
                    confetti.start(3000);
                }
            }
        }

        // status(msg, type);
    },

    onError: function (error) {
        javaruntimeerror = false;
        enableRun();
        clearInterval(numTestMon);

        var msg = "Sorry! Your code threw a runtime error during the test.";
        status(msg, "error border");
        console.log(error);
        LOGtestFailed("RuntimeError:" + error, "error border");

        javaRuntimeError = standardJavaRuntimeError;
    },
};
