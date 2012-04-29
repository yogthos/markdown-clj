var COMPILED = false;
var goog = goog || {};
goog.global = this;
goog.DEBUG = true;
goog.LOCALE = "en";
goog.evalWorksForGlobals_ = null;
goog.provide = function(name) {
  if(!COMPILED) {
    if(goog.getObjectByName(name) && !goog.implicitNamespaces_[name]) {
      throw Error('Namespace "' + name + '" already declared.');
    }
    var namespace = name;
    while(namespace = namespace.substring(0, namespace.lastIndexOf("."))) {
      goog.implicitNamespaces_[namespace] = true
    }
  }
  goog.exportPath_(name)
};
goog.setTestOnly = function(opt_message) {
  if(COMPILED && !goog.DEBUG) {
    opt_message = opt_message || "";
    throw Error("Importing test-only code into non-debug environment" + opt_message ? ": " + opt_message : ".");
  }
};
if(!COMPILED) {
  goog.implicitNamespaces_ = {}
}
goog.exportPath_ = function(name, opt_object, opt_objectToExportTo) {
  var parts = name.split(".");
  var cur = opt_objectToExportTo || goog.global;
  if(!(parts[0] in cur) && cur.execScript) {
    cur.execScript("var " + parts[0])
  }
  for(var part;parts.length && (part = parts.shift());) {
    if(!parts.length && goog.isDef(opt_object)) {
      cur[part] = opt_object
    }else {
      if(cur[part]) {
        cur = cur[part]
      }else {
        cur = cur[part] = {}
      }
    }
  }
};
goog.getObjectByName = function(name, opt_obj) {
  var parts = name.split(".");
  var cur = opt_obj || goog.global;
  for(var part;part = parts.shift();) {
    if(goog.isDefAndNotNull(cur[part])) {
      cur = cur[part]
    }else {
      return null
    }
  }
  return cur
};
goog.globalize = function(obj, opt_global) {
  var global = opt_global || goog.global;
  for(var x in obj) {
    global[x] = obj[x]
  }
};
goog.addDependency = function(relPath, provides, requires) {
  if(!COMPILED) {
    var provide, require;
    var path = relPath.replace(/\\/g, "/");
    var deps = goog.dependencies_;
    for(var i = 0;provide = provides[i];i++) {
      deps.nameToPath[provide] = path;
      if(!(path in deps.pathToNames)) {
        deps.pathToNames[path] = {}
      }
      deps.pathToNames[path][provide] = true
    }
    for(var j = 0;require = requires[j];j++) {
      if(!(path in deps.requires)) {
        deps.requires[path] = {}
      }
      deps.requires[path][require] = true
    }
  }
};
goog.require = function(rule) {
  if(!COMPILED) {
    if(goog.getObjectByName(rule)) {
      return
    }
    var path = goog.getPathFromDeps_(rule);
    if(path) {
      goog.included_[path] = true;
      goog.writeScripts_()
    }else {
      var errorMessage = "goog.require could not find: " + rule;
      if(goog.global.console) {
        goog.global.console["error"](errorMessage)
      }
      throw Error(errorMessage);
    }
  }
};
goog.basePath = "";
goog.global.CLOSURE_BASE_PATH;
goog.global.CLOSURE_NO_DEPS;
goog.global.CLOSURE_IMPORT_SCRIPT;
goog.nullFunction = function() {
};
goog.identityFunction = function(var_args) {
  return arguments[0]
};
goog.abstractMethod = function() {
  throw Error("unimplemented abstract method");
};
goog.addSingletonGetter = function(ctor) {
  ctor.getInstance = function() {
    return ctor.instance_ || (ctor.instance_ = new ctor)
  }
};
if(!COMPILED) {
  goog.included_ = {};
  goog.dependencies_ = {pathToNames:{}, nameToPath:{}, requires:{}, visited:{}, written:{}};
  goog.inHtmlDocument_ = function() {
    var doc = goog.global.document;
    return typeof doc != "undefined" && "write" in doc
  };
  goog.findBasePath_ = function() {
    if(goog.global.CLOSURE_BASE_PATH) {
      goog.basePath = goog.global.CLOSURE_BASE_PATH;
      return
    }else {
      if(!goog.inHtmlDocument_()) {
        return
      }
    }
    var doc = goog.global.document;
    var scripts = doc.getElementsByTagName("script");
    for(var i = scripts.length - 1;i >= 0;--i) {
      var src = scripts[i].src;
      var qmark = src.lastIndexOf("?");
      var l = qmark == -1 ? src.length : qmark;
      if(src.substr(l - 7, 7) == "base.js") {
        goog.basePath = src.substr(0, l - 7);
        return
      }
    }
  };
  goog.importScript_ = function(src) {
    var importScript = goog.global.CLOSURE_IMPORT_SCRIPT || goog.writeScriptTag_;
    if(!goog.dependencies_.written[src] && importScript(src)) {
      goog.dependencies_.written[src] = true
    }
  };
  goog.writeScriptTag_ = function(src) {
    if(goog.inHtmlDocument_()) {
      var doc = goog.global.document;
      doc.write('<script type="text/javascript" src="' + src + '"></' + "script>");
      return true
    }else {
      return false
    }
  };
  goog.writeScripts_ = function() {
    var scripts = [];
    var seenScript = {};
    var deps = goog.dependencies_;
    function visitNode(path) {
      if(path in deps.written) {
        return
      }
      if(path in deps.visited) {
        if(!(path in seenScript)) {
          seenScript[path] = true;
          scripts.push(path)
        }
        return
      }
      deps.visited[path] = true;
      if(path in deps.requires) {
        for(var requireName in deps.requires[path]) {
          if(requireName in deps.nameToPath) {
            visitNode(deps.nameToPath[requireName])
          }else {
            if(!goog.getObjectByName(requireName)) {
              throw Error("Undefined nameToPath for " + requireName);
            }
          }
        }
      }
      if(!(path in seenScript)) {
        seenScript[path] = true;
        scripts.push(path)
      }
    }
    for(var path in goog.included_) {
      if(!deps.written[path]) {
        visitNode(path)
      }
    }
    for(var i = 0;i < scripts.length;i++) {
      if(scripts[i]) {
        goog.importScript_(goog.basePath + scripts[i])
      }else {
        throw Error("Undefined script input");
      }
    }
  };
  goog.getPathFromDeps_ = function(rule) {
    if(rule in goog.dependencies_.nameToPath) {
      return goog.dependencies_.nameToPath[rule]
    }else {
      return null
    }
  };
  goog.findBasePath_();
  if(!goog.global.CLOSURE_NO_DEPS) {
    goog.importScript_(goog.basePath + "deps.js")
  }
}
goog.typeOf = function(value) {
  var s = typeof value;
  if(s == "object") {
    if(value) {
      if(value instanceof Array) {
        return"array"
      }else {
        if(value instanceof Object) {
          return s
        }
      }
      var className = Object.prototype.toString.call(value);
      if(className == "[object Window]") {
        return"object"
      }
      if(className == "[object Array]" || typeof value.length == "number" && typeof value.splice != "undefined" && typeof value.propertyIsEnumerable != "undefined" && !value.propertyIsEnumerable("splice")) {
        return"array"
      }
      if(className == "[object Function]" || typeof value.call != "undefined" && typeof value.propertyIsEnumerable != "undefined" && !value.propertyIsEnumerable("call")) {
        return"function"
      }
    }else {
      return"null"
    }
  }else {
    if(s == "function" && typeof value.call == "undefined") {
      return"object"
    }
  }
  return s
};
goog.propertyIsEnumerableCustom_ = function(object, propName) {
  if(propName in object) {
    for(var key in object) {
      if(key == propName && Object.prototype.hasOwnProperty.call(object, propName)) {
        return true
      }
    }
  }
  return false
};
goog.propertyIsEnumerable_ = function(object, propName) {
  if(object instanceof Object) {
    return Object.prototype.propertyIsEnumerable.call(object, propName)
  }else {
    return goog.propertyIsEnumerableCustom_(object, propName)
  }
};
goog.isDef = function(val) {
  return val !== undefined
};
goog.isNull = function(val) {
  return val === null
};
goog.isDefAndNotNull = function(val) {
  return val != null
};
goog.isArray = function(val) {
  return goog.typeOf(val) == "array"
};
goog.isArrayLike = function(val) {
  var type = goog.typeOf(val);
  return type == "array" || type == "object" && typeof val.length == "number"
};
goog.isDateLike = function(val) {
  return goog.isObject(val) && typeof val.getFullYear == "function"
};
goog.isString = function(val) {
  return typeof val == "string"
};
goog.isBoolean = function(val) {
  return typeof val == "boolean"
};
goog.isNumber = function(val) {
  return typeof val == "number"
};
goog.isFunction = function(val) {
  return goog.typeOf(val) == "function"
};
goog.isObject = function(val) {
  var type = goog.typeOf(val);
  return type == "object" || type == "array" || type == "function"
};
goog.getUid = function(obj) {
  return obj[goog.UID_PROPERTY_] || (obj[goog.UID_PROPERTY_] = ++goog.uidCounter_)
};
goog.removeUid = function(obj) {
  if("removeAttribute" in obj) {
    obj.removeAttribute(goog.UID_PROPERTY_)
  }
  try {
    delete obj[goog.UID_PROPERTY_]
  }catch(ex) {
  }
};
goog.UID_PROPERTY_ = "closure_uid_" + Math.floor(Math.random() * 2147483648).toString(36);
goog.uidCounter_ = 0;
goog.getHashCode = goog.getUid;
goog.removeHashCode = goog.removeUid;
goog.cloneObject = function(obj) {
  var type = goog.typeOf(obj);
  if(type == "object" || type == "array") {
    if(obj.clone) {
      return obj.clone()
    }
    var clone = type == "array" ? [] : {};
    for(var key in obj) {
      clone[key] = goog.cloneObject(obj[key])
    }
    return clone
  }
  return obj
};
Object.prototype.clone;
goog.bindNative_ = function(fn, selfObj, var_args) {
  return fn.call.apply(fn.bind, arguments)
};
goog.bindJs_ = function(fn, selfObj, var_args) {
  var context = selfObj || goog.global;
  if(arguments.length > 2) {
    var boundArgs = Array.prototype.slice.call(arguments, 2);
    return function() {
      var newArgs = Array.prototype.slice.call(arguments);
      Array.prototype.unshift.apply(newArgs, boundArgs);
      return fn.apply(context, newArgs)
    }
  }else {
    return function() {
      return fn.apply(context, arguments)
    }
  }
};
goog.bind = function(fn, selfObj, var_args) {
  if(Function.prototype.bind && Function.prototype.bind.toString().indexOf("native code") != -1) {
    goog.bind = goog.bindNative_
  }else {
    goog.bind = goog.bindJs_
  }
  return goog.bind.apply(null, arguments)
};
goog.partial = function(fn, var_args) {
  var args = Array.prototype.slice.call(arguments, 1);
  return function() {
    var newArgs = Array.prototype.slice.call(arguments);
    newArgs.unshift.apply(newArgs, args);
    return fn.apply(this, newArgs)
  }
};
goog.mixin = function(target, source) {
  for(var x in source) {
    target[x] = source[x]
  }
};
goog.now = Date.now || function() {
  return+new Date
};
goog.globalEval = function(script) {
  if(goog.global.execScript) {
    goog.global.execScript(script, "JavaScript")
  }else {
    if(goog.global.eval) {
      if(goog.evalWorksForGlobals_ == null) {
        goog.global.eval("var _et_ = 1;");
        if(typeof goog.global["_et_"] != "undefined") {
          delete goog.global["_et_"];
          goog.evalWorksForGlobals_ = true
        }else {
          goog.evalWorksForGlobals_ = false
        }
      }
      if(goog.evalWorksForGlobals_) {
        goog.global.eval(script)
      }else {
        var doc = goog.global.document;
        var scriptElt = doc.createElement("script");
        scriptElt.type = "text/javascript";
        scriptElt.defer = false;
        scriptElt.appendChild(doc.createTextNode(script));
        doc.body.appendChild(scriptElt);
        doc.body.removeChild(scriptElt)
      }
    }else {
      throw Error("goog.globalEval not available");
    }
  }
};
goog.cssNameMapping_;
goog.cssNameMappingStyle_;
goog.getCssName = function(className, opt_modifier) {
  var getMapping = function(cssName) {
    return goog.cssNameMapping_[cssName] || cssName
  };
  var renameByParts = function(cssName) {
    var parts = cssName.split("-");
    var mapped = [];
    for(var i = 0;i < parts.length;i++) {
      mapped.push(getMapping(parts[i]))
    }
    return mapped.join("-")
  };
  var rename;
  if(goog.cssNameMapping_) {
    rename = goog.cssNameMappingStyle_ == "BY_WHOLE" ? getMapping : renameByParts
  }else {
    rename = function(a) {
      return a
    }
  }
  if(opt_modifier) {
    return className + "-" + rename(opt_modifier)
  }else {
    return rename(className)
  }
};
goog.setCssNameMapping = function(mapping, style) {
  goog.cssNameMapping_ = mapping;
  goog.cssNameMappingStyle_ = style
};
goog.getMsg = function(str, opt_values) {
  var values = opt_values || {};
  for(var key in values) {
    var value = ("" + values[key]).replace(/\$/g, "$$$$");
    str = str.replace(new RegExp("\\{\\$" + key + "\\}", "gi"), value)
  }
  return str
};
goog.exportSymbol = function(publicPath, object, opt_objectToExportTo) {
  goog.exportPath_(publicPath, object, opt_objectToExportTo)
};
goog.exportProperty = function(object, publicName, symbol) {
  object[publicName] = symbol
};
goog.inherits = function(childCtor, parentCtor) {
  function tempCtor() {
  }
  tempCtor.prototype = parentCtor.prototype;
  childCtor.superClass_ = parentCtor.prototype;
  childCtor.prototype = new tempCtor;
  childCtor.prototype.constructor = childCtor
};
goog.base = function(me, opt_methodName, var_args) {
  var caller = arguments.callee.caller;
  if(caller.superClass_) {
    return caller.superClass_.constructor.apply(me, Array.prototype.slice.call(arguments, 1))
  }
  var args = Array.prototype.slice.call(arguments, 2);
  var foundCaller = false;
  for(var ctor = me.constructor;ctor;ctor = ctor.superClass_ && ctor.superClass_.constructor) {
    if(ctor.prototype[opt_methodName] === caller) {
      foundCaller = true
    }else {
      if(foundCaller) {
        return ctor.prototype[opt_methodName].apply(me, args)
      }
    }
  }
  if(me[opt_methodName] === caller) {
    return me.constructor.prototype[opt_methodName].apply(me, args)
  }else {
    throw Error("goog.base called from a method of one name " + "to a method of a different name");
  }
};
goog.scope = function(fn) {
  fn.call(goog.global)
};
goog.provide("goog.string");
goog.provide("goog.string.Unicode");
goog.string.Unicode = {NBSP:"\u00a0"};
goog.string.startsWith = function(str, prefix) {
  return str.lastIndexOf(prefix, 0) == 0
};
goog.string.endsWith = function(str, suffix) {
  var l = str.length - suffix.length;
  return l >= 0 && str.indexOf(suffix, l) == l
};
goog.string.caseInsensitiveStartsWith = function(str, prefix) {
  return goog.string.caseInsensitiveCompare(prefix, str.substr(0, prefix.length)) == 0
};
goog.string.caseInsensitiveEndsWith = function(str, suffix) {
  return goog.string.caseInsensitiveCompare(suffix, str.substr(str.length - suffix.length, suffix.length)) == 0
};
goog.string.subs = function(str, var_args) {
  for(var i = 1;i < arguments.length;i++) {
    var replacement = String(arguments[i]).replace(/\$/g, "$$$$");
    str = str.replace(/\%s/, replacement)
  }
  return str
};
goog.string.collapseWhitespace = function(str) {
  return str.replace(/[\s\xa0]+/g, " ").replace(/^\s+|\s+$/g, "")
};
goog.string.isEmpty = function(str) {
  return/^[\s\xa0]*$/.test(str)
};
goog.string.isEmptySafe = function(str) {
  return goog.string.isEmpty(goog.string.makeSafe(str))
};
goog.string.isBreakingWhitespace = function(str) {
  return!/[^\t\n\r ]/.test(str)
};
goog.string.isAlpha = function(str) {
  return!/[^a-zA-Z]/.test(str)
};
goog.string.isNumeric = function(str) {
  return!/[^0-9]/.test(str)
};
goog.string.isAlphaNumeric = function(str) {
  return!/[^a-zA-Z0-9]/.test(str)
};
goog.string.isSpace = function(ch) {
  return ch == " "
};
goog.string.isUnicodeChar = function(ch) {
  return ch.length == 1 && ch >= " " && ch <= "~" || ch >= "\u0080" && ch <= "\ufffd"
};
goog.string.stripNewlines = function(str) {
  return str.replace(/(\r\n|\r|\n)+/g, " ")
};
goog.string.canonicalizeNewlines = function(str) {
  return str.replace(/(\r\n|\r|\n)/g, "\n")
};
goog.string.normalizeWhitespace = function(str) {
  return str.replace(/\xa0|\s/g, " ")
};
goog.string.normalizeSpaces = function(str) {
  return str.replace(/\xa0|[ \t]+/g, " ")
};
goog.string.trim = function(str) {
  return str.replace(/^[\s\xa0]+|[\s\xa0]+$/g, "")
};
goog.string.trimLeft = function(str) {
  return str.replace(/^[\s\xa0]+/, "")
};
goog.string.trimRight = function(str) {
  return str.replace(/[\s\xa0]+$/, "")
};
goog.string.caseInsensitiveCompare = function(str1, str2) {
  var test1 = String(str1).toLowerCase();
  var test2 = String(str2).toLowerCase();
  if(test1 < test2) {
    return-1
  }else {
    if(test1 == test2) {
      return 0
    }else {
      return 1
    }
  }
};
goog.string.numerateCompareRegExp_ = /(\.\d+)|(\d+)|(\D+)/g;
goog.string.numerateCompare = function(str1, str2) {
  if(str1 == str2) {
    return 0
  }
  if(!str1) {
    return-1
  }
  if(!str2) {
    return 1
  }
  var tokens1 = str1.toLowerCase().match(goog.string.numerateCompareRegExp_);
  var tokens2 = str2.toLowerCase().match(goog.string.numerateCompareRegExp_);
  var count = Math.min(tokens1.length, tokens2.length);
  for(var i = 0;i < count;i++) {
    var a = tokens1[i];
    var b = tokens2[i];
    if(a != b) {
      var num1 = parseInt(a, 10);
      if(!isNaN(num1)) {
        var num2 = parseInt(b, 10);
        if(!isNaN(num2) && num1 - num2) {
          return num1 - num2
        }
      }
      return a < b ? -1 : 1
    }
  }
  if(tokens1.length != tokens2.length) {
    return tokens1.length - tokens2.length
  }
  return str1 < str2 ? -1 : 1
};
goog.string.encodeUriRegExp_ = /^[a-zA-Z0-9\-_.!~*'()]*$/;
goog.string.urlEncode = function(str) {
  str = String(str);
  if(!goog.string.encodeUriRegExp_.test(str)) {
    return encodeURIComponent(str)
  }
  return str
};
goog.string.urlDecode = function(str) {
  return decodeURIComponent(str.replace(/\+/g, " "))
};
goog.string.newLineToBr = function(str, opt_xml) {
  return str.replace(/(\r\n|\r|\n)/g, opt_xml ? "<br />" : "<br>")
};
goog.string.htmlEscape = function(str, opt_isLikelyToContainHtmlChars) {
  if(opt_isLikelyToContainHtmlChars) {
    return str.replace(goog.string.amperRe_, "&amp;").replace(goog.string.ltRe_, "&lt;").replace(goog.string.gtRe_, "&gt;").replace(goog.string.quotRe_, "&quot;")
  }else {
    if(!goog.string.allRe_.test(str)) {
      return str
    }
    if(str.indexOf("&") != -1) {
      str = str.replace(goog.string.amperRe_, "&amp;")
    }
    if(str.indexOf("<") != -1) {
      str = str.replace(goog.string.ltRe_, "&lt;")
    }
    if(str.indexOf(">") != -1) {
      str = str.replace(goog.string.gtRe_, "&gt;")
    }
    if(str.indexOf('"') != -1) {
      str = str.replace(goog.string.quotRe_, "&quot;")
    }
    return str
  }
};
goog.string.amperRe_ = /&/g;
goog.string.ltRe_ = /</g;
goog.string.gtRe_ = />/g;
goog.string.quotRe_ = /\"/g;
goog.string.allRe_ = /[&<>\"]/;
goog.string.unescapeEntities = function(str) {
  if(goog.string.contains(str, "&")) {
    if("document" in goog.global && !goog.string.contains(str, "<")) {
      return goog.string.unescapeEntitiesUsingDom_(str)
    }else {
      return goog.string.unescapePureXmlEntities_(str)
    }
  }
  return str
};
goog.string.unescapeEntitiesUsingDom_ = function(str) {
  var el = goog.global["document"]["createElement"]("div");
  el["innerHTML"] = "<pre>x" + str + "</pre>";
  if(el["firstChild"][goog.string.NORMALIZE_FN_]) {
    el["firstChild"][goog.string.NORMALIZE_FN_]()
  }
  str = el["firstChild"]["firstChild"]["nodeValue"].slice(1);
  el["innerHTML"] = "";
  return goog.string.canonicalizeNewlines(str)
};
goog.string.unescapePureXmlEntities_ = function(str) {
  return str.replace(/&([^;]+);/g, function(s, entity) {
    switch(entity) {
      case "amp":
        return"&";
      case "lt":
        return"<";
      case "gt":
        return">";
      case "quot":
        return'"';
      default:
        if(entity.charAt(0) == "#") {
          var n = Number("0" + entity.substr(1));
          if(!isNaN(n)) {
            return String.fromCharCode(n)
          }
        }
        return s
    }
  })
};
goog.string.NORMALIZE_FN_ = "normalize";
goog.string.whitespaceEscape = function(str, opt_xml) {
  return goog.string.newLineToBr(str.replace(/  /g, " &#160;"), opt_xml)
};
goog.string.stripQuotes = function(str, quoteChars) {
  var length = quoteChars.length;
  for(var i = 0;i < length;i++) {
    var quoteChar = length == 1 ? quoteChars : quoteChars.charAt(i);
    if(str.charAt(0) == quoteChar && str.charAt(str.length - 1) == quoteChar) {
      return str.substring(1, str.length - 1)
    }
  }
  return str
};
goog.string.truncate = function(str, chars, opt_protectEscapedCharacters) {
  if(opt_protectEscapedCharacters) {
    str = goog.string.unescapeEntities(str)
  }
  if(str.length > chars) {
    str = str.substring(0, chars - 3) + "..."
  }
  if(opt_protectEscapedCharacters) {
    str = goog.string.htmlEscape(str)
  }
  return str
};
goog.string.truncateMiddle = function(str, chars, opt_protectEscapedCharacters, opt_trailingChars) {
  if(opt_protectEscapedCharacters) {
    str = goog.string.unescapeEntities(str)
  }
  if(opt_trailingChars) {
    if(opt_trailingChars > chars) {
      opt_trailingChars = chars
    }
    var endPoint = str.length - opt_trailingChars;
    var startPoint = chars - opt_trailingChars;
    str = str.substring(0, startPoint) + "..." + str.substring(endPoint)
  }else {
    if(str.length > chars) {
      var half = Math.floor(chars / 2);
      var endPos = str.length - half;
      half += chars % 2;
      str = str.substring(0, half) + "..." + str.substring(endPos)
    }
  }
  if(opt_protectEscapedCharacters) {
    str = goog.string.htmlEscape(str)
  }
  return str
};
goog.string.specialEscapeChars_ = {"\x00":"\\0", "\u0008":"\\b", "\u000c":"\\f", "\n":"\\n", "\r":"\\r", "\t":"\\t", "\u000b":"\\x0B", '"':'\\"', "\\":"\\\\"};
goog.string.jsEscapeCache_ = {"'":"\\'"};
goog.string.quote = function(s) {
  s = String(s);
  if(s.quote) {
    return s.quote()
  }else {
    var sb = ['"'];
    for(var i = 0;i < s.length;i++) {
      var ch = s.charAt(i);
      var cc = ch.charCodeAt(0);
      sb[i + 1] = goog.string.specialEscapeChars_[ch] || (cc > 31 && cc < 127 ? ch : goog.string.escapeChar(ch))
    }
    sb.push('"');
    return sb.join("")
  }
};
goog.string.escapeString = function(str) {
  var sb = [];
  for(var i = 0;i < str.length;i++) {
    sb[i] = goog.string.escapeChar(str.charAt(i))
  }
  return sb.join("")
};
goog.string.escapeChar = function(c) {
  if(c in goog.string.jsEscapeCache_) {
    return goog.string.jsEscapeCache_[c]
  }
  if(c in goog.string.specialEscapeChars_) {
    return goog.string.jsEscapeCache_[c] = goog.string.specialEscapeChars_[c]
  }
  var rv = c;
  var cc = c.charCodeAt(0);
  if(cc > 31 && cc < 127) {
    rv = c
  }else {
    if(cc < 256) {
      rv = "\\x";
      if(cc < 16 || cc > 256) {
        rv += "0"
      }
    }else {
      rv = "\\u";
      if(cc < 4096) {
        rv += "0"
      }
    }
    rv += cc.toString(16).toUpperCase()
  }
  return goog.string.jsEscapeCache_[c] = rv
};
goog.string.toMap = function(s) {
  var rv = {};
  for(var i = 0;i < s.length;i++) {
    rv[s.charAt(i)] = true
  }
  return rv
};
goog.string.contains = function(s, ss) {
  return s.indexOf(ss) != -1
};
goog.string.removeAt = function(s, index, stringLength) {
  var resultStr = s;
  if(index >= 0 && index < s.length && stringLength > 0) {
    resultStr = s.substr(0, index) + s.substr(index + stringLength, s.length - index - stringLength)
  }
  return resultStr
};
goog.string.remove = function(s, ss) {
  var re = new RegExp(goog.string.regExpEscape(ss), "");
  return s.replace(re, "")
};
goog.string.removeAll = function(s, ss) {
  var re = new RegExp(goog.string.regExpEscape(ss), "g");
  return s.replace(re, "")
};
goog.string.regExpEscape = function(s) {
  return String(s).replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, "\\$1").replace(/\x08/g, "\\x08")
};
goog.string.repeat = function(string, length) {
  return(new Array(length + 1)).join(string)
};
goog.string.padNumber = function(num, length, opt_precision) {
  var s = goog.isDef(opt_precision) ? num.toFixed(opt_precision) : String(num);
  var index = s.indexOf(".");
  if(index == -1) {
    index = s.length
  }
  return goog.string.repeat("0", Math.max(0, length - index)) + s
};
goog.string.makeSafe = function(obj) {
  return obj == null ? "" : String(obj)
};
goog.string.buildString = function(var_args) {
  return Array.prototype.join.call(arguments, "")
};
goog.string.getRandomString = function() {
  var x = 2147483648;
  return Math.floor(Math.random() * x).toString(36) + Math.abs(Math.floor(Math.random() * x) ^ goog.now()).toString(36)
};
goog.string.compareVersions = function(version1, version2) {
  var order = 0;
  var v1Subs = goog.string.trim(String(version1)).split(".");
  var v2Subs = goog.string.trim(String(version2)).split(".");
  var subCount = Math.max(v1Subs.length, v2Subs.length);
  for(var subIdx = 0;order == 0 && subIdx < subCount;subIdx++) {
    var v1Sub = v1Subs[subIdx] || "";
    var v2Sub = v2Subs[subIdx] || "";
    var v1CompParser = new RegExp("(\\d*)(\\D*)", "g");
    var v2CompParser = new RegExp("(\\d*)(\\D*)", "g");
    do {
      var v1Comp = v1CompParser.exec(v1Sub) || ["", "", ""];
      var v2Comp = v2CompParser.exec(v2Sub) || ["", "", ""];
      if(v1Comp[0].length == 0 && v2Comp[0].length == 0) {
        break
      }
      var v1CompNum = v1Comp[1].length == 0 ? 0 : parseInt(v1Comp[1], 10);
      var v2CompNum = v2Comp[1].length == 0 ? 0 : parseInt(v2Comp[1], 10);
      order = goog.string.compareElements_(v1CompNum, v2CompNum) || goog.string.compareElements_(v1Comp[2].length == 0, v2Comp[2].length == 0) || goog.string.compareElements_(v1Comp[2], v2Comp[2])
    }while(order == 0)
  }
  return order
};
goog.string.compareElements_ = function(left, right) {
  if(left < right) {
    return-1
  }else {
    if(left > right) {
      return 1
    }
  }
  return 0
};
goog.string.HASHCODE_MAX_ = 4294967296;
goog.string.hashCode = function(str) {
  var result = 0;
  for(var i = 0;i < str.length;++i) {
    result = 31 * result + str.charCodeAt(i);
    result %= goog.string.HASHCODE_MAX_
  }
  return result
};
goog.string.uniqueStringCounter_ = Math.random() * 2147483648 | 0;
goog.string.createUniqueString = function() {
  return"goog_" + goog.string.uniqueStringCounter_++
};
goog.string.toNumber = function(str) {
  var num = Number(str);
  if(num == 0 && goog.string.isEmpty(str)) {
    return NaN
  }
  return num
};
goog.string.toCamelCaseCache_ = {};
goog.string.toCamelCase = function(str) {
  return goog.string.toCamelCaseCache_[str] || (goog.string.toCamelCaseCache_[str] = String(str).replace(/\-([a-z])/g, function(all, match) {
    return match.toUpperCase()
  }))
};
goog.string.toSelectorCaseCache_ = {};
goog.string.toSelectorCase = function(str) {
  return goog.string.toSelectorCaseCache_[str] || (goog.string.toSelectorCaseCache_[str] = String(str).replace(/([A-Z])/g, "-$1").toLowerCase())
};
goog.provide("goog.debug.Error");
goog.debug.Error = function(opt_msg) {
  this.stack = (new Error).stack || "";
  if(opt_msg) {
    this.message = String(opt_msg)
  }
};
goog.inherits(goog.debug.Error, Error);
goog.debug.Error.prototype.name = "CustomError";
goog.provide("goog.asserts");
goog.provide("goog.asserts.AssertionError");
goog.require("goog.debug.Error");
goog.require("goog.string");
goog.asserts.ENABLE_ASSERTS = goog.DEBUG;
goog.asserts.AssertionError = function(messagePattern, messageArgs) {
  messageArgs.unshift(messagePattern);
  goog.debug.Error.call(this, goog.string.subs.apply(null, messageArgs));
  messageArgs.shift();
  this.messagePattern = messagePattern
};
goog.inherits(goog.asserts.AssertionError, goog.debug.Error);
goog.asserts.AssertionError.prototype.name = "AssertionError";
goog.asserts.doAssertFailure_ = function(defaultMessage, defaultArgs, givenMessage, givenArgs) {
  var message = "Assertion failed";
  if(givenMessage) {
    message += ": " + givenMessage;
    var args = givenArgs
  }else {
    if(defaultMessage) {
      message += ": " + defaultMessage;
      args = defaultArgs
    }
  }
  throw new goog.asserts.AssertionError("" + message, args || []);
};
goog.asserts.assert = function(condition, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !condition) {
    goog.asserts.doAssertFailure_("", null, opt_message, Array.prototype.slice.call(arguments, 2))
  }
  return condition
};
goog.asserts.fail = function(opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS) {
    throw new goog.asserts.AssertionError("Failure" + (opt_message ? ": " + opt_message : ""), Array.prototype.slice.call(arguments, 1));
  }
};
goog.asserts.assertNumber = function(value, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !goog.isNumber(value)) {
    goog.asserts.doAssertFailure_("Expected number but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2))
  }
  return value
};
goog.asserts.assertString = function(value, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !goog.isString(value)) {
    goog.asserts.doAssertFailure_("Expected string but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2))
  }
  return value
};
goog.asserts.assertFunction = function(value, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !goog.isFunction(value)) {
    goog.asserts.doAssertFailure_("Expected function but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2))
  }
  return value
};
goog.asserts.assertObject = function(value, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !goog.isObject(value)) {
    goog.asserts.doAssertFailure_("Expected object but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2))
  }
  return value
};
goog.asserts.assertArray = function(value, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !goog.isArray(value)) {
    goog.asserts.doAssertFailure_("Expected array but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2))
  }
  return value
};
goog.asserts.assertBoolean = function(value, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !goog.isBoolean(value)) {
    goog.asserts.doAssertFailure_("Expected boolean but got %s: %s.", [goog.typeOf(value), value], opt_message, Array.prototype.slice.call(arguments, 2))
  }
  return value
};
goog.asserts.assertInstanceof = function(value, type, opt_message, var_args) {
  if(goog.asserts.ENABLE_ASSERTS && !(value instanceof type)) {
    goog.asserts.doAssertFailure_("instanceof check failed.", null, opt_message, Array.prototype.slice.call(arguments, 3))
  }
};
goog.provide("goog.array");
goog.provide("goog.array.ArrayLike");
goog.require("goog.asserts");
goog.NATIVE_ARRAY_PROTOTYPES = true;
goog.array.ArrayLike;
goog.array.peek = function(array) {
  return array[array.length - 1]
};
goog.array.ARRAY_PROTOTYPE_ = Array.prototype;
goog.array.indexOf = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.indexOf ? function(arr, obj, opt_fromIndex) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.indexOf.call(arr, obj, opt_fromIndex)
} : function(arr, obj, opt_fromIndex) {
  var fromIndex = opt_fromIndex == null ? 0 : opt_fromIndex < 0 ? Math.max(0, arr.length + opt_fromIndex) : opt_fromIndex;
  if(goog.isString(arr)) {
    if(!goog.isString(obj) || obj.length != 1) {
      return-1
    }
    return arr.indexOf(obj, fromIndex)
  }
  for(var i = fromIndex;i < arr.length;i++) {
    if(i in arr && arr[i] === obj) {
      return i
    }
  }
  return-1
};
goog.array.lastIndexOf = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.lastIndexOf ? function(arr, obj, opt_fromIndex) {
  goog.asserts.assert(arr.length != null);
  var fromIndex = opt_fromIndex == null ? arr.length - 1 : opt_fromIndex;
  return goog.array.ARRAY_PROTOTYPE_.lastIndexOf.call(arr, obj, fromIndex)
} : function(arr, obj, opt_fromIndex) {
  var fromIndex = opt_fromIndex == null ? arr.length - 1 : opt_fromIndex;
  if(fromIndex < 0) {
    fromIndex = Math.max(0, arr.length + fromIndex)
  }
  if(goog.isString(arr)) {
    if(!goog.isString(obj) || obj.length != 1) {
      return-1
    }
    return arr.lastIndexOf(obj, fromIndex)
  }
  for(var i = fromIndex;i >= 0;i--) {
    if(i in arr && arr[i] === obj) {
      return i
    }
  }
  return-1
};
goog.array.forEach = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.forEach ? function(arr, f, opt_obj) {
  goog.asserts.assert(arr.length != null);
  goog.array.ARRAY_PROTOTYPE_.forEach.call(arr, f, opt_obj)
} : function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = 0;i < l;i++) {
    if(i in arr2) {
      f.call(opt_obj, arr2[i], i, arr)
    }
  }
};
goog.array.forEachRight = function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = l - 1;i >= 0;--i) {
    if(i in arr2) {
      f.call(opt_obj, arr2[i], i, arr)
    }
  }
};
goog.array.filter = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.filter ? function(arr, f, opt_obj) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.filter.call(arr, f, opt_obj)
} : function(arr, f, opt_obj) {
  var l = arr.length;
  var res = [];
  var resLength = 0;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = 0;i < l;i++) {
    if(i in arr2) {
      var val = arr2[i];
      if(f.call(opt_obj, val, i, arr)) {
        res[resLength++] = val
      }
    }
  }
  return res
};
goog.array.map = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.map ? function(arr, f, opt_obj) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.map.call(arr, f, opt_obj)
} : function(arr, f, opt_obj) {
  var l = arr.length;
  var res = new Array(l);
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = 0;i < l;i++) {
    if(i in arr2) {
      res[i] = f.call(opt_obj, arr2[i], i, arr)
    }
  }
  return res
};
goog.array.reduce = function(arr, f, val, opt_obj) {
  if(arr.reduce) {
    if(opt_obj) {
      return arr.reduce(goog.bind(f, opt_obj), val)
    }else {
      return arr.reduce(f, val)
    }
  }
  var rval = val;
  goog.array.forEach(arr, function(val, index) {
    rval = f.call(opt_obj, rval, val, index, arr)
  });
  return rval
};
goog.array.reduceRight = function(arr, f, val, opt_obj) {
  if(arr.reduceRight) {
    if(opt_obj) {
      return arr.reduceRight(goog.bind(f, opt_obj), val)
    }else {
      return arr.reduceRight(f, val)
    }
  }
  var rval = val;
  goog.array.forEachRight(arr, function(val, index) {
    rval = f.call(opt_obj, rval, val, index, arr)
  });
  return rval
};
goog.array.some = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.some ? function(arr, f, opt_obj) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.some.call(arr, f, opt_obj)
} : function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = 0;i < l;i++) {
    if(i in arr2 && f.call(opt_obj, arr2[i], i, arr)) {
      return true
    }
  }
  return false
};
goog.array.every = goog.NATIVE_ARRAY_PROTOTYPES && goog.array.ARRAY_PROTOTYPE_.every ? function(arr, f, opt_obj) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.every.call(arr, f, opt_obj)
} : function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = 0;i < l;i++) {
    if(i in arr2 && !f.call(opt_obj, arr2[i], i, arr)) {
      return false
    }
  }
  return true
};
goog.array.find = function(arr, f, opt_obj) {
  var i = goog.array.findIndex(arr, f, opt_obj);
  return i < 0 ? null : goog.isString(arr) ? arr.charAt(i) : arr[i]
};
goog.array.findIndex = function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = 0;i < l;i++) {
    if(i in arr2 && f.call(opt_obj, arr2[i], i, arr)) {
      return i
    }
  }
  return-1
};
goog.array.findRight = function(arr, f, opt_obj) {
  var i = goog.array.findIndexRight(arr, f, opt_obj);
  return i < 0 ? null : goog.isString(arr) ? arr.charAt(i) : arr[i]
};
goog.array.findIndexRight = function(arr, f, opt_obj) {
  var l = arr.length;
  var arr2 = goog.isString(arr) ? arr.split("") : arr;
  for(var i = l - 1;i >= 0;i--) {
    if(i in arr2 && f.call(opt_obj, arr2[i], i, arr)) {
      return i
    }
  }
  return-1
};
goog.array.contains = function(arr, obj) {
  return goog.array.indexOf(arr, obj) >= 0
};
goog.array.isEmpty = function(arr) {
  return arr.length == 0
};
goog.array.clear = function(arr) {
  if(!goog.isArray(arr)) {
    for(var i = arr.length - 1;i >= 0;i--) {
      delete arr[i]
    }
  }
  arr.length = 0
};
goog.array.insert = function(arr, obj) {
  if(!goog.array.contains(arr, obj)) {
    arr.push(obj)
  }
};
goog.array.insertAt = function(arr, obj, opt_i) {
  goog.array.splice(arr, opt_i, 0, obj)
};
goog.array.insertArrayAt = function(arr, elementsToAdd, opt_i) {
  goog.partial(goog.array.splice, arr, opt_i, 0).apply(null, elementsToAdd)
};
goog.array.insertBefore = function(arr, obj, opt_obj2) {
  var i;
  if(arguments.length == 2 || (i = goog.array.indexOf(arr, opt_obj2)) < 0) {
    arr.push(obj)
  }else {
    goog.array.insertAt(arr, obj, i)
  }
};
goog.array.remove = function(arr, obj) {
  var i = goog.array.indexOf(arr, obj);
  var rv;
  if(rv = i >= 0) {
    goog.array.removeAt(arr, i)
  }
  return rv
};
goog.array.removeAt = function(arr, i) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.splice.call(arr, i, 1).length == 1
};
goog.array.removeIf = function(arr, f, opt_obj) {
  var i = goog.array.findIndex(arr, f, opt_obj);
  if(i >= 0) {
    goog.array.removeAt(arr, i);
    return true
  }
  return false
};
goog.array.concat = function(var_args) {
  return goog.array.ARRAY_PROTOTYPE_.concat.apply(goog.array.ARRAY_PROTOTYPE_, arguments)
};
goog.array.clone = function(arr) {
  if(goog.isArray(arr)) {
    return goog.array.concat(arr)
  }else {
    var rv = [];
    for(var i = 0, len = arr.length;i < len;i++) {
      rv[i] = arr[i]
    }
    return rv
  }
};
goog.array.toArray = function(object) {
  if(goog.isArray(object)) {
    return goog.array.concat(object)
  }
  return goog.array.clone(object)
};
goog.array.extend = function(arr1, var_args) {
  for(var i = 1;i < arguments.length;i++) {
    var arr2 = arguments[i];
    var isArrayLike;
    if(goog.isArray(arr2) || (isArrayLike = goog.isArrayLike(arr2)) && arr2.hasOwnProperty("callee")) {
      arr1.push.apply(arr1, arr2)
    }else {
      if(isArrayLike) {
        var len1 = arr1.length;
        var len2 = arr2.length;
        for(var j = 0;j < len2;j++) {
          arr1[len1 + j] = arr2[j]
        }
      }else {
        arr1.push(arr2)
      }
    }
  }
};
goog.array.splice = function(arr, index, howMany, var_args) {
  goog.asserts.assert(arr.length != null);
  return goog.array.ARRAY_PROTOTYPE_.splice.apply(arr, goog.array.slice(arguments, 1))
};
goog.array.slice = function(arr, start, opt_end) {
  goog.asserts.assert(arr.length != null);
  if(arguments.length <= 2) {
    return goog.array.ARRAY_PROTOTYPE_.slice.call(arr, start)
  }else {
    return goog.array.ARRAY_PROTOTYPE_.slice.call(arr, start, opt_end)
  }
};
goog.array.removeDuplicates = function(arr, opt_rv) {
  var returnArray = opt_rv || arr;
  var seen = {}, cursorInsert = 0, cursorRead = 0;
  while(cursorRead < arr.length) {
    var current = arr[cursorRead++];
    var key = goog.isObject(current) ? "o" + goog.getUid(current) : (typeof current).charAt(0) + current;
    if(!Object.prototype.hasOwnProperty.call(seen, key)) {
      seen[key] = true;
      returnArray[cursorInsert++] = current
    }
  }
  returnArray.length = cursorInsert
};
goog.array.binarySearch = function(arr, target, opt_compareFn) {
  return goog.array.binarySearch_(arr, opt_compareFn || goog.array.defaultCompare, false, target)
};
goog.array.binarySelect = function(arr, evaluator, opt_obj) {
  return goog.array.binarySearch_(arr, evaluator, true, undefined, opt_obj)
};
goog.array.binarySearch_ = function(arr, compareFn, isEvaluator, opt_target, opt_selfObj) {
  var left = 0;
  var right = arr.length;
  var found;
  while(left < right) {
    var middle = left + right >> 1;
    var compareResult;
    if(isEvaluator) {
      compareResult = compareFn.call(opt_selfObj, arr[middle], middle, arr)
    }else {
      compareResult = compareFn(opt_target, arr[middle])
    }
    if(compareResult > 0) {
      left = middle + 1
    }else {
      right = middle;
      found = !compareResult
    }
  }
  return found ? left : ~left
};
goog.array.sort = function(arr, opt_compareFn) {
  goog.asserts.assert(arr.length != null);
  goog.array.ARRAY_PROTOTYPE_.sort.call(arr, opt_compareFn || goog.array.defaultCompare)
};
goog.array.stableSort = function(arr, opt_compareFn) {
  for(var i = 0;i < arr.length;i++) {
    arr[i] = {index:i, value:arr[i]}
  }
  var valueCompareFn = opt_compareFn || goog.array.defaultCompare;
  function stableCompareFn(obj1, obj2) {
    return valueCompareFn(obj1.value, obj2.value) || obj1.index - obj2.index
  }
  goog.array.sort(arr, stableCompareFn);
  for(var i = 0;i < arr.length;i++) {
    arr[i] = arr[i].value
  }
};
goog.array.sortObjectsByKey = function(arr, key, opt_compareFn) {
  var compare = opt_compareFn || goog.array.defaultCompare;
  goog.array.sort(arr, function(a, b) {
    return compare(a[key], b[key])
  })
};
goog.array.isSorted = function(arr, opt_compareFn, opt_strict) {
  var compare = opt_compareFn || goog.array.defaultCompare;
  for(var i = 1;i < arr.length;i++) {
    var compareResult = compare(arr[i - 1], arr[i]);
    if(compareResult > 0 || compareResult == 0 && opt_strict) {
      return false
    }
  }
  return true
};
goog.array.equals = function(arr1, arr2, opt_equalsFn) {
  if(!goog.isArrayLike(arr1) || !goog.isArrayLike(arr2) || arr1.length != arr2.length) {
    return false
  }
  var l = arr1.length;
  var equalsFn = opt_equalsFn || goog.array.defaultCompareEquality;
  for(var i = 0;i < l;i++) {
    if(!equalsFn(arr1[i], arr2[i])) {
      return false
    }
  }
  return true
};
goog.array.compare = function(arr1, arr2, opt_equalsFn) {
  return goog.array.equals(arr1, arr2, opt_equalsFn)
};
goog.array.defaultCompare = function(a, b) {
  return a > b ? 1 : a < b ? -1 : 0
};
goog.array.defaultCompareEquality = function(a, b) {
  return a === b
};
goog.array.binaryInsert = function(array, value, opt_compareFn) {
  var index = goog.array.binarySearch(array, value, opt_compareFn);
  if(index < 0) {
    goog.array.insertAt(array, value, -(index + 1));
    return true
  }
  return false
};
goog.array.binaryRemove = function(array, value, opt_compareFn) {
  var index = goog.array.binarySearch(array, value, opt_compareFn);
  return index >= 0 ? goog.array.removeAt(array, index) : false
};
goog.array.bucket = function(array, sorter) {
  var buckets = {};
  for(var i = 0;i < array.length;i++) {
    var value = array[i];
    var key = sorter(value, i, array);
    if(goog.isDef(key)) {
      var bucket = buckets[key] || (buckets[key] = []);
      bucket.push(value)
    }
  }
  return buckets
};
goog.array.repeat = function(value, n) {
  var array = [];
  for(var i = 0;i < n;i++) {
    array[i] = value
  }
  return array
};
goog.array.flatten = function(var_args) {
  var result = [];
  for(var i = 0;i < arguments.length;i++) {
    var element = arguments[i];
    if(goog.isArray(element)) {
      result.push.apply(result, goog.array.flatten.apply(null, element))
    }else {
      result.push(element)
    }
  }
  return result
};
goog.array.rotate = function(array, n) {
  goog.asserts.assert(array.length != null);
  if(array.length) {
    n %= array.length;
    if(n > 0) {
      goog.array.ARRAY_PROTOTYPE_.unshift.apply(array, array.splice(-n, n))
    }else {
      if(n < 0) {
        goog.array.ARRAY_PROTOTYPE_.push.apply(array, array.splice(0, -n))
      }
    }
  }
  return array
};
goog.array.zip = function(var_args) {
  if(!arguments.length) {
    return[]
  }
  var result = [];
  for(var i = 0;true;i++) {
    var value = [];
    for(var j = 0;j < arguments.length;j++) {
      var arr = arguments[j];
      if(i >= arr.length) {
        return result
      }
      value.push(arr[i])
    }
    result.push(value)
  }
};
goog.array.shuffle = function(arr, opt_randFn) {
  var randFn = opt_randFn || Math.random;
  for(var i = arr.length - 1;i > 0;i--) {
    var j = Math.floor(randFn() * (i + 1));
    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp
  }
};
goog.provide("goog.object");
goog.object.forEach = function(obj, f, opt_obj) {
  for(var key in obj) {
    f.call(opt_obj, obj[key], key, obj)
  }
};
goog.object.filter = function(obj, f, opt_obj) {
  var res = {};
  for(var key in obj) {
    if(f.call(opt_obj, obj[key], key, obj)) {
      res[key] = obj[key]
    }
  }
  return res
};
goog.object.map = function(obj, f, opt_obj) {
  var res = {};
  for(var key in obj) {
    res[key] = f.call(opt_obj, obj[key], key, obj)
  }
  return res
};
goog.object.some = function(obj, f, opt_obj) {
  for(var key in obj) {
    if(f.call(opt_obj, obj[key], key, obj)) {
      return true
    }
  }
  return false
};
goog.object.every = function(obj, f, opt_obj) {
  for(var key in obj) {
    if(!f.call(opt_obj, obj[key], key, obj)) {
      return false
    }
  }
  return true
};
goog.object.getCount = function(obj) {
  var rv = 0;
  for(var key in obj) {
    rv++
  }
  return rv
};
goog.object.getAnyKey = function(obj) {
  for(var key in obj) {
    return key
  }
};
goog.object.getAnyValue = function(obj) {
  for(var key in obj) {
    return obj[key]
  }
};
goog.object.contains = function(obj, val) {
  return goog.object.containsValue(obj, val)
};
goog.object.getValues = function(obj) {
  var res = [];
  var i = 0;
  for(var key in obj) {
    res[i++] = obj[key]
  }
  return res
};
goog.object.getKeys = function(obj) {
  var res = [];
  var i = 0;
  for(var key in obj) {
    res[i++] = key
  }
  return res
};
goog.object.getValueByKeys = function(obj, var_args) {
  var isArrayLike = goog.isArrayLike(var_args);
  var keys = isArrayLike ? var_args : arguments;
  for(var i = isArrayLike ? 0 : 1;i < keys.length;i++) {
    obj = obj[keys[i]];
    if(!goog.isDef(obj)) {
      break
    }
  }
  return obj
};
goog.object.containsKey = function(obj, key) {
  return key in obj
};
goog.object.containsValue = function(obj, val) {
  for(var key in obj) {
    if(obj[key] == val) {
      return true
    }
  }
  return false
};
goog.object.findKey = function(obj, f, opt_this) {
  for(var key in obj) {
    if(f.call(opt_this, obj[key], key, obj)) {
      return key
    }
  }
  return undefined
};
goog.object.findValue = function(obj, f, opt_this) {
  var key = goog.object.findKey(obj, f, opt_this);
  return key && obj[key]
};
goog.object.isEmpty = function(obj) {
  for(var key in obj) {
    return false
  }
  return true
};
goog.object.clear = function(obj) {
  for(var i in obj) {
    delete obj[i]
  }
};
goog.object.remove = function(obj, key) {
  var rv;
  if(rv = key in obj) {
    delete obj[key]
  }
  return rv
};
goog.object.add = function(obj, key, val) {
  if(key in obj) {
    throw Error('The object already contains the key "' + key + '"');
  }
  goog.object.set(obj, key, val)
};
goog.object.get = function(obj, key, opt_val) {
  if(key in obj) {
    return obj[key]
  }
  return opt_val
};
goog.object.set = function(obj, key, value) {
  obj[key] = value
};
goog.object.setIfUndefined = function(obj, key, value) {
  return key in obj ? obj[key] : obj[key] = value
};
goog.object.clone = function(obj) {
  var res = {};
  for(var key in obj) {
    res[key] = obj[key]
  }
  return res
};
goog.object.unsafeClone = function(obj) {
  var type = goog.typeOf(obj);
  if(type == "object" || type == "array") {
    if(obj.clone) {
      return obj.clone()
    }
    var clone = type == "array" ? [] : {};
    for(var key in obj) {
      clone[key] = goog.object.unsafeClone(obj[key])
    }
    return clone
  }
  return obj
};
goog.object.transpose = function(obj) {
  var transposed = {};
  for(var key in obj) {
    transposed[obj[key]] = key
  }
  return transposed
};
goog.object.PROTOTYPE_FIELDS_ = ["constructor", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "toLocaleString", "toString", "valueOf"];
goog.object.extend = function(target, var_args) {
  var key, source;
  for(var i = 1;i < arguments.length;i++) {
    source = arguments[i];
    for(key in source) {
      target[key] = source[key]
    }
    for(var j = 0;j < goog.object.PROTOTYPE_FIELDS_.length;j++) {
      key = goog.object.PROTOTYPE_FIELDS_[j];
      if(Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key]
      }
    }
  }
};
goog.object.create = function(var_args) {
  var argLength = arguments.length;
  if(argLength == 1 && goog.isArray(arguments[0])) {
    return goog.object.create.apply(null, arguments[0])
  }
  if(argLength % 2) {
    throw Error("Uneven number of arguments");
  }
  var rv = {};
  for(var i = 0;i < argLength;i += 2) {
    rv[arguments[i]] = arguments[i + 1]
  }
  return rv
};
goog.object.createSet = function(var_args) {
  var argLength = arguments.length;
  if(argLength == 1 && goog.isArray(arguments[0])) {
    return goog.object.createSet.apply(null, arguments[0])
  }
  var rv = {};
  for(var i = 0;i < argLength;i++) {
    rv[arguments[i]] = true
  }
  return rv
};
goog.provide("goog.userAgent.jscript");
goog.require("goog.string");
goog.userAgent.jscript.ASSUME_NO_JSCRIPT = false;
goog.userAgent.jscript.init_ = function() {
  var hasScriptEngine = "ScriptEngine" in goog.global;
  goog.userAgent.jscript.DETECTED_HAS_JSCRIPT_ = hasScriptEngine && goog.global["ScriptEngine"]() == "JScript";
  goog.userAgent.jscript.DETECTED_VERSION_ = goog.userAgent.jscript.DETECTED_HAS_JSCRIPT_ ? goog.global["ScriptEngineMajorVersion"]() + "." + goog.global["ScriptEngineMinorVersion"]() + "." + goog.global["ScriptEngineBuildVersion"]() : "0"
};
if(!goog.userAgent.jscript.ASSUME_NO_JSCRIPT) {
  goog.userAgent.jscript.init_()
}
goog.userAgent.jscript.HAS_JSCRIPT = goog.userAgent.jscript.ASSUME_NO_JSCRIPT ? false : goog.userAgent.jscript.DETECTED_HAS_JSCRIPT_;
goog.userAgent.jscript.VERSION = goog.userAgent.jscript.ASSUME_NO_JSCRIPT ? "0" : goog.userAgent.jscript.DETECTED_VERSION_;
goog.userAgent.jscript.isVersion = function(version) {
  return goog.string.compareVersions(goog.userAgent.jscript.VERSION, version) >= 0
};
goog.provide("goog.string.StringBuffer");
goog.require("goog.userAgent.jscript");
goog.string.StringBuffer = function(opt_a1, var_args) {
  this.buffer_ = goog.userAgent.jscript.HAS_JSCRIPT ? [] : "";
  if(opt_a1 != null) {
    this.append.apply(this, arguments)
  }
};
goog.string.StringBuffer.prototype.set = function(s) {
  this.clear();
  this.append(s)
};
if(goog.userAgent.jscript.HAS_JSCRIPT) {
  goog.string.StringBuffer.prototype.bufferLength_ = 0;
  goog.string.StringBuffer.prototype.append = function(a1, opt_a2, var_args) {
    if(opt_a2 == null) {
      this.buffer_[this.bufferLength_++] = a1
    }else {
      this.buffer_.push.apply(this.buffer_, arguments);
      this.bufferLength_ = this.buffer_.length
    }
    return this
  }
}else {
  goog.string.StringBuffer.prototype.append = function(a1, opt_a2, var_args) {
    this.buffer_ += a1;
    if(opt_a2 != null) {
      for(var i = 1;i < arguments.length;i++) {
        this.buffer_ += arguments[i]
      }
    }
    return this
  }
}
goog.string.StringBuffer.prototype.clear = function() {
  if(goog.userAgent.jscript.HAS_JSCRIPT) {
    this.buffer_.length = 0;
    this.bufferLength_ = 0
  }else {
    this.buffer_ = ""
  }
};
goog.string.StringBuffer.prototype.getLength = function() {
  return this.toString().length
};
goog.string.StringBuffer.prototype.toString = function() {
  if(goog.userAgent.jscript.HAS_JSCRIPT) {
    var str = this.buffer_.join("");
    this.clear();
    if(str) {
      this.append(str)
    }
    return str
  }else {
    return this.buffer_
  }
};
goog.provide("cljs.core");
goog.require("goog.string");
goog.require("goog.string.StringBuffer");
goog.require("goog.object");
goog.require("goog.array");
cljs.core._STAR_print_fn_STAR_ = function _STAR_print_fn_STAR_(_) {
  throw new Error("No *print-fn* fn set for evaluation environment");
};
cljs.core.truth_ = function truth_(x) {
  return x != null && x !== false
};
cljs.core.type_satisfies_ = function type_satisfies_(p, x) {
  var or__3824__auto____3206 = p[goog.typeOf.call(null, x)];
  if(cljs.core.truth_(or__3824__auto____3206)) {
    return or__3824__auto____3206
  }else {
    var or__3824__auto____3207 = p["_"];
    if(cljs.core.truth_(or__3824__auto____3207)) {
      return or__3824__auto____3207
    }else {
      return false
    }
  }
};
cljs.core.is_proto_ = function is_proto_(x) {
  return x.constructor.prototype === x
};
cljs.core._STAR_main_cli_fn_STAR_ = null;
cljs.core.missing_protocol = function missing_protocol(proto, obj) {
  return Error.call(null, "No protocol method " + proto + " defined for type " + goog.typeOf.call(null, obj) + ": " + obj)
};
cljs.core.aclone = function aclone(array_like) {
  return Array.prototype.slice.call(array_like)
};
cljs.core.array = function array(var_args) {
  return Array.prototype.slice.call(arguments)
};
cljs.core.aget = function aget(array, i) {
  return array[i]
};
cljs.core.aset = function aset(array, i, val) {
  return array[i] = val
};
cljs.core.alength = function alength(array) {
  return array.length
};
cljs.core.IFn = {};
cljs.core._invoke = function() {
  var _invoke = null;
  var _invoke__3271 = function(this$) {
    if(cljs.core.truth_(function() {
      var and__3822__auto____3208 = this$;
      if(cljs.core.truth_(and__3822__auto____3208)) {
        return this$.cljs$core$IFn$_invoke
      }else {
        return and__3822__auto____3208
      }
    }())) {
      return this$.cljs$core$IFn$_invoke(this$)
    }else {
      return function() {
        var or__3824__auto____3209 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(cljs.core.truth_(or__3824__auto____3209)) {
          return or__3824__auto____3209
        }else {
          var or__3824__auto____3210 = cljs.core._invoke["_"];
          if(cljs.core.truth_(or__3824__auto____3210)) {
            return or__3824__auto____3210
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$)
    }
  };
  var _invoke__3272 = function(this$, a) {
    if(cljs.core.truth_(function() {
      var and__3822__auto____3211 = this$;
      if(cljs.core.truth_(and__3822__auto____3211)) {
        return this$.cljs$core$IFn$_invoke
      }else {
        return and__3822__auto____3211
      }
    }())) {
      return this$.cljs$core$IFn$_invoke(this$, a)
    }else {
      return function() {
        var or__3824__auto____3212 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(cljs.core.truth_(or__3824__auto____3212)) {
          return or__3824__auto____3212
        }else {
          var or__3824__auto____3213 = cljs.core._invoke["_"];
          if(cljs.core.truth_(or__3824__auto____3213)) {
            return or__3824__auto____3213
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a)
    }
  };
  var _invoke__3273 = function(this$, a, b) {
    if(cljs.core.truth_(function() {
      var and__3822__auto____3214 = this$;
      if(cljs.core.truth_(and__3822__auto____3214)) {
        return this$.cljs$core$IFn$_invoke
      }else {
        return and__3822__auto____3214
      }
    }())) {
      return this$.cljs$core$IFn$_invoke(this$, a, b)
    }else {
      return function() {
        var or__3824__auto____3215 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(cljs.core.truth_(or__3824__auto____3215)) {
          return or__3824__auto____3215
        }else {
          var or__3824__auto____3216 = cljs.core._invoke["_"];
          if(cljs.core.truth_(or__3824__auto____3216)) {
            return or__3824__auto____3216
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b)
    }
  };
  var _invoke__3274 = function(this$, a, b, c) {
    if(cljs.core.truth_(function() {
      var and__3822__auto____3217 = this$;
      if(cljs.core.truth_(and__3822__auto____3217)) {
        return this$.cljs$core$IFn$_invoke
      }else {
        return and__3822__auto____3217
      }
    }())) {
      return this$.cljs$core$IFn$_invoke(this$, a, b, c)
    }else {
      return function() {
        var or__3824__auto____3218 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(cljs.core.truth_(or__3824__auto____3218)) {
          return or__3824__auto____3218
        }else {
          var or__3824__auto____3219 = cljs.core._invoke["_"];
          if(cljs.core.truth_(or__3824__auto____3219)) {
            return or__3824__auto____3219
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c)
    }
  };
  var _invoke__3275 = function(this$, a, b, c, d) {
    if(cljs.core.truth_(function() {
      var and__3822__auto____3220 = this$;
      if(cljs.core.truth_(and__3822__auto____3220)) {
        return this$.cljs$core$IFn$_invoke
      }else {
        return and__3822__auto____3220
      }
    }())) {
      return this$.cljs$core$IFn$_invoke(this$, a, b, c, d)
    }else {
      return function() {
        var or__3824__auto____3221 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(cljs.core.truth_(or__3824__auto____3221)) {
          return or__3824__auto____3221
        }else {
          var or__3824__auto____3222 = cljs.core._invoke["_"];
          if(cljs.core.truth_(or__3824__auto____3222)) {
            return or__3824__auto____3222
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d)
    }
  };
  var _invoke__3276 = function(this$, a, b, c, d, e) {
    if(cljs.core.truth_(function() {
      var and__3822__auto____3223 = this$;
      if(cljs.core.truth_(and__3822__auto____3223)) {
        return this$.cljs$core$IFn$_invoke
      }else {
        return and__3822__auto____3223
      }
    }())) {
      return this$.cljs$core$IFn$_invoke(this$, a, b, c, d, e)
    }else {
      return function() {
        var or__3824__auto____3224 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(cljs.core.truth_(or__3824__auto____3224)) {
          return or__3824__auto____3224
        }else {
          var or__3824__auto____3225 = cljs.core._invoke["_"];
          if(cljs.core.truth_(or__3824__auto____3225)) {
            return or__3824__auto____3225
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e)
    }
  };
  var _invoke__3277 = function(this$, a, b, c, d, e, f) {
    if(cljs.core.truth_(function() {
      var and__3822__auto____3226 = this$;
      if(cljs.core.truth_(and__3822__auto____3226)) {
        return this$.cljs$core$IFn$_invoke
      }else {
        return and__3822__auto____3226
      }
    }())) {
      return this$.cljs$core$IFn$_invoke(this$, a, b, c, d, e, f)
    }else {
      return function() {
        var or__3824__auto____3227 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(cljs.core.truth_(or__3824__auto____3227)) {
          return or__3824__auto____3227
        }else {
          var or__3824__auto____3228 = cljs.core._invoke["_"];
          if(cljs.core.truth_(or__3824__auto____3228)) {
            return or__3824__auto____3228
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f)
    }
  };
  var _invoke__3278 = function(this$, a, b, c, d, e, f, g) {
    if(cljs.core.truth_(function() {
      var and__3822__auto____3229 = this$;
      if(cljs.core.truth_(and__3822__auto____3229)) {
        return this$.cljs$core$IFn$_invoke
      }else {
        return and__3822__auto____3229
      }
    }())) {
      return this$.cljs$core$IFn$_invoke(this$, a, b, c, d, e, f, g)
    }else {
      return function() {
        var or__3824__auto____3230 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(cljs.core.truth_(or__3824__auto____3230)) {
          return or__3824__auto____3230
        }else {
          var or__3824__auto____3231 = cljs.core._invoke["_"];
          if(cljs.core.truth_(or__3824__auto____3231)) {
            return or__3824__auto____3231
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g)
    }
  };
  var _invoke__3279 = function(this$, a, b, c, d, e, f, g, h) {
    if(cljs.core.truth_(function() {
      var and__3822__auto____3232 = this$;
      if(cljs.core.truth_(and__3822__auto____3232)) {
        return this$.cljs$core$IFn$_invoke
      }else {
        return and__3822__auto____3232
      }
    }())) {
      return this$.cljs$core$IFn$_invoke(this$, a, b, c, d, e, f, g, h)
    }else {
      return function() {
        var or__3824__auto____3233 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(cljs.core.truth_(or__3824__auto____3233)) {
          return or__3824__auto____3233
        }else {
          var or__3824__auto____3234 = cljs.core._invoke["_"];
          if(cljs.core.truth_(or__3824__auto____3234)) {
            return or__3824__auto____3234
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h)
    }
  };
  var _invoke__3280 = function(this$, a, b, c, d, e, f, g, h, i) {
    if(cljs.core.truth_(function() {
      var and__3822__auto____3235 = this$;
      if(cljs.core.truth_(and__3822__auto____3235)) {
        return this$.cljs$core$IFn$_invoke
      }else {
        return and__3822__auto____3235
      }
    }())) {
      return this$.cljs$core$IFn$_invoke(this$, a, b, c, d, e, f, g, h, i)
    }else {
      return function() {
        var or__3824__auto____3236 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(cljs.core.truth_(or__3824__auto____3236)) {
          return or__3824__auto____3236
        }else {
          var or__3824__auto____3237 = cljs.core._invoke["_"];
          if(cljs.core.truth_(or__3824__auto____3237)) {
            return or__3824__auto____3237
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i)
    }
  };
  var _invoke__3281 = function(this$, a, b, c, d, e, f, g, h, i, j) {
    if(cljs.core.truth_(function() {
      var and__3822__auto____3238 = this$;
      if(cljs.core.truth_(and__3822__auto____3238)) {
        return this$.cljs$core$IFn$_invoke
      }else {
        return and__3822__auto____3238
      }
    }())) {
      return this$.cljs$core$IFn$_invoke(this$, a, b, c, d, e, f, g, h, i, j)
    }else {
      return function() {
        var or__3824__auto____3239 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(cljs.core.truth_(or__3824__auto____3239)) {
          return or__3824__auto____3239
        }else {
          var or__3824__auto____3240 = cljs.core._invoke["_"];
          if(cljs.core.truth_(or__3824__auto____3240)) {
            return or__3824__auto____3240
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j)
    }
  };
  var _invoke__3282 = function(this$, a, b, c, d, e, f, g, h, i, j, k) {
    if(cljs.core.truth_(function() {
      var and__3822__auto____3241 = this$;
      if(cljs.core.truth_(and__3822__auto____3241)) {
        return this$.cljs$core$IFn$_invoke
      }else {
        return and__3822__auto____3241
      }
    }())) {
      return this$.cljs$core$IFn$_invoke(this$, a, b, c, d, e, f, g, h, i, j, k)
    }else {
      return function() {
        var or__3824__auto____3242 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(cljs.core.truth_(or__3824__auto____3242)) {
          return or__3824__auto____3242
        }else {
          var or__3824__auto____3243 = cljs.core._invoke["_"];
          if(cljs.core.truth_(or__3824__auto____3243)) {
            return or__3824__auto____3243
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k)
    }
  };
  var _invoke__3283 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l) {
    if(cljs.core.truth_(function() {
      var and__3822__auto____3244 = this$;
      if(cljs.core.truth_(and__3822__auto____3244)) {
        return this$.cljs$core$IFn$_invoke
      }else {
        return and__3822__auto____3244
      }
    }())) {
      return this$.cljs$core$IFn$_invoke(this$, a, b, c, d, e, f, g, h, i, j, k, l)
    }else {
      return function() {
        var or__3824__auto____3245 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(cljs.core.truth_(or__3824__auto____3245)) {
          return or__3824__auto____3245
        }else {
          var or__3824__auto____3246 = cljs.core._invoke["_"];
          if(cljs.core.truth_(or__3824__auto____3246)) {
            return or__3824__auto____3246
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l)
    }
  };
  var _invoke__3284 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m) {
    if(cljs.core.truth_(function() {
      var and__3822__auto____3247 = this$;
      if(cljs.core.truth_(and__3822__auto____3247)) {
        return this$.cljs$core$IFn$_invoke
      }else {
        return and__3822__auto____3247
      }
    }())) {
      return this$.cljs$core$IFn$_invoke(this$, a, b, c, d, e, f, g, h, i, j, k, l, m)
    }else {
      return function() {
        var or__3824__auto____3248 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(cljs.core.truth_(or__3824__auto____3248)) {
          return or__3824__auto____3248
        }else {
          var or__3824__auto____3249 = cljs.core._invoke["_"];
          if(cljs.core.truth_(or__3824__auto____3249)) {
            return or__3824__auto____3249
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m)
    }
  };
  var _invoke__3285 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n) {
    if(cljs.core.truth_(function() {
      var and__3822__auto____3250 = this$;
      if(cljs.core.truth_(and__3822__auto____3250)) {
        return this$.cljs$core$IFn$_invoke
      }else {
        return and__3822__auto____3250
      }
    }())) {
      return this$.cljs$core$IFn$_invoke(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n)
    }else {
      return function() {
        var or__3824__auto____3251 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(cljs.core.truth_(or__3824__auto____3251)) {
          return or__3824__auto____3251
        }else {
          var or__3824__auto____3252 = cljs.core._invoke["_"];
          if(cljs.core.truth_(or__3824__auto____3252)) {
            return or__3824__auto____3252
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n)
    }
  };
  var _invoke__3286 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o) {
    if(cljs.core.truth_(function() {
      var and__3822__auto____3253 = this$;
      if(cljs.core.truth_(and__3822__auto____3253)) {
        return this$.cljs$core$IFn$_invoke
      }else {
        return and__3822__auto____3253
      }
    }())) {
      return this$.cljs$core$IFn$_invoke(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o)
    }else {
      return function() {
        var or__3824__auto____3254 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(cljs.core.truth_(or__3824__auto____3254)) {
          return or__3824__auto____3254
        }else {
          var or__3824__auto____3255 = cljs.core._invoke["_"];
          if(cljs.core.truth_(or__3824__auto____3255)) {
            return or__3824__auto____3255
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o)
    }
  };
  var _invoke__3287 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p) {
    if(cljs.core.truth_(function() {
      var and__3822__auto____3256 = this$;
      if(cljs.core.truth_(and__3822__auto____3256)) {
        return this$.cljs$core$IFn$_invoke
      }else {
        return and__3822__auto____3256
      }
    }())) {
      return this$.cljs$core$IFn$_invoke(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p)
    }else {
      return function() {
        var or__3824__auto____3257 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(cljs.core.truth_(or__3824__auto____3257)) {
          return or__3824__auto____3257
        }else {
          var or__3824__auto____3258 = cljs.core._invoke["_"];
          if(cljs.core.truth_(or__3824__auto____3258)) {
            return or__3824__auto____3258
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p)
    }
  };
  var _invoke__3288 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q) {
    if(cljs.core.truth_(function() {
      var and__3822__auto____3259 = this$;
      if(cljs.core.truth_(and__3822__auto____3259)) {
        return this$.cljs$core$IFn$_invoke
      }else {
        return and__3822__auto____3259
      }
    }())) {
      return this$.cljs$core$IFn$_invoke(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q)
    }else {
      return function() {
        var or__3824__auto____3260 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(cljs.core.truth_(or__3824__auto____3260)) {
          return or__3824__auto____3260
        }else {
          var or__3824__auto____3261 = cljs.core._invoke["_"];
          if(cljs.core.truth_(or__3824__auto____3261)) {
            return or__3824__auto____3261
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q)
    }
  };
  var _invoke__3289 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s) {
    if(cljs.core.truth_(function() {
      var and__3822__auto____3262 = this$;
      if(cljs.core.truth_(and__3822__auto____3262)) {
        return this$.cljs$core$IFn$_invoke
      }else {
        return and__3822__auto____3262
      }
    }())) {
      return this$.cljs$core$IFn$_invoke(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s)
    }else {
      return function() {
        var or__3824__auto____3263 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(cljs.core.truth_(or__3824__auto____3263)) {
          return or__3824__auto____3263
        }else {
          var or__3824__auto____3264 = cljs.core._invoke["_"];
          if(cljs.core.truth_(or__3824__auto____3264)) {
            return or__3824__auto____3264
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s)
    }
  };
  var _invoke__3290 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t) {
    if(cljs.core.truth_(function() {
      var and__3822__auto____3265 = this$;
      if(cljs.core.truth_(and__3822__auto____3265)) {
        return this$.cljs$core$IFn$_invoke
      }else {
        return and__3822__auto____3265
      }
    }())) {
      return this$.cljs$core$IFn$_invoke(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t)
    }else {
      return function() {
        var or__3824__auto____3266 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(cljs.core.truth_(or__3824__auto____3266)) {
          return or__3824__auto____3266
        }else {
          var or__3824__auto____3267 = cljs.core._invoke["_"];
          if(cljs.core.truth_(or__3824__auto____3267)) {
            return or__3824__auto____3267
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t)
    }
  };
  var _invoke__3291 = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t, rest) {
    if(cljs.core.truth_(function() {
      var and__3822__auto____3268 = this$;
      if(cljs.core.truth_(and__3822__auto____3268)) {
        return this$.cljs$core$IFn$_invoke
      }else {
        return and__3822__auto____3268
      }
    }())) {
      return this$.cljs$core$IFn$_invoke(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t, rest)
    }else {
      return function() {
        var or__3824__auto____3269 = cljs.core._invoke[goog.typeOf.call(null, this$)];
        if(cljs.core.truth_(or__3824__auto____3269)) {
          return or__3824__auto____3269
        }else {
          var or__3824__auto____3270 = cljs.core._invoke["_"];
          if(cljs.core.truth_(or__3824__auto____3270)) {
            return or__3824__auto____3270
          }else {
            throw cljs.core.missing_protocol.call(null, "IFn.-invoke", this$);
          }
        }
      }().call(null, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t, rest)
    }
  };
  _invoke = function(this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t, rest) {
    switch(arguments.length) {
      case 1:
        return _invoke__3271.call(this, this$);
      case 2:
        return _invoke__3272.call(this, this$, a);
      case 3:
        return _invoke__3273.call(this, this$, a, b);
      case 4:
        return _invoke__3274.call(this, this$, a, b, c);
      case 5:
        return _invoke__3275.call(this, this$, a, b, c, d);
      case 6:
        return _invoke__3276.call(this, this$, a, b, c, d, e);
      case 7:
        return _invoke__3277.call(this, this$, a, b, c, d, e, f);
      case 8:
        return _invoke__3278.call(this, this$, a, b, c, d, e, f, g);
      case 9:
        return _invoke__3279.call(this, this$, a, b, c, d, e, f, g, h);
      case 10:
        return _invoke__3280.call(this, this$, a, b, c, d, e, f, g, h, i);
      case 11:
        return _invoke__3281.call(this, this$, a, b, c, d, e, f, g, h, i, j);
      case 12:
        return _invoke__3282.call(this, this$, a, b, c, d, e, f, g, h, i, j, k);
      case 13:
        return _invoke__3283.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l);
      case 14:
        return _invoke__3284.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m);
      case 15:
        return _invoke__3285.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n);
      case 16:
        return _invoke__3286.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o);
      case 17:
        return _invoke__3287.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p);
      case 18:
        return _invoke__3288.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q);
      case 19:
        return _invoke__3289.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s);
      case 20:
        return _invoke__3290.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t);
      case 21:
        return _invoke__3291.call(this, this$, a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, s, t, rest)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return _invoke
}();
cljs.core.ICounted = {};
cljs.core._count = function _count(coll) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____3293 = coll;
    if(cljs.core.truth_(and__3822__auto____3293)) {
      return coll.cljs$core$ICounted$_count
    }else {
      return and__3822__auto____3293
    }
  }())) {
    return coll.cljs$core$ICounted$_count(coll)
  }else {
    return function() {
      var or__3824__auto____3294 = cljs.core._count[goog.typeOf.call(null, coll)];
      if(cljs.core.truth_(or__3824__auto____3294)) {
        return or__3824__auto____3294
      }else {
        var or__3824__auto____3295 = cljs.core._count["_"];
        if(cljs.core.truth_(or__3824__auto____3295)) {
          return or__3824__auto____3295
        }else {
          throw cljs.core.missing_protocol.call(null, "ICounted.-count", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core.IEmptyableCollection = {};
cljs.core._empty = function _empty(coll) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____3296 = coll;
    if(cljs.core.truth_(and__3822__auto____3296)) {
      return coll.cljs$core$IEmptyableCollection$_empty
    }else {
      return and__3822__auto____3296
    }
  }())) {
    return coll.cljs$core$IEmptyableCollection$_empty(coll)
  }else {
    return function() {
      var or__3824__auto____3297 = cljs.core._empty[goog.typeOf.call(null, coll)];
      if(cljs.core.truth_(or__3824__auto____3297)) {
        return or__3824__auto____3297
      }else {
        var or__3824__auto____3298 = cljs.core._empty["_"];
        if(cljs.core.truth_(or__3824__auto____3298)) {
          return or__3824__auto____3298
        }else {
          throw cljs.core.missing_protocol.call(null, "IEmptyableCollection.-empty", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core.ICollection = {};
cljs.core._conj = function _conj(coll, o) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____3299 = coll;
    if(cljs.core.truth_(and__3822__auto____3299)) {
      return coll.cljs$core$ICollection$_conj
    }else {
      return and__3822__auto____3299
    }
  }())) {
    return coll.cljs$core$ICollection$_conj(coll, o)
  }else {
    return function() {
      var or__3824__auto____3300 = cljs.core._conj[goog.typeOf.call(null, coll)];
      if(cljs.core.truth_(or__3824__auto____3300)) {
        return or__3824__auto____3300
      }else {
        var or__3824__auto____3301 = cljs.core._conj["_"];
        if(cljs.core.truth_(or__3824__auto____3301)) {
          return or__3824__auto____3301
        }else {
          throw cljs.core.missing_protocol.call(null, "ICollection.-conj", coll);
        }
      }
    }().call(null, coll, o)
  }
};
cljs.core.IIndexed = {};
cljs.core._nth = function() {
  var _nth = null;
  var _nth__3308 = function(coll, n) {
    if(cljs.core.truth_(function() {
      var and__3822__auto____3302 = coll;
      if(cljs.core.truth_(and__3822__auto____3302)) {
        return coll.cljs$core$IIndexed$_nth
      }else {
        return and__3822__auto____3302
      }
    }())) {
      return coll.cljs$core$IIndexed$_nth(coll, n)
    }else {
      return function() {
        var or__3824__auto____3303 = cljs.core._nth[goog.typeOf.call(null, coll)];
        if(cljs.core.truth_(or__3824__auto____3303)) {
          return or__3824__auto____3303
        }else {
          var or__3824__auto____3304 = cljs.core._nth["_"];
          if(cljs.core.truth_(or__3824__auto____3304)) {
            return or__3824__auto____3304
          }else {
            throw cljs.core.missing_protocol.call(null, "IIndexed.-nth", coll);
          }
        }
      }().call(null, coll, n)
    }
  };
  var _nth__3309 = function(coll, n, not_found) {
    if(cljs.core.truth_(function() {
      var and__3822__auto____3305 = coll;
      if(cljs.core.truth_(and__3822__auto____3305)) {
        return coll.cljs$core$IIndexed$_nth
      }else {
        return and__3822__auto____3305
      }
    }())) {
      return coll.cljs$core$IIndexed$_nth(coll, n, not_found)
    }else {
      return function() {
        var or__3824__auto____3306 = cljs.core._nth[goog.typeOf.call(null, coll)];
        if(cljs.core.truth_(or__3824__auto____3306)) {
          return or__3824__auto____3306
        }else {
          var or__3824__auto____3307 = cljs.core._nth["_"];
          if(cljs.core.truth_(or__3824__auto____3307)) {
            return or__3824__auto____3307
          }else {
            throw cljs.core.missing_protocol.call(null, "IIndexed.-nth", coll);
          }
        }
      }().call(null, coll, n, not_found)
    }
  };
  _nth = function(coll, n, not_found) {
    switch(arguments.length) {
      case 2:
        return _nth__3308.call(this, coll, n);
      case 3:
        return _nth__3309.call(this, coll, n, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return _nth
}();
cljs.core.ISeq = {};
cljs.core._first = function _first(coll) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____3311 = coll;
    if(cljs.core.truth_(and__3822__auto____3311)) {
      return coll.cljs$core$ISeq$_first
    }else {
      return and__3822__auto____3311
    }
  }())) {
    return coll.cljs$core$ISeq$_first(coll)
  }else {
    return function() {
      var or__3824__auto____3312 = cljs.core._first[goog.typeOf.call(null, coll)];
      if(cljs.core.truth_(or__3824__auto____3312)) {
        return or__3824__auto____3312
      }else {
        var or__3824__auto____3313 = cljs.core._first["_"];
        if(cljs.core.truth_(or__3824__auto____3313)) {
          return or__3824__auto____3313
        }else {
          throw cljs.core.missing_protocol.call(null, "ISeq.-first", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core._rest = function _rest(coll) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____3314 = coll;
    if(cljs.core.truth_(and__3822__auto____3314)) {
      return coll.cljs$core$ISeq$_rest
    }else {
      return and__3822__auto____3314
    }
  }())) {
    return coll.cljs$core$ISeq$_rest(coll)
  }else {
    return function() {
      var or__3824__auto____3315 = cljs.core._rest[goog.typeOf.call(null, coll)];
      if(cljs.core.truth_(or__3824__auto____3315)) {
        return or__3824__auto____3315
      }else {
        var or__3824__auto____3316 = cljs.core._rest["_"];
        if(cljs.core.truth_(or__3824__auto____3316)) {
          return or__3824__auto____3316
        }else {
          throw cljs.core.missing_protocol.call(null, "ISeq.-rest", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core.ILookup = {};
cljs.core._lookup = function() {
  var _lookup = null;
  var _lookup__3323 = function(o, k) {
    if(cljs.core.truth_(function() {
      var and__3822__auto____3317 = o;
      if(cljs.core.truth_(and__3822__auto____3317)) {
        return o.cljs$core$ILookup$_lookup
      }else {
        return and__3822__auto____3317
      }
    }())) {
      return o.cljs$core$ILookup$_lookup(o, k)
    }else {
      return function() {
        var or__3824__auto____3318 = cljs.core._lookup[goog.typeOf.call(null, o)];
        if(cljs.core.truth_(or__3824__auto____3318)) {
          return or__3824__auto____3318
        }else {
          var or__3824__auto____3319 = cljs.core._lookup["_"];
          if(cljs.core.truth_(or__3824__auto____3319)) {
            return or__3824__auto____3319
          }else {
            throw cljs.core.missing_protocol.call(null, "ILookup.-lookup", o);
          }
        }
      }().call(null, o, k)
    }
  };
  var _lookup__3324 = function(o, k, not_found) {
    if(cljs.core.truth_(function() {
      var and__3822__auto____3320 = o;
      if(cljs.core.truth_(and__3822__auto____3320)) {
        return o.cljs$core$ILookup$_lookup
      }else {
        return and__3822__auto____3320
      }
    }())) {
      return o.cljs$core$ILookup$_lookup(o, k, not_found)
    }else {
      return function() {
        var or__3824__auto____3321 = cljs.core._lookup[goog.typeOf.call(null, o)];
        if(cljs.core.truth_(or__3824__auto____3321)) {
          return or__3824__auto____3321
        }else {
          var or__3824__auto____3322 = cljs.core._lookup["_"];
          if(cljs.core.truth_(or__3824__auto____3322)) {
            return or__3824__auto____3322
          }else {
            throw cljs.core.missing_protocol.call(null, "ILookup.-lookup", o);
          }
        }
      }().call(null, o, k, not_found)
    }
  };
  _lookup = function(o, k, not_found) {
    switch(arguments.length) {
      case 2:
        return _lookup__3323.call(this, o, k);
      case 3:
        return _lookup__3324.call(this, o, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return _lookup
}();
cljs.core.IAssociative = {};
cljs.core._contains_key_QMARK_ = function _contains_key_QMARK_(coll, k) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____3326 = coll;
    if(cljs.core.truth_(and__3822__auto____3326)) {
      return coll.cljs$core$IAssociative$_contains_key_QMARK_
    }else {
      return and__3822__auto____3326
    }
  }())) {
    return coll.cljs$core$IAssociative$_contains_key_QMARK_(coll, k)
  }else {
    return function() {
      var or__3824__auto____3327 = cljs.core._contains_key_QMARK_[goog.typeOf.call(null, coll)];
      if(cljs.core.truth_(or__3824__auto____3327)) {
        return or__3824__auto____3327
      }else {
        var or__3824__auto____3328 = cljs.core._contains_key_QMARK_["_"];
        if(cljs.core.truth_(or__3824__auto____3328)) {
          return or__3824__auto____3328
        }else {
          throw cljs.core.missing_protocol.call(null, "IAssociative.-contains-key?", coll);
        }
      }
    }().call(null, coll, k)
  }
};
cljs.core._assoc = function _assoc(coll, k, v) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____3329 = coll;
    if(cljs.core.truth_(and__3822__auto____3329)) {
      return coll.cljs$core$IAssociative$_assoc
    }else {
      return and__3822__auto____3329
    }
  }())) {
    return coll.cljs$core$IAssociative$_assoc(coll, k, v)
  }else {
    return function() {
      var or__3824__auto____3330 = cljs.core._assoc[goog.typeOf.call(null, coll)];
      if(cljs.core.truth_(or__3824__auto____3330)) {
        return or__3824__auto____3330
      }else {
        var or__3824__auto____3331 = cljs.core._assoc["_"];
        if(cljs.core.truth_(or__3824__auto____3331)) {
          return or__3824__auto____3331
        }else {
          throw cljs.core.missing_protocol.call(null, "IAssociative.-assoc", coll);
        }
      }
    }().call(null, coll, k, v)
  }
};
cljs.core.IMap = {};
cljs.core._dissoc = function _dissoc(coll, k) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____3332 = coll;
    if(cljs.core.truth_(and__3822__auto____3332)) {
      return coll.cljs$core$IMap$_dissoc
    }else {
      return and__3822__auto____3332
    }
  }())) {
    return coll.cljs$core$IMap$_dissoc(coll, k)
  }else {
    return function() {
      var or__3824__auto____3333 = cljs.core._dissoc[goog.typeOf.call(null, coll)];
      if(cljs.core.truth_(or__3824__auto____3333)) {
        return or__3824__auto____3333
      }else {
        var or__3824__auto____3334 = cljs.core._dissoc["_"];
        if(cljs.core.truth_(or__3824__auto____3334)) {
          return or__3824__auto____3334
        }else {
          throw cljs.core.missing_protocol.call(null, "IMap.-dissoc", coll);
        }
      }
    }().call(null, coll, k)
  }
};
cljs.core.ISet = {};
cljs.core._disjoin = function _disjoin(coll, v) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____3335 = coll;
    if(cljs.core.truth_(and__3822__auto____3335)) {
      return coll.cljs$core$ISet$_disjoin
    }else {
      return and__3822__auto____3335
    }
  }())) {
    return coll.cljs$core$ISet$_disjoin(coll, v)
  }else {
    return function() {
      var or__3824__auto____3336 = cljs.core._disjoin[goog.typeOf.call(null, coll)];
      if(cljs.core.truth_(or__3824__auto____3336)) {
        return or__3824__auto____3336
      }else {
        var or__3824__auto____3337 = cljs.core._disjoin["_"];
        if(cljs.core.truth_(or__3824__auto____3337)) {
          return or__3824__auto____3337
        }else {
          throw cljs.core.missing_protocol.call(null, "ISet.-disjoin", coll);
        }
      }
    }().call(null, coll, v)
  }
};
cljs.core.IStack = {};
cljs.core._peek = function _peek(coll) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____3338 = coll;
    if(cljs.core.truth_(and__3822__auto____3338)) {
      return coll.cljs$core$IStack$_peek
    }else {
      return and__3822__auto____3338
    }
  }())) {
    return coll.cljs$core$IStack$_peek(coll)
  }else {
    return function() {
      var or__3824__auto____3339 = cljs.core._peek[goog.typeOf.call(null, coll)];
      if(cljs.core.truth_(or__3824__auto____3339)) {
        return or__3824__auto____3339
      }else {
        var or__3824__auto____3340 = cljs.core._peek["_"];
        if(cljs.core.truth_(or__3824__auto____3340)) {
          return or__3824__auto____3340
        }else {
          throw cljs.core.missing_protocol.call(null, "IStack.-peek", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core._pop = function _pop(coll) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____3341 = coll;
    if(cljs.core.truth_(and__3822__auto____3341)) {
      return coll.cljs$core$IStack$_pop
    }else {
      return and__3822__auto____3341
    }
  }())) {
    return coll.cljs$core$IStack$_pop(coll)
  }else {
    return function() {
      var or__3824__auto____3342 = cljs.core._pop[goog.typeOf.call(null, coll)];
      if(cljs.core.truth_(or__3824__auto____3342)) {
        return or__3824__auto____3342
      }else {
        var or__3824__auto____3343 = cljs.core._pop["_"];
        if(cljs.core.truth_(or__3824__auto____3343)) {
          return or__3824__auto____3343
        }else {
          throw cljs.core.missing_protocol.call(null, "IStack.-pop", coll);
        }
      }
    }().call(null, coll)
  }
};
cljs.core.IVector = {};
cljs.core._assoc_n = function _assoc_n(coll, n, val) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____3344 = coll;
    if(cljs.core.truth_(and__3822__auto____3344)) {
      return coll.cljs$core$IVector$_assoc_n
    }else {
      return and__3822__auto____3344
    }
  }())) {
    return coll.cljs$core$IVector$_assoc_n(coll, n, val)
  }else {
    return function() {
      var or__3824__auto____3345 = cljs.core._assoc_n[goog.typeOf.call(null, coll)];
      if(cljs.core.truth_(or__3824__auto____3345)) {
        return or__3824__auto____3345
      }else {
        var or__3824__auto____3346 = cljs.core._assoc_n["_"];
        if(cljs.core.truth_(or__3824__auto____3346)) {
          return or__3824__auto____3346
        }else {
          throw cljs.core.missing_protocol.call(null, "IVector.-assoc-n", coll);
        }
      }
    }().call(null, coll, n, val)
  }
};
cljs.core.IDeref = {};
cljs.core._deref = function _deref(o) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____3347 = o;
    if(cljs.core.truth_(and__3822__auto____3347)) {
      return o.cljs$core$IDeref$_deref
    }else {
      return and__3822__auto____3347
    }
  }())) {
    return o.cljs$core$IDeref$_deref(o)
  }else {
    return function() {
      var or__3824__auto____3348 = cljs.core._deref[goog.typeOf.call(null, o)];
      if(cljs.core.truth_(or__3824__auto____3348)) {
        return or__3824__auto____3348
      }else {
        var or__3824__auto____3349 = cljs.core._deref["_"];
        if(cljs.core.truth_(or__3824__auto____3349)) {
          return or__3824__auto____3349
        }else {
          throw cljs.core.missing_protocol.call(null, "IDeref.-deref", o);
        }
      }
    }().call(null, o)
  }
};
cljs.core.IDerefWithTimeout = {};
cljs.core._deref_with_timeout = function _deref_with_timeout(o, msec, timeout_val) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____3350 = o;
    if(cljs.core.truth_(and__3822__auto____3350)) {
      return o.cljs$core$IDerefWithTimeout$_deref_with_timeout
    }else {
      return and__3822__auto____3350
    }
  }())) {
    return o.cljs$core$IDerefWithTimeout$_deref_with_timeout(o, msec, timeout_val)
  }else {
    return function() {
      var or__3824__auto____3351 = cljs.core._deref_with_timeout[goog.typeOf.call(null, o)];
      if(cljs.core.truth_(or__3824__auto____3351)) {
        return or__3824__auto____3351
      }else {
        var or__3824__auto____3352 = cljs.core._deref_with_timeout["_"];
        if(cljs.core.truth_(or__3824__auto____3352)) {
          return or__3824__auto____3352
        }else {
          throw cljs.core.missing_protocol.call(null, "IDerefWithTimeout.-deref-with-timeout", o);
        }
      }
    }().call(null, o, msec, timeout_val)
  }
};
cljs.core.IMeta = {};
cljs.core._meta = function _meta(o) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____3353 = o;
    if(cljs.core.truth_(and__3822__auto____3353)) {
      return o.cljs$core$IMeta$_meta
    }else {
      return and__3822__auto____3353
    }
  }())) {
    return o.cljs$core$IMeta$_meta(o)
  }else {
    return function() {
      var or__3824__auto____3354 = cljs.core._meta[goog.typeOf.call(null, o)];
      if(cljs.core.truth_(or__3824__auto____3354)) {
        return or__3824__auto____3354
      }else {
        var or__3824__auto____3355 = cljs.core._meta["_"];
        if(cljs.core.truth_(or__3824__auto____3355)) {
          return or__3824__auto____3355
        }else {
          throw cljs.core.missing_protocol.call(null, "IMeta.-meta", o);
        }
      }
    }().call(null, o)
  }
};
cljs.core.IWithMeta = {};
cljs.core._with_meta = function _with_meta(o, meta) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____3356 = o;
    if(cljs.core.truth_(and__3822__auto____3356)) {
      return o.cljs$core$IWithMeta$_with_meta
    }else {
      return and__3822__auto____3356
    }
  }())) {
    return o.cljs$core$IWithMeta$_with_meta(o, meta)
  }else {
    return function() {
      var or__3824__auto____3357 = cljs.core._with_meta[goog.typeOf.call(null, o)];
      if(cljs.core.truth_(or__3824__auto____3357)) {
        return or__3824__auto____3357
      }else {
        var or__3824__auto____3358 = cljs.core._with_meta["_"];
        if(cljs.core.truth_(or__3824__auto____3358)) {
          return or__3824__auto____3358
        }else {
          throw cljs.core.missing_protocol.call(null, "IWithMeta.-with-meta", o);
        }
      }
    }().call(null, o, meta)
  }
};
cljs.core.IReduce = {};
cljs.core._reduce = function() {
  var _reduce = null;
  var _reduce__3365 = function(coll, f) {
    if(cljs.core.truth_(function() {
      var and__3822__auto____3359 = coll;
      if(cljs.core.truth_(and__3822__auto____3359)) {
        return coll.cljs$core$IReduce$_reduce
      }else {
        return and__3822__auto____3359
      }
    }())) {
      return coll.cljs$core$IReduce$_reduce(coll, f)
    }else {
      return function() {
        var or__3824__auto____3360 = cljs.core._reduce[goog.typeOf.call(null, coll)];
        if(cljs.core.truth_(or__3824__auto____3360)) {
          return or__3824__auto____3360
        }else {
          var or__3824__auto____3361 = cljs.core._reduce["_"];
          if(cljs.core.truth_(or__3824__auto____3361)) {
            return or__3824__auto____3361
          }else {
            throw cljs.core.missing_protocol.call(null, "IReduce.-reduce", coll);
          }
        }
      }().call(null, coll, f)
    }
  };
  var _reduce__3366 = function(coll, f, start) {
    if(cljs.core.truth_(function() {
      var and__3822__auto____3362 = coll;
      if(cljs.core.truth_(and__3822__auto____3362)) {
        return coll.cljs$core$IReduce$_reduce
      }else {
        return and__3822__auto____3362
      }
    }())) {
      return coll.cljs$core$IReduce$_reduce(coll, f, start)
    }else {
      return function() {
        var or__3824__auto____3363 = cljs.core._reduce[goog.typeOf.call(null, coll)];
        if(cljs.core.truth_(or__3824__auto____3363)) {
          return or__3824__auto____3363
        }else {
          var or__3824__auto____3364 = cljs.core._reduce["_"];
          if(cljs.core.truth_(or__3824__auto____3364)) {
            return or__3824__auto____3364
          }else {
            throw cljs.core.missing_protocol.call(null, "IReduce.-reduce", coll);
          }
        }
      }().call(null, coll, f, start)
    }
  };
  _reduce = function(coll, f, start) {
    switch(arguments.length) {
      case 2:
        return _reduce__3365.call(this, coll, f);
      case 3:
        return _reduce__3366.call(this, coll, f, start)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return _reduce
}();
cljs.core.IEquiv = {};
cljs.core._equiv = function _equiv(o, other) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____3368 = o;
    if(cljs.core.truth_(and__3822__auto____3368)) {
      return o.cljs$core$IEquiv$_equiv
    }else {
      return and__3822__auto____3368
    }
  }())) {
    return o.cljs$core$IEquiv$_equiv(o, other)
  }else {
    return function() {
      var or__3824__auto____3369 = cljs.core._equiv[goog.typeOf.call(null, o)];
      if(cljs.core.truth_(or__3824__auto____3369)) {
        return or__3824__auto____3369
      }else {
        var or__3824__auto____3370 = cljs.core._equiv["_"];
        if(cljs.core.truth_(or__3824__auto____3370)) {
          return or__3824__auto____3370
        }else {
          throw cljs.core.missing_protocol.call(null, "IEquiv.-equiv", o);
        }
      }
    }().call(null, o, other)
  }
};
cljs.core.IHash = {};
cljs.core._hash = function _hash(o) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____3371 = o;
    if(cljs.core.truth_(and__3822__auto____3371)) {
      return o.cljs$core$IHash$_hash
    }else {
      return and__3822__auto____3371
    }
  }())) {
    return o.cljs$core$IHash$_hash(o)
  }else {
    return function() {
      var or__3824__auto____3372 = cljs.core._hash[goog.typeOf.call(null, o)];
      if(cljs.core.truth_(or__3824__auto____3372)) {
        return or__3824__auto____3372
      }else {
        var or__3824__auto____3373 = cljs.core._hash["_"];
        if(cljs.core.truth_(or__3824__auto____3373)) {
          return or__3824__auto____3373
        }else {
          throw cljs.core.missing_protocol.call(null, "IHash.-hash", o);
        }
      }
    }().call(null, o)
  }
};
cljs.core.ISeqable = {};
cljs.core._seq = function _seq(o) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____3374 = o;
    if(cljs.core.truth_(and__3822__auto____3374)) {
      return o.cljs$core$ISeqable$_seq
    }else {
      return and__3822__auto____3374
    }
  }())) {
    return o.cljs$core$ISeqable$_seq(o)
  }else {
    return function() {
      var or__3824__auto____3375 = cljs.core._seq[goog.typeOf.call(null, o)];
      if(cljs.core.truth_(or__3824__auto____3375)) {
        return or__3824__auto____3375
      }else {
        var or__3824__auto____3376 = cljs.core._seq["_"];
        if(cljs.core.truth_(or__3824__auto____3376)) {
          return or__3824__auto____3376
        }else {
          throw cljs.core.missing_protocol.call(null, "ISeqable.-seq", o);
        }
      }
    }().call(null, o)
  }
};
cljs.core.ISequential = {};
cljs.core.IRecord = {};
cljs.core.IPrintable = {};
cljs.core._pr_seq = function _pr_seq(o, opts) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____3377 = o;
    if(cljs.core.truth_(and__3822__auto____3377)) {
      return o.cljs$core$IPrintable$_pr_seq
    }else {
      return and__3822__auto____3377
    }
  }())) {
    return o.cljs$core$IPrintable$_pr_seq(o, opts)
  }else {
    return function() {
      var or__3824__auto____3378 = cljs.core._pr_seq[goog.typeOf.call(null, o)];
      if(cljs.core.truth_(or__3824__auto____3378)) {
        return or__3824__auto____3378
      }else {
        var or__3824__auto____3379 = cljs.core._pr_seq["_"];
        if(cljs.core.truth_(or__3824__auto____3379)) {
          return or__3824__auto____3379
        }else {
          throw cljs.core.missing_protocol.call(null, "IPrintable.-pr-seq", o);
        }
      }
    }().call(null, o, opts)
  }
};
cljs.core.IPending = {};
cljs.core._realized_QMARK_ = function _realized_QMARK_(d) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____3380 = d;
    if(cljs.core.truth_(and__3822__auto____3380)) {
      return d.cljs$core$IPending$_realized_QMARK_
    }else {
      return and__3822__auto____3380
    }
  }())) {
    return d.cljs$core$IPending$_realized_QMARK_(d)
  }else {
    return function() {
      var or__3824__auto____3381 = cljs.core._realized_QMARK_[goog.typeOf.call(null, d)];
      if(cljs.core.truth_(or__3824__auto____3381)) {
        return or__3824__auto____3381
      }else {
        var or__3824__auto____3382 = cljs.core._realized_QMARK_["_"];
        if(cljs.core.truth_(or__3824__auto____3382)) {
          return or__3824__auto____3382
        }else {
          throw cljs.core.missing_protocol.call(null, "IPending.-realized?", d);
        }
      }
    }().call(null, d)
  }
};
cljs.core.IWatchable = {};
cljs.core._notify_watches = function _notify_watches(this$, oldval, newval) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____3383 = this$;
    if(cljs.core.truth_(and__3822__auto____3383)) {
      return this$.cljs$core$IWatchable$_notify_watches
    }else {
      return and__3822__auto____3383
    }
  }())) {
    return this$.cljs$core$IWatchable$_notify_watches(this$, oldval, newval)
  }else {
    return function() {
      var or__3824__auto____3384 = cljs.core._notify_watches[goog.typeOf.call(null, this$)];
      if(cljs.core.truth_(or__3824__auto____3384)) {
        return or__3824__auto____3384
      }else {
        var or__3824__auto____3385 = cljs.core._notify_watches["_"];
        if(cljs.core.truth_(or__3824__auto____3385)) {
          return or__3824__auto____3385
        }else {
          throw cljs.core.missing_protocol.call(null, "IWatchable.-notify-watches", this$);
        }
      }
    }().call(null, this$, oldval, newval)
  }
};
cljs.core._add_watch = function _add_watch(this$, key, f) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____3386 = this$;
    if(cljs.core.truth_(and__3822__auto____3386)) {
      return this$.cljs$core$IWatchable$_add_watch
    }else {
      return and__3822__auto____3386
    }
  }())) {
    return this$.cljs$core$IWatchable$_add_watch(this$, key, f)
  }else {
    return function() {
      var or__3824__auto____3387 = cljs.core._add_watch[goog.typeOf.call(null, this$)];
      if(cljs.core.truth_(or__3824__auto____3387)) {
        return or__3824__auto____3387
      }else {
        var or__3824__auto____3388 = cljs.core._add_watch["_"];
        if(cljs.core.truth_(or__3824__auto____3388)) {
          return or__3824__auto____3388
        }else {
          throw cljs.core.missing_protocol.call(null, "IWatchable.-add-watch", this$);
        }
      }
    }().call(null, this$, key, f)
  }
};
cljs.core._remove_watch = function _remove_watch(this$, key) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____3389 = this$;
    if(cljs.core.truth_(and__3822__auto____3389)) {
      return this$.cljs$core$IWatchable$_remove_watch
    }else {
      return and__3822__auto____3389
    }
  }())) {
    return this$.cljs$core$IWatchable$_remove_watch(this$, key)
  }else {
    return function() {
      var or__3824__auto____3390 = cljs.core._remove_watch[goog.typeOf.call(null, this$)];
      if(cljs.core.truth_(or__3824__auto____3390)) {
        return or__3824__auto____3390
      }else {
        var or__3824__auto____3391 = cljs.core._remove_watch["_"];
        if(cljs.core.truth_(or__3824__auto____3391)) {
          return or__3824__auto____3391
        }else {
          throw cljs.core.missing_protocol.call(null, "IWatchable.-remove-watch", this$);
        }
      }
    }().call(null, this$, key)
  }
};
cljs.core.identical_QMARK_ = function identical_QMARK_(x, y) {
  return x === y
};
cljs.core._EQ_ = function _EQ_(x, y) {
  return cljs.core._equiv.call(null, x, y)
};
cljs.core.nil_QMARK_ = function nil_QMARK_(x) {
  return x === null
};
cljs.core.type = function type(x) {
  return x.constructor
};
cljs.core.IHash["null"] = true;
cljs.core._hash["null"] = function(o) {
  return 0
};
cljs.core.ILookup["null"] = true;
cljs.core._lookup["null"] = function() {
  var G__3392 = null;
  var G__3392__3393 = function(o, k) {
    return null
  };
  var G__3392__3394 = function(o, k, not_found) {
    return not_found
  };
  G__3392 = function(o, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__3392__3393.call(this, o, k);
      case 3:
        return G__3392__3394.call(this, o, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__3392
}();
cljs.core.IAssociative["null"] = true;
cljs.core._assoc["null"] = function(_, k, v) {
  return cljs.core.hash_map.call(null, k, v)
};
cljs.core.ICollection["null"] = true;
cljs.core._conj["null"] = function(_, o) {
  return cljs.core.list.call(null, o)
};
cljs.core.IReduce["null"] = true;
cljs.core._reduce["null"] = function() {
  var G__3396 = null;
  var G__3396__3397 = function(_, f) {
    return f.call(null)
  };
  var G__3396__3398 = function(_, f, start) {
    return start
  };
  G__3396 = function(_, f, start) {
    switch(arguments.length) {
      case 2:
        return G__3396__3397.call(this, _, f);
      case 3:
        return G__3396__3398.call(this, _, f, start)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__3396
}();
cljs.core.IPrintable["null"] = true;
cljs.core._pr_seq["null"] = function(o) {
  return cljs.core.list.call(null, "nil")
};
cljs.core.ISet["null"] = true;
cljs.core._disjoin["null"] = function(_, v) {
  return null
};
cljs.core.ICounted["null"] = true;
cljs.core._count["null"] = function(_) {
  return 0
};
cljs.core.IStack["null"] = true;
cljs.core._peek["null"] = function(_) {
  return null
};
cljs.core._pop["null"] = function(_) {
  return null
};
cljs.core.ISeq["null"] = true;
cljs.core._first["null"] = function(_) {
  return null
};
cljs.core._rest["null"] = function(_) {
  return cljs.core.list.call(null)
};
cljs.core.IEquiv["null"] = true;
cljs.core._equiv["null"] = function(_, o) {
  return o === null
};
cljs.core.IWithMeta["null"] = true;
cljs.core._with_meta["null"] = function(_, meta) {
  return null
};
cljs.core.IMeta["null"] = true;
cljs.core._meta["null"] = function(_) {
  return null
};
cljs.core.IIndexed["null"] = true;
cljs.core._nth["null"] = function() {
  var G__3400 = null;
  var G__3400__3401 = function(_, n) {
    return null
  };
  var G__3400__3402 = function(_, n, not_found) {
    return not_found
  };
  G__3400 = function(_, n, not_found) {
    switch(arguments.length) {
      case 2:
        return G__3400__3401.call(this, _, n);
      case 3:
        return G__3400__3402.call(this, _, n, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__3400
}();
cljs.core.IEmptyableCollection["null"] = true;
cljs.core._empty["null"] = function(_) {
  return null
};
cljs.core.IMap["null"] = true;
cljs.core._dissoc["null"] = function(_, k) {
  return null
};
Date.prototype.cljs$core$IEquiv$ = true;
Date.prototype.cljs$core$IEquiv$_equiv = function(o, other) {
  return o.toString() === other.toString()
};
cljs.core.IHash["number"] = true;
cljs.core._hash["number"] = function(o) {
  return o
};
cljs.core.IEquiv["number"] = true;
cljs.core._equiv["number"] = function(x, o) {
  return x === o
};
cljs.core.IHash["boolean"] = true;
cljs.core._hash["boolean"] = function(o) {
  return o === true ? 1 : 0
};
cljs.core.IHash["function"] = true;
cljs.core._hash["function"] = function(o) {
  return goog.getUid.call(null, o)
};
cljs.core.inc = function inc(x) {
  return x + 1
};
cljs.core.ci_reduce = function() {
  var ci_reduce = null;
  var ci_reduce__3410 = function(cicoll, f) {
    if(cljs.core.truth_(cljs.core._EQ_.call(null, 0, cljs.core._count.call(null, cicoll)))) {
      return f.call(null)
    }else {
      var val__3404 = cljs.core._nth.call(null, cicoll, 0);
      var n__3405 = 1;
      while(true) {
        if(cljs.core.truth_(n__3405 < cljs.core._count.call(null, cicoll))) {
          var G__3414 = f.call(null, val__3404, cljs.core._nth.call(null, cicoll, n__3405));
          var G__3415 = n__3405 + 1;
          val__3404 = G__3414;
          n__3405 = G__3415;
          continue
        }else {
          return val__3404
        }
        break
      }
    }
  };
  var ci_reduce__3411 = function(cicoll, f, val) {
    var val__3406 = val;
    var n__3407 = 0;
    while(true) {
      if(cljs.core.truth_(n__3407 < cljs.core._count.call(null, cicoll))) {
        var G__3416 = f.call(null, val__3406, cljs.core._nth.call(null, cicoll, n__3407));
        var G__3417 = n__3407 + 1;
        val__3406 = G__3416;
        n__3407 = G__3417;
        continue
      }else {
        return val__3406
      }
      break
    }
  };
  var ci_reduce__3412 = function(cicoll, f, val, idx) {
    var val__3408 = val;
    var n__3409 = idx;
    while(true) {
      if(cljs.core.truth_(n__3409 < cljs.core._count.call(null, cicoll))) {
        var G__3418 = f.call(null, val__3408, cljs.core._nth.call(null, cicoll, n__3409));
        var G__3419 = n__3409 + 1;
        val__3408 = G__3418;
        n__3409 = G__3419;
        continue
      }else {
        return val__3408
      }
      break
    }
  };
  ci_reduce = function(cicoll, f, val, idx) {
    switch(arguments.length) {
      case 2:
        return ci_reduce__3410.call(this, cicoll, f);
      case 3:
        return ci_reduce__3411.call(this, cicoll, f, val);
      case 4:
        return ci_reduce__3412.call(this, cicoll, f, val, idx)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return ci_reduce
}();
cljs.core.IndexedSeq = function(a, i) {
  this.a = a;
  this.i = i
};
cljs.core.IndexedSeq.cljs$core$IPrintable$_pr_seq = function(this__367__auto__) {
  return cljs.core.list.call(null, "cljs.core.IndexedSeq")
};
cljs.core.IndexedSeq.prototype.cljs$core$IHash$ = true;
cljs.core.IndexedSeq.prototype.cljs$core$IHash$_hash = function(coll) {
  var this__3420 = this;
  return cljs.core.hash_coll.call(null, coll)
};
cljs.core.IndexedSeq.prototype.cljs$core$IReduce$ = true;
cljs.core.IndexedSeq.prototype.cljs$core$IReduce$_reduce = function() {
  var G__3433 = null;
  var G__3433__3434 = function(_, f) {
    var this__3421 = this;
    return cljs.core.ci_reduce.call(null, this__3421.a, f, this__3421.a[this__3421.i], this__3421.i + 1)
  };
  var G__3433__3435 = function(_, f, start) {
    var this__3422 = this;
    return cljs.core.ci_reduce.call(null, this__3422.a, f, start, this__3422.i)
  };
  G__3433 = function(_, f, start) {
    switch(arguments.length) {
      case 2:
        return G__3433__3434.call(this, _, f);
      case 3:
        return G__3433__3435.call(this, _, f, start)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__3433
}();
cljs.core.IndexedSeq.prototype.cljs$core$ICollection$ = true;
cljs.core.IndexedSeq.prototype.cljs$core$ICollection$_conj = function(coll, o) {
  var this__3423 = this;
  return cljs.core.cons.call(null, o, coll)
};
cljs.core.IndexedSeq.prototype.cljs$core$IEquiv$ = true;
cljs.core.IndexedSeq.prototype.cljs$core$IEquiv$_equiv = function(coll, other) {
  var this__3424 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.IndexedSeq.prototype.cljs$core$ISequential$ = true;
cljs.core.IndexedSeq.prototype.cljs$core$IIndexed$ = true;
cljs.core.IndexedSeq.prototype.cljs$core$IIndexed$_nth = function() {
  var G__3437 = null;
  var G__3437__3438 = function(coll, n) {
    var this__3425 = this;
    var i__3426 = n + this__3425.i;
    if(cljs.core.truth_(i__3426 < this__3425.a.length)) {
      return this__3425.a[i__3426]
    }else {
      return null
    }
  };
  var G__3437__3439 = function(coll, n, not_found) {
    var this__3427 = this;
    var i__3428 = n + this__3427.i;
    if(cljs.core.truth_(i__3428 < this__3427.a.length)) {
      return this__3427.a[i__3428]
    }else {
      return not_found
    }
  };
  G__3437 = function(coll, n, not_found) {
    switch(arguments.length) {
      case 2:
        return G__3437__3438.call(this, coll, n);
      case 3:
        return G__3437__3439.call(this, coll, n, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__3437
}();
cljs.core.IndexedSeq.prototype.cljs$core$ICounted$ = true;
cljs.core.IndexedSeq.prototype.cljs$core$ICounted$_count = function(_) {
  var this__3429 = this;
  return this__3429.a.length - this__3429.i
};
cljs.core.IndexedSeq.prototype.cljs$core$ISeq$ = true;
cljs.core.IndexedSeq.prototype.cljs$core$ISeq$_first = function(_) {
  var this__3430 = this;
  return this__3430.a[this__3430.i]
};
cljs.core.IndexedSeq.prototype.cljs$core$ISeq$_rest = function(_) {
  var this__3431 = this;
  if(cljs.core.truth_(this__3431.i + 1 < this__3431.a.length)) {
    return new cljs.core.IndexedSeq(this__3431.a, this__3431.i + 1)
  }else {
    return cljs.core.list.call(null)
  }
};
cljs.core.IndexedSeq.prototype.cljs$core$ISeqable$ = true;
cljs.core.IndexedSeq.prototype.cljs$core$ISeqable$_seq = function(this$) {
  var this__3432 = this;
  return this$
};
cljs.core.IndexedSeq;
cljs.core.prim_seq = function prim_seq(prim, i) {
  if(cljs.core.truth_(cljs.core._EQ_.call(null, 0, prim.length))) {
    return null
  }else {
    return new cljs.core.IndexedSeq(prim, i)
  }
};
cljs.core.array_seq = function array_seq(array, i) {
  return cljs.core.prim_seq.call(null, array, i)
};
cljs.core.IReduce["array"] = true;
cljs.core._reduce["array"] = function() {
  var G__3441 = null;
  var G__3441__3442 = function(array, f) {
    return cljs.core.ci_reduce.call(null, array, f)
  };
  var G__3441__3443 = function(array, f, start) {
    return cljs.core.ci_reduce.call(null, array, f, start)
  };
  G__3441 = function(array, f, start) {
    switch(arguments.length) {
      case 2:
        return G__3441__3442.call(this, array, f);
      case 3:
        return G__3441__3443.call(this, array, f, start)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__3441
}();
cljs.core.ILookup["array"] = true;
cljs.core._lookup["array"] = function() {
  var G__3445 = null;
  var G__3445__3446 = function(array, k) {
    return array[k]
  };
  var G__3445__3447 = function(array, k, not_found) {
    return cljs.core._nth.call(null, array, k, not_found)
  };
  G__3445 = function(array, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__3445__3446.call(this, array, k);
      case 3:
        return G__3445__3447.call(this, array, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__3445
}();
cljs.core.IIndexed["array"] = true;
cljs.core._nth["array"] = function() {
  var G__3449 = null;
  var G__3449__3450 = function(array, n) {
    if(cljs.core.truth_(n < array.length)) {
      return array[n]
    }else {
      return null
    }
  };
  var G__3449__3451 = function(array, n, not_found) {
    if(cljs.core.truth_(n < array.length)) {
      return array[n]
    }else {
      return not_found
    }
  };
  G__3449 = function(array, n, not_found) {
    switch(arguments.length) {
      case 2:
        return G__3449__3450.call(this, array, n);
      case 3:
        return G__3449__3451.call(this, array, n, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__3449
}();
cljs.core.ICounted["array"] = true;
cljs.core._count["array"] = function(a) {
  return a.length
};
cljs.core.ISeqable["array"] = true;
cljs.core._seq["array"] = function(array) {
  return cljs.core.array_seq.call(null, array, 0)
};
cljs.core.seq = function seq(coll) {
  if(cljs.core.truth_(coll)) {
    return cljs.core._seq.call(null, coll)
  }else {
    return null
  }
};
cljs.core.first = function first(coll) {
  var temp__3974__auto____3453 = cljs.core.seq.call(null, coll);
  if(cljs.core.truth_(temp__3974__auto____3453)) {
    var s__3454 = temp__3974__auto____3453;
    return cljs.core._first.call(null, s__3454)
  }else {
    return null
  }
};
cljs.core.rest = function rest(coll) {
  return cljs.core._rest.call(null, cljs.core.seq.call(null, coll))
};
cljs.core.next = function next(coll) {
  if(cljs.core.truth_(coll)) {
    return cljs.core.seq.call(null, cljs.core.rest.call(null, coll))
  }else {
    return null
  }
};
cljs.core.second = function second(coll) {
  return cljs.core.first.call(null, cljs.core.next.call(null, coll))
};
cljs.core.ffirst = function ffirst(coll) {
  return cljs.core.first.call(null, cljs.core.first.call(null, coll))
};
cljs.core.nfirst = function nfirst(coll) {
  return cljs.core.next.call(null, cljs.core.first.call(null, coll))
};
cljs.core.fnext = function fnext(coll) {
  return cljs.core.first.call(null, cljs.core.next.call(null, coll))
};
cljs.core.nnext = function nnext(coll) {
  return cljs.core.next.call(null, cljs.core.next.call(null, coll))
};
cljs.core.last = function last(s) {
  while(true) {
    if(cljs.core.truth_(cljs.core.next.call(null, s))) {
      var G__3455 = cljs.core.next.call(null, s);
      s = G__3455;
      continue
    }else {
      return cljs.core.first.call(null, s)
    }
    break
  }
};
cljs.core.ICounted["_"] = true;
cljs.core._count["_"] = function(x) {
  var s__3456 = cljs.core.seq.call(null, x);
  var n__3457 = 0;
  while(true) {
    if(cljs.core.truth_(s__3456)) {
      var G__3458 = cljs.core.next.call(null, s__3456);
      var G__3459 = n__3457 + 1;
      s__3456 = G__3458;
      n__3457 = G__3459;
      continue
    }else {
      return n__3457
    }
    break
  }
};
cljs.core.IEquiv["_"] = true;
cljs.core._equiv["_"] = function(x, o) {
  return x === o
};
cljs.core.not = function not(x) {
  if(cljs.core.truth_(x)) {
    return false
  }else {
    return true
  }
};
cljs.core.conj = function() {
  var conj = null;
  var conj__3460 = function(coll, x) {
    return cljs.core._conj.call(null, coll, x)
  };
  var conj__3461 = function() {
    var G__3463__delegate = function(coll, x, xs) {
      while(true) {
        if(cljs.core.truth_(xs)) {
          var G__3464 = conj.call(null, coll, x);
          var G__3465 = cljs.core.first.call(null, xs);
          var G__3466 = cljs.core.next.call(null, xs);
          coll = G__3464;
          x = G__3465;
          xs = G__3466;
          continue
        }else {
          return conj.call(null, coll, x)
        }
        break
      }
    };
    var G__3463 = function(coll, x, var_args) {
      var xs = null;
      if(goog.isDef(var_args)) {
        xs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__3463__delegate.call(this, coll, x, xs)
    };
    G__3463.cljs$lang$maxFixedArity = 2;
    G__3463.cljs$lang$applyTo = function(arglist__3467) {
      var coll = cljs.core.first(arglist__3467);
      var x = cljs.core.first(cljs.core.next(arglist__3467));
      var xs = cljs.core.rest(cljs.core.next(arglist__3467));
      return G__3463__delegate.call(this, coll, x, xs)
    };
    return G__3463
  }();
  conj = function(coll, x, var_args) {
    var xs = var_args;
    switch(arguments.length) {
      case 2:
        return conj__3460.call(this, coll, x);
      default:
        return conj__3461.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  conj.cljs$lang$maxFixedArity = 2;
  conj.cljs$lang$applyTo = conj__3461.cljs$lang$applyTo;
  return conj
}();
cljs.core.empty = function empty(coll) {
  return cljs.core._empty.call(null, coll)
};
cljs.core.count = function count(coll) {
  return cljs.core._count.call(null, coll)
};
cljs.core.nth = function() {
  var nth = null;
  var nth__3468 = function(coll, n) {
    return cljs.core._nth.call(null, coll, Math.floor(n))
  };
  var nth__3469 = function(coll, n, not_found) {
    return cljs.core._nth.call(null, coll, Math.floor(n), not_found)
  };
  nth = function(coll, n, not_found) {
    switch(arguments.length) {
      case 2:
        return nth__3468.call(this, coll, n);
      case 3:
        return nth__3469.call(this, coll, n, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return nth
}();
cljs.core.get = function() {
  var get = null;
  var get__3471 = function(o, k) {
    return cljs.core._lookup.call(null, o, k)
  };
  var get__3472 = function(o, k, not_found) {
    return cljs.core._lookup.call(null, o, k, not_found)
  };
  get = function(o, k, not_found) {
    switch(arguments.length) {
      case 2:
        return get__3471.call(this, o, k);
      case 3:
        return get__3472.call(this, o, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return get
}();
cljs.core.assoc = function() {
  var assoc = null;
  var assoc__3475 = function(coll, k, v) {
    return cljs.core._assoc.call(null, coll, k, v)
  };
  var assoc__3476 = function() {
    var G__3478__delegate = function(coll, k, v, kvs) {
      while(true) {
        var ret__3474 = assoc.call(null, coll, k, v);
        if(cljs.core.truth_(kvs)) {
          var G__3479 = ret__3474;
          var G__3480 = cljs.core.first.call(null, kvs);
          var G__3481 = cljs.core.second.call(null, kvs);
          var G__3482 = cljs.core.nnext.call(null, kvs);
          coll = G__3479;
          k = G__3480;
          v = G__3481;
          kvs = G__3482;
          continue
        }else {
          return ret__3474
        }
        break
      }
    };
    var G__3478 = function(coll, k, v, var_args) {
      var kvs = null;
      if(goog.isDef(var_args)) {
        kvs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
      }
      return G__3478__delegate.call(this, coll, k, v, kvs)
    };
    G__3478.cljs$lang$maxFixedArity = 3;
    G__3478.cljs$lang$applyTo = function(arglist__3483) {
      var coll = cljs.core.first(arglist__3483);
      var k = cljs.core.first(cljs.core.next(arglist__3483));
      var v = cljs.core.first(cljs.core.next(cljs.core.next(arglist__3483)));
      var kvs = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__3483)));
      return G__3478__delegate.call(this, coll, k, v, kvs)
    };
    return G__3478
  }();
  assoc = function(coll, k, v, var_args) {
    var kvs = var_args;
    switch(arguments.length) {
      case 3:
        return assoc__3475.call(this, coll, k, v);
      default:
        return assoc__3476.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  assoc.cljs$lang$maxFixedArity = 3;
  assoc.cljs$lang$applyTo = assoc__3476.cljs$lang$applyTo;
  return assoc
}();
cljs.core.dissoc = function() {
  var dissoc = null;
  var dissoc__3485 = function(coll) {
    return coll
  };
  var dissoc__3486 = function(coll, k) {
    return cljs.core._dissoc.call(null, coll, k)
  };
  var dissoc__3487 = function() {
    var G__3489__delegate = function(coll, k, ks) {
      while(true) {
        var ret__3484 = dissoc.call(null, coll, k);
        if(cljs.core.truth_(ks)) {
          var G__3490 = ret__3484;
          var G__3491 = cljs.core.first.call(null, ks);
          var G__3492 = cljs.core.next.call(null, ks);
          coll = G__3490;
          k = G__3491;
          ks = G__3492;
          continue
        }else {
          return ret__3484
        }
        break
      }
    };
    var G__3489 = function(coll, k, var_args) {
      var ks = null;
      if(goog.isDef(var_args)) {
        ks = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__3489__delegate.call(this, coll, k, ks)
    };
    G__3489.cljs$lang$maxFixedArity = 2;
    G__3489.cljs$lang$applyTo = function(arglist__3493) {
      var coll = cljs.core.first(arglist__3493);
      var k = cljs.core.first(cljs.core.next(arglist__3493));
      var ks = cljs.core.rest(cljs.core.next(arglist__3493));
      return G__3489__delegate.call(this, coll, k, ks)
    };
    return G__3489
  }();
  dissoc = function(coll, k, var_args) {
    var ks = var_args;
    switch(arguments.length) {
      case 1:
        return dissoc__3485.call(this, coll);
      case 2:
        return dissoc__3486.call(this, coll, k);
      default:
        return dissoc__3487.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  dissoc.cljs$lang$maxFixedArity = 2;
  dissoc.cljs$lang$applyTo = dissoc__3487.cljs$lang$applyTo;
  return dissoc
}();
cljs.core.with_meta = function with_meta(o, meta) {
  return cljs.core._with_meta.call(null, o, meta)
};
cljs.core.meta = function meta(o) {
  if(cljs.core.truth_(function() {
    var x__451__auto____3494 = o;
    if(cljs.core.truth_(function() {
      var and__3822__auto____3495 = x__451__auto____3494;
      if(cljs.core.truth_(and__3822__auto____3495)) {
        var and__3822__auto____3496 = x__451__auto____3494.cljs$core$IMeta$;
        if(cljs.core.truth_(and__3822__auto____3496)) {
          return cljs.core.not.call(null, x__451__auto____3494.hasOwnProperty("cljs$core$IMeta$"))
        }else {
          return and__3822__auto____3496
        }
      }else {
        return and__3822__auto____3495
      }
    }())) {
      return true
    }else {
      return cljs.core.type_satisfies_.call(null, cljs.core.IMeta, x__451__auto____3494)
    }
  }())) {
    return cljs.core._meta.call(null, o)
  }else {
    return null
  }
};
cljs.core.peek = function peek(coll) {
  return cljs.core._peek.call(null, coll)
};
cljs.core.pop = function pop(coll) {
  return cljs.core._pop.call(null, coll)
};
cljs.core.disj = function() {
  var disj = null;
  var disj__3498 = function(coll) {
    return coll
  };
  var disj__3499 = function(coll, k) {
    return cljs.core._disjoin.call(null, coll, k)
  };
  var disj__3500 = function() {
    var G__3502__delegate = function(coll, k, ks) {
      while(true) {
        var ret__3497 = disj.call(null, coll, k);
        if(cljs.core.truth_(ks)) {
          var G__3503 = ret__3497;
          var G__3504 = cljs.core.first.call(null, ks);
          var G__3505 = cljs.core.next.call(null, ks);
          coll = G__3503;
          k = G__3504;
          ks = G__3505;
          continue
        }else {
          return ret__3497
        }
        break
      }
    };
    var G__3502 = function(coll, k, var_args) {
      var ks = null;
      if(goog.isDef(var_args)) {
        ks = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__3502__delegate.call(this, coll, k, ks)
    };
    G__3502.cljs$lang$maxFixedArity = 2;
    G__3502.cljs$lang$applyTo = function(arglist__3506) {
      var coll = cljs.core.first(arglist__3506);
      var k = cljs.core.first(cljs.core.next(arglist__3506));
      var ks = cljs.core.rest(cljs.core.next(arglist__3506));
      return G__3502__delegate.call(this, coll, k, ks)
    };
    return G__3502
  }();
  disj = function(coll, k, var_args) {
    var ks = var_args;
    switch(arguments.length) {
      case 1:
        return disj__3498.call(this, coll);
      case 2:
        return disj__3499.call(this, coll, k);
      default:
        return disj__3500.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  disj.cljs$lang$maxFixedArity = 2;
  disj.cljs$lang$applyTo = disj__3500.cljs$lang$applyTo;
  return disj
}();
cljs.core.hash = function hash(o) {
  return cljs.core._hash.call(null, o)
};
cljs.core.empty_QMARK_ = function empty_QMARK_(coll) {
  return cljs.core.not.call(null, cljs.core.seq.call(null, coll))
};
cljs.core.coll_QMARK_ = function coll_QMARK_(x) {
  if(cljs.core.truth_(x === null)) {
    return false
  }else {
    var x__451__auto____3507 = x;
    if(cljs.core.truth_(function() {
      var and__3822__auto____3508 = x__451__auto____3507;
      if(cljs.core.truth_(and__3822__auto____3508)) {
        var and__3822__auto____3509 = x__451__auto____3507.cljs$core$ICollection$;
        if(cljs.core.truth_(and__3822__auto____3509)) {
          return cljs.core.not.call(null, x__451__auto____3507.hasOwnProperty("cljs$core$ICollection$"))
        }else {
          return and__3822__auto____3509
        }
      }else {
        return and__3822__auto____3508
      }
    }())) {
      return true
    }else {
      return cljs.core.type_satisfies_.call(null, cljs.core.ICollection, x__451__auto____3507)
    }
  }
};
cljs.core.set_QMARK_ = function set_QMARK_(x) {
  if(cljs.core.truth_(x === null)) {
    return false
  }else {
    var x__451__auto____3510 = x;
    if(cljs.core.truth_(function() {
      var and__3822__auto____3511 = x__451__auto____3510;
      if(cljs.core.truth_(and__3822__auto____3511)) {
        var and__3822__auto____3512 = x__451__auto____3510.cljs$core$ISet$;
        if(cljs.core.truth_(and__3822__auto____3512)) {
          return cljs.core.not.call(null, x__451__auto____3510.hasOwnProperty("cljs$core$ISet$"))
        }else {
          return and__3822__auto____3512
        }
      }else {
        return and__3822__auto____3511
      }
    }())) {
      return true
    }else {
      return cljs.core.type_satisfies_.call(null, cljs.core.ISet, x__451__auto____3510)
    }
  }
};
cljs.core.associative_QMARK_ = function associative_QMARK_(x) {
  var x__451__auto____3513 = x;
  if(cljs.core.truth_(function() {
    var and__3822__auto____3514 = x__451__auto____3513;
    if(cljs.core.truth_(and__3822__auto____3514)) {
      var and__3822__auto____3515 = x__451__auto____3513.cljs$core$IAssociative$;
      if(cljs.core.truth_(and__3822__auto____3515)) {
        return cljs.core.not.call(null, x__451__auto____3513.hasOwnProperty("cljs$core$IAssociative$"))
      }else {
        return and__3822__auto____3515
      }
    }else {
      return and__3822__auto____3514
    }
  }())) {
    return true
  }else {
    return cljs.core.type_satisfies_.call(null, cljs.core.IAssociative, x__451__auto____3513)
  }
};
cljs.core.sequential_QMARK_ = function sequential_QMARK_(x) {
  var x__451__auto____3516 = x;
  if(cljs.core.truth_(function() {
    var and__3822__auto____3517 = x__451__auto____3516;
    if(cljs.core.truth_(and__3822__auto____3517)) {
      var and__3822__auto____3518 = x__451__auto____3516.cljs$core$ISequential$;
      if(cljs.core.truth_(and__3822__auto____3518)) {
        return cljs.core.not.call(null, x__451__auto____3516.hasOwnProperty("cljs$core$ISequential$"))
      }else {
        return and__3822__auto____3518
      }
    }else {
      return and__3822__auto____3517
    }
  }())) {
    return true
  }else {
    return cljs.core.type_satisfies_.call(null, cljs.core.ISequential, x__451__auto____3516)
  }
};
cljs.core.counted_QMARK_ = function counted_QMARK_(x) {
  var x__451__auto____3519 = x;
  if(cljs.core.truth_(function() {
    var and__3822__auto____3520 = x__451__auto____3519;
    if(cljs.core.truth_(and__3822__auto____3520)) {
      var and__3822__auto____3521 = x__451__auto____3519.cljs$core$ICounted$;
      if(cljs.core.truth_(and__3822__auto____3521)) {
        return cljs.core.not.call(null, x__451__auto____3519.hasOwnProperty("cljs$core$ICounted$"))
      }else {
        return and__3822__auto____3521
      }
    }else {
      return and__3822__auto____3520
    }
  }())) {
    return true
  }else {
    return cljs.core.type_satisfies_.call(null, cljs.core.ICounted, x__451__auto____3519)
  }
};
cljs.core.map_QMARK_ = function map_QMARK_(x) {
  if(cljs.core.truth_(x === null)) {
    return false
  }else {
    var x__451__auto____3522 = x;
    if(cljs.core.truth_(function() {
      var and__3822__auto____3523 = x__451__auto____3522;
      if(cljs.core.truth_(and__3822__auto____3523)) {
        var and__3822__auto____3524 = x__451__auto____3522.cljs$core$IMap$;
        if(cljs.core.truth_(and__3822__auto____3524)) {
          return cljs.core.not.call(null, x__451__auto____3522.hasOwnProperty("cljs$core$IMap$"))
        }else {
          return and__3822__auto____3524
        }
      }else {
        return and__3822__auto____3523
      }
    }())) {
      return true
    }else {
      return cljs.core.type_satisfies_.call(null, cljs.core.IMap, x__451__auto____3522)
    }
  }
};
cljs.core.vector_QMARK_ = function vector_QMARK_(x) {
  var x__451__auto____3525 = x;
  if(cljs.core.truth_(function() {
    var and__3822__auto____3526 = x__451__auto____3525;
    if(cljs.core.truth_(and__3822__auto____3526)) {
      var and__3822__auto____3527 = x__451__auto____3525.cljs$core$IVector$;
      if(cljs.core.truth_(and__3822__auto____3527)) {
        return cljs.core.not.call(null, x__451__auto____3525.hasOwnProperty("cljs$core$IVector$"))
      }else {
        return and__3822__auto____3527
      }
    }else {
      return and__3822__auto____3526
    }
  }())) {
    return true
  }else {
    return cljs.core.type_satisfies_.call(null, cljs.core.IVector, x__451__auto____3525)
  }
};
cljs.core.js_obj = function js_obj() {
  return{}
};
cljs.core.js_keys = function js_keys(obj) {
  var keys__3528 = [];
  goog.object.forEach.call(null, obj, function(val, key, obj) {
    return keys__3528.push(key)
  });
  return keys__3528
};
cljs.core.js_delete = function js_delete(obj, key) {
  return delete obj[key]
};
cljs.core.lookup_sentinel = cljs.core.js_obj.call(null);
cljs.core.false_QMARK_ = function false_QMARK_(x) {
  return x === false
};
cljs.core.true_QMARK_ = function true_QMARK_(x) {
  return x === true
};
cljs.core.undefined_QMARK_ = function undefined_QMARK_(x) {
  return void 0 === x
};
cljs.core.instance_QMARK_ = function instance_QMARK_(t, o) {
  return o != null && (o instanceof t || o.constructor === t || t === Object)
};
cljs.core.seq_QMARK_ = function seq_QMARK_(s) {
  if(cljs.core.truth_(s === null)) {
    return false
  }else {
    var x__451__auto____3529 = s;
    if(cljs.core.truth_(function() {
      var and__3822__auto____3530 = x__451__auto____3529;
      if(cljs.core.truth_(and__3822__auto____3530)) {
        var and__3822__auto____3531 = x__451__auto____3529.cljs$core$ISeq$;
        if(cljs.core.truth_(and__3822__auto____3531)) {
          return cljs.core.not.call(null, x__451__auto____3529.hasOwnProperty("cljs$core$ISeq$"))
        }else {
          return and__3822__auto____3531
        }
      }else {
        return and__3822__auto____3530
      }
    }())) {
      return true
    }else {
      return cljs.core.type_satisfies_.call(null, cljs.core.ISeq, x__451__auto____3529)
    }
  }
};
cljs.core.boolean$ = function boolean$(x) {
  if(cljs.core.truth_(x)) {
    return true
  }else {
    return false
  }
};
cljs.core.string_QMARK_ = function string_QMARK_(x) {
  var and__3822__auto____3532 = goog.isString.call(null, x);
  if(cljs.core.truth_(and__3822__auto____3532)) {
    return cljs.core.not.call(null, function() {
      var or__3824__auto____3533 = cljs.core._EQ_.call(null, x.charAt(0), "\ufdd0");
      if(cljs.core.truth_(or__3824__auto____3533)) {
        return or__3824__auto____3533
      }else {
        return cljs.core._EQ_.call(null, x.charAt(0), "\ufdd1")
      }
    }())
  }else {
    return and__3822__auto____3532
  }
};
cljs.core.keyword_QMARK_ = function keyword_QMARK_(x) {
  var and__3822__auto____3534 = goog.isString.call(null, x);
  if(cljs.core.truth_(and__3822__auto____3534)) {
    return cljs.core._EQ_.call(null, x.charAt(0), "\ufdd0")
  }else {
    return and__3822__auto____3534
  }
};
cljs.core.symbol_QMARK_ = function symbol_QMARK_(x) {
  var and__3822__auto____3535 = goog.isString.call(null, x);
  if(cljs.core.truth_(and__3822__auto____3535)) {
    return cljs.core._EQ_.call(null, x.charAt(0), "\ufdd1")
  }else {
    return and__3822__auto____3535
  }
};
cljs.core.number_QMARK_ = function number_QMARK_(n) {
  return goog.isNumber.call(null, n)
};
cljs.core.fn_QMARK_ = function fn_QMARK_(f) {
  return goog.isFunction.call(null, f)
};
cljs.core.integer_QMARK_ = function integer_QMARK_(n) {
  var and__3822__auto____3536 = cljs.core.number_QMARK_.call(null, n);
  if(cljs.core.truth_(and__3822__auto____3536)) {
    return n == n.toFixed()
  }else {
    return and__3822__auto____3536
  }
};
cljs.core.contains_QMARK_ = function contains_QMARK_(coll, v) {
  if(cljs.core.truth_(cljs.core._lookup.call(null, coll, v, cljs.core.lookup_sentinel) === cljs.core.lookup_sentinel)) {
    return false
  }else {
    return true
  }
};
cljs.core.find = function find(coll, k) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____3537 = coll;
    if(cljs.core.truth_(and__3822__auto____3537)) {
      var and__3822__auto____3538 = cljs.core.associative_QMARK_.call(null, coll);
      if(cljs.core.truth_(and__3822__auto____3538)) {
        return cljs.core.contains_QMARK_.call(null, coll, k)
      }else {
        return and__3822__auto____3538
      }
    }else {
      return and__3822__auto____3537
    }
  }())) {
    return cljs.core.PersistentVector.fromArray([k, cljs.core._lookup.call(null, coll, k)])
  }else {
    return null
  }
};
cljs.core.distinct_QMARK_ = function() {
  var distinct_QMARK_ = null;
  var distinct_QMARK___3543 = function(x) {
    return true
  };
  var distinct_QMARK___3544 = function(x, y) {
    return cljs.core.not.call(null, cljs.core._EQ_.call(null, x, y))
  };
  var distinct_QMARK___3545 = function() {
    var G__3547__delegate = function(x, y, more) {
      if(cljs.core.truth_(cljs.core.not.call(null, cljs.core._EQ_.call(null, x, y)))) {
        var s__3539 = cljs.core.set([y, x]);
        var xs__3540 = more;
        while(true) {
          var x__3541 = cljs.core.first.call(null, xs__3540);
          var etc__3542 = cljs.core.next.call(null, xs__3540);
          if(cljs.core.truth_(xs__3540)) {
            if(cljs.core.truth_(cljs.core.contains_QMARK_.call(null, s__3539, x__3541))) {
              return false
            }else {
              var G__3548 = cljs.core.conj.call(null, s__3539, x__3541);
              var G__3549 = etc__3542;
              s__3539 = G__3548;
              xs__3540 = G__3549;
              continue
            }
          }else {
            return true
          }
          break
        }
      }else {
        return false
      }
    };
    var G__3547 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__3547__delegate.call(this, x, y, more)
    };
    G__3547.cljs$lang$maxFixedArity = 2;
    G__3547.cljs$lang$applyTo = function(arglist__3550) {
      var x = cljs.core.first(arglist__3550);
      var y = cljs.core.first(cljs.core.next(arglist__3550));
      var more = cljs.core.rest(cljs.core.next(arglist__3550));
      return G__3547__delegate.call(this, x, y, more)
    };
    return G__3547
  }();
  distinct_QMARK_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return distinct_QMARK___3543.call(this, x);
      case 2:
        return distinct_QMARK___3544.call(this, x, y);
      default:
        return distinct_QMARK___3545.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  distinct_QMARK_.cljs$lang$maxFixedArity = 2;
  distinct_QMARK_.cljs$lang$applyTo = distinct_QMARK___3545.cljs$lang$applyTo;
  return distinct_QMARK_
}();
cljs.core.compare = function compare(x, y) {
  return goog.array.defaultCompare.call(null, x, y)
};
cljs.core.fn__GT_comparator = function fn__GT_comparator(f) {
  if(cljs.core.truth_(cljs.core._EQ_.call(null, f, cljs.core.compare))) {
    return cljs.core.compare
  }else {
    return function(x, y) {
      var r__3551 = f.call(null, x, y);
      if(cljs.core.truth_(cljs.core.number_QMARK_.call(null, r__3551))) {
        return r__3551
      }else {
        if(cljs.core.truth_(r__3551)) {
          return-1
        }else {
          if(cljs.core.truth_(f.call(null, y, x))) {
            return 1
          }else {
            return 0
          }
        }
      }
    }
  }
};
cljs.core.sort = function() {
  var sort = null;
  var sort__3553 = function(coll) {
    return sort.call(null, cljs.core.compare, coll)
  };
  var sort__3554 = function(comp, coll) {
    if(cljs.core.truth_(cljs.core.seq.call(null, coll))) {
      var a__3552 = cljs.core.to_array.call(null, coll);
      goog.array.stableSort.call(null, a__3552, cljs.core.fn__GT_comparator.call(null, comp));
      return cljs.core.seq.call(null, a__3552)
    }else {
      return cljs.core.List.EMPTY
    }
  };
  sort = function(comp, coll) {
    switch(arguments.length) {
      case 1:
        return sort__3553.call(this, comp);
      case 2:
        return sort__3554.call(this, comp, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return sort
}();
cljs.core.sort_by = function() {
  var sort_by = null;
  var sort_by__3556 = function(keyfn, coll) {
    return sort_by.call(null, keyfn, cljs.core.compare, coll)
  };
  var sort_by__3557 = function(keyfn, comp, coll) {
    return cljs.core.sort.call(null, function(x, y) {
      return cljs.core.fn__GT_comparator.call(null, comp).call(null, keyfn.call(null, x), keyfn.call(null, y))
    }, coll)
  };
  sort_by = function(keyfn, comp, coll) {
    switch(arguments.length) {
      case 2:
        return sort_by__3556.call(this, keyfn, comp);
      case 3:
        return sort_by__3557.call(this, keyfn, comp, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return sort_by
}();
cljs.core.reduce = function() {
  var reduce = null;
  var reduce__3559 = function(f, coll) {
    return cljs.core._reduce.call(null, coll, f)
  };
  var reduce__3560 = function(f, val, coll) {
    return cljs.core._reduce.call(null, coll, f, val)
  };
  reduce = function(f, val, coll) {
    switch(arguments.length) {
      case 2:
        return reduce__3559.call(this, f, val);
      case 3:
        return reduce__3560.call(this, f, val, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return reduce
}();
cljs.core.seq_reduce = function() {
  var seq_reduce = null;
  var seq_reduce__3566 = function(f, coll) {
    var temp__3971__auto____3562 = cljs.core.seq.call(null, coll);
    if(cljs.core.truth_(temp__3971__auto____3562)) {
      var s__3563 = temp__3971__auto____3562;
      return cljs.core.reduce.call(null, f, cljs.core.first.call(null, s__3563), cljs.core.next.call(null, s__3563))
    }else {
      return f.call(null)
    }
  };
  var seq_reduce__3567 = function(f, val, coll) {
    var val__3564 = val;
    var coll__3565 = cljs.core.seq.call(null, coll);
    while(true) {
      if(cljs.core.truth_(coll__3565)) {
        var G__3569 = f.call(null, val__3564, cljs.core.first.call(null, coll__3565));
        var G__3570 = cljs.core.next.call(null, coll__3565);
        val__3564 = G__3569;
        coll__3565 = G__3570;
        continue
      }else {
        return val__3564
      }
      break
    }
  };
  seq_reduce = function(f, val, coll) {
    switch(arguments.length) {
      case 2:
        return seq_reduce__3566.call(this, f, val);
      case 3:
        return seq_reduce__3567.call(this, f, val, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return seq_reduce
}();
cljs.core.IReduce["_"] = true;
cljs.core._reduce["_"] = function() {
  var G__3571 = null;
  var G__3571__3572 = function(coll, f) {
    return cljs.core.seq_reduce.call(null, f, coll)
  };
  var G__3571__3573 = function(coll, f, start) {
    return cljs.core.seq_reduce.call(null, f, start, coll)
  };
  G__3571 = function(coll, f, start) {
    switch(arguments.length) {
      case 2:
        return G__3571__3572.call(this, coll, f);
      case 3:
        return G__3571__3573.call(this, coll, f, start)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__3571
}();
cljs.core._PLUS_ = function() {
  var _PLUS_ = null;
  var _PLUS___3575 = function() {
    return 0
  };
  var _PLUS___3576 = function(x) {
    return x
  };
  var _PLUS___3577 = function(x, y) {
    return x + y
  };
  var _PLUS___3578 = function() {
    var G__3580__delegate = function(x, y, more) {
      return cljs.core.reduce.call(null, _PLUS_, x + y, more)
    };
    var G__3580 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__3580__delegate.call(this, x, y, more)
    };
    G__3580.cljs$lang$maxFixedArity = 2;
    G__3580.cljs$lang$applyTo = function(arglist__3581) {
      var x = cljs.core.first(arglist__3581);
      var y = cljs.core.first(cljs.core.next(arglist__3581));
      var more = cljs.core.rest(cljs.core.next(arglist__3581));
      return G__3580__delegate.call(this, x, y, more)
    };
    return G__3580
  }();
  _PLUS_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 0:
        return _PLUS___3575.call(this);
      case 1:
        return _PLUS___3576.call(this, x);
      case 2:
        return _PLUS___3577.call(this, x, y);
      default:
        return _PLUS___3578.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  _PLUS_.cljs$lang$maxFixedArity = 2;
  _PLUS_.cljs$lang$applyTo = _PLUS___3578.cljs$lang$applyTo;
  return _PLUS_
}();
cljs.core._ = function() {
  var _ = null;
  var ___3582 = function(x) {
    return-x
  };
  var ___3583 = function(x, y) {
    return x - y
  };
  var ___3584 = function() {
    var G__3586__delegate = function(x, y, more) {
      return cljs.core.reduce.call(null, _, x - y, more)
    };
    var G__3586 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__3586__delegate.call(this, x, y, more)
    };
    G__3586.cljs$lang$maxFixedArity = 2;
    G__3586.cljs$lang$applyTo = function(arglist__3587) {
      var x = cljs.core.first(arglist__3587);
      var y = cljs.core.first(cljs.core.next(arglist__3587));
      var more = cljs.core.rest(cljs.core.next(arglist__3587));
      return G__3586__delegate.call(this, x, y, more)
    };
    return G__3586
  }();
  _ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return ___3582.call(this, x);
      case 2:
        return ___3583.call(this, x, y);
      default:
        return ___3584.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  _.cljs$lang$maxFixedArity = 2;
  _.cljs$lang$applyTo = ___3584.cljs$lang$applyTo;
  return _
}();
cljs.core._STAR_ = function() {
  var _STAR_ = null;
  var _STAR___3588 = function() {
    return 1
  };
  var _STAR___3589 = function(x) {
    return x
  };
  var _STAR___3590 = function(x, y) {
    return x * y
  };
  var _STAR___3591 = function() {
    var G__3593__delegate = function(x, y, more) {
      return cljs.core.reduce.call(null, _STAR_, x * y, more)
    };
    var G__3593 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__3593__delegate.call(this, x, y, more)
    };
    G__3593.cljs$lang$maxFixedArity = 2;
    G__3593.cljs$lang$applyTo = function(arglist__3594) {
      var x = cljs.core.first(arglist__3594);
      var y = cljs.core.first(cljs.core.next(arglist__3594));
      var more = cljs.core.rest(cljs.core.next(arglist__3594));
      return G__3593__delegate.call(this, x, y, more)
    };
    return G__3593
  }();
  _STAR_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 0:
        return _STAR___3588.call(this);
      case 1:
        return _STAR___3589.call(this, x);
      case 2:
        return _STAR___3590.call(this, x, y);
      default:
        return _STAR___3591.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  _STAR_.cljs$lang$maxFixedArity = 2;
  _STAR_.cljs$lang$applyTo = _STAR___3591.cljs$lang$applyTo;
  return _STAR_
}();
cljs.core._SLASH_ = function() {
  var _SLASH_ = null;
  var _SLASH___3595 = function(x) {
    return _SLASH_.call(null, 1, x)
  };
  var _SLASH___3596 = function(x, y) {
    return x / y
  };
  var _SLASH___3597 = function() {
    var G__3599__delegate = function(x, y, more) {
      return cljs.core.reduce.call(null, _SLASH_, _SLASH_.call(null, x, y), more)
    };
    var G__3599 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__3599__delegate.call(this, x, y, more)
    };
    G__3599.cljs$lang$maxFixedArity = 2;
    G__3599.cljs$lang$applyTo = function(arglist__3600) {
      var x = cljs.core.first(arglist__3600);
      var y = cljs.core.first(cljs.core.next(arglist__3600));
      var more = cljs.core.rest(cljs.core.next(arglist__3600));
      return G__3599__delegate.call(this, x, y, more)
    };
    return G__3599
  }();
  _SLASH_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return _SLASH___3595.call(this, x);
      case 2:
        return _SLASH___3596.call(this, x, y);
      default:
        return _SLASH___3597.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  _SLASH_.cljs$lang$maxFixedArity = 2;
  _SLASH_.cljs$lang$applyTo = _SLASH___3597.cljs$lang$applyTo;
  return _SLASH_
}();
cljs.core._LT_ = function() {
  var _LT_ = null;
  var _LT___3601 = function(x) {
    return true
  };
  var _LT___3602 = function(x, y) {
    return x < y
  };
  var _LT___3603 = function() {
    var G__3605__delegate = function(x, y, more) {
      while(true) {
        if(cljs.core.truth_(x < y)) {
          if(cljs.core.truth_(cljs.core.next.call(null, more))) {
            var G__3606 = y;
            var G__3607 = cljs.core.first.call(null, more);
            var G__3608 = cljs.core.next.call(null, more);
            x = G__3606;
            y = G__3607;
            more = G__3608;
            continue
          }else {
            return y < cljs.core.first.call(null, more)
          }
        }else {
          return false
        }
        break
      }
    };
    var G__3605 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__3605__delegate.call(this, x, y, more)
    };
    G__3605.cljs$lang$maxFixedArity = 2;
    G__3605.cljs$lang$applyTo = function(arglist__3609) {
      var x = cljs.core.first(arglist__3609);
      var y = cljs.core.first(cljs.core.next(arglist__3609));
      var more = cljs.core.rest(cljs.core.next(arglist__3609));
      return G__3605__delegate.call(this, x, y, more)
    };
    return G__3605
  }();
  _LT_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return _LT___3601.call(this, x);
      case 2:
        return _LT___3602.call(this, x, y);
      default:
        return _LT___3603.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  _LT_.cljs$lang$maxFixedArity = 2;
  _LT_.cljs$lang$applyTo = _LT___3603.cljs$lang$applyTo;
  return _LT_
}();
cljs.core._LT__EQ_ = function() {
  var _LT__EQ_ = null;
  var _LT__EQ___3610 = function(x) {
    return true
  };
  var _LT__EQ___3611 = function(x, y) {
    return x <= y
  };
  var _LT__EQ___3612 = function() {
    var G__3614__delegate = function(x, y, more) {
      while(true) {
        if(cljs.core.truth_(x <= y)) {
          if(cljs.core.truth_(cljs.core.next.call(null, more))) {
            var G__3615 = y;
            var G__3616 = cljs.core.first.call(null, more);
            var G__3617 = cljs.core.next.call(null, more);
            x = G__3615;
            y = G__3616;
            more = G__3617;
            continue
          }else {
            return y <= cljs.core.first.call(null, more)
          }
        }else {
          return false
        }
        break
      }
    };
    var G__3614 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__3614__delegate.call(this, x, y, more)
    };
    G__3614.cljs$lang$maxFixedArity = 2;
    G__3614.cljs$lang$applyTo = function(arglist__3618) {
      var x = cljs.core.first(arglist__3618);
      var y = cljs.core.first(cljs.core.next(arglist__3618));
      var more = cljs.core.rest(cljs.core.next(arglist__3618));
      return G__3614__delegate.call(this, x, y, more)
    };
    return G__3614
  }();
  _LT__EQ_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return _LT__EQ___3610.call(this, x);
      case 2:
        return _LT__EQ___3611.call(this, x, y);
      default:
        return _LT__EQ___3612.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  _LT__EQ_.cljs$lang$maxFixedArity = 2;
  _LT__EQ_.cljs$lang$applyTo = _LT__EQ___3612.cljs$lang$applyTo;
  return _LT__EQ_
}();
cljs.core._GT_ = function() {
  var _GT_ = null;
  var _GT___3619 = function(x) {
    return true
  };
  var _GT___3620 = function(x, y) {
    return x > y
  };
  var _GT___3621 = function() {
    var G__3623__delegate = function(x, y, more) {
      while(true) {
        if(cljs.core.truth_(x > y)) {
          if(cljs.core.truth_(cljs.core.next.call(null, more))) {
            var G__3624 = y;
            var G__3625 = cljs.core.first.call(null, more);
            var G__3626 = cljs.core.next.call(null, more);
            x = G__3624;
            y = G__3625;
            more = G__3626;
            continue
          }else {
            return y > cljs.core.first.call(null, more)
          }
        }else {
          return false
        }
        break
      }
    };
    var G__3623 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__3623__delegate.call(this, x, y, more)
    };
    G__3623.cljs$lang$maxFixedArity = 2;
    G__3623.cljs$lang$applyTo = function(arglist__3627) {
      var x = cljs.core.first(arglist__3627);
      var y = cljs.core.first(cljs.core.next(arglist__3627));
      var more = cljs.core.rest(cljs.core.next(arglist__3627));
      return G__3623__delegate.call(this, x, y, more)
    };
    return G__3623
  }();
  _GT_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return _GT___3619.call(this, x);
      case 2:
        return _GT___3620.call(this, x, y);
      default:
        return _GT___3621.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  _GT_.cljs$lang$maxFixedArity = 2;
  _GT_.cljs$lang$applyTo = _GT___3621.cljs$lang$applyTo;
  return _GT_
}();
cljs.core._GT__EQ_ = function() {
  var _GT__EQ_ = null;
  var _GT__EQ___3628 = function(x) {
    return true
  };
  var _GT__EQ___3629 = function(x, y) {
    return x >= y
  };
  var _GT__EQ___3630 = function() {
    var G__3632__delegate = function(x, y, more) {
      while(true) {
        if(cljs.core.truth_(x >= y)) {
          if(cljs.core.truth_(cljs.core.next.call(null, more))) {
            var G__3633 = y;
            var G__3634 = cljs.core.first.call(null, more);
            var G__3635 = cljs.core.next.call(null, more);
            x = G__3633;
            y = G__3634;
            more = G__3635;
            continue
          }else {
            return y >= cljs.core.first.call(null, more)
          }
        }else {
          return false
        }
        break
      }
    };
    var G__3632 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__3632__delegate.call(this, x, y, more)
    };
    G__3632.cljs$lang$maxFixedArity = 2;
    G__3632.cljs$lang$applyTo = function(arglist__3636) {
      var x = cljs.core.first(arglist__3636);
      var y = cljs.core.first(cljs.core.next(arglist__3636));
      var more = cljs.core.rest(cljs.core.next(arglist__3636));
      return G__3632__delegate.call(this, x, y, more)
    };
    return G__3632
  }();
  _GT__EQ_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return _GT__EQ___3628.call(this, x);
      case 2:
        return _GT__EQ___3629.call(this, x, y);
      default:
        return _GT__EQ___3630.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  _GT__EQ_.cljs$lang$maxFixedArity = 2;
  _GT__EQ_.cljs$lang$applyTo = _GT__EQ___3630.cljs$lang$applyTo;
  return _GT__EQ_
}();
cljs.core.dec = function dec(x) {
  return x - 1
};
cljs.core.max = function() {
  var max = null;
  var max__3637 = function(x) {
    return x
  };
  var max__3638 = function(x, y) {
    return x > y ? x : y
  };
  var max__3639 = function() {
    var G__3641__delegate = function(x, y, more) {
      return cljs.core.reduce.call(null, max, x > y ? x : y, more)
    };
    var G__3641 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__3641__delegate.call(this, x, y, more)
    };
    G__3641.cljs$lang$maxFixedArity = 2;
    G__3641.cljs$lang$applyTo = function(arglist__3642) {
      var x = cljs.core.first(arglist__3642);
      var y = cljs.core.first(cljs.core.next(arglist__3642));
      var more = cljs.core.rest(cljs.core.next(arglist__3642));
      return G__3641__delegate.call(this, x, y, more)
    };
    return G__3641
  }();
  max = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return max__3637.call(this, x);
      case 2:
        return max__3638.call(this, x, y);
      default:
        return max__3639.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  max.cljs$lang$maxFixedArity = 2;
  max.cljs$lang$applyTo = max__3639.cljs$lang$applyTo;
  return max
}();
cljs.core.min = function() {
  var min = null;
  var min__3643 = function(x) {
    return x
  };
  var min__3644 = function(x, y) {
    return x < y ? x : y
  };
  var min__3645 = function() {
    var G__3647__delegate = function(x, y, more) {
      return cljs.core.reduce.call(null, min, x < y ? x : y, more)
    };
    var G__3647 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__3647__delegate.call(this, x, y, more)
    };
    G__3647.cljs$lang$maxFixedArity = 2;
    G__3647.cljs$lang$applyTo = function(arglist__3648) {
      var x = cljs.core.first(arglist__3648);
      var y = cljs.core.first(cljs.core.next(arglist__3648));
      var more = cljs.core.rest(cljs.core.next(arglist__3648));
      return G__3647__delegate.call(this, x, y, more)
    };
    return G__3647
  }();
  min = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return min__3643.call(this, x);
      case 2:
        return min__3644.call(this, x, y);
      default:
        return min__3645.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  min.cljs$lang$maxFixedArity = 2;
  min.cljs$lang$applyTo = min__3645.cljs$lang$applyTo;
  return min
}();
cljs.core.fix = function fix(q) {
  if(cljs.core.truth_(q >= 0)) {
    return Math.floor.call(null, q)
  }else {
    return Math.ceil.call(null, q)
  }
};
cljs.core.mod = function mod(n, d) {
  return n % d
};
cljs.core.quot = function quot(n, d) {
  var rem__3649 = n % d;
  return cljs.core.fix.call(null, (n - rem__3649) / d)
};
cljs.core.rem = function rem(n, d) {
  var q__3650 = cljs.core.quot.call(null, n, d);
  return n - d * q__3650
};
cljs.core.rand = function() {
  var rand = null;
  var rand__3651 = function() {
    return Math.random.call(null)
  };
  var rand__3652 = function(n) {
    return n * rand.call(null)
  };
  rand = function(n) {
    switch(arguments.length) {
      case 0:
        return rand__3651.call(this);
      case 1:
        return rand__3652.call(this, n)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return rand
}();
cljs.core.rand_int = function rand_int(n) {
  return cljs.core.fix.call(null, cljs.core.rand.call(null, n))
};
cljs.core.bit_xor = function bit_xor(x, y) {
  return x ^ y
};
cljs.core.bit_and = function bit_and(x, y) {
  return x & y
};
cljs.core.bit_or = function bit_or(x, y) {
  return x | y
};
cljs.core.bit_and_not = function bit_and_not(x, y) {
  return x & ~y
};
cljs.core.bit_clear = function bit_clear(x, n) {
  return x & ~(1 << n)
};
cljs.core.bit_flip = function bit_flip(x, n) {
  return x ^ 1 << n
};
cljs.core.bit_not = function bit_not(x) {
  return~x
};
cljs.core.bit_set = function bit_set(x, n) {
  return x | 1 << n
};
cljs.core.bit_test = function bit_test(x, n) {
  return(x & 1 << n) != 0
};
cljs.core.bit_shift_left = function bit_shift_left(x, n) {
  return x << n
};
cljs.core.bit_shift_right = function bit_shift_right(x, n) {
  return x >> n
};
cljs.core._EQ__EQ_ = function() {
  var _EQ__EQ_ = null;
  var _EQ__EQ___3654 = function(x) {
    return true
  };
  var _EQ__EQ___3655 = function(x, y) {
    return cljs.core._equiv.call(null, x, y)
  };
  var _EQ__EQ___3656 = function() {
    var G__3658__delegate = function(x, y, more) {
      while(true) {
        if(cljs.core.truth_(_EQ__EQ_.call(null, x, y))) {
          if(cljs.core.truth_(cljs.core.next.call(null, more))) {
            var G__3659 = y;
            var G__3660 = cljs.core.first.call(null, more);
            var G__3661 = cljs.core.next.call(null, more);
            x = G__3659;
            y = G__3660;
            more = G__3661;
            continue
          }else {
            return _EQ__EQ_.call(null, y, cljs.core.first.call(null, more))
          }
        }else {
          return false
        }
        break
      }
    };
    var G__3658 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__3658__delegate.call(this, x, y, more)
    };
    G__3658.cljs$lang$maxFixedArity = 2;
    G__3658.cljs$lang$applyTo = function(arglist__3662) {
      var x = cljs.core.first(arglist__3662);
      var y = cljs.core.first(cljs.core.next(arglist__3662));
      var more = cljs.core.rest(cljs.core.next(arglist__3662));
      return G__3658__delegate.call(this, x, y, more)
    };
    return G__3658
  }();
  _EQ__EQ_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return _EQ__EQ___3654.call(this, x);
      case 2:
        return _EQ__EQ___3655.call(this, x, y);
      default:
        return _EQ__EQ___3656.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  _EQ__EQ_.cljs$lang$maxFixedArity = 2;
  _EQ__EQ_.cljs$lang$applyTo = _EQ__EQ___3656.cljs$lang$applyTo;
  return _EQ__EQ_
}();
cljs.core.pos_QMARK_ = function pos_QMARK_(n) {
  return n > 0
};
cljs.core.zero_QMARK_ = function zero_QMARK_(n) {
  return n === 0
};
cljs.core.neg_QMARK_ = function neg_QMARK_(x) {
  return x < 0
};
cljs.core.nthnext = function nthnext(coll, n) {
  var n__3663 = n;
  var xs__3664 = cljs.core.seq.call(null, coll);
  while(true) {
    if(cljs.core.truth_(function() {
      var and__3822__auto____3665 = xs__3664;
      if(cljs.core.truth_(and__3822__auto____3665)) {
        return n__3663 > 0
      }else {
        return and__3822__auto____3665
      }
    }())) {
      var G__3666 = n__3663 - 1;
      var G__3667 = cljs.core.next.call(null, xs__3664);
      n__3663 = G__3666;
      xs__3664 = G__3667;
      continue
    }else {
      return xs__3664
    }
    break
  }
};
cljs.core.IIndexed["_"] = true;
cljs.core._nth["_"] = function() {
  var G__3672 = null;
  var G__3672__3673 = function(coll, n) {
    var temp__3971__auto____3668 = cljs.core.nthnext.call(null, coll, n);
    if(cljs.core.truth_(temp__3971__auto____3668)) {
      var xs__3669 = temp__3971__auto____3668;
      return cljs.core.first.call(null, xs__3669)
    }else {
      throw new Error("Index out of bounds");
    }
  };
  var G__3672__3674 = function(coll, n, not_found) {
    var temp__3971__auto____3670 = cljs.core.nthnext.call(null, coll, n);
    if(cljs.core.truth_(temp__3971__auto____3670)) {
      var xs__3671 = temp__3971__auto____3670;
      return cljs.core.first.call(null, xs__3671)
    }else {
      return not_found
    }
  };
  G__3672 = function(coll, n, not_found) {
    switch(arguments.length) {
      case 2:
        return G__3672__3673.call(this, coll, n);
      case 3:
        return G__3672__3674.call(this, coll, n, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__3672
}();
cljs.core.str_STAR_ = function() {
  var str_STAR_ = null;
  var str_STAR___3676 = function() {
    return""
  };
  var str_STAR___3677 = function(x) {
    if(cljs.core.truth_(x === null)) {
      return""
    }else {
      if(cljs.core.truth_("\ufdd0'else")) {
        return x.toString()
      }else {
        return null
      }
    }
  };
  var str_STAR___3678 = function() {
    var G__3680__delegate = function(x, ys) {
      return function(sb, more) {
        while(true) {
          if(cljs.core.truth_(more)) {
            var G__3681 = sb.append(str_STAR_.call(null, cljs.core.first.call(null, more)));
            var G__3682 = cljs.core.next.call(null, more);
            sb = G__3681;
            more = G__3682;
            continue
          }else {
            return str_STAR_.call(null, sb)
          }
          break
        }
      }.call(null, new goog.string.StringBuffer(str_STAR_.call(null, x)), ys)
    };
    var G__3680 = function(x, var_args) {
      var ys = null;
      if(goog.isDef(var_args)) {
        ys = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
      }
      return G__3680__delegate.call(this, x, ys)
    };
    G__3680.cljs$lang$maxFixedArity = 1;
    G__3680.cljs$lang$applyTo = function(arglist__3683) {
      var x = cljs.core.first(arglist__3683);
      var ys = cljs.core.rest(arglist__3683);
      return G__3680__delegate.call(this, x, ys)
    };
    return G__3680
  }();
  str_STAR_ = function(x, var_args) {
    var ys = var_args;
    switch(arguments.length) {
      case 0:
        return str_STAR___3676.call(this);
      case 1:
        return str_STAR___3677.call(this, x);
      default:
        return str_STAR___3678.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  str_STAR_.cljs$lang$maxFixedArity = 1;
  str_STAR_.cljs$lang$applyTo = str_STAR___3678.cljs$lang$applyTo;
  return str_STAR_
}();
cljs.core.str = function() {
  var str = null;
  var str__3684 = function() {
    return""
  };
  var str__3685 = function(x) {
    if(cljs.core.truth_(cljs.core.symbol_QMARK_.call(null, x))) {
      return x.substring(2, x.length)
    }else {
      if(cljs.core.truth_(cljs.core.keyword_QMARK_.call(null, x))) {
        return cljs.core.str_STAR_.call(null, ":", x.substring(2, x.length))
      }else {
        if(cljs.core.truth_(x === null)) {
          return""
        }else {
          if(cljs.core.truth_("\ufdd0'else")) {
            return x.toString()
          }else {
            return null
          }
        }
      }
    }
  };
  var str__3686 = function() {
    var G__3688__delegate = function(x, ys) {
      return function(sb, more) {
        while(true) {
          if(cljs.core.truth_(more)) {
            var G__3689 = sb.append(str.call(null, cljs.core.first.call(null, more)));
            var G__3690 = cljs.core.next.call(null, more);
            sb = G__3689;
            more = G__3690;
            continue
          }else {
            return cljs.core.str_STAR_.call(null, sb)
          }
          break
        }
      }.call(null, new goog.string.StringBuffer(str.call(null, x)), ys)
    };
    var G__3688 = function(x, var_args) {
      var ys = null;
      if(goog.isDef(var_args)) {
        ys = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
      }
      return G__3688__delegate.call(this, x, ys)
    };
    G__3688.cljs$lang$maxFixedArity = 1;
    G__3688.cljs$lang$applyTo = function(arglist__3691) {
      var x = cljs.core.first(arglist__3691);
      var ys = cljs.core.rest(arglist__3691);
      return G__3688__delegate.call(this, x, ys)
    };
    return G__3688
  }();
  str = function(x, var_args) {
    var ys = var_args;
    switch(arguments.length) {
      case 0:
        return str__3684.call(this);
      case 1:
        return str__3685.call(this, x);
      default:
        return str__3686.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  str.cljs$lang$maxFixedArity = 1;
  str.cljs$lang$applyTo = str__3686.cljs$lang$applyTo;
  return str
}();
cljs.core.subs = function() {
  var subs = null;
  var subs__3692 = function(s, start) {
    return s.substring(start)
  };
  var subs__3693 = function(s, start, end) {
    return s.substring(start, end)
  };
  subs = function(s, start, end) {
    switch(arguments.length) {
      case 2:
        return subs__3692.call(this, s, start);
      case 3:
        return subs__3693.call(this, s, start, end)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return subs
}();
cljs.core.symbol = function() {
  var symbol = null;
  var symbol__3695 = function(name) {
    if(cljs.core.truth_(cljs.core.symbol_QMARK_.call(null, name))) {
      name
    }else {
      if(cljs.core.truth_(cljs.core.keyword_QMARK_.call(null, name))) {
        cljs.core.str_STAR_.call(null, "\ufdd1", "'", cljs.core.subs.call(null, name, 2))
      }else {
      }
    }
    return cljs.core.str_STAR_.call(null, "\ufdd1", "'", name)
  };
  var symbol__3696 = function(ns, name) {
    return symbol.call(null, cljs.core.str_STAR_.call(null, ns, "/", name))
  };
  symbol = function(ns, name) {
    switch(arguments.length) {
      case 1:
        return symbol__3695.call(this, ns);
      case 2:
        return symbol__3696.call(this, ns, name)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return symbol
}();
cljs.core.keyword = function() {
  var keyword = null;
  var keyword__3698 = function(name) {
    if(cljs.core.truth_(cljs.core.keyword_QMARK_.call(null, name))) {
      return name
    }else {
      if(cljs.core.truth_(cljs.core.symbol_QMARK_.call(null, name))) {
        return cljs.core.str_STAR_.call(null, "\ufdd0", "'", cljs.core.subs.call(null, name, 2))
      }else {
        if(cljs.core.truth_("\ufdd0'else")) {
          return cljs.core.str_STAR_.call(null, "\ufdd0", "'", name)
        }else {
          return null
        }
      }
    }
  };
  var keyword__3699 = function(ns, name) {
    return keyword.call(null, cljs.core.str_STAR_.call(null, ns, "/", name))
  };
  keyword = function(ns, name) {
    switch(arguments.length) {
      case 1:
        return keyword__3698.call(this, ns);
      case 2:
        return keyword__3699.call(this, ns, name)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return keyword
}();
cljs.core.equiv_sequential = function equiv_sequential(x, y) {
  return cljs.core.boolean$.call(null, cljs.core.truth_(cljs.core.sequential_QMARK_.call(null, y)) ? function() {
    var xs__3701 = cljs.core.seq.call(null, x);
    var ys__3702 = cljs.core.seq.call(null, y);
    while(true) {
      if(cljs.core.truth_(xs__3701 === null)) {
        return ys__3702 === null
      }else {
        if(cljs.core.truth_(ys__3702 === null)) {
          return false
        }else {
          if(cljs.core.truth_(cljs.core._EQ_.call(null, cljs.core.first.call(null, xs__3701), cljs.core.first.call(null, ys__3702)))) {
            var G__3703 = cljs.core.next.call(null, xs__3701);
            var G__3704 = cljs.core.next.call(null, ys__3702);
            xs__3701 = G__3703;
            ys__3702 = G__3704;
            continue
          }else {
            if(cljs.core.truth_("\ufdd0'else")) {
              return false
            }else {
              return null
            }
          }
        }
      }
      break
    }
  }() : null)
};
cljs.core.hash_combine = function hash_combine(seed, hash) {
  return seed ^ hash + 2654435769 + (seed << 6) + (seed >> 2)
};
cljs.core.hash_coll = function hash_coll(coll) {
  return cljs.core.reduce.call(null, function(p1__3705_SHARP_, p2__3706_SHARP_) {
    return cljs.core.hash_combine.call(null, p1__3705_SHARP_, cljs.core.hash.call(null, p2__3706_SHARP_))
  }, cljs.core.hash.call(null, cljs.core.first.call(null, coll)), cljs.core.next.call(null, coll))
};
cljs.core.extend_object_BANG_ = function extend_object_BANG_(obj, fn_map) {
  var G__3707__3708 = cljs.core.seq.call(null, fn_map);
  if(cljs.core.truth_(G__3707__3708)) {
    var G__3710__3712 = cljs.core.first.call(null, G__3707__3708);
    var vec__3711__3713 = G__3710__3712;
    var key_name__3714 = cljs.core.nth.call(null, vec__3711__3713, 0, null);
    var f__3715 = cljs.core.nth.call(null, vec__3711__3713, 1, null);
    var G__3707__3716 = G__3707__3708;
    var G__3710__3717 = G__3710__3712;
    var G__3707__3718 = G__3707__3716;
    while(true) {
      var vec__3719__3720 = G__3710__3717;
      var key_name__3721 = cljs.core.nth.call(null, vec__3719__3720, 0, null);
      var f__3722 = cljs.core.nth.call(null, vec__3719__3720, 1, null);
      var G__3707__3723 = G__3707__3718;
      var str_name__3724 = cljs.core.name.call(null, key_name__3721);
      obj[str_name__3724] = f__3722;
      var temp__3974__auto____3725 = cljs.core.next.call(null, G__3707__3723);
      if(cljs.core.truth_(temp__3974__auto____3725)) {
        var G__3707__3726 = temp__3974__auto____3725;
        var G__3727 = cljs.core.first.call(null, G__3707__3726);
        var G__3728 = G__3707__3726;
        G__3710__3717 = G__3727;
        G__3707__3718 = G__3728;
        continue
      }else {
      }
      break
    }
  }else {
  }
  return obj
};
cljs.core.List = function(meta, first, rest, count) {
  this.meta = meta;
  this.first = first;
  this.rest = rest;
  this.count = count
};
cljs.core.List.cljs$core$IPrintable$_pr_seq = function(this__367__auto__) {
  return cljs.core.list.call(null, "cljs.core.List")
};
cljs.core.List.prototype.cljs$core$IHash$ = true;
cljs.core.List.prototype.cljs$core$IHash$_hash = function(coll) {
  var this__3729 = this;
  return cljs.core.hash_coll.call(null, coll)
};
cljs.core.List.prototype.cljs$core$ISequential$ = true;
cljs.core.List.prototype.cljs$core$ICollection$ = true;
cljs.core.List.prototype.cljs$core$ICollection$_conj = function(coll, o) {
  var this__3730 = this;
  return new cljs.core.List(this__3730.meta, o, coll, this__3730.count + 1)
};
cljs.core.List.prototype.cljs$core$ISeqable$ = true;
cljs.core.List.prototype.cljs$core$ISeqable$_seq = function(coll) {
  var this__3731 = this;
  return coll
};
cljs.core.List.prototype.cljs$core$ICounted$ = true;
cljs.core.List.prototype.cljs$core$ICounted$_count = function(coll) {
  var this__3732 = this;
  return this__3732.count
};
cljs.core.List.prototype.cljs$core$IStack$ = true;
cljs.core.List.prototype.cljs$core$IStack$_peek = function(coll) {
  var this__3733 = this;
  return this__3733.first
};
cljs.core.List.prototype.cljs$core$IStack$_pop = function(coll) {
  var this__3734 = this;
  return cljs.core._rest.call(null, coll)
};
cljs.core.List.prototype.cljs$core$ISeq$ = true;
cljs.core.List.prototype.cljs$core$ISeq$_first = function(coll) {
  var this__3735 = this;
  return this__3735.first
};
cljs.core.List.prototype.cljs$core$ISeq$_rest = function(coll) {
  var this__3736 = this;
  return this__3736.rest
};
cljs.core.List.prototype.cljs$core$IEquiv$ = true;
cljs.core.List.prototype.cljs$core$IEquiv$_equiv = function(coll, other) {
  var this__3737 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.List.prototype.cljs$core$IWithMeta$ = true;
cljs.core.List.prototype.cljs$core$IWithMeta$_with_meta = function(coll, meta) {
  var this__3738 = this;
  return new cljs.core.List(meta, this__3738.first, this__3738.rest, this__3738.count)
};
cljs.core.List.prototype.cljs$core$IMeta$ = true;
cljs.core.List.prototype.cljs$core$IMeta$_meta = function(coll) {
  var this__3739 = this;
  return this__3739.meta
};
cljs.core.List.prototype.cljs$core$IEmptyableCollection$ = true;
cljs.core.List.prototype.cljs$core$IEmptyableCollection$_empty = function(coll) {
  var this__3740 = this;
  return cljs.core.List.EMPTY
};
cljs.core.List;
cljs.core.EmptyList = function(meta) {
  this.meta = meta
};
cljs.core.EmptyList.cljs$core$IPrintable$_pr_seq = function(this__367__auto__) {
  return cljs.core.list.call(null, "cljs.core.EmptyList")
};
cljs.core.EmptyList.prototype.cljs$core$IHash$ = true;
cljs.core.EmptyList.prototype.cljs$core$IHash$_hash = function(coll) {
  var this__3741 = this;
  return cljs.core.hash_coll.call(null, coll)
};
cljs.core.EmptyList.prototype.cljs$core$ISequential$ = true;
cljs.core.EmptyList.prototype.cljs$core$ICollection$ = true;
cljs.core.EmptyList.prototype.cljs$core$ICollection$_conj = function(coll, o) {
  var this__3742 = this;
  return new cljs.core.List(this__3742.meta, o, null, 1)
};
cljs.core.EmptyList.prototype.cljs$core$ISeqable$ = true;
cljs.core.EmptyList.prototype.cljs$core$ISeqable$_seq = function(coll) {
  var this__3743 = this;
  return null
};
cljs.core.EmptyList.prototype.cljs$core$ICounted$ = true;
cljs.core.EmptyList.prototype.cljs$core$ICounted$_count = function(coll) {
  var this__3744 = this;
  return 0
};
cljs.core.EmptyList.prototype.cljs$core$IStack$ = true;
cljs.core.EmptyList.prototype.cljs$core$IStack$_peek = function(coll) {
  var this__3745 = this;
  return null
};
cljs.core.EmptyList.prototype.cljs$core$IStack$_pop = function(coll) {
  var this__3746 = this;
  return null
};
cljs.core.EmptyList.prototype.cljs$core$ISeq$ = true;
cljs.core.EmptyList.prototype.cljs$core$ISeq$_first = function(coll) {
  var this__3747 = this;
  return null
};
cljs.core.EmptyList.prototype.cljs$core$ISeq$_rest = function(coll) {
  var this__3748 = this;
  return null
};
cljs.core.EmptyList.prototype.cljs$core$IEquiv$ = true;
cljs.core.EmptyList.prototype.cljs$core$IEquiv$_equiv = function(coll, other) {
  var this__3749 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.EmptyList.prototype.cljs$core$IWithMeta$ = true;
cljs.core.EmptyList.prototype.cljs$core$IWithMeta$_with_meta = function(coll, meta) {
  var this__3750 = this;
  return new cljs.core.EmptyList(meta)
};
cljs.core.EmptyList.prototype.cljs$core$IMeta$ = true;
cljs.core.EmptyList.prototype.cljs$core$IMeta$_meta = function(coll) {
  var this__3751 = this;
  return this__3751.meta
};
cljs.core.EmptyList.prototype.cljs$core$IEmptyableCollection$ = true;
cljs.core.EmptyList.prototype.cljs$core$IEmptyableCollection$_empty = function(coll) {
  var this__3752 = this;
  return coll
};
cljs.core.EmptyList;
cljs.core.List.EMPTY = new cljs.core.EmptyList(null);
cljs.core.reverse = function reverse(coll) {
  return cljs.core.reduce.call(null, cljs.core.conj, cljs.core.List.EMPTY, coll)
};
cljs.core.list = function() {
  var list__delegate = function(items) {
    return cljs.core.reduce.call(null, cljs.core.conj, cljs.core.List.EMPTY, cljs.core.reverse.call(null, items))
  };
  var list = function(var_args) {
    var items = null;
    if(goog.isDef(var_args)) {
      items = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return list__delegate.call(this, items)
  };
  list.cljs$lang$maxFixedArity = 0;
  list.cljs$lang$applyTo = function(arglist__3753) {
    var items = cljs.core.seq(arglist__3753);
    return list__delegate.call(this, items)
  };
  return list
}();
cljs.core.Cons = function(meta, first, rest) {
  this.meta = meta;
  this.first = first;
  this.rest = rest
};
cljs.core.Cons.cljs$core$IPrintable$_pr_seq = function(this__367__auto__) {
  return cljs.core.list.call(null, "cljs.core.Cons")
};
cljs.core.Cons.prototype.cljs$core$ISeqable$ = true;
cljs.core.Cons.prototype.cljs$core$ISeqable$_seq = function(coll) {
  var this__3754 = this;
  return coll
};
cljs.core.Cons.prototype.cljs$core$IHash$ = true;
cljs.core.Cons.prototype.cljs$core$IHash$_hash = function(coll) {
  var this__3755 = this;
  return cljs.core.hash_coll.call(null, coll)
};
cljs.core.Cons.prototype.cljs$core$IEquiv$ = true;
cljs.core.Cons.prototype.cljs$core$IEquiv$_equiv = function(coll, other) {
  var this__3756 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.Cons.prototype.cljs$core$ISequential$ = true;
cljs.core.Cons.prototype.cljs$core$IEmptyableCollection$ = true;
cljs.core.Cons.prototype.cljs$core$IEmptyableCollection$_empty = function(coll) {
  var this__3757 = this;
  return cljs.core.with_meta.call(null, cljs.core.List.EMPTY, this__3757.meta)
};
cljs.core.Cons.prototype.cljs$core$ICollection$ = true;
cljs.core.Cons.prototype.cljs$core$ICollection$_conj = function(coll, o) {
  var this__3758 = this;
  return new cljs.core.Cons(null, o, coll)
};
cljs.core.Cons.prototype.cljs$core$ISeq$ = true;
cljs.core.Cons.prototype.cljs$core$ISeq$_first = function(coll) {
  var this__3759 = this;
  return this__3759.first
};
cljs.core.Cons.prototype.cljs$core$ISeq$_rest = function(coll) {
  var this__3760 = this;
  if(cljs.core.truth_(this__3760.rest === null)) {
    return cljs.core.List.EMPTY
  }else {
    return this__3760.rest
  }
};
cljs.core.Cons.prototype.cljs$core$IMeta$ = true;
cljs.core.Cons.prototype.cljs$core$IMeta$_meta = function(coll) {
  var this__3761 = this;
  return this__3761.meta
};
cljs.core.Cons.prototype.cljs$core$IWithMeta$ = true;
cljs.core.Cons.prototype.cljs$core$IWithMeta$_with_meta = function(coll, meta) {
  var this__3762 = this;
  return new cljs.core.Cons(meta, this__3762.first, this__3762.rest)
};
cljs.core.Cons;
cljs.core.cons = function cons(x, seq) {
  return new cljs.core.Cons(null, x, seq)
};
cljs.core.IReduce["string"] = true;
cljs.core._reduce["string"] = function() {
  var G__3763 = null;
  var G__3763__3764 = function(string, f) {
    return cljs.core.ci_reduce.call(null, string, f)
  };
  var G__3763__3765 = function(string, f, start) {
    return cljs.core.ci_reduce.call(null, string, f, start)
  };
  G__3763 = function(string, f, start) {
    switch(arguments.length) {
      case 2:
        return G__3763__3764.call(this, string, f);
      case 3:
        return G__3763__3765.call(this, string, f, start)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__3763
}();
cljs.core.ILookup["string"] = true;
cljs.core._lookup["string"] = function() {
  var G__3767 = null;
  var G__3767__3768 = function(string, k) {
    return cljs.core._nth.call(null, string, k)
  };
  var G__3767__3769 = function(string, k, not_found) {
    return cljs.core._nth.call(null, string, k, not_found)
  };
  G__3767 = function(string, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__3767__3768.call(this, string, k);
      case 3:
        return G__3767__3769.call(this, string, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__3767
}();
cljs.core.IIndexed["string"] = true;
cljs.core._nth["string"] = function() {
  var G__3771 = null;
  var G__3771__3772 = function(string, n) {
    if(cljs.core.truth_(n < cljs.core._count.call(null, string))) {
      return string.charAt(n)
    }else {
      return null
    }
  };
  var G__3771__3773 = function(string, n, not_found) {
    if(cljs.core.truth_(n < cljs.core._count.call(null, string))) {
      return string.charAt(n)
    }else {
      return not_found
    }
  };
  G__3771 = function(string, n, not_found) {
    switch(arguments.length) {
      case 2:
        return G__3771__3772.call(this, string, n);
      case 3:
        return G__3771__3773.call(this, string, n, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__3771
}();
cljs.core.ICounted["string"] = true;
cljs.core._count["string"] = function(s) {
  return s.length
};
cljs.core.ISeqable["string"] = true;
cljs.core._seq["string"] = function(string) {
  return cljs.core.prim_seq.call(null, string, 0)
};
cljs.core.IHash["string"] = true;
cljs.core._hash["string"] = function(o) {
  return goog.string.hashCode.call(null, o)
};
String.prototype.cljs$core$IFn$ = true;
String.prototype.call = function() {
  var G__3781 = null;
  var G__3781__3782 = function(tsym3775, coll) {
    var tsym3775__3777 = this;
    var this$__3778 = tsym3775__3777;
    return cljs.core.get.call(null, coll, this$__3778.toString())
  };
  var G__3781__3783 = function(tsym3776, coll, not_found) {
    var tsym3776__3779 = this;
    var this$__3780 = tsym3776__3779;
    return cljs.core.get.call(null, coll, this$__3780.toString(), not_found)
  };
  G__3781 = function(tsym3776, coll, not_found) {
    switch(arguments.length) {
      case 2:
        return G__3781__3782.call(this, tsym3776, coll);
      case 3:
        return G__3781__3783.call(this, tsym3776, coll, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__3781
}();
String["prototype"]["apply"] = function(s, args) {
  if(cljs.core.truth_(cljs.core.count.call(null, args) < 2)) {
    return cljs.core.get.call(null, args[0], s)
  }else {
    return cljs.core.get.call(null, args[0], s, args[1])
  }
};
cljs.core.lazy_seq_value = function lazy_seq_value(lazy_seq) {
  var x__3785 = lazy_seq.x;
  if(cljs.core.truth_(lazy_seq.realized)) {
    return x__3785
  }else {
    lazy_seq.x = x__3785.call(null);
    lazy_seq.realized = true;
    return lazy_seq.x
  }
};
cljs.core.LazySeq = function(meta, realized, x) {
  this.meta = meta;
  this.realized = realized;
  this.x = x
};
cljs.core.LazySeq.cljs$core$IPrintable$_pr_seq = function(this__367__auto__) {
  return cljs.core.list.call(null, "cljs.core.LazySeq")
};
cljs.core.LazySeq.prototype.cljs$core$ISeqable$ = true;
cljs.core.LazySeq.prototype.cljs$core$ISeqable$_seq = function(coll) {
  var this__3786 = this;
  return cljs.core.seq.call(null, cljs.core.lazy_seq_value.call(null, coll))
};
cljs.core.LazySeq.prototype.cljs$core$IHash$ = true;
cljs.core.LazySeq.prototype.cljs$core$IHash$_hash = function(coll) {
  var this__3787 = this;
  return cljs.core.hash_coll.call(null, coll)
};
cljs.core.LazySeq.prototype.cljs$core$IEquiv$ = true;
cljs.core.LazySeq.prototype.cljs$core$IEquiv$_equiv = function(coll, other) {
  var this__3788 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.LazySeq.prototype.cljs$core$ISequential$ = true;
cljs.core.LazySeq.prototype.cljs$core$IEmptyableCollection$ = true;
cljs.core.LazySeq.prototype.cljs$core$IEmptyableCollection$_empty = function(coll) {
  var this__3789 = this;
  return cljs.core.with_meta.call(null, cljs.core.List.EMPTY, this__3789.meta)
};
cljs.core.LazySeq.prototype.cljs$core$ICollection$ = true;
cljs.core.LazySeq.prototype.cljs$core$ICollection$_conj = function(coll, o) {
  var this__3790 = this;
  return cljs.core.cons.call(null, o, coll)
};
cljs.core.LazySeq.prototype.cljs$core$ISeq$ = true;
cljs.core.LazySeq.prototype.cljs$core$ISeq$_first = function(coll) {
  var this__3791 = this;
  return cljs.core.first.call(null, cljs.core.lazy_seq_value.call(null, coll))
};
cljs.core.LazySeq.prototype.cljs$core$ISeq$_rest = function(coll) {
  var this__3792 = this;
  return cljs.core.rest.call(null, cljs.core.lazy_seq_value.call(null, coll))
};
cljs.core.LazySeq.prototype.cljs$core$IMeta$ = true;
cljs.core.LazySeq.prototype.cljs$core$IMeta$_meta = function(coll) {
  var this__3793 = this;
  return this__3793.meta
};
cljs.core.LazySeq.prototype.cljs$core$IWithMeta$ = true;
cljs.core.LazySeq.prototype.cljs$core$IWithMeta$_with_meta = function(coll, meta) {
  var this__3794 = this;
  return new cljs.core.LazySeq(meta, this__3794.realized, this__3794.x)
};
cljs.core.LazySeq;
cljs.core.to_array = function to_array(s) {
  var ary__3795 = [];
  var s__3796 = s;
  while(true) {
    if(cljs.core.truth_(cljs.core.seq.call(null, s__3796))) {
      ary__3795.push(cljs.core.first.call(null, s__3796));
      var G__3797 = cljs.core.next.call(null, s__3796);
      s__3796 = G__3797;
      continue
    }else {
      return ary__3795
    }
    break
  }
};
cljs.core.bounded_count = function bounded_count(s, n) {
  var s__3798 = s;
  var i__3799 = n;
  var sum__3800 = 0;
  while(true) {
    if(cljs.core.truth_(function() {
      var and__3822__auto____3801 = i__3799 > 0;
      if(cljs.core.truth_(and__3822__auto____3801)) {
        return cljs.core.seq.call(null, s__3798)
      }else {
        return and__3822__auto____3801
      }
    }())) {
      var G__3802 = cljs.core.next.call(null, s__3798);
      var G__3803 = i__3799 - 1;
      var G__3804 = sum__3800 + 1;
      s__3798 = G__3802;
      i__3799 = G__3803;
      sum__3800 = G__3804;
      continue
    }else {
      return sum__3800
    }
    break
  }
};
cljs.core.spread = function spread(arglist) {
  if(cljs.core.truth_(arglist === null)) {
    return null
  }else {
    if(cljs.core.truth_(cljs.core.next.call(null, arglist) === null)) {
      return cljs.core.seq.call(null, cljs.core.first.call(null, arglist))
    }else {
      if(cljs.core.truth_("\ufdd0'else")) {
        return cljs.core.cons.call(null, cljs.core.first.call(null, arglist), spread.call(null, cljs.core.next.call(null, arglist)))
      }else {
        return null
      }
    }
  }
};
cljs.core.concat = function() {
  var concat = null;
  var concat__3808 = function() {
    return new cljs.core.LazySeq(null, false, function() {
      return null
    })
  };
  var concat__3809 = function(x) {
    return new cljs.core.LazySeq(null, false, function() {
      return x
    })
  };
  var concat__3810 = function(x, y) {
    return new cljs.core.LazySeq(null, false, function() {
      var s__3805 = cljs.core.seq.call(null, x);
      if(cljs.core.truth_(s__3805)) {
        return cljs.core.cons.call(null, cljs.core.first.call(null, s__3805), concat.call(null, cljs.core.rest.call(null, s__3805), y))
      }else {
        return y
      }
    })
  };
  var concat__3811 = function() {
    var G__3813__delegate = function(x, y, zs) {
      var cat__3807 = function cat(xys, zs) {
        return new cljs.core.LazySeq(null, false, function() {
          var xys__3806 = cljs.core.seq.call(null, xys);
          if(cljs.core.truth_(xys__3806)) {
            return cljs.core.cons.call(null, cljs.core.first.call(null, xys__3806), cat.call(null, cljs.core.rest.call(null, xys__3806), zs))
          }else {
            if(cljs.core.truth_(zs)) {
              return cat.call(null, cljs.core.first.call(null, zs), cljs.core.next.call(null, zs))
            }else {
              return null
            }
          }
        })
      };
      return cat__3807.call(null, concat.call(null, x, y), zs)
    };
    var G__3813 = function(x, y, var_args) {
      var zs = null;
      if(goog.isDef(var_args)) {
        zs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__3813__delegate.call(this, x, y, zs)
    };
    G__3813.cljs$lang$maxFixedArity = 2;
    G__3813.cljs$lang$applyTo = function(arglist__3814) {
      var x = cljs.core.first(arglist__3814);
      var y = cljs.core.first(cljs.core.next(arglist__3814));
      var zs = cljs.core.rest(cljs.core.next(arglist__3814));
      return G__3813__delegate.call(this, x, y, zs)
    };
    return G__3813
  }();
  concat = function(x, y, var_args) {
    var zs = var_args;
    switch(arguments.length) {
      case 0:
        return concat__3808.call(this);
      case 1:
        return concat__3809.call(this, x);
      case 2:
        return concat__3810.call(this, x, y);
      default:
        return concat__3811.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  concat.cljs$lang$maxFixedArity = 2;
  concat.cljs$lang$applyTo = concat__3811.cljs$lang$applyTo;
  return concat
}();
cljs.core.list_STAR_ = function() {
  var list_STAR_ = null;
  var list_STAR___3815 = function(args) {
    return cljs.core.seq.call(null, args)
  };
  var list_STAR___3816 = function(a, args) {
    return cljs.core.cons.call(null, a, args)
  };
  var list_STAR___3817 = function(a, b, args) {
    return cljs.core.cons.call(null, a, cljs.core.cons.call(null, b, args))
  };
  var list_STAR___3818 = function(a, b, c, args) {
    return cljs.core.cons.call(null, a, cljs.core.cons.call(null, b, cljs.core.cons.call(null, c, args)))
  };
  var list_STAR___3819 = function() {
    var G__3821__delegate = function(a, b, c, d, more) {
      return cljs.core.cons.call(null, a, cljs.core.cons.call(null, b, cljs.core.cons.call(null, c, cljs.core.cons.call(null, d, cljs.core.spread.call(null, more)))))
    };
    var G__3821 = function(a, b, c, d, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 4), 0)
      }
      return G__3821__delegate.call(this, a, b, c, d, more)
    };
    G__3821.cljs$lang$maxFixedArity = 4;
    G__3821.cljs$lang$applyTo = function(arglist__3822) {
      var a = cljs.core.first(arglist__3822);
      var b = cljs.core.first(cljs.core.next(arglist__3822));
      var c = cljs.core.first(cljs.core.next(cljs.core.next(arglist__3822)));
      var d = cljs.core.first(cljs.core.next(cljs.core.next(cljs.core.next(arglist__3822))));
      var more = cljs.core.rest(cljs.core.next(cljs.core.next(cljs.core.next(arglist__3822))));
      return G__3821__delegate.call(this, a, b, c, d, more)
    };
    return G__3821
  }();
  list_STAR_ = function(a, b, c, d, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return list_STAR___3815.call(this, a);
      case 2:
        return list_STAR___3816.call(this, a, b);
      case 3:
        return list_STAR___3817.call(this, a, b, c);
      case 4:
        return list_STAR___3818.call(this, a, b, c, d);
      default:
        return list_STAR___3819.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  list_STAR_.cljs$lang$maxFixedArity = 4;
  list_STAR_.cljs$lang$applyTo = list_STAR___3819.cljs$lang$applyTo;
  return list_STAR_
}();
cljs.core.apply = function() {
  var apply = null;
  var apply__3832 = function(f, args) {
    var fixed_arity__3823 = f.cljs$lang$maxFixedArity;
    if(cljs.core.truth_(f.cljs$lang$applyTo)) {
      if(cljs.core.truth_(cljs.core.bounded_count.call(null, args, fixed_arity__3823 + 1) <= fixed_arity__3823)) {
        return f.apply(f, cljs.core.to_array.call(null, args))
      }else {
        return f.cljs$lang$applyTo(args)
      }
    }else {
      return f.apply(f, cljs.core.to_array.call(null, args))
    }
  };
  var apply__3833 = function(f, x, args) {
    var arglist__3824 = cljs.core.list_STAR_.call(null, x, args);
    var fixed_arity__3825 = f.cljs$lang$maxFixedArity;
    if(cljs.core.truth_(f.cljs$lang$applyTo)) {
      if(cljs.core.truth_(cljs.core.bounded_count.call(null, arglist__3824, fixed_arity__3825) <= fixed_arity__3825)) {
        return f.apply(f, cljs.core.to_array.call(null, arglist__3824))
      }else {
        return f.cljs$lang$applyTo(arglist__3824)
      }
    }else {
      return f.apply(f, cljs.core.to_array.call(null, arglist__3824))
    }
  };
  var apply__3834 = function(f, x, y, args) {
    var arglist__3826 = cljs.core.list_STAR_.call(null, x, y, args);
    var fixed_arity__3827 = f.cljs$lang$maxFixedArity;
    if(cljs.core.truth_(f.cljs$lang$applyTo)) {
      if(cljs.core.truth_(cljs.core.bounded_count.call(null, arglist__3826, fixed_arity__3827) <= fixed_arity__3827)) {
        return f.apply(f, cljs.core.to_array.call(null, arglist__3826))
      }else {
        return f.cljs$lang$applyTo(arglist__3826)
      }
    }else {
      return f.apply(f, cljs.core.to_array.call(null, arglist__3826))
    }
  };
  var apply__3835 = function(f, x, y, z, args) {
    var arglist__3828 = cljs.core.list_STAR_.call(null, x, y, z, args);
    var fixed_arity__3829 = f.cljs$lang$maxFixedArity;
    if(cljs.core.truth_(f.cljs$lang$applyTo)) {
      if(cljs.core.truth_(cljs.core.bounded_count.call(null, arglist__3828, fixed_arity__3829) <= fixed_arity__3829)) {
        return f.apply(f, cljs.core.to_array.call(null, arglist__3828))
      }else {
        return f.cljs$lang$applyTo(arglist__3828)
      }
    }else {
      return f.apply(f, cljs.core.to_array.call(null, arglist__3828))
    }
  };
  var apply__3836 = function() {
    var G__3838__delegate = function(f, a, b, c, d, args) {
      var arglist__3830 = cljs.core.cons.call(null, a, cljs.core.cons.call(null, b, cljs.core.cons.call(null, c, cljs.core.cons.call(null, d, cljs.core.spread.call(null, args)))));
      var fixed_arity__3831 = f.cljs$lang$maxFixedArity;
      if(cljs.core.truth_(f.cljs$lang$applyTo)) {
        if(cljs.core.truth_(cljs.core.bounded_count.call(null, arglist__3830, fixed_arity__3831) <= fixed_arity__3831)) {
          return f.apply(f, cljs.core.to_array.call(null, arglist__3830))
        }else {
          return f.cljs$lang$applyTo(arglist__3830)
        }
      }else {
        return f.apply(f, cljs.core.to_array.call(null, arglist__3830))
      }
    };
    var G__3838 = function(f, a, b, c, d, var_args) {
      var args = null;
      if(goog.isDef(var_args)) {
        args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 5), 0)
      }
      return G__3838__delegate.call(this, f, a, b, c, d, args)
    };
    G__3838.cljs$lang$maxFixedArity = 5;
    G__3838.cljs$lang$applyTo = function(arglist__3839) {
      var f = cljs.core.first(arglist__3839);
      var a = cljs.core.first(cljs.core.next(arglist__3839));
      var b = cljs.core.first(cljs.core.next(cljs.core.next(arglist__3839)));
      var c = cljs.core.first(cljs.core.next(cljs.core.next(cljs.core.next(arglist__3839))));
      var d = cljs.core.first(cljs.core.next(cljs.core.next(cljs.core.next(cljs.core.next(arglist__3839)))));
      var args = cljs.core.rest(cljs.core.next(cljs.core.next(cljs.core.next(cljs.core.next(arglist__3839)))));
      return G__3838__delegate.call(this, f, a, b, c, d, args)
    };
    return G__3838
  }();
  apply = function(f, a, b, c, d, var_args) {
    var args = var_args;
    switch(arguments.length) {
      case 2:
        return apply__3832.call(this, f, a);
      case 3:
        return apply__3833.call(this, f, a, b);
      case 4:
        return apply__3834.call(this, f, a, b, c);
      case 5:
        return apply__3835.call(this, f, a, b, c, d);
      default:
        return apply__3836.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  apply.cljs$lang$maxFixedArity = 5;
  apply.cljs$lang$applyTo = apply__3836.cljs$lang$applyTo;
  return apply
}();
cljs.core.vary_meta = function() {
  var vary_meta__delegate = function(obj, f, args) {
    return cljs.core.with_meta.call(null, obj, cljs.core.apply.call(null, f, cljs.core.meta.call(null, obj), args))
  };
  var vary_meta = function(obj, f, var_args) {
    var args = null;
    if(goog.isDef(var_args)) {
      args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
    }
    return vary_meta__delegate.call(this, obj, f, args)
  };
  vary_meta.cljs$lang$maxFixedArity = 2;
  vary_meta.cljs$lang$applyTo = function(arglist__3840) {
    var obj = cljs.core.first(arglist__3840);
    var f = cljs.core.first(cljs.core.next(arglist__3840));
    var args = cljs.core.rest(cljs.core.next(arglist__3840));
    return vary_meta__delegate.call(this, obj, f, args)
  };
  return vary_meta
}();
cljs.core.not_EQ_ = function() {
  var not_EQ_ = null;
  var not_EQ___3841 = function(x) {
    return false
  };
  var not_EQ___3842 = function(x, y) {
    return cljs.core.not.call(null, cljs.core._EQ_.call(null, x, y))
  };
  var not_EQ___3843 = function() {
    var G__3845__delegate = function(x, y, more) {
      return cljs.core.not.call(null, cljs.core.apply.call(null, cljs.core._EQ_, x, y, more))
    };
    var G__3845 = function(x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__3845__delegate.call(this, x, y, more)
    };
    G__3845.cljs$lang$maxFixedArity = 2;
    G__3845.cljs$lang$applyTo = function(arglist__3846) {
      var x = cljs.core.first(arglist__3846);
      var y = cljs.core.first(cljs.core.next(arglist__3846));
      var more = cljs.core.rest(cljs.core.next(arglist__3846));
      return G__3845__delegate.call(this, x, y, more)
    };
    return G__3845
  }();
  not_EQ_ = function(x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 1:
        return not_EQ___3841.call(this, x);
      case 2:
        return not_EQ___3842.call(this, x, y);
      default:
        return not_EQ___3843.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  not_EQ_.cljs$lang$maxFixedArity = 2;
  not_EQ_.cljs$lang$applyTo = not_EQ___3843.cljs$lang$applyTo;
  return not_EQ_
}();
cljs.core.not_empty = function not_empty(coll) {
  if(cljs.core.truth_(cljs.core.seq.call(null, coll))) {
    return coll
  }else {
    return null
  }
};
cljs.core.every_QMARK_ = function every_QMARK_(pred, coll) {
  while(true) {
    if(cljs.core.truth_(cljs.core.seq.call(null, coll) === null)) {
      return true
    }else {
      if(cljs.core.truth_(pred.call(null, cljs.core.first.call(null, coll)))) {
        var G__3847 = pred;
        var G__3848 = cljs.core.next.call(null, coll);
        pred = G__3847;
        coll = G__3848;
        continue
      }else {
        if(cljs.core.truth_("\ufdd0'else")) {
          return false
        }else {
          return null
        }
      }
    }
    break
  }
};
cljs.core.not_every_QMARK_ = function not_every_QMARK_(pred, coll) {
  return cljs.core.not.call(null, cljs.core.every_QMARK_.call(null, pred, coll))
};
cljs.core.some = function some(pred, coll) {
  while(true) {
    if(cljs.core.truth_(cljs.core.seq.call(null, coll))) {
      var or__3824__auto____3849 = pred.call(null, cljs.core.first.call(null, coll));
      if(cljs.core.truth_(or__3824__auto____3849)) {
        return or__3824__auto____3849
      }else {
        var G__3850 = pred;
        var G__3851 = cljs.core.next.call(null, coll);
        pred = G__3850;
        coll = G__3851;
        continue
      }
    }else {
      return null
    }
    break
  }
};
cljs.core.not_any_QMARK_ = function not_any_QMARK_(pred, coll) {
  return cljs.core.not.call(null, cljs.core.some.call(null, pred, coll))
};
cljs.core.even_QMARK_ = function even_QMARK_(n) {
  if(cljs.core.truth_(cljs.core.integer_QMARK_.call(null, n))) {
    return(n & 1) === 0
  }else {
    throw new Error(cljs.core.str.call(null, "Argument must be an integer: ", n));
  }
};
cljs.core.odd_QMARK_ = function odd_QMARK_(n) {
  return cljs.core.not.call(null, cljs.core.even_QMARK_.call(null, n))
};
cljs.core.identity = function identity(x) {
  return x
};
cljs.core.complement = function complement(f) {
  return function() {
    var G__3852 = null;
    var G__3852__3853 = function() {
      return cljs.core.not.call(null, f.call(null))
    };
    var G__3852__3854 = function(x) {
      return cljs.core.not.call(null, f.call(null, x))
    };
    var G__3852__3855 = function(x, y) {
      return cljs.core.not.call(null, f.call(null, x, y))
    };
    var G__3852__3856 = function() {
      var G__3858__delegate = function(x, y, zs) {
        return cljs.core.not.call(null, cljs.core.apply.call(null, f, x, y, zs))
      };
      var G__3858 = function(x, y, var_args) {
        var zs = null;
        if(goog.isDef(var_args)) {
          zs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
        }
        return G__3858__delegate.call(this, x, y, zs)
      };
      G__3858.cljs$lang$maxFixedArity = 2;
      G__3858.cljs$lang$applyTo = function(arglist__3859) {
        var x = cljs.core.first(arglist__3859);
        var y = cljs.core.first(cljs.core.next(arglist__3859));
        var zs = cljs.core.rest(cljs.core.next(arglist__3859));
        return G__3858__delegate.call(this, x, y, zs)
      };
      return G__3858
    }();
    G__3852 = function(x, y, var_args) {
      var zs = var_args;
      switch(arguments.length) {
        case 0:
          return G__3852__3853.call(this);
        case 1:
          return G__3852__3854.call(this, x);
        case 2:
          return G__3852__3855.call(this, x, y);
        default:
          return G__3852__3856.apply(this, arguments)
      }
      throw"Invalid arity: " + arguments.length;
    };
    G__3852.cljs$lang$maxFixedArity = 2;
    G__3852.cljs$lang$applyTo = G__3852__3856.cljs$lang$applyTo;
    return G__3852
  }()
};
cljs.core.constantly = function constantly(x) {
  return function() {
    var G__3860__delegate = function(args) {
      return x
    };
    var G__3860 = function(var_args) {
      var args = null;
      if(goog.isDef(var_args)) {
        args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
      }
      return G__3860__delegate.call(this, args)
    };
    G__3860.cljs$lang$maxFixedArity = 0;
    G__3860.cljs$lang$applyTo = function(arglist__3861) {
      var args = cljs.core.seq(arglist__3861);
      return G__3860__delegate.call(this, args)
    };
    return G__3860
  }()
};
cljs.core.comp = function() {
  var comp = null;
  var comp__3865 = function() {
    return cljs.core.identity
  };
  var comp__3866 = function(f) {
    return f
  };
  var comp__3867 = function(f, g) {
    return function() {
      var G__3871 = null;
      var G__3871__3872 = function() {
        return f.call(null, g.call(null))
      };
      var G__3871__3873 = function(x) {
        return f.call(null, g.call(null, x))
      };
      var G__3871__3874 = function(x, y) {
        return f.call(null, g.call(null, x, y))
      };
      var G__3871__3875 = function(x, y, z) {
        return f.call(null, g.call(null, x, y, z))
      };
      var G__3871__3876 = function() {
        var G__3878__delegate = function(x, y, z, args) {
          return f.call(null, cljs.core.apply.call(null, g, x, y, z, args))
        };
        var G__3878 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__3878__delegate.call(this, x, y, z, args)
        };
        G__3878.cljs$lang$maxFixedArity = 3;
        G__3878.cljs$lang$applyTo = function(arglist__3879) {
          var x = cljs.core.first(arglist__3879);
          var y = cljs.core.first(cljs.core.next(arglist__3879));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__3879)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__3879)));
          return G__3878__delegate.call(this, x, y, z, args)
        };
        return G__3878
      }();
      G__3871 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return G__3871__3872.call(this);
          case 1:
            return G__3871__3873.call(this, x);
          case 2:
            return G__3871__3874.call(this, x, y);
          case 3:
            return G__3871__3875.call(this, x, y, z);
          default:
            return G__3871__3876.apply(this, arguments)
        }
        throw"Invalid arity: " + arguments.length;
      };
      G__3871.cljs$lang$maxFixedArity = 3;
      G__3871.cljs$lang$applyTo = G__3871__3876.cljs$lang$applyTo;
      return G__3871
    }()
  };
  var comp__3868 = function(f, g, h) {
    return function() {
      var G__3880 = null;
      var G__3880__3881 = function() {
        return f.call(null, g.call(null, h.call(null)))
      };
      var G__3880__3882 = function(x) {
        return f.call(null, g.call(null, h.call(null, x)))
      };
      var G__3880__3883 = function(x, y) {
        return f.call(null, g.call(null, h.call(null, x, y)))
      };
      var G__3880__3884 = function(x, y, z) {
        return f.call(null, g.call(null, h.call(null, x, y, z)))
      };
      var G__3880__3885 = function() {
        var G__3887__delegate = function(x, y, z, args) {
          return f.call(null, g.call(null, cljs.core.apply.call(null, h, x, y, z, args)))
        };
        var G__3887 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__3887__delegate.call(this, x, y, z, args)
        };
        G__3887.cljs$lang$maxFixedArity = 3;
        G__3887.cljs$lang$applyTo = function(arglist__3888) {
          var x = cljs.core.first(arglist__3888);
          var y = cljs.core.first(cljs.core.next(arglist__3888));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__3888)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__3888)));
          return G__3887__delegate.call(this, x, y, z, args)
        };
        return G__3887
      }();
      G__3880 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return G__3880__3881.call(this);
          case 1:
            return G__3880__3882.call(this, x);
          case 2:
            return G__3880__3883.call(this, x, y);
          case 3:
            return G__3880__3884.call(this, x, y, z);
          default:
            return G__3880__3885.apply(this, arguments)
        }
        throw"Invalid arity: " + arguments.length;
      };
      G__3880.cljs$lang$maxFixedArity = 3;
      G__3880.cljs$lang$applyTo = G__3880__3885.cljs$lang$applyTo;
      return G__3880
    }()
  };
  var comp__3869 = function() {
    var G__3889__delegate = function(f1, f2, f3, fs) {
      var fs__3862 = cljs.core.reverse.call(null, cljs.core.list_STAR_.call(null, f1, f2, f3, fs));
      return function() {
        var G__3890__delegate = function(args) {
          var ret__3863 = cljs.core.apply.call(null, cljs.core.first.call(null, fs__3862), args);
          var fs__3864 = cljs.core.next.call(null, fs__3862);
          while(true) {
            if(cljs.core.truth_(fs__3864)) {
              var G__3891 = cljs.core.first.call(null, fs__3864).call(null, ret__3863);
              var G__3892 = cljs.core.next.call(null, fs__3864);
              ret__3863 = G__3891;
              fs__3864 = G__3892;
              continue
            }else {
              return ret__3863
            }
            break
          }
        };
        var G__3890 = function(var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
          }
          return G__3890__delegate.call(this, args)
        };
        G__3890.cljs$lang$maxFixedArity = 0;
        G__3890.cljs$lang$applyTo = function(arglist__3893) {
          var args = cljs.core.seq(arglist__3893);
          return G__3890__delegate.call(this, args)
        };
        return G__3890
      }()
    };
    var G__3889 = function(f1, f2, f3, var_args) {
      var fs = null;
      if(goog.isDef(var_args)) {
        fs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
      }
      return G__3889__delegate.call(this, f1, f2, f3, fs)
    };
    G__3889.cljs$lang$maxFixedArity = 3;
    G__3889.cljs$lang$applyTo = function(arglist__3894) {
      var f1 = cljs.core.first(arglist__3894);
      var f2 = cljs.core.first(cljs.core.next(arglist__3894));
      var f3 = cljs.core.first(cljs.core.next(cljs.core.next(arglist__3894)));
      var fs = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__3894)));
      return G__3889__delegate.call(this, f1, f2, f3, fs)
    };
    return G__3889
  }();
  comp = function(f1, f2, f3, var_args) {
    var fs = var_args;
    switch(arguments.length) {
      case 0:
        return comp__3865.call(this);
      case 1:
        return comp__3866.call(this, f1);
      case 2:
        return comp__3867.call(this, f1, f2);
      case 3:
        return comp__3868.call(this, f1, f2, f3);
      default:
        return comp__3869.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  comp.cljs$lang$maxFixedArity = 3;
  comp.cljs$lang$applyTo = comp__3869.cljs$lang$applyTo;
  return comp
}();
cljs.core.partial = function() {
  var partial = null;
  var partial__3895 = function(f, arg1) {
    return function() {
      var G__3900__delegate = function(args) {
        return cljs.core.apply.call(null, f, arg1, args)
      };
      var G__3900 = function(var_args) {
        var args = null;
        if(goog.isDef(var_args)) {
          args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
        }
        return G__3900__delegate.call(this, args)
      };
      G__3900.cljs$lang$maxFixedArity = 0;
      G__3900.cljs$lang$applyTo = function(arglist__3901) {
        var args = cljs.core.seq(arglist__3901);
        return G__3900__delegate.call(this, args)
      };
      return G__3900
    }()
  };
  var partial__3896 = function(f, arg1, arg2) {
    return function() {
      var G__3902__delegate = function(args) {
        return cljs.core.apply.call(null, f, arg1, arg2, args)
      };
      var G__3902 = function(var_args) {
        var args = null;
        if(goog.isDef(var_args)) {
          args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
        }
        return G__3902__delegate.call(this, args)
      };
      G__3902.cljs$lang$maxFixedArity = 0;
      G__3902.cljs$lang$applyTo = function(arglist__3903) {
        var args = cljs.core.seq(arglist__3903);
        return G__3902__delegate.call(this, args)
      };
      return G__3902
    }()
  };
  var partial__3897 = function(f, arg1, arg2, arg3) {
    return function() {
      var G__3904__delegate = function(args) {
        return cljs.core.apply.call(null, f, arg1, arg2, arg3, args)
      };
      var G__3904 = function(var_args) {
        var args = null;
        if(goog.isDef(var_args)) {
          args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
        }
        return G__3904__delegate.call(this, args)
      };
      G__3904.cljs$lang$maxFixedArity = 0;
      G__3904.cljs$lang$applyTo = function(arglist__3905) {
        var args = cljs.core.seq(arglist__3905);
        return G__3904__delegate.call(this, args)
      };
      return G__3904
    }()
  };
  var partial__3898 = function() {
    var G__3906__delegate = function(f, arg1, arg2, arg3, more) {
      return function() {
        var G__3907__delegate = function(args) {
          return cljs.core.apply.call(null, f, arg1, arg2, arg3, cljs.core.concat.call(null, more, args))
        };
        var G__3907 = function(var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
          }
          return G__3907__delegate.call(this, args)
        };
        G__3907.cljs$lang$maxFixedArity = 0;
        G__3907.cljs$lang$applyTo = function(arglist__3908) {
          var args = cljs.core.seq(arglist__3908);
          return G__3907__delegate.call(this, args)
        };
        return G__3907
      }()
    };
    var G__3906 = function(f, arg1, arg2, arg3, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 4), 0)
      }
      return G__3906__delegate.call(this, f, arg1, arg2, arg3, more)
    };
    G__3906.cljs$lang$maxFixedArity = 4;
    G__3906.cljs$lang$applyTo = function(arglist__3909) {
      var f = cljs.core.first(arglist__3909);
      var arg1 = cljs.core.first(cljs.core.next(arglist__3909));
      var arg2 = cljs.core.first(cljs.core.next(cljs.core.next(arglist__3909)));
      var arg3 = cljs.core.first(cljs.core.next(cljs.core.next(cljs.core.next(arglist__3909))));
      var more = cljs.core.rest(cljs.core.next(cljs.core.next(cljs.core.next(arglist__3909))));
      return G__3906__delegate.call(this, f, arg1, arg2, arg3, more)
    };
    return G__3906
  }();
  partial = function(f, arg1, arg2, arg3, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 2:
        return partial__3895.call(this, f, arg1);
      case 3:
        return partial__3896.call(this, f, arg1, arg2);
      case 4:
        return partial__3897.call(this, f, arg1, arg2, arg3);
      default:
        return partial__3898.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  partial.cljs$lang$maxFixedArity = 4;
  partial.cljs$lang$applyTo = partial__3898.cljs$lang$applyTo;
  return partial
}();
cljs.core.fnil = function() {
  var fnil = null;
  var fnil__3910 = function(f, x) {
    return function() {
      var G__3914 = null;
      var G__3914__3915 = function(a) {
        return f.call(null, cljs.core.truth_(a === null) ? x : a)
      };
      var G__3914__3916 = function(a, b) {
        return f.call(null, cljs.core.truth_(a === null) ? x : a, b)
      };
      var G__3914__3917 = function(a, b, c) {
        return f.call(null, cljs.core.truth_(a === null) ? x : a, b, c)
      };
      var G__3914__3918 = function() {
        var G__3920__delegate = function(a, b, c, ds) {
          return cljs.core.apply.call(null, f, cljs.core.truth_(a === null) ? x : a, b, c, ds)
        };
        var G__3920 = function(a, b, c, var_args) {
          var ds = null;
          if(goog.isDef(var_args)) {
            ds = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__3920__delegate.call(this, a, b, c, ds)
        };
        G__3920.cljs$lang$maxFixedArity = 3;
        G__3920.cljs$lang$applyTo = function(arglist__3921) {
          var a = cljs.core.first(arglist__3921);
          var b = cljs.core.first(cljs.core.next(arglist__3921));
          var c = cljs.core.first(cljs.core.next(cljs.core.next(arglist__3921)));
          var ds = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__3921)));
          return G__3920__delegate.call(this, a, b, c, ds)
        };
        return G__3920
      }();
      G__3914 = function(a, b, c, var_args) {
        var ds = var_args;
        switch(arguments.length) {
          case 1:
            return G__3914__3915.call(this, a);
          case 2:
            return G__3914__3916.call(this, a, b);
          case 3:
            return G__3914__3917.call(this, a, b, c);
          default:
            return G__3914__3918.apply(this, arguments)
        }
        throw"Invalid arity: " + arguments.length;
      };
      G__3914.cljs$lang$maxFixedArity = 3;
      G__3914.cljs$lang$applyTo = G__3914__3918.cljs$lang$applyTo;
      return G__3914
    }()
  };
  var fnil__3911 = function(f, x, y) {
    return function() {
      var G__3922 = null;
      var G__3922__3923 = function(a, b) {
        return f.call(null, cljs.core.truth_(a === null) ? x : a, cljs.core.truth_(b === null) ? y : b)
      };
      var G__3922__3924 = function(a, b, c) {
        return f.call(null, cljs.core.truth_(a === null) ? x : a, cljs.core.truth_(b === null) ? y : b, c)
      };
      var G__3922__3925 = function() {
        var G__3927__delegate = function(a, b, c, ds) {
          return cljs.core.apply.call(null, f, cljs.core.truth_(a === null) ? x : a, cljs.core.truth_(b === null) ? y : b, c, ds)
        };
        var G__3927 = function(a, b, c, var_args) {
          var ds = null;
          if(goog.isDef(var_args)) {
            ds = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__3927__delegate.call(this, a, b, c, ds)
        };
        G__3927.cljs$lang$maxFixedArity = 3;
        G__3927.cljs$lang$applyTo = function(arglist__3928) {
          var a = cljs.core.first(arglist__3928);
          var b = cljs.core.first(cljs.core.next(arglist__3928));
          var c = cljs.core.first(cljs.core.next(cljs.core.next(arglist__3928)));
          var ds = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__3928)));
          return G__3927__delegate.call(this, a, b, c, ds)
        };
        return G__3927
      }();
      G__3922 = function(a, b, c, var_args) {
        var ds = var_args;
        switch(arguments.length) {
          case 2:
            return G__3922__3923.call(this, a, b);
          case 3:
            return G__3922__3924.call(this, a, b, c);
          default:
            return G__3922__3925.apply(this, arguments)
        }
        throw"Invalid arity: " + arguments.length;
      };
      G__3922.cljs$lang$maxFixedArity = 3;
      G__3922.cljs$lang$applyTo = G__3922__3925.cljs$lang$applyTo;
      return G__3922
    }()
  };
  var fnil__3912 = function(f, x, y, z) {
    return function() {
      var G__3929 = null;
      var G__3929__3930 = function(a, b) {
        return f.call(null, cljs.core.truth_(a === null) ? x : a, cljs.core.truth_(b === null) ? y : b)
      };
      var G__3929__3931 = function(a, b, c) {
        return f.call(null, cljs.core.truth_(a === null) ? x : a, cljs.core.truth_(b === null) ? y : b, cljs.core.truth_(c === null) ? z : c)
      };
      var G__3929__3932 = function() {
        var G__3934__delegate = function(a, b, c, ds) {
          return cljs.core.apply.call(null, f, cljs.core.truth_(a === null) ? x : a, cljs.core.truth_(b === null) ? y : b, cljs.core.truth_(c === null) ? z : c, ds)
        };
        var G__3934 = function(a, b, c, var_args) {
          var ds = null;
          if(goog.isDef(var_args)) {
            ds = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__3934__delegate.call(this, a, b, c, ds)
        };
        G__3934.cljs$lang$maxFixedArity = 3;
        G__3934.cljs$lang$applyTo = function(arglist__3935) {
          var a = cljs.core.first(arglist__3935);
          var b = cljs.core.first(cljs.core.next(arglist__3935));
          var c = cljs.core.first(cljs.core.next(cljs.core.next(arglist__3935)));
          var ds = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__3935)));
          return G__3934__delegate.call(this, a, b, c, ds)
        };
        return G__3934
      }();
      G__3929 = function(a, b, c, var_args) {
        var ds = var_args;
        switch(arguments.length) {
          case 2:
            return G__3929__3930.call(this, a, b);
          case 3:
            return G__3929__3931.call(this, a, b, c);
          default:
            return G__3929__3932.apply(this, arguments)
        }
        throw"Invalid arity: " + arguments.length;
      };
      G__3929.cljs$lang$maxFixedArity = 3;
      G__3929.cljs$lang$applyTo = G__3929__3932.cljs$lang$applyTo;
      return G__3929
    }()
  };
  fnil = function(f, x, y, z) {
    switch(arguments.length) {
      case 2:
        return fnil__3910.call(this, f, x);
      case 3:
        return fnil__3911.call(this, f, x, y);
      case 4:
        return fnil__3912.call(this, f, x, y, z)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return fnil
}();
cljs.core.map_indexed = function map_indexed(f, coll) {
  var mapi__3938 = function mpi(idx, coll) {
    return new cljs.core.LazySeq(null, false, function() {
      var temp__3974__auto____3936 = cljs.core.seq.call(null, coll);
      if(cljs.core.truth_(temp__3974__auto____3936)) {
        var s__3937 = temp__3974__auto____3936;
        return cljs.core.cons.call(null, f.call(null, idx, cljs.core.first.call(null, s__3937)), mpi.call(null, idx + 1, cljs.core.rest.call(null, s__3937)))
      }else {
        return null
      }
    })
  };
  return mapi__3938.call(null, 0, coll)
};
cljs.core.keep = function keep(f, coll) {
  return new cljs.core.LazySeq(null, false, function() {
    var temp__3974__auto____3939 = cljs.core.seq.call(null, coll);
    if(cljs.core.truth_(temp__3974__auto____3939)) {
      var s__3940 = temp__3974__auto____3939;
      var x__3941 = f.call(null, cljs.core.first.call(null, s__3940));
      if(cljs.core.truth_(x__3941 === null)) {
        return keep.call(null, f, cljs.core.rest.call(null, s__3940))
      }else {
        return cljs.core.cons.call(null, x__3941, keep.call(null, f, cljs.core.rest.call(null, s__3940)))
      }
    }else {
      return null
    }
  })
};
cljs.core.keep_indexed = function keep_indexed(f, coll) {
  var keepi__3951 = function kpi(idx, coll) {
    return new cljs.core.LazySeq(null, false, function() {
      var temp__3974__auto____3948 = cljs.core.seq.call(null, coll);
      if(cljs.core.truth_(temp__3974__auto____3948)) {
        var s__3949 = temp__3974__auto____3948;
        var x__3950 = f.call(null, idx, cljs.core.first.call(null, s__3949));
        if(cljs.core.truth_(x__3950 === null)) {
          return kpi.call(null, idx + 1, cljs.core.rest.call(null, s__3949))
        }else {
          return cljs.core.cons.call(null, x__3950, kpi.call(null, idx + 1, cljs.core.rest.call(null, s__3949)))
        }
      }else {
        return null
      }
    })
  };
  return keepi__3951.call(null, 0, coll)
};
cljs.core.every_pred = function() {
  var every_pred = null;
  var every_pred__3996 = function(p) {
    return function() {
      var ep1 = null;
      var ep1__4001 = function() {
        return true
      };
      var ep1__4002 = function(x) {
        return cljs.core.boolean$.call(null, p.call(null, x))
      };
      var ep1__4003 = function(x, y) {
        return cljs.core.boolean$.call(null, function() {
          var and__3822__auto____3958 = p.call(null, x);
          if(cljs.core.truth_(and__3822__auto____3958)) {
            return p.call(null, y)
          }else {
            return and__3822__auto____3958
          }
        }())
      };
      var ep1__4004 = function(x, y, z) {
        return cljs.core.boolean$.call(null, function() {
          var and__3822__auto____3959 = p.call(null, x);
          if(cljs.core.truth_(and__3822__auto____3959)) {
            var and__3822__auto____3960 = p.call(null, y);
            if(cljs.core.truth_(and__3822__auto____3960)) {
              return p.call(null, z)
            }else {
              return and__3822__auto____3960
            }
          }else {
            return and__3822__auto____3959
          }
        }())
      };
      var ep1__4005 = function() {
        var G__4007__delegate = function(x, y, z, args) {
          return cljs.core.boolean$.call(null, function() {
            var and__3822__auto____3961 = ep1.call(null, x, y, z);
            if(cljs.core.truth_(and__3822__auto____3961)) {
              return cljs.core.every_QMARK_.call(null, p, args)
            }else {
              return and__3822__auto____3961
            }
          }())
        };
        var G__4007 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__4007__delegate.call(this, x, y, z, args)
        };
        G__4007.cljs$lang$maxFixedArity = 3;
        G__4007.cljs$lang$applyTo = function(arglist__4008) {
          var x = cljs.core.first(arglist__4008);
          var y = cljs.core.first(cljs.core.next(arglist__4008));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4008)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__4008)));
          return G__4007__delegate.call(this, x, y, z, args)
        };
        return G__4007
      }();
      ep1 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return ep1__4001.call(this);
          case 1:
            return ep1__4002.call(this, x);
          case 2:
            return ep1__4003.call(this, x, y);
          case 3:
            return ep1__4004.call(this, x, y, z);
          default:
            return ep1__4005.apply(this, arguments)
        }
        throw"Invalid arity: " + arguments.length;
      };
      ep1.cljs$lang$maxFixedArity = 3;
      ep1.cljs$lang$applyTo = ep1__4005.cljs$lang$applyTo;
      return ep1
    }()
  };
  var every_pred__3997 = function(p1, p2) {
    return function() {
      var ep2 = null;
      var ep2__4009 = function() {
        return true
      };
      var ep2__4010 = function(x) {
        return cljs.core.boolean$.call(null, function() {
          var and__3822__auto____3962 = p1.call(null, x);
          if(cljs.core.truth_(and__3822__auto____3962)) {
            return p2.call(null, x)
          }else {
            return and__3822__auto____3962
          }
        }())
      };
      var ep2__4011 = function(x, y) {
        return cljs.core.boolean$.call(null, function() {
          var and__3822__auto____3963 = p1.call(null, x);
          if(cljs.core.truth_(and__3822__auto____3963)) {
            var and__3822__auto____3964 = p1.call(null, y);
            if(cljs.core.truth_(and__3822__auto____3964)) {
              var and__3822__auto____3965 = p2.call(null, x);
              if(cljs.core.truth_(and__3822__auto____3965)) {
                return p2.call(null, y)
              }else {
                return and__3822__auto____3965
              }
            }else {
              return and__3822__auto____3964
            }
          }else {
            return and__3822__auto____3963
          }
        }())
      };
      var ep2__4012 = function(x, y, z) {
        return cljs.core.boolean$.call(null, function() {
          var and__3822__auto____3966 = p1.call(null, x);
          if(cljs.core.truth_(and__3822__auto____3966)) {
            var and__3822__auto____3967 = p1.call(null, y);
            if(cljs.core.truth_(and__3822__auto____3967)) {
              var and__3822__auto____3968 = p1.call(null, z);
              if(cljs.core.truth_(and__3822__auto____3968)) {
                var and__3822__auto____3969 = p2.call(null, x);
                if(cljs.core.truth_(and__3822__auto____3969)) {
                  var and__3822__auto____3970 = p2.call(null, y);
                  if(cljs.core.truth_(and__3822__auto____3970)) {
                    return p2.call(null, z)
                  }else {
                    return and__3822__auto____3970
                  }
                }else {
                  return and__3822__auto____3969
                }
              }else {
                return and__3822__auto____3968
              }
            }else {
              return and__3822__auto____3967
            }
          }else {
            return and__3822__auto____3966
          }
        }())
      };
      var ep2__4013 = function() {
        var G__4015__delegate = function(x, y, z, args) {
          return cljs.core.boolean$.call(null, function() {
            var and__3822__auto____3971 = ep2.call(null, x, y, z);
            if(cljs.core.truth_(and__3822__auto____3971)) {
              return cljs.core.every_QMARK_.call(null, function(p1__3942_SHARP_) {
                var and__3822__auto____3972 = p1.call(null, p1__3942_SHARP_);
                if(cljs.core.truth_(and__3822__auto____3972)) {
                  return p2.call(null, p1__3942_SHARP_)
                }else {
                  return and__3822__auto____3972
                }
              }, args)
            }else {
              return and__3822__auto____3971
            }
          }())
        };
        var G__4015 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__4015__delegate.call(this, x, y, z, args)
        };
        G__4015.cljs$lang$maxFixedArity = 3;
        G__4015.cljs$lang$applyTo = function(arglist__4016) {
          var x = cljs.core.first(arglist__4016);
          var y = cljs.core.first(cljs.core.next(arglist__4016));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4016)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__4016)));
          return G__4015__delegate.call(this, x, y, z, args)
        };
        return G__4015
      }();
      ep2 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return ep2__4009.call(this);
          case 1:
            return ep2__4010.call(this, x);
          case 2:
            return ep2__4011.call(this, x, y);
          case 3:
            return ep2__4012.call(this, x, y, z);
          default:
            return ep2__4013.apply(this, arguments)
        }
        throw"Invalid arity: " + arguments.length;
      };
      ep2.cljs$lang$maxFixedArity = 3;
      ep2.cljs$lang$applyTo = ep2__4013.cljs$lang$applyTo;
      return ep2
    }()
  };
  var every_pred__3998 = function(p1, p2, p3) {
    return function() {
      var ep3 = null;
      var ep3__4017 = function() {
        return true
      };
      var ep3__4018 = function(x) {
        return cljs.core.boolean$.call(null, function() {
          var and__3822__auto____3973 = p1.call(null, x);
          if(cljs.core.truth_(and__3822__auto____3973)) {
            var and__3822__auto____3974 = p2.call(null, x);
            if(cljs.core.truth_(and__3822__auto____3974)) {
              return p3.call(null, x)
            }else {
              return and__3822__auto____3974
            }
          }else {
            return and__3822__auto____3973
          }
        }())
      };
      var ep3__4019 = function(x, y) {
        return cljs.core.boolean$.call(null, function() {
          var and__3822__auto____3975 = p1.call(null, x);
          if(cljs.core.truth_(and__3822__auto____3975)) {
            var and__3822__auto____3976 = p2.call(null, x);
            if(cljs.core.truth_(and__3822__auto____3976)) {
              var and__3822__auto____3977 = p3.call(null, x);
              if(cljs.core.truth_(and__3822__auto____3977)) {
                var and__3822__auto____3978 = p1.call(null, y);
                if(cljs.core.truth_(and__3822__auto____3978)) {
                  var and__3822__auto____3979 = p2.call(null, y);
                  if(cljs.core.truth_(and__3822__auto____3979)) {
                    return p3.call(null, y)
                  }else {
                    return and__3822__auto____3979
                  }
                }else {
                  return and__3822__auto____3978
                }
              }else {
                return and__3822__auto____3977
              }
            }else {
              return and__3822__auto____3976
            }
          }else {
            return and__3822__auto____3975
          }
        }())
      };
      var ep3__4020 = function(x, y, z) {
        return cljs.core.boolean$.call(null, function() {
          var and__3822__auto____3980 = p1.call(null, x);
          if(cljs.core.truth_(and__3822__auto____3980)) {
            var and__3822__auto____3981 = p2.call(null, x);
            if(cljs.core.truth_(and__3822__auto____3981)) {
              var and__3822__auto____3982 = p3.call(null, x);
              if(cljs.core.truth_(and__3822__auto____3982)) {
                var and__3822__auto____3983 = p1.call(null, y);
                if(cljs.core.truth_(and__3822__auto____3983)) {
                  var and__3822__auto____3984 = p2.call(null, y);
                  if(cljs.core.truth_(and__3822__auto____3984)) {
                    var and__3822__auto____3985 = p3.call(null, y);
                    if(cljs.core.truth_(and__3822__auto____3985)) {
                      var and__3822__auto____3986 = p1.call(null, z);
                      if(cljs.core.truth_(and__3822__auto____3986)) {
                        var and__3822__auto____3987 = p2.call(null, z);
                        if(cljs.core.truth_(and__3822__auto____3987)) {
                          return p3.call(null, z)
                        }else {
                          return and__3822__auto____3987
                        }
                      }else {
                        return and__3822__auto____3986
                      }
                    }else {
                      return and__3822__auto____3985
                    }
                  }else {
                    return and__3822__auto____3984
                  }
                }else {
                  return and__3822__auto____3983
                }
              }else {
                return and__3822__auto____3982
              }
            }else {
              return and__3822__auto____3981
            }
          }else {
            return and__3822__auto____3980
          }
        }())
      };
      var ep3__4021 = function() {
        var G__4023__delegate = function(x, y, z, args) {
          return cljs.core.boolean$.call(null, function() {
            var and__3822__auto____3988 = ep3.call(null, x, y, z);
            if(cljs.core.truth_(and__3822__auto____3988)) {
              return cljs.core.every_QMARK_.call(null, function(p1__3943_SHARP_) {
                var and__3822__auto____3989 = p1.call(null, p1__3943_SHARP_);
                if(cljs.core.truth_(and__3822__auto____3989)) {
                  var and__3822__auto____3990 = p2.call(null, p1__3943_SHARP_);
                  if(cljs.core.truth_(and__3822__auto____3990)) {
                    return p3.call(null, p1__3943_SHARP_)
                  }else {
                    return and__3822__auto____3990
                  }
                }else {
                  return and__3822__auto____3989
                }
              }, args)
            }else {
              return and__3822__auto____3988
            }
          }())
        };
        var G__4023 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__4023__delegate.call(this, x, y, z, args)
        };
        G__4023.cljs$lang$maxFixedArity = 3;
        G__4023.cljs$lang$applyTo = function(arglist__4024) {
          var x = cljs.core.first(arglist__4024);
          var y = cljs.core.first(cljs.core.next(arglist__4024));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4024)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__4024)));
          return G__4023__delegate.call(this, x, y, z, args)
        };
        return G__4023
      }();
      ep3 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return ep3__4017.call(this);
          case 1:
            return ep3__4018.call(this, x);
          case 2:
            return ep3__4019.call(this, x, y);
          case 3:
            return ep3__4020.call(this, x, y, z);
          default:
            return ep3__4021.apply(this, arguments)
        }
        throw"Invalid arity: " + arguments.length;
      };
      ep3.cljs$lang$maxFixedArity = 3;
      ep3.cljs$lang$applyTo = ep3__4021.cljs$lang$applyTo;
      return ep3
    }()
  };
  var every_pred__3999 = function() {
    var G__4025__delegate = function(p1, p2, p3, ps) {
      var ps__3991 = cljs.core.list_STAR_.call(null, p1, p2, p3, ps);
      return function() {
        var epn = null;
        var epn__4026 = function() {
          return true
        };
        var epn__4027 = function(x) {
          return cljs.core.every_QMARK_.call(null, function(p1__3944_SHARP_) {
            return p1__3944_SHARP_.call(null, x)
          }, ps__3991)
        };
        var epn__4028 = function(x, y) {
          return cljs.core.every_QMARK_.call(null, function(p1__3945_SHARP_) {
            var and__3822__auto____3992 = p1__3945_SHARP_.call(null, x);
            if(cljs.core.truth_(and__3822__auto____3992)) {
              return p1__3945_SHARP_.call(null, y)
            }else {
              return and__3822__auto____3992
            }
          }, ps__3991)
        };
        var epn__4029 = function(x, y, z) {
          return cljs.core.every_QMARK_.call(null, function(p1__3946_SHARP_) {
            var and__3822__auto____3993 = p1__3946_SHARP_.call(null, x);
            if(cljs.core.truth_(and__3822__auto____3993)) {
              var and__3822__auto____3994 = p1__3946_SHARP_.call(null, y);
              if(cljs.core.truth_(and__3822__auto____3994)) {
                return p1__3946_SHARP_.call(null, z)
              }else {
                return and__3822__auto____3994
              }
            }else {
              return and__3822__auto____3993
            }
          }, ps__3991)
        };
        var epn__4030 = function() {
          var G__4032__delegate = function(x, y, z, args) {
            return cljs.core.boolean$.call(null, function() {
              var and__3822__auto____3995 = epn.call(null, x, y, z);
              if(cljs.core.truth_(and__3822__auto____3995)) {
                return cljs.core.every_QMARK_.call(null, function(p1__3947_SHARP_) {
                  return cljs.core.every_QMARK_.call(null, p1__3947_SHARP_, args)
                }, ps__3991)
              }else {
                return and__3822__auto____3995
              }
            }())
          };
          var G__4032 = function(x, y, z, var_args) {
            var args = null;
            if(goog.isDef(var_args)) {
              args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
            }
            return G__4032__delegate.call(this, x, y, z, args)
          };
          G__4032.cljs$lang$maxFixedArity = 3;
          G__4032.cljs$lang$applyTo = function(arglist__4033) {
            var x = cljs.core.first(arglist__4033);
            var y = cljs.core.first(cljs.core.next(arglist__4033));
            var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4033)));
            var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__4033)));
            return G__4032__delegate.call(this, x, y, z, args)
          };
          return G__4032
        }();
        epn = function(x, y, z, var_args) {
          var args = var_args;
          switch(arguments.length) {
            case 0:
              return epn__4026.call(this);
            case 1:
              return epn__4027.call(this, x);
            case 2:
              return epn__4028.call(this, x, y);
            case 3:
              return epn__4029.call(this, x, y, z);
            default:
              return epn__4030.apply(this, arguments)
          }
          throw"Invalid arity: " + arguments.length;
        };
        epn.cljs$lang$maxFixedArity = 3;
        epn.cljs$lang$applyTo = epn__4030.cljs$lang$applyTo;
        return epn
      }()
    };
    var G__4025 = function(p1, p2, p3, var_args) {
      var ps = null;
      if(goog.isDef(var_args)) {
        ps = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
      }
      return G__4025__delegate.call(this, p1, p2, p3, ps)
    };
    G__4025.cljs$lang$maxFixedArity = 3;
    G__4025.cljs$lang$applyTo = function(arglist__4034) {
      var p1 = cljs.core.first(arglist__4034);
      var p2 = cljs.core.first(cljs.core.next(arglist__4034));
      var p3 = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4034)));
      var ps = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__4034)));
      return G__4025__delegate.call(this, p1, p2, p3, ps)
    };
    return G__4025
  }();
  every_pred = function(p1, p2, p3, var_args) {
    var ps = var_args;
    switch(arguments.length) {
      case 1:
        return every_pred__3996.call(this, p1);
      case 2:
        return every_pred__3997.call(this, p1, p2);
      case 3:
        return every_pred__3998.call(this, p1, p2, p3);
      default:
        return every_pred__3999.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  every_pred.cljs$lang$maxFixedArity = 3;
  every_pred.cljs$lang$applyTo = every_pred__3999.cljs$lang$applyTo;
  return every_pred
}();
cljs.core.some_fn = function() {
  var some_fn = null;
  var some_fn__4074 = function(p) {
    return function() {
      var sp1 = null;
      var sp1__4079 = function() {
        return null
      };
      var sp1__4080 = function(x) {
        return p.call(null, x)
      };
      var sp1__4081 = function(x, y) {
        var or__3824__auto____4036 = p.call(null, x);
        if(cljs.core.truth_(or__3824__auto____4036)) {
          return or__3824__auto____4036
        }else {
          return p.call(null, y)
        }
      };
      var sp1__4082 = function(x, y, z) {
        var or__3824__auto____4037 = p.call(null, x);
        if(cljs.core.truth_(or__3824__auto____4037)) {
          return or__3824__auto____4037
        }else {
          var or__3824__auto____4038 = p.call(null, y);
          if(cljs.core.truth_(or__3824__auto____4038)) {
            return or__3824__auto____4038
          }else {
            return p.call(null, z)
          }
        }
      };
      var sp1__4083 = function() {
        var G__4085__delegate = function(x, y, z, args) {
          var or__3824__auto____4039 = sp1.call(null, x, y, z);
          if(cljs.core.truth_(or__3824__auto____4039)) {
            return or__3824__auto____4039
          }else {
            return cljs.core.some.call(null, p, args)
          }
        };
        var G__4085 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__4085__delegate.call(this, x, y, z, args)
        };
        G__4085.cljs$lang$maxFixedArity = 3;
        G__4085.cljs$lang$applyTo = function(arglist__4086) {
          var x = cljs.core.first(arglist__4086);
          var y = cljs.core.first(cljs.core.next(arglist__4086));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4086)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__4086)));
          return G__4085__delegate.call(this, x, y, z, args)
        };
        return G__4085
      }();
      sp1 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return sp1__4079.call(this);
          case 1:
            return sp1__4080.call(this, x);
          case 2:
            return sp1__4081.call(this, x, y);
          case 3:
            return sp1__4082.call(this, x, y, z);
          default:
            return sp1__4083.apply(this, arguments)
        }
        throw"Invalid arity: " + arguments.length;
      };
      sp1.cljs$lang$maxFixedArity = 3;
      sp1.cljs$lang$applyTo = sp1__4083.cljs$lang$applyTo;
      return sp1
    }()
  };
  var some_fn__4075 = function(p1, p2) {
    return function() {
      var sp2 = null;
      var sp2__4087 = function() {
        return null
      };
      var sp2__4088 = function(x) {
        var or__3824__auto____4040 = p1.call(null, x);
        if(cljs.core.truth_(or__3824__auto____4040)) {
          return or__3824__auto____4040
        }else {
          return p2.call(null, x)
        }
      };
      var sp2__4089 = function(x, y) {
        var or__3824__auto____4041 = p1.call(null, x);
        if(cljs.core.truth_(or__3824__auto____4041)) {
          return or__3824__auto____4041
        }else {
          var or__3824__auto____4042 = p1.call(null, y);
          if(cljs.core.truth_(or__3824__auto____4042)) {
            return or__3824__auto____4042
          }else {
            var or__3824__auto____4043 = p2.call(null, x);
            if(cljs.core.truth_(or__3824__auto____4043)) {
              return or__3824__auto____4043
            }else {
              return p2.call(null, y)
            }
          }
        }
      };
      var sp2__4090 = function(x, y, z) {
        var or__3824__auto____4044 = p1.call(null, x);
        if(cljs.core.truth_(or__3824__auto____4044)) {
          return or__3824__auto____4044
        }else {
          var or__3824__auto____4045 = p1.call(null, y);
          if(cljs.core.truth_(or__3824__auto____4045)) {
            return or__3824__auto____4045
          }else {
            var or__3824__auto____4046 = p1.call(null, z);
            if(cljs.core.truth_(or__3824__auto____4046)) {
              return or__3824__auto____4046
            }else {
              var or__3824__auto____4047 = p2.call(null, x);
              if(cljs.core.truth_(or__3824__auto____4047)) {
                return or__3824__auto____4047
              }else {
                var or__3824__auto____4048 = p2.call(null, y);
                if(cljs.core.truth_(or__3824__auto____4048)) {
                  return or__3824__auto____4048
                }else {
                  return p2.call(null, z)
                }
              }
            }
          }
        }
      };
      var sp2__4091 = function() {
        var G__4093__delegate = function(x, y, z, args) {
          var or__3824__auto____4049 = sp2.call(null, x, y, z);
          if(cljs.core.truth_(or__3824__auto____4049)) {
            return or__3824__auto____4049
          }else {
            return cljs.core.some.call(null, function(p1__3952_SHARP_) {
              var or__3824__auto____4050 = p1.call(null, p1__3952_SHARP_);
              if(cljs.core.truth_(or__3824__auto____4050)) {
                return or__3824__auto____4050
              }else {
                return p2.call(null, p1__3952_SHARP_)
              }
            }, args)
          }
        };
        var G__4093 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__4093__delegate.call(this, x, y, z, args)
        };
        G__4093.cljs$lang$maxFixedArity = 3;
        G__4093.cljs$lang$applyTo = function(arglist__4094) {
          var x = cljs.core.first(arglist__4094);
          var y = cljs.core.first(cljs.core.next(arglist__4094));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4094)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__4094)));
          return G__4093__delegate.call(this, x, y, z, args)
        };
        return G__4093
      }();
      sp2 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return sp2__4087.call(this);
          case 1:
            return sp2__4088.call(this, x);
          case 2:
            return sp2__4089.call(this, x, y);
          case 3:
            return sp2__4090.call(this, x, y, z);
          default:
            return sp2__4091.apply(this, arguments)
        }
        throw"Invalid arity: " + arguments.length;
      };
      sp2.cljs$lang$maxFixedArity = 3;
      sp2.cljs$lang$applyTo = sp2__4091.cljs$lang$applyTo;
      return sp2
    }()
  };
  var some_fn__4076 = function(p1, p2, p3) {
    return function() {
      var sp3 = null;
      var sp3__4095 = function() {
        return null
      };
      var sp3__4096 = function(x) {
        var or__3824__auto____4051 = p1.call(null, x);
        if(cljs.core.truth_(or__3824__auto____4051)) {
          return or__3824__auto____4051
        }else {
          var or__3824__auto____4052 = p2.call(null, x);
          if(cljs.core.truth_(or__3824__auto____4052)) {
            return or__3824__auto____4052
          }else {
            return p3.call(null, x)
          }
        }
      };
      var sp3__4097 = function(x, y) {
        var or__3824__auto____4053 = p1.call(null, x);
        if(cljs.core.truth_(or__3824__auto____4053)) {
          return or__3824__auto____4053
        }else {
          var or__3824__auto____4054 = p2.call(null, x);
          if(cljs.core.truth_(or__3824__auto____4054)) {
            return or__3824__auto____4054
          }else {
            var or__3824__auto____4055 = p3.call(null, x);
            if(cljs.core.truth_(or__3824__auto____4055)) {
              return or__3824__auto____4055
            }else {
              var or__3824__auto____4056 = p1.call(null, y);
              if(cljs.core.truth_(or__3824__auto____4056)) {
                return or__3824__auto____4056
              }else {
                var or__3824__auto____4057 = p2.call(null, y);
                if(cljs.core.truth_(or__3824__auto____4057)) {
                  return or__3824__auto____4057
                }else {
                  return p3.call(null, y)
                }
              }
            }
          }
        }
      };
      var sp3__4098 = function(x, y, z) {
        var or__3824__auto____4058 = p1.call(null, x);
        if(cljs.core.truth_(or__3824__auto____4058)) {
          return or__3824__auto____4058
        }else {
          var or__3824__auto____4059 = p2.call(null, x);
          if(cljs.core.truth_(or__3824__auto____4059)) {
            return or__3824__auto____4059
          }else {
            var or__3824__auto____4060 = p3.call(null, x);
            if(cljs.core.truth_(or__3824__auto____4060)) {
              return or__3824__auto____4060
            }else {
              var or__3824__auto____4061 = p1.call(null, y);
              if(cljs.core.truth_(or__3824__auto____4061)) {
                return or__3824__auto____4061
              }else {
                var or__3824__auto____4062 = p2.call(null, y);
                if(cljs.core.truth_(or__3824__auto____4062)) {
                  return or__3824__auto____4062
                }else {
                  var or__3824__auto____4063 = p3.call(null, y);
                  if(cljs.core.truth_(or__3824__auto____4063)) {
                    return or__3824__auto____4063
                  }else {
                    var or__3824__auto____4064 = p1.call(null, z);
                    if(cljs.core.truth_(or__3824__auto____4064)) {
                      return or__3824__auto____4064
                    }else {
                      var or__3824__auto____4065 = p2.call(null, z);
                      if(cljs.core.truth_(or__3824__auto____4065)) {
                        return or__3824__auto____4065
                      }else {
                        return p3.call(null, z)
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };
      var sp3__4099 = function() {
        var G__4101__delegate = function(x, y, z, args) {
          var or__3824__auto____4066 = sp3.call(null, x, y, z);
          if(cljs.core.truth_(or__3824__auto____4066)) {
            return or__3824__auto____4066
          }else {
            return cljs.core.some.call(null, function(p1__3953_SHARP_) {
              var or__3824__auto____4067 = p1.call(null, p1__3953_SHARP_);
              if(cljs.core.truth_(or__3824__auto____4067)) {
                return or__3824__auto____4067
              }else {
                var or__3824__auto____4068 = p2.call(null, p1__3953_SHARP_);
                if(cljs.core.truth_(or__3824__auto____4068)) {
                  return or__3824__auto____4068
                }else {
                  return p3.call(null, p1__3953_SHARP_)
                }
              }
            }, args)
          }
        };
        var G__4101 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__4101__delegate.call(this, x, y, z, args)
        };
        G__4101.cljs$lang$maxFixedArity = 3;
        G__4101.cljs$lang$applyTo = function(arglist__4102) {
          var x = cljs.core.first(arglist__4102);
          var y = cljs.core.first(cljs.core.next(arglist__4102));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4102)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__4102)));
          return G__4101__delegate.call(this, x, y, z, args)
        };
        return G__4101
      }();
      sp3 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return sp3__4095.call(this);
          case 1:
            return sp3__4096.call(this, x);
          case 2:
            return sp3__4097.call(this, x, y);
          case 3:
            return sp3__4098.call(this, x, y, z);
          default:
            return sp3__4099.apply(this, arguments)
        }
        throw"Invalid arity: " + arguments.length;
      };
      sp3.cljs$lang$maxFixedArity = 3;
      sp3.cljs$lang$applyTo = sp3__4099.cljs$lang$applyTo;
      return sp3
    }()
  };
  var some_fn__4077 = function() {
    var G__4103__delegate = function(p1, p2, p3, ps) {
      var ps__4069 = cljs.core.list_STAR_.call(null, p1, p2, p3, ps);
      return function() {
        var spn = null;
        var spn__4104 = function() {
          return null
        };
        var spn__4105 = function(x) {
          return cljs.core.some.call(null, function(p1__3954_SHARP_) {
            return p1__3954_SHARP_.call(null, x)
          }, ps__4069)
        };
        var spn__4106 = function(x, y) {
          return cljs.core.some.call(null, function(p1__3955_SHARP_) {
            var or__3824__auto____4070 = p1__3955_SHARP_.call(null, x);
            if(cljs.core.truth_(or__3824__auto____4070)) {
              return or__3824__auto____4070
            }else {
              return p1__3955_SHARP_.call(null, y)
            }
          }, ps__4069)
        };
        var spn__4107 = function(x, y, z) {
          return cljs.core.some.call(null, function(p1__3956_SHARP_) {
            var or__3824__auto____4071 = p1__3956_SHARP_.call(null, x);
            if(cljs.core.truth_(or__3824__auto____4071)) {
              return or__3824__auto____4071
            }else {
              var or__3824__auto____4072 = p1__3956_SHARP_.call(null, y);
              if(cljs.core.truth_(or__3824__auto____4072)) {
                return or__3824__auto____4072
              }else {
                return p1__3956_SHARP_.call(null, z)
              }
            }
          }, ps__4069)
        };
        var spn__4108 = function() {
          var G__4110__delegate = function(x, y, z, args) {
            var or__3824__auto____4073 = spn.call(null, x, y, z);
            if(cljs.core.truth_(or__3824__auto____4073)) {
              return or__3824__auto____4073
            }else {
              return cljs.core.some.call(null, function(p1__3957_SHARP_) {
                return cljs.core.some.call(null, p1__3957_SHARP_, args)
              }, ps__4069)
            }
          };
          var G__4110 = function(x, y, z, var_args) {
            var args = null;
            if(goog.isDef(var_args)) {
              args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
            }
            return G__4110__delegate.call(this, x, y, z, args)
          };
          G__4110.cljs$lang$maxFixedArity = 3;
          G__4110.cljs$lang$applyTo = function(arglist__4111) {
            var x = cljs.core.first(arglist__4111);
            var y = cljs.core.first(cljs.core.next(arglist__4111));
            var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4111)));
            var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__4111)));
            return G__4110__delegate.call(this, x, y, z, args)
          };
          return G__4110
        }();
        spn = function(x, y, z, var_args) {
          var args = var_args;
          switch(arguments.length) {
            case 0:
              return spn__4104.call(this);
            case 1:
              return spn__4105.call(this, x);
            case 2:
              return spn__4106.call(this, x, y);
            case 3:
              return spn__4107.call(this, x, y, z);
            default:
              return spn__4108.apply(this, arguments)
          }
          throw"Invalid arity: " + arguments.length;
        };
        spn.cljs$lang$maxFixedArity = 3;
        spn.cljs$lang$applyTo = spn__4108.cljs$lang$applyTo;
        return spn
      }()
    };
    var G__4103 = function(p1, p2, p3, var_args) {
      var ps = null;
      if(goog.isDef(var_args)) {
        ps = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
      }
      return G__4103__delegate.call(this, p1, p2, p3, ps)
    };
    G__4103.cljs$lang$maxFixedArity = 3;
    G__4103.cljs$lang$applyTo = function(arglist__4112) {
      var p1 = cljs.core.first(arglist__4112);
      var p2 = cljs.core.first(cljs.core.next(arglist__4112));
      var p3 = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4112)));
      var ps = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__4112)));
      return G__4103__delegate.call(this, p1, p2, p3, ps)
    };
    return G__4103
  }();
  some_fn = function(p1, p2, p3, var_args) {
    var ps = var_args;
    switch(arguments.length) {
      case 1:
        return some_fn__4074.call(this, p1);
      case 2:
        return some_fn__4075.call(this, p1, p2);
      case 3:
        return some_fn__4076.call(this, p1, p2, p3);
      default:
        return some_fn__4077.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  some_fn.cljs$lang$maxFixedArity = 3;
  some_fn.cljs$lang$applyTo = some_fn__4077.cljs$lang$applyTo;
  return some_fn
}();
cljs.core.map = function() {
  var map = null;
  var map__4125 = function(f, coll) {
    return new cljs.core.LazySeq(null, false, function() {
      var temp__3974__auto____4113 = cljs.core.seq.call(null, coll);
      if(cljs.core.truth_(temp__3974__auto____4113)) {
        var s__4114 = temp__3974__auto____4113;
        return cljs.core.cons.call(null, f.call(null, cljs.core.first.call(null, s__4114)), map.call(null, f, cljs.core.rest.call(null, s__4114)))
      }else {
        return null
      }
    })
  };
  var map__4126 = function(f, c1, c2) {
    return new cljs.core.LazySeq(null, false, function() {
      var s1__4115 = cljs.core.seq.call(null, c1);
      var s2__4116 = cljs.core.seq.call(null, c2);
      if(cljs.core.truth_(function() {
        var and__3822__auto____4117 = s1__4115;
        if(cljs.core.truth_(and__3822__auto____4117)) {
          return s2__4116
        }else {
          return and__3822__auto____4117
        }
      }())) {
        return cljs.core.cons.call(null, f.call(null, cljs.core.first.call(null, s1__4115), cljs.core.first.call(null, s2__4116)), map.call(null, f, cljs.core.rest.call(null, s1__4115), cljs.core.rest.call(null, s2__4116)))
      }else {
        return null
      }
    })
  };
  var map__4127 = function(f, c1, c2, c3) {
    return new cljs.core.LazySeq(null, false, function() {
      var s1__4118 = cljs.core.seq.call(null, c1);
      var s2__4119 = cljs.core.seq.call(null, c2);
      var s3__4120 = cljs.core.seq.call(null, c3);
      if(cljs.core.truth_(function() {
        var and__3822__auto____4121 = s1__4118;
        if(cljs.core.truth_(and__3822__auto____4121)) {
          var and__3822__auto____4122 = s2__4119;
          if(cljs.core.truth_(and__3822__auto____4122)) {
            return s3__4120
          }else {
            return and__3822__auto____4122
          }
        }else {
          return and__3822__auto____4121
        }
      }())) {
        return cljs.core.cons.call(null, f.call(null, cljs.core.first.call(null, s1__4118), cljs.core.first.call(null, s2__4119), cljs.core.first.call(null, s3__4120)), map.call(null, f, cljs.core.rest.call(null, s1__4118), cljs.core.rest.call(null, s2__4119), cljs.core.rest.call(null, s3__4120)))
      }else {
        return null
      }
    })
  };
  var map__4128 = function() {
    var G__4130__delegate = function(f, c1, c2, c3, colls) {
      var step__4124 = function step(cs) {
        return new cljs.core.LazySeq(null, false, function() {
          var ss__4123 = map.call(null, cljs.core.seq, cs);
          if(cljs.core.truth_(cljs.core.every_QMARK_.call(null, cljs.core.identity, ss__4123))) {
            return cljs.core.cons.call(null, map.call(null, cljs.core.first, ss__4123), step.call(null, map.call(null, cljs.core.rest, ss__4123)))
          }else {
            return null
          }
        })
      };
      return map.call(null, function(p1__4035_SHARP_) {
        return cljs.core.apply.call(null, f, p1__4035_SHARP_)
      }, step__4124.call(null, cljs.core.conj.call(null, colls, c3, c2, c1)))
    };
    var G__4130 = function(f, c1, c2, c3, var_args) {
      var colls = null;
      if(goog.isDef(var_args)) {
        colls = cljs.core.array_seq(Array.prototype.slice.call(arguments, 4), 0)
      }
      return G__4130__delegate.call(this, f, c1, c2, c3, colls)
    };
    G__4130.cljs$lang$maxFixedArity = 4;
    G__4130.cljs$lang$applyTo = function(arglist__4131) {
      var f = cljs.core.first(arglist__4131);
      var c1 = cljs.core.first(cljs.core.next(arglist__4131));
      var c2 = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4131)));
      var c3 = cljs.core.first(cljs.core.next(cljs.core.next(cljs.core.next(arglist__4131))));
      var colls = cljs.core.rest(cljs.core.next(cljs.core.next(cljs.core.next(arglist__4131))));
      return G__4130__delegate.call(this, f, c1, c2, c3, colls)
    };
    return G__4130
  }();
  map = function(f, c1, c2, c3, var_args) {
    var colls = var_args;
    switch(arguments.length) {
      case 2:
        return map__4125.call(this, f, c1);
      case 3:
        return map__4126.call(this, f, c1, c2);
      case 4:
        return map__4127.call(this, f, c1, c2, c3);
      default:
        return map__4128.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  map.cljs$lang$maxFixedArity = 4;
  map.cljs$lang$applyTo = map__4128.cljs$lang$applyTo;
  return map
}();
cljs.core.take = function take(n, coll) {
  return new cljs.core.LazySeq(null, false, function() {
    if(cljs.core.truth_(n > 0)) {
      var temp__3974__auto____4132 = cljs.core.seq.call(null, coll);
      if(cljs.core.truth_(temp__3974__auto____4132)) {
        var s__4133 = temp__3974__auto____4132;
        return cljs.core.cons.call(null, cljs.core.first.call(null, s__4133), take.call(null, n - 1, cljs.core.rest.call(null, s__4133)))
      }else {
        return null
      }
    }else {
      return null
    }
  })
};
cljs.core.drop = function drop(n, coll) {
  var step__4136 = function(n, coll) {
    while(true) {
      var s__4134 = cljs.core.seq.call(null, coll);
      if(cljs.core.truth_(function() {
        var and__3822__auto____4135 = n > 0;
        if(cljs.core.truth_(and__3822__auto____4135)) {
          return s__4134
        }else {
          return and__3822__auto____4135
        }
      }())) {
        var G__4137 = n - 1;
        var G__4138 = cljs.core.rest.call(null, s__4134);
        n = G__4137;
        coll = G__4138;
        continue
      }else {
        return s__4134
      }
      break
    }
  };
  return new cljs.core.LazySeq(null, false, function() {
    return step__4136.call(null, n, coll)
  })
};
cljs.core.drop_last = function() {
  var drop_last = null;
  var drop_last__4139 = function(s) {
    return drop_last.call(null, 1, s)
  };
  var drop_last__4140 = function(n, s) {
    return cljs.core.map.call(null, function(x, _) {
      return x
    }, s, cljs.core.drop.call(null, n, s))
  };
  drop_last = function(n, s) {
    switch(arguments.length) {
      case 1:
        return drop_last__4139.call(this, n);
      case 2:
        return drop_last__4140.call(this, n, s)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return drop_last
}();
cljs.core.take_last = function take_last(n, coll) {
  var s__4142 = cljs.core.seq.call(null, coll);
  var lead__4143 = cljs.core.seq.call(null, cljs.core.drop.call(null, n, coll));
  while(true) {
    if(cljs.core.truth_(lead__4143)) {
      var G__4144 = cljs.core.next.call(null, s__4142);
      var G__4145 = cljs.core.next.call(null, lead__4143);
      s__4142 = G__4144;
      lead__4143 = G__4145;
      continue
    }else {
      return s__4142
    }
    break
  }
};
cljs.core.drop_while = function drop_while(pred, coll) {
  var step__4148 = function(pred, coll) {
    while(true) {
      var s__4146 = cljs.core.seq.call(null, coll);
      if(cljs.core.truth_(function() {
        var and__3822__auto____4147 = s__4146;
        if(cljs.core.truth_(and__3822__auto____4147)) {
          return pred.call(null, cljs.core.first.call(null, s__4146))
        }else {
          return and__3822__auto____4147
        }
      }())) {
        var G__4149 = pred;
        var G__4150 = cljs.core.rest.call(null, s__4146);
        pred = G__4149;
        coll = G__4150;
        continue
      }else {
        return s__4146
      }
      break
    }
  };
  return new cljs.core.LazySeq(null, false, function() {
    return step__4148.call(null, pred, coll)
  })
};
cljs.core.cycle = function cycle(coll) {
  return new cljs.core.LazySeq(null, false, function() {
    var temp__3974__auto____4151 = cljs.core.seq.call(null, coll);
    if(cljs.core.truth_(temp__3974__auto____4151)) {
      var s__4152 = temp__3974__auto____4151;
      return cljs.core.concat.call(null, s__4152, cycle.call(null, s__4152))
    }else {
      return null
    }
  })
};
cljs.core.split_at = function split_at(n, coll) {
  return cljs.core.PersistentVector.fromArray([cljs.core.take.call(null, n, coll), cljs.core.drop.call(null, n, coll)])
};
cljs.core.repeat = function() {
  var repeat = null;
  var repeat__4153 = function(x) {
    return new cljs.core.LazySeq(null, false, function() {
      return cljs.core.cons.call(null, x, repeat.call(null, x))
    })
  };
  var repeat__4154 = function(n, x) {
    return cljs.core.take.call(null, n, repeat.call(null, x))
  };
  repeat = function(n, x) {
    switch(arguments.length) {
      case 1:
        return repeat__4153.call(this, n);
      case 2:
        return repeat__4154.call(this, n, x)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return repeat
}();
cljs.core.replicate = function replicate(n, x) {
  return cljs.core.take.call(null, n, cljs.core.repeat.call(null, x))
};
cljs.core.repeatedly = function() {
  var repeatedly = null;
  var repeatedly__4156 = function(f) {
    return new cljs.core.LazySeq(null, false, function() {
      return cljs.core.cons.call(null, f.call(null), repeatedly.call(null, f))
    })
  };
  var repeatedly__4157 = function(n, f) {
    return cljs.core.take.call(null, n, repeatedly.call(null, f))
  };
  repeatedly = function(n, f) {
    switch(arguments.length) {
      case 1:
        return repeatedly__4156.call(this, n);
      case 2:
        return repeatedly__4157.call(this, n, f)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return repeatedly
}();
cljs.core.iterate = function iterate(f, x) {
  return cljs.core.cons.call(null, x, new cljs.core.LazySeq(null, false, function() {
    return iterate.call(null, f, f.call(null, x))
  }))
};
cljs.core.interleave = function() {
  var interleave = null;
  var interleave__4163 = function(c1, c2) {
    return new cljs.core.LazySeq(null, false, function() {
      var s1__4159 = cljs.core.seq.call(null, c1);
      var s2__4160 = cljs.core.seq.call(null, c2);
      if(cljs.core.truth_(function() {
        var and__3822__auto____4161 = s1__4159;
        if(cljs.core.truth_(and__3822__auto____4161)) {
          return s2__4160
        }else {
          return and__3822__auto____4161
        }
      }())) {
        return cljs.core.cons.call(null, cljs.core.first.call(null, s1__4159), cljs.core.cons.call(null, cljs.core.first.call(null, s2__4160), interleave.call(null, cljs.core.rest.call(null, s1__4159), cljs.core.rest.call(null, s2__4160))))
      }else {
        return null
      }
    })
  };
  var interleave__4164 = function() {
    var G__4166__delegate = function(c1, c2, colls) {
      return new cljs.core.LazySeq(null, false, function() {
        var ss__4162 = cljs.core.map.call(null, cljs.core.seq, cljs.core.conj.call(null, colls, c2, c1));
        if(cljs.core.truth_(cljs.core.every_QMARK_.call(null, cljs.core.identity, ss__4162))) {
          return cljs.core.concat.call(null, cljs.core.map.call(null, cljs.core.first, ss__4162), cljs.core.apply.call(null, interleave, cljs.core.map.call(null, cljs.core.rest, ss__4162)))
        }else {
          return null
        }
      })
    };
    var G__4166 = function(c1, c2, var_args) {
      var colls = null;
      if(goog.isDef(var_args)) {
        colls = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__4166__delegate.call(this, c1, c2, colls)
    };
    G__4166.cljs$lang$maxFixedArity = 2;
    G__4166.cljs$lang$applyTo = function(arglist__4167) {
      var c1 = cljs.core.first(arglist__4167);
      var c2 = cljs.core.first(cljs.core.next(arglist__4167));
      var colls = cljs.core.rest(cljs.core.next(arglist__4167));
      return G__4166__delegate.call(this, c1, c2, colls)
    };
    return G__4166
  }();
  interleave = function(c1, c2, var_args) {
    var colls = var_args;
    switch(arguments.length) {
      case 2:
        return interleave__4163.call(this, c1, c2);
      default:
        return interleave__4164.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  interleave.cljs$lang$maxFixedArity = 2;
  interleave.cljs$lang$applyTo = interleave__4164.cljs$lang$applyTo;
  return interleave
}();
cljs.core.interpose = function interpose(sep, coll) {
  return cljs.core.drop.call(null, 1, cljs.core.interleave.call(null, cljs.core.repeat.call(null, sep), coll))
};
cljs.core.flatten1 = function flatten1(colls) {
  var cat__4170 = function cat(coll, colls) {
    return new cljs.core.LazySeq(null, false, function() {
      var temp__3971__auto____4168 = cljs.core.seq.call(null, coll);
      if(cljs.core.truth_(temp__3971__auto____4168)) {
        var coll__4169 = temp__3971__auto____4168;
        return cljs.core.cons.call(null, cljs.core.first.call(null, coll__4169), cat.call(null, cljs.core.rest.call(null, coll__4169), colls))
      }else {
        if(cljs.core.truth_(cljs.core.seq.call(null, colls))) {
          return cat.call(null, cljs.core.first.call(null, colls), cljs.core.rest.call(null, colls))
        }else {
          return null
        }
      }
    })
  };
  return cat__4170.call(null, null, colls)
};
cljs.core.mapcat = function() {
  var mapcat = null;
  var mapcat__4171 = function(f, coll) {
    return cljs.core.flatten1.call(null, cljs.core.map.call(null, f, coll))
  };
  var mapcat__4172 = function() {
    var G__4174__delegate = function(f, coll, colls) {
      return cljs.core.flatten1.call(null, cljs.core.apply.call(null, cljs.core.map, f, coll, colls))
    };
    var G__4174 = function(f, coll, var_args) {
      var colls = null;
      if(goog.isDef(var_args)) {
        colls = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
      }
      return G__4174__delegate.call(this, f, coll, colls)
    };
    G__4174.cljs$lang$maxFixedArity = 2;
    G__4174.cljs$lang$applyTo = function(arglist__4175) {
      var f = cljs.core.first(arglist__4175);
      var coll = cljs.core.first(cljs.core.next(arglist__4175));
      var colls = cljs.core.rest(cljs.core.next(arglist__4175));
      return G__4174__delegate.call(this, f, coll, colls)
    };
    return G__4174
  }();
  mapcat = function(f, coll, var_args) {
    var colls = var_args;
    switch(arguments.length) {
      case 2:
        return mapcat__4171.call(this, f, coll);
      default:
        return mapcat__4172.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  mapcat.cljs$lang$maxFixedArity = 2;
  mapcat.cljs$lang$applyTo = mapcat__4172.cljs$lang$applyTo;
  return mapcat
}();
cljs.core.filter = function filter(pred, coll) {
  return new cljs.core.LazySeq(null, false, function() {
    var temp__3974__auto____4176 = cljs.core.seq.call(null, coll);
    if(cljs.core.truth_(temp__3974__auto____4176)) {
      var s__4177 = temp__3974__auto____4176;
      var f__4178 = cljs.core.first.call(null, s__4177);
      var r__4179 = cljs.core.rest.call(null, s__4177);
      if(cljs.core.truth_(pred.call(null, f__4178))) {
        return cljs.core.cons.call(null, f__4178, filter.call(null, pred, r__4179))
      }else {
        return filter.call(null, pred, r__4179)
      }
    }else {
      return null
    }
  })
};
cljs.core.remove = function remove(pred, coll) {
  return cljs.core.filter.call(null, cljs.core.complement.call(null, pred), coll)
};
cljs.core.tree_seq = function tree_seq(branch_QMARK_, children, root) {
  var walk__4181 = function walk(node) {
    return new cljs.core.LazySeq(null, false, function() {
      return cljs.core.cons.call(null, node, cljs.core.truth_(branch_QMARK_.call(null, node)) ? cljs.core.mapcat.call(null, walk, children.call(null, node)) : null)
    })
  };
  return walk__4181.call(null, root)
};
cljs.core.flatten = function flatten(x) {
  return cljs.core.filter.call(null, function(p1__4180_SHARP_) {
    return cljs.core.not.call(null, cljs.core.sequential_QMARK_.call(null, p1__4180_SHARP_))
  }, cljs.core.rest.call(null, cljs.core.tree_seq.call(null, cljs.core.sequential_QMARK_, cljs.core.seq, x)))
};
cljs.core.into = function into(to, from) {
  return cljs.core.reduce.call(null, cljs.core._conj, to, from)
};
cljs.core.partition = function() {
  var partition = null;
  var partition__4188 = function(n, coll) {
    return partition.call(null, n, n, coll)
  };
  var partition__4189 = function(n, step, coll) {
    return new cljs.core.LazySeq(null, false, function() {
      var temp__3974__auto____4182 = cljs.core.seq.call(null, coll);
      if(cljs.core.truth_(temp__3974__auto____4182)) {
        var s__4183 = temp__3974__auto____4182;
        var p__4184 = cljs.core.take.call(null, n, s__4183);
        if(cljs.core.truth_(cljs.core._EQ_.call(null, n, cljs.core.count.call(null, p__4184)))) {
          return cljs.core.cons.call(null, p__4184, partition.call(null, n, step, cljs.core.drop.call(null, step, s__4183)))
        }else {
          return null
        }
      }else {
        return null
      }
    })
  };
  var partition__4190 = function(n, step, pad, coll) {
    return new cljs.core.LazySeq(null, false, function() {
      var temp__3974__auto____4185 = cljs.core.seq.call(null, coll);
      if(cljs.core.truth_(temp__3974__auto____4185)) {
        var s__4186 = temp__3974__auto____4185;
        var p__4187 = cljs.core.take.call(null, n, s__4186);
        if(cljs.core.truth_(cljs.core._EQ_.call(null, n, cljs.core.count.call(null, p__4187)))) {
          return cljs.core.cons.call(null, p__4187, partition.call(null, n, step, pad, cljs.core.drop.call(null, step, s__4186)))
        }else {
          return cljs.core.list.call(null, cljs.core.take.call(null, n, cljs.core.concat.call(null, p__4187, pad)))
        }
      }else {
        return null
      }
    })
  };
  partition = function(n, step, pad, coll) {
    switch(arguments.length) {
      case 2:
        return partition__4188.call(this, n, step);
      case 3:
        return partition__4189.call(this, n, step, pad);
      case 4:
        return partition__4190.call(this, n, step, pad, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return partition
}();
cljs.core.get_in = function() {
  var get_in = null;
  var get_in__4196 = function(m, ks) {
    return cljs.core.reduce.call(null, cljs.core.get, m, ks)
  };
  var get_in__4197 = function(m, ks, not_found) {
    var sentinel__4192 = cljs.core.lookup_sentinel;
    var m__4193 = m;
    var ks__4194 = cljs.core.seq.call(null, ks);
    while(true) {
      if(cljs.core.truth_(ks__4194)) {
        var m__4195 = cljs.core.get.call(null, m__4193, cljs.core.first.call(null, ks__4194), sentinel__4192);
        if(cljs.core.truth_(sentinel__4192 === m__4195)) {
          return not_found
        }else {
          var G__4199 = sentinel__4192;
          var G__4200 = m__4195;
          var G__4201 = cljs.core.next.call(null, ks__4194);
          sentinel__4192 = G__4199;
          m__4193 = G__4200;
          ks__4194 = G__4201;
          continue
        }
      }else {
        return m__4193
      }
      break
    }
  };
  get_in = function(m, ks, not_found) {
    switch(arguments.length) {
      case 2:
        return get_in__4196.call(this, m, ks);
      case 3:
        return get_in__4197.call(this, m, ks, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return get_in
}();
cljs.core.assoc_in = function assoc_in(m, p__4202, v) {
  var vec__4203__4204 = p__4202;
  var k__4205 = cljs.core.nth.call(null, vec__4203__4204, 0, null);
  var ks__4206 = cljs.core.nthnext.call(null, vec__4203__4204, 1);
  if(cljs.core.truth_(ks__4206)) {
    return cljs.core.assoc.call(null, m, k__4205, assoc_in.call(null, cljs.core.get.call(null, m, k__4205), ks__4206, v))
  }else {
    return cljs.core.assoc.call(null, m, k__4205, v)
  }
};
cljs.core.update_in = function() {
  var update_in__delegate = function(m, p__4207, f, args) {
    var vec__4208__4209 = p__4207;
    var k__4210 = cljs.core.nth.call(null, vec__4208__4209, 0, null);
    var ks__4211 = cljs.core.nthnext.call(null, vec__4208__4209, 1);
    if(cljs.core.truth_(ks__4211)) {
      return cljs.core.assoc.call(null, m, k__4210, cljs.core.apply.call(null, update_in, cljs.core.get.call(null, m, k__4210), ks__4211, f, args))
    }else {
      return cljs.core.assoc.call(null, m, k__4210, cljs.core.apply.call(null, f, cljs.core.get.call(null, m, k__4210), args))
    }
  };
  var update_in = function(m, p__4207, f, var_args) {
    var args = null;
    if(goog.isDef(var_args)) {
      args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
    }
    return update_in__delegate.call(this, m, p__4207, f, args)
  };
  update_in.cljs$lang$maxFixedArity = 3;
  update_in.cljs$lang$applyTo = function(arglist__4212) {
    var m = cljs.core.first(arglist__4212);
    var p__4207 = cljs.core.first(cljs.core.next(arglist__4212));
    var f = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4212)));
    var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__4212)));
    return update_in__delegate.call(this, m, p__4207, f, args)
  };
  return update_in
}();
cljs.core.Vector = function(meta, array) {
  this.meta = meta;
  this.array = array
};
cljs.core.Vector.cljs$core$IPrintable$_pr_seq = function(this__367__auto__) {
  return cljs.core.list.call(null, "cljs.core.Vector")
};
cljs.core.Vector.prototype.cljs$core$IHash$ = true;
cljs.core.Vector.prototype.cljs$core$IHash$_hash = function(coll) {
  var this__4213 = this;
  return cljs.core.hash_coll.call(null, coll)
};
cljs.core.Vector.prototype.cljs$core$ILookup$ = true;
cljs.core.Vector.prototype.cljs$core$ILookup$_lookup = function() {
  var G__4246 = null;
  var G__4246__4247 = function(coll, k) {
    var this__4214 = this;
    return cljs.core._nth.call(null, coll, k, null)
  };
  var G__4246__4248 = function(coll, k, not_found) {
    var this__4215 = this;
    return cljs.core._nth.call(null, coll, k, not_found)
  };
  G__4246 = function(coll, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__4246__4247.call(this, coll, k);
      case 3:
        return G__4246__4248.call(this, coll, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__4246
}();
cljs.core.Vector.prototype.cljs$core$IAssociative$ = true;
cljs.core.Vector.prototype.cljs$core$IAssociative$_assoc = function(coll, k, v) {
  var this__4216 = this;
  var new_array__4217 = cljs.core.aclone.call(null, this__4216.array);
  new_array__4217[k] = v;
  return new cljs.core.Vector(this__4216.meta, new_array__4217)
};
cljs.core.Vector.prototype.cljs$core$IFn$ = true;
cljs.core.Vector.prototype.call = function() {
  var G__4250 = null;
  var G__4250__4251 = function(tsym4218, k) {
    var this__4220 = this;
    var tsym4218__4221 = this;
    var coll__4222 = tsym4218__4221;
    return cljs.core._lookup.call(null, coll__4222, k)
  };
  var G__4250__4252 = function(tsym4219, k, not_found) {
    var this__4223 = this;
    var tsym4219__4224 = this;
    var coll__4225 = tsym4219__4224;
    return cljs.core._lookup.call(null, coll__4225, k, not_found)
  };
  G__4250 = function(tsym4219, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__4250__4251.call(this, tsym4219, k);
      case 3:
        return G__4250__4252.call(this, tsym4219, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__4250
}();
cljs.core.Vector.prototype.cljs$core$ISequential$ = true;
cljs.core.Vector.prototype.cljs$core$ICollection$ = true;
cljs.core.Vector.prototype.cljs$core$ICollection$_conj = function(coll, o) {
  var this__4226 = this;
  var new_array__4227 = cljs.core.aclone.call(null, this__4226.array);
  new_array__4227.push(o);
  return new cljs.core.Vector(this__4226.meta, new_array__4227)
};
cljs.core.Vector.prototype.cljs$core$IReduce$ = true;
cljs.core.Vector.prototype.cljs$core$IReduce$_reduce = function() {
  var G__4254 = null;
  var G__4254__4255 = function(v, f) {
    var this__4228 = this;
    return cljs.core.ci_reduce.call(null, this__4228.array, f)
  };
  var G__4254__4256 = function(v, f, start) {
    var this__4229 = this;
    return cljs.core.ci_reduce.call(null, this__4229.array, f, start)
  };
  G__4254 = function(v, f, start) {
    switch(arguments.length) {
      case 2:
        return G__4254__4255.call(this, v, f);
      case 3:
        return G__4254__4256.call(this, v, f, start)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__4254
}();
cljs.core.Vector.prototype.cljs$core$ISeqable$ = true;
cljs.core.Vector.prototype.cljs$core$ISeqable$_seq = function(coll) {
  var this__4230 = this;
  if(cljs.core.truth_(this__4230.array.length > 0)) {
    var vector_seq__4231 = function vector_seq(i) {
      return new cljs.core.LazySeq(null, false, function() {
        if(cljs.core.truth_(i < this__4230.array.length)) {
          return cljs.core.cons.call(null, this__4230.array[i], vector_seq.call(null, i + 1))
        }else {
          return null
        }
      })
    };
    return vector_seq__4231.call(null, 0)
  }else {
    return null
  }
};
cljs.core.Vector.prototype.cljs$core$ICounted$ = true;
cljs.core.Vector.prototype.cljs$core$ICounted$_count = function(coll) {
  var this__4232 = this;
  return this__4232.array.length
};
cljs.core.Vector.prototype.cljs$core$IStack$ = true;
cljs.core.Vector.prototype.cljs$core$IStack$_peek = function(coll) {
  var this__4233 = this;
  var count__4234 = this__4233.array.length;
  if(cljs.core.truth_(count__4234 > 0)) {
    return this__4233.array[count__4234 - 1]
  }else {
    return null
  }
};
cljs.core.Vector.prototype.cljs$core$IStack$_pop = function(coll) {
  var this__4235 = this;
  if(cljs.core.truth_(this__4235.array.length > 0)) {
    var new_array__4236 = cljs.core.aclone.call(null, this__4235.array);
    new_array__4236.pop();
    return new cljs.core.Vector(this__4235.meta, new_array__4236)
  }else {
    throw new Error("Can't pop empty vector");
  }
};
cljs.core.Vector.prototype.cljs$core$IVector$ = true;
cljs.core.Vector.prototype.cljs$core$IVector$_assoc_n = function(coll, n, val) {
  var this__4237 = this;
  return cljs.core._assoc.call(null, coll, n, val)
};
cljs.core.Vector.prototype.cljs$core$IEquiv$ = true;
cljs.core.Vector.prototype.cljs$core$IEquiv$_equiv = function(coll, other) {
  var this__4238 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.Vector.prototype.cljs$core$IWithMeta$ = true;
cljs.core.Vector.prototype.cljs$core$IWithMeta$_with_meta = function(coll, meta) {
  var this__4239 = this;
  return new cljs.core.Vector(meta, this__4239.array)
};
cljs.core.Vector.prototype.cljs$core$IMeta$ = true;
cljs.core.Vector.prototype.cljs$core$IMeta$_meta = function(coll) {
  var this__4240 = this;
  return this__4240.meta
};
cljs.core.Vector.prototype.cljs$core$IIndexed$ = true;
cljs.core.Vector.prototype.cljs$core$IIndexed$_nth = function() {
  var G__4258 = null;
  var G__4258__4259 = function(coll, n) {
    var this__4241 = this;
    if(cljs.core.truth_(function() {
      var and__3822__auto____4242 = 0 <= n;
      if(cljs.core.truth_(and__3822__auto____4242)) {
        return n < this__4241.array.length
      }else {
        return and__3822__auto____4242
      }
    }())) {
      return this__4241.array[n]
    }else {
      return null
    }
  };
  var G__4258__4260 = function(coll, n, not_found) {
    var this__4243 = this;
    if(cljs.core.truth_(function() {
      var and__3822__auto____4244 = 0 <= n;
      if(cljs.core.truth_(and__3822__auto____4244)) {
        return n < this__4243.array.length
      }else {
        return and__3822__auto____4244
      }
    }())) {
      return this__4243.array[n]
    }else {
      return not_found
    }
  };
  G__4258 = function(coll, n, not_found) {
    switch(arguments.length) {
      case 2:
        return G__4258__4259.call(this, coll, n);
      case 3:
        return G__4258__4260.call(this, coll, n, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__4258
}();
cljs.core.Vector.prototype.cljs$core$IEmptyableCollection$ = true;
cljs.core.Vector.prototype.cljs$core$IEmptyableCollection$_empty = function(coll) {
  var this__4245 = this;
  return cljs.core.with_meta.call(null, cljs.core.Vector.EMPTY, this__4245.meta)
};
cljs.core.Vector;
cljs.core.Vector.EMPTY = new cljs.core.Vector(null, []);
cljs.core.Vector.fromArray = function(xs) {
  return new cljs.core.Vector(null, xs)
};
cljs.core.tail_off = function tail_off(pv) {
  var cnt__4262 = pv.cnt;
  if(cljs.core.truth_(cnt__4262 < 32)) {
    return 0
  }else {
    return cnt__4262 - 1 >> 5 << 5
  }
};
cljs.core.new_path = function new_path(level, node) {
  var ll__4263 = level;
  var ret__4264 = node;
  while(true) {
    if(cljs.core.truth_(cljs.core._EQ_.call(null, 0, ll__4263))) {
      return ret__4264
    }else {
      var embed__4265 = ret__4264;
      var r__4266 = cljs.core.aclone.call(null, cljs.core.PersistentVector.EMPTY_NODE);
      var ___4267 = r__4266[0] = embed__4265;
      var G__4268 = ll__4263 - 5;
      var G__4269 = r__4266;
      ll__4263 = G__4268;
      ret__4264 = G__4269;
      continue
    }
    break
  }
};
cljs.core.push_tail = function push_tail(pv, level, parent, tailnode) {
  var ret__4270 = cljs.core.aclone.call(null, parent);
  var subidx__4271 = pv.cnt - 1 >> level & 31;
  if(cljs.core.truth_(cljs.core._EQ_.call(null, 5, level))) {
    ret__4270[subidx__4271] = tailnode;
    return ret__4270
  }else {
    var temp__3971__auto____4272 = parent[subidx__4271];
    if(cljs.core.truth_(temp__3971__auto____4272)) {
      var child__4273 = temp__3971__auto____4272;
      var node_to_insert__4274 = push_tail.call(null, pv, level - 5, child__4273, tailnode);
      var ___4275 = ret__4270[subidx__4271] = node_to_insert__4274;
      return ret__4270
    }else {
      var node_to_insert__4276 = cljs.core.new_path.call(null, level - 5, tailnode);
      var ___4277 = ret__4270[subidx__4271] = node_to_insert__4276;
      return ret__4270
    }
  }
};
cljs.core.array_for = function array_for(pv, i) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____4278 = 0 <= i;
    if(cljs.core.truth_(and__3822__auto____4278)) {
      return i < pv.cnt
    }else {
      return and__3822__auto____4278
    }
  }())) {
    if(cljs.core.truth_(i >= cljs.core.tail_off.call(null, pv))) {
      return pv.tail
    }else {
      var node__4279 = pv.root;
      var level__4280 = pv.shift;
      while(true) {
        if(cljs.core.truth_(level__4280 > 0)) {
          var G__4281 = node__4279[i >> level__4280 & 31];
          var G__4282 = level__4280 - 5;
          node__4279 = G__4281;
          level__4280 = G__4282;
          continue
        }else {
          return node__4279
        }
        break
      }
    }
  }else {
    throw new Error(cljs.core.str.call(null, "No item ", i, " in vector of length ", pv.cnt));
  }
};
cljs.core.do_assoc = function do_assoc(pv, level, node, i, val) {
  var ret__4283 = cljs.core.aclone.call(null, node);
  if(cljs.core.truth_(level === 0)) {
    ret__4283[i & 31] = val;
    return ret__4283
  }else {
    var subidx__4284 = i >> level & 31;
    var ___4285 = ret__4283[subidx__4284] = do_assoc.call(null, pv, level - 5, node[subidx__4284], i, val);
    return ret__4283
  }
};
cljs.core.pop_tail = function pop_tail(pv, level, node) {
  var subidx__4286 = pv.cnt - 2 >> level & 31;
  if(cljs.core.truth_(level > 5)) {
    var new_child__4287 = pop_tail.call(null, pv, level - 5, node[subidx__4286]);
    if(cljs.core.truth_(function() {
      var and__3822__auto____4288 = new_child__4287 === null;
      if(cljs.core.truth_(and__3822__auto____4288)) {
        return subidx__4286 === 0
      }else {
        return and__3822__auto____4288
      }
    }())) {
      return null
    }else {
      var ret__4289 = cljs.core.aclone.call(null, node);
      var ___4290 = ret__4289[subidx__4286] = new_child__4287;
      return ret__4289
    }
  }else {
    if(cljs.core.truth_(subidx__4286 === 0)) {
      return null
    }else {
      if(cljs.core.truth_("\ufdd0'else")) {
        var ret__4291 = cljs.core.aclone.call(null, node);
        var ___4292 = ret__4291[subidx__4286] = null;
        return ret__4291
      }else {
        return null
      }
    }
  }
};
cljs.core.PersistentVector = function(meta, cnt, shift, root, tail) {
  this.meta = meta;
  this.cnt = cnt;
  this.shift = shift;
  this.root = root;
  this.tail = tail
};
cljs.core.PersistentVector.cljs$core$IPrintable$_pr_seq = function(this__367__auto__) {
  return cljs.core.list.call(null, "cljs.core.PersistentVector")
};
cljs.core.PersistentVector.prototype.cljs$core$IHash$ = true;
cljs.core.PersistentVector.prototype.cljs$core$IHash$_hash = function(coll) {
  var this__4293 = this;
  return cljs.core.hash_coll.call(null, coll)
};
cljs.core.PersistentVector.prototype.cljs$core$ILookup$ = true;
cljs.core.PersistentVector.prototype.cljs$core$ILookup$_lookup = function() {
  var G__4333 = null;
  var G__4333__4334 = function(coll, k) {
    var this__4294 = this;
    return cljs.core._nth.call(null, coll, k, null)
  };
  var G__4333__4335 = function(coll, k, not_found) {
    var this__4295 = this;
    return cljs.core._nth.call(null, coll, k, not_found)
  };
  G__4333 = function(coll, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__4333__4334.call(this, coll, k);
      case 3:
        return G__4333__4335.call(this, coll, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__4333
}();
cljs.core.PersistentVector.prototype.cljs$core$IAssociative$ = true;
cljs.core.PersistentVector.prototype.cljs$core$IAssociative$_assoc = function(coll, k, v) {
  var this__4296 = this;
  if(cljs.core.truth_(function() {
    var and__3822__auto____4297 = 0 <= k;
    if(cljs.core.truth_(and__3822__auto____4297)) {
      return k < this__4296.cnt
    }else {
      return and__3822__auto____4297
    }
  }())) {
    if(cljs.core.truth_(cljs.core.tail_off.call(null, coll) <= k)) {
      var new_tail__4298 = cljs.core.aclone.call(null, this__4296.tail);
      new_tail__4298[k & 31] = v;
      return new cljs.core.PersistentVector(this__4296.meta, this__4296.cnt, this__4296.shift, this__4296.root, new_tail__4298)
    }else {
      return new cljs.core.PersistentVector(this__4296.meta, this__4296.cnt, this__4296.shift, cljs.core.do_assoc.call(null, coll, this__4296.shift, this__4296.root, k, v), this__4296.tail)
    }
  }else {
    if(cljs.core.truth_(cljs.core._EQ_.call(null, k, this__4296.cnt))) {
      return cljs.core._conj.call(null, coll, v)
    }else {
      if(cljs.core.truth_("\ufdd0'else")) {
        throw new Error(cljs.core.str.call(null, "Index ", k, " out of bounds  [0,", this__4296.cnt, "]"));
      }else {
        return null
      }
    }
  }
};
cljs.core.PersistentVector.prototype.cljs$core$IFn$ = true;
cljs.core.PersistentVector.prototype.call = function() {
  var G__4337 = null;
  var G__4337__4338 = function(tsym4299, k) {
    var this__4301 = this;
    var tsym4299__4302 = this;
    var coll__4303 = tsym4299__4302;
    return cljs.core._lookup.call(null, coll__4303, k)
  };
  var G__4337__4339 = function(tsym4300, k, not_found) {
    var this__4304 = this;
    var tsym4300__4305 = this;
    var coll__4306 = tsym4300__4305;
    return cljs.core._lookup.call(null, coll__4306, k, not_found)
  };
  G__4337 = function(tsym4300, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__4337__4338.call(this, tsym4300, k);
      case 3:
        return G__4337__4339.call(this, tsym4300, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__4337
}();
cljs.core.PersistentVector.prototype.cljs$core$ISequential$ = true;
cljs.core.PersistentVector.prototype.cljs$core$ICollection$ = true;
cljs.core.PersistentVector.prototype.cljs$core$ICollection$_conj = function(coll, o) {
  var this__4307 = this;
  if(cljs.core.truth_(this__4307.cnt - cljs.core.tail_off.call(null, coll) < 32)) {
    var new_tail__4308 = cljs.core.aclone.call(null, this__4307.tail);
    new_tail__4308.push(o);
    return new cljs.core.PersistentVector(this__4307.meta, this__4307.cnt + 1, this__4307.shift, this__4307.root, new_tail__4308)
  }else {
    var root_overflow_QMARK___4309 = this__4307.cnt >> 5 > 1 << this__4307.shift;
    var new_shift__4310 = cljs.core.truth_(root_overflow_QMARK___4309) ? this__4307.shift + 5 : this__4307.shift;
    var new_root__4312 = cljs.core.truth_(root_overflow_QMARK___4309) ? function() {
      var n_r__4311 = cljs.core.aclone.call(null, cljs.core.PersistentVector.EMPTY_NODE);
      n_r__4311[0] = this__4307.root;
      n_r__4311[1] = cljs.core.new_path.call(null, this__4307.shift, this__4307.tail);
      return n_r__4311
    }() : cljs.core.push_tail.call(null, coll, this__4307.shift, this__4307.root, this__4307.tail);
    return new cljs.core.PersistentVector(this__4307.meta, this__4307.cnt + 1, new_shift__4310, new_root__4312, [o])
  }
};
cljs.core.PersistentVector.prototype.cljs$core$IReduce$ = true;
cljs.core.PersistentVector.prototype.cljs$core$IReduce$_reduce = function() {
  var G__4341 = null;
  var G__4341__4342 = function(v, f) {
    var this__4313 = this;
    return cljs.core.ci_reduce.call(null, v, f)
  };
  var G__4341__4343 = function(v, f, start) {
    var this__4314 = this;
    return cljs.core.ci_reduce.call(null, v, f, start)
  };
  G__4341 = function(v, f, start) {
    switch(arguments.length) {
      case 2:
        return G__4341__4342.call(this, v, f);
      case 3:
        return G__4341__4343.call(this, v, f, start)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__4341
}();
cljs.core.PersistentVector.prototype.cljs$core$ISeqable$ = true;
cljs.core.PersistentVector.prototype.cljs$core$ISeqable$_seq = function(coll) {
  var this__4315 = this;
  if(cljs.core.truth_(this__4315.cnt > 0)) {
    var vector_seq__4316 = function vector_seq(i) {
      return new cljs.core.LazySeq(null, false, function() {
        if(cljs.core.truth_(i < this__4315.cnt)) {
          return cljs.core.cons.call(null, cljs.core._nth.call(null, coll, i), vector_seq.call(null, i + 1))
        }else {
          return null
        }
      })
    };
    return vector_seq__4316.call(null, 0)
  }else {
    return null
  }
};
cljs.core.PersistentVector.prototype.cljs$core$ICounted$ = true;
cljs.core.PersistentVector.prototype.cljs$core$ICounted$_count = function(coll) {
  var this__4317 = this;
  return this__4317.cnt
};
cljs.core.PersistentVector.prototype.cljs$core$IStack$ = true;
cljs.core.PersistentVector.prototype.cljs$core$IStack$_peek = function(coll) {
  var this__4318 = this;
  if(cljs.core.truth_(this__4318.cnt > 0)) {
    return cljs.core._nth.call(null, coll, this__4318.cnt - 1)
  }else {
    return null
  }
};
cljs.core.PersistentVector.prototype.cljs$core$IStack$_pop = function(coll) {
  var this__4319 = this;
  if(cljs.core.truth_(this__4319.cnt === 0)) {
    throw new Error("Can't pop empty vector");
  }else {
    if(cljs.core.truth_(cljs.core._EQ_.call(null, 1, this__4319.cnt))) {
      return cljs.core._with_meta.call(null, cljs.core.PersistentVector.EMPTY, this__4319.meta)
    }else {
      if(cljs.core.truth_(1 < this__4319.cnt - cljs.core.tail_off.call(null, coll))) {
        return new cljs.core.PersistentVector(this__4319.meta, this__4319.cnt - 1, this__4319.shift, this__4319.root, cljs.core.aclone.call(null, this__4319.tail))
      }else {
        if(cljs.core.truth_("\ufdd0'else")) {
          var new_tail__4320 = cljs.core.array_for.call(null, coll, this__4319.cnt - 2);
          var nr__4321 = cljs.core.pop_tail.call(null, this__4319.shift, this__4319.root);
          var new_root__4322 = cljs.core.truth_(nr__4321 === null) ? cljs.core.PersistentVector.EMPTY_NODE : nr__4321;
          var cnt_1__4323 = this__4319.cnt - 1;
          if(cljs.core.truth_(function() {
            var and__3822__auto____4324 = 5 < this__4319.shift;
            if(cljs.core.truth_(and__3822__auto____4324)) {
              return new_root__4322[1] === null
            }else {
              return and__3822__auto____4324
            }
          }())) {
            return new cljs.core.PersistentVector(this__4319.meta, cnt_1__4323, this__4319.shift - 5, new_root__4322[0], new_tail__4320)
          }else {
            return new cljs.core.PersistentVector(this__4319.meta, cnt_1__4323, this__4319.shift, new_root__4322, new_tail__4320)
          }
        }else {
          return null
        }
      }
    }
  }
};
cljs.core.PersistentVector.prototype.cljs$core$IVector$ = true;
cljs.core.PersistentVector.prototype.cljs$core$IVector$_assoc_n = function(coll, n, val) {
  var this__4325 = this;
  return cljs.core._assoc.call(null, coll, n, val)
};
cljs.core.PersistentVector.prototype.cljs$core$IEquiv$ = true;
cljs.core.PersistentVector.prototype.cljs$core$IEquiv$_equiv = function(coll, other) {
  var this__4326 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.PersistentVector.prototype.cljs$core$IWithMeta$ = true;
cljs.core.PersistentVector.prototype.cljs$core$IWithMeta$_with_meta = function(coll, meta) {
  var this__4327 = this;
  return new cljs.core.PersistentVector(meta, this__4327.cnt, this__4327.shift, this__4327.root, this__4327.tail)
};
cljs.core.PersistentVector.prototype.cljs$core$IMeta$ = true;
cljs.core.PersistentVector.prototype.cljs$core$IMeta$_meta = function(coll) {
  var this__4328 = this;
  return this__4328.meta
};
cljs.core.PersistentVector.prototype.cljs$core$IIndexed$ = true;
cljs.core.PersistentVector.prototype.cljs$core$IIndexed$_nth = function() {
  var G__4345 = null;
  var G__4345__4346 = function(coll, n) {
    var this__4329 = this;
    return cljs.core.array_for.call(null, coll, n)[n & 31]
  };
  var G__4345__4347 = function(coll, n, not_found) {
    var this__4330 = this;
    if(cljs.core.truth_(function() {
      var and__3822__auto____4331 = 0 <= n;
      if(cljs.core.truth_(and__3822__auto____4331)) {
        return n < this__4330.cnt
      }else {
        return and__3822__auto____4331
      }
    }())) {
      return cljs.core._nth.call(null, coll, n)
    }else {
      return not_found
    }
  };
  G__4345 = function(coll, n, not_found) {
    switch(arguments.length) {
      case 2:
        return G__4345__4346.call(this, coll, n);
      case 3:
        return G__4345__4347.call(this, coll, n, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__4345
}();
cljs.core.PersistentVector.prototype.cljs$core$IEmptyableCollection$ = true;
cljs.core.PersistentVector.prototype.cljs$core$IEmptyableCollection$_empty = function(coll) {
  var this__4332 = this;
  return cljs.core.with_meta.call(null, cljs.core.PersistentVector.EMPTY, this__4332.meta)
};
cljs.core.PersistentVector;
cljs.core.PersistentVector.EMPTY_NODE = new Array(32);
cljs.core.PersistentVector.EMPTY = new cljs.core.PersistentVector(null, 0, 5, cljs.core.PersistentVector.EMPTY_NODE, []);
cljs.core.PersistentVector.fromArray = function(xs) {
  return cljs.core.into.call(null, cljs.core.PersistentVector.EMPTY, xs)
};
cljs.core.vec = function vec(coll) {
  return cljs.core.reduce.call(null, cljs.core.conj, cljs.core.PersistentVector.EMPTY, coll)
};
cljs.core.vector = function() {
  var vector__delegate = function(args) {
    return cljs.core.vec.call(null, args)
  };
  var vector = function(var_args) {
    var args = null;
    if(goog.isDef(var_args)) {
      args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return vector__delegate.call(this, args)
  };
  vector.cljs$lang$maxFixedArity = 0;
  vector.cljs$lang$applyTo = function(arglist__4349) {
    var args = cljs.core.seq(arglist__4349);
    return vector__delegate.call(this, args)
  };
  return vector
}();
cljs.core.Subvec = function(meta, v, start, end) {
  this.meta = meta;
  this.v = v;
  this.start = start;
  this.end = end
};
cljs.core.Subvec.cljs$core$IPrintable$_pr_seq = function(this__367__auto__) {
  return cljs.core.list.call(null, "cljs.core.Subvec")
};
cljs.core.Subvec.prototype.cljs$core$IHash$ = true;
cljs.core.Subvec.prototype.cljs$core$IHash$_hash = function(coll) {
  var this__4350 = this;
  return cljs.core.hash_coll.call(null, coll)
};
cljs.core.Subvec.prototype.cljs$core$ILookup$ = true;
cljs.core.Subvec.prototype.cljs$core$ILookup$_lookup = function() {
  var G__4378 = null;
  var G__4378__4379 = function(coll, k) {
    var this__4351 = this;
    return cljs.core._nth.call(null, coll, k, null)
  };
  var G__4378__4380 = function(coll, k, not_found) {
    var this__4352 = this;
    return cljs.core._nth.call(null, coll, k, not_found)
  };
  G__4378 = function(coll, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__4378__4379.call(this, coll, k);
      case 3:
        return G__4378__4380.call(this, coll, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__4378
}();
cljs.core.Subvec.prototype.cljs$core$IAssociative$ = true;
cljs.core.Subvec.prototype.cljs$core$IAssociative$_assoc = function(coll, key, val) {
  var this__4353 = this;
  var v_pos__4354 = this__4353.start + key;
  return new cljs.core.Subvec(this__4353.meta, cljs.core._assoc.call(null, this__4353.v, v_pos__4354, val), this__4353.start, this__4353.end > v_pos__4354 + 1 ? this__4353.end : v_pos__4354 + 1)
};
cljs.core.Subvec.prototype.cljs$core$IFn$ = true;
cljs.core.Subvec.prototype.call = function() {
  var G__4382 = null;
  var G__4382__4383 = function(tsym4355, k) {
    var this__4357 = this;
    var tsym4355__4358 = this;
    var coll__4359 = tsym4355__4358;
    return cljs.core._lookup.call(null, coll__4359, k)
  };
  var G__4382__4384 = function(tsym4356, k, not_found) {
    var this__4360 = this;
    var tsym4356__4361 = this;
    var coll__4362 = tsym4356__4361;
    return cljs.core._lookup.call(null, coll__4362, k, not_found)
  };
  G__4382 = function(tsym4356, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__4382__4383.call(this, tsym4356, k);
      case 3:
        return G__4382__4384.call(this, tsym4356, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__4382
}();
cljs.core.Subvec.prototype.cljs$core$ISequential$ = true;
cljs.core.Subvec.prototype.cljs$core$ICollection$ = true;
cljs.core.Subvec.prototype.cljs$core$ICollection$_conj = function(coll, o) {
  var this__4363 = this;
  return new cljs.core.Subvec(this__4363.meta, cljs.core._assoc_n.call(null, this__4363.v, this__4363.end, o), this__4363.start, this__4363.end + 1)
};
cljs.core.Subvec.prototype.cljs$core$IReduce$ = true;
cljs.core.Subvec.prototype.cljs$core$IReduce$_reduce = function() {
  var G__4386 = null;
  var G__4386__4387 = function(coll, f) {
    var this__4364 = this;
    return cljs.core.ci_reduce.call(null, coll, f)
  };
  var G__4386__4388 = function(coll, f, start) {
    var this__4365 = this;
    return cljs.core.ci_reduce.call(null, coll, f, start)
  };
  G__4386 = function(coll, f, start) {
    switch(arguments.length) {
      case 2:
        return G__4386__4387.call(this, coll, f);
      case 3:
        return G__4386__4388.call(this, coll, f, start)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__4386
}();
cljs.core.Subvec.prototype.cljs$core$ISeqable$ = true;
cljs.core.Subvec.prototype.cljs$core$ISeqable$_seq = function(coll) {
  var this__4366 = this;
  var subvec_seq__4367 = function subvec_seq(i) {
    if(cljs.core.truth_(cljs.core._EQ_.call(null, i, this__4366.end))) {
      return null
    }else {
      return cljs.core.cons.call(null, cljs.core._nth.call(null, this__4366.v, i), new cljs.core.LazySeq(null, false, function() {
        return subvec_seq.call(null, i + 1)
      }))
    }
  };
  return subvec_seq__4367.call(null, this__4366.start)
};
cljs.core.Subvec.prototype.cljs$core$ICounted$ = true;
cljs.core.Subvec.prototype.cljs$core$ICounted$_count = function(coll) {
  var this__4368 = this;
  return this__4368.end - this__4368.start
};
cljs.core.Subvec.prototype.cljs$core$IStack$ = true;
cljs.core.Subvec.prototype.cljs$core$IStack$_peek = function(coll) {
  var this__4369 = this;
  return cljs.core._nth.call(null, this__4369.v, this__4369.end - 1)
};
cljs.core.Subvec.prototype.cljs$core$IStack$_pop = function(coll) {
  var this__4370 = this;
  if(cljs.core.truth_(cljs.core._EQ_.call(null, this__4370.start, this__4370.end))) {
    throw new Error("Can't pop empty vector");
  }else {
    return new cljs.core.Subvec(this__4370.meta, this__4370.v, this__4370.start, this__4370.end - 1)
  }
};
cljs.core.Subvec.prototype.cljs$core$IVector$ = true;
cljs.core.Subvec.prototype.cljs$core$IVector$_assoc_n = function(coll, n, val) {
  var this__4371 = this;
  return cljs.core._assoc.call(null, coll, n, val)
};
cljs.core.Subvec.prototype.cljs$core$IEquiv$ = true;
cljs.core.Subvec.prototype.cljs$core$IEquiv$_equiv = function(coll, other) {
  var this__4372 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.Subvec.prototype.cljs$core$IWithMeta$ = true;
cljs.core.Subvec.prototype.cljs$core$IWithMeta$_with_meta = function(coll, meta) {
  var this__4373 = this;
  return new cljs.core.Subvec(meta, this__4373.v, this__4373.start, this__4373.end)
};
cljs.core.Subvec.prototype.cljs$core$IMeta$ = true;
cljs.core.Subvec.prototype.cljs$core$IMeta$_meta = function(coll) {
  var this__4374 = this;
  return this__4374.meta
};
cljs.core.Subvec.prototype.cljs$core$IIndexed$ = true;
cljs.core.Subvec.prototype.cljs$core$IIndexed$_nth = function() {
  var G__4390 = null;
  var G__4390__4391 = function(coll, n) {
    var this__4375 = this;
    return cljs.core._nth.call(null, this__4375.v, this__4375.start + n)
  };
  var G__4390__4392 = function(coll, n, not_found) {
    var this__4376 = this;
    return cljs.core._nth.call(null, this__4376.v, this__4376.start + n, not_found)
  };
  G__4390 = function(coll, n, not_found) {
    switch(arguments.length) {
      case 2:
        return G__4390__4391.call(this, coll, n);
      case 3:
        return G__4390__4392.call(this, coll, n, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__4390
}();
cljs.core.Subvec.prototype.cljs$core$IEmptyableCollection$ = true;
cljs.core.Subvec.prototype.cljs$core$IEmptyableCollection$_empty = function(coll) {
  var this__4377 = this;
  return cljs.core.with_meta.call(null, cljs.core.Vector.EMPTY, this__4377.meta)
};
cljs.core.Subvec;
cljs.core.subvec = function() {
  var subvec = null;
  var subvec__4394 = function(v, start) {
    return subvec.call(null, v, start, cljs.core.count.call(null, v))
  };
  var subvec__4395 = function(v, start, end) {
    return new cljs.core.Subvec(null, v, start, end)
  };
  subvec = function(v, start, end) {
    switch(arguments.length) {
      case 2:
        return subvec__4394.call(this, v, start);
      case 3:
        return subvec__4395.call(this, v, start, end)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return subvec
}();
cljs.core.PersistentQueueSeq = function(meta, front, rear) {
  this.meta = meta;
  this.front = front;
  this.rear = rear
};
cljs.core.PersistentQueueSeq.cljs$core$IPrintable$_pr_seq = function(this__367__auto__) {
  return cljs.core.list.call(null, "cljs.core.PersistentQueueSeq")
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$ISeqable$ = true;
cljs.core.PersistentQueueSeq.prototype.cljs$core$ISeqable$_seq = function(coll) {
  var this__4397 = this;
  return coll
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$IHash$ = true;
cljs.core.PersistentQueueSeq.prototype.cljs$core$IHash$_hash = function(coll) {
  var this__4398 = this;
  return cljs.core.hash_coll.call(null, coll)
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$IEquiv$ = true;
cljs.core.PersistentQueueSeq.prototype.cljs$core$IEquiv$_equiv = function(coll, other) {
  var this__4399 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$ISequential$ = true;
cljs.core.PersistentQueueSeq.prototype.cljs$core$IEmptyableCollection$ = true;
cljs.core.PersistentQueueSeq.prototype.cljs$core$IEmptyableCollection$_empty = function(coll) {
  var this__4400 = this;
  return cljs.core.with_meta.call(null, cljs.core.List.EMPTY, this__4400.meta)
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$ICollection$ = true;
cljs.core.PersistentQueueSeq.prototype.cljs$core$ICollection$_conj = function(coll, o) {
  var this__4401 = this;
  return cljs.core.cons.call(null, o, coll)
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$ISeq$ = true;
cljs.core.PersistentQueueSeq.prototype.cljs$core$ISeq$_first = function(coll) {
  var this__4402 = this;
  return cljs.core._first.call(null, this__4402.front)
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$ISeq$_rest = function(coll) {
  var this__4403 = this;
  var temp__3971__auto____4404 = cljs.core.next.call(null, this__4403.front);
  if(cljs.core.truth_(temp__3971__auto____4404)) {
    var f1__4405 = temp__3971__auto____4404;
    return new cljs.core.PersistentQueueSeq(this__4403.meta, f1__4405, this__4403.rear)
  }else {
    if(cljs.core.truth_(this__4403.rear === null)) {
      return cljs.core._empty.call(null, coll)
    }else {
      return new cljs.core.PersistentQueueSeq(this__4403.meta, this__4403.rear, null)
    }
  }
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$IMeta$ = true;
cljs.core.PersistentQueueSeq.prototype.cljs$core$IMeta$_meta = function(coll) {
  var this__4406 = this;
  return this__4406.meta
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$IWithMeta$ = true;
cljs.core.PersistentQueueSeq.prototype.cljs$core$IWithMeta$_with_meta = function(coll, meta) {
  var this__4407 = this;
  return new cljs.core.PersistentQueueSeq(meta, this__4407.front, this__4407.rear)
};
cljs.core.PersistentQueueSeq;
cljs.core.PersistentQueue = function(meta, count, front, rear) {
  this.meta = meta;
  this.count = count;
  this.front = front;
  this.rear = rear
};
cljs.core.PersistentQueue.cljs$core$IPrintable$_pr_seq = function(this__367__auto__) {
  return cljs.core.list.call(null, "cljs.core.PersistentQueue")
};
cljs.core.PersistentQueue.prototype.cljs$core$IHash$ = true;
cljs.core.PersistentQueue.prototype.cljs$core$IHash$_hash = function(coll) {
  var this__4408 = this;
  return cljs.core.hash_coll.call(null, coll)
};
cljs.core.PersistentQueue.prototype.cljs$core$ISequential$ = true;
cljs.core.PersistentQueue.prototype.cljs$core$ICollection$ = true;
cljs.core.PersistentQueue.prototype.cljs$core$ICollection$_conj = function(coll, o) {
  var this__4409 = this;
  if(cljs.core.truth_(this__4409.front)) {
    return new cljs.core.PersistentQueue(this__4409.meta, this__4409.count + 1, this__4409.front, cljs.core.conj.call(null, function() {
      var or__3824__auto____4410 = this__4409.rear;
      if(cljs.core.truth_(or__3824__auto____4410)) {
        return or__3824__auto____4410
      }else {
        return cljs.core.PersistentVector.fromArray([])
      }
    }(), o))
  }else {
    return new cljs.core.PersistentQueue(this__4409.meta, this__4409.count + 1, cljs.core.conj.call(null, this__4409.front, o), cljs.core.PersistentVector.fromArray([]))
  }
};
cljs.core.PersistentQueue.prototype.cljs$core$ISeqable$ = true;
cljs.core.PersistentQueue.prototype.cljs$core$ISeqable$_seq = function(coll) {
  var this__4411 = this;
  var rear__4412 = cljs.core.seq.call(null, this__4411.rear);
  if(cljs.core.truth_(function() {
    var or__3824__auto____4413 = this__4411.front;
    if(cljs.core.truth_(or__3824__auto____4413)) {
      return or__3824__auto____4413
    }else {
      return rear__4412
    }
  }())) {
    return new cljs.core.PersistentQueueSeq(null, this__4411.front, cljs.core.seq.call(null, rear__4412))
  }else {
    return cljs.core.List.EMPTY
  }
};
cljs.core.PersistentQueue.prototype.cljs$core$ICounted$ = true;
cljs.core.PersistentQueue.prototype.cljs$core$ICounted$_count = function(coll) {
  var this__4414 = this;
  return this__4414.count
};
cljs.core.PersistentQueue.prototype.cljs$core$IStack$ = true;
cljs.core.PersistentQueue.prototype.cljs$core$IStack$_peek = function(coll) {
  var this__4415 = this;
  return cljs.core._first.call(null, this__4415.front)
};
cljs.core.PersistentQueue.prototype.cljs$core$IStack$_pop = function(coll) {
  var this__4416 = this;
  if(cljs.core.truth_(this__4416.front)) {
    var temp__3971__auto____4417 = cljs.core.next.call(null, this__4416.front);
    if(cljs.core.truth_(temp__3971__auto____4417)) {
      var f1__4418 = temp__3971__auto____4417;
      return new cljs.core.PersistentQueue(this__4416.meta, this__4416.count - 1, f1__4418, this__4416.rear)
    }else {
      return new cljs.core.PersistentQueue(this__4416.meta, this__4416.count - 1, cljs.core.seq.call(null, this__4416.rear), cljs.core.PersistentVector.fromArray([]))
    }
  }else {
    return coll
  }
};
cljs.core.PersistentQueue.prototype.cljs$core$ISeq$ = true;
cljs.core.PersistentQueue.prototype.cljs$core$ISeq$_first = function(coll) {
  var this__4419 = this;
  return cljs.core.first.call(null, this__4419.front)
};
cljs.core.PersistentQueue.prototype.cljs$core$ISeq$_rest = function(coll) {
  var this__4420 = this;
  return cljs.core.rest.call(null, cljs.core.seq.call(null, coll))
};
cljs.core.PersistentQueue.prototype.cljs$core$IEquiv$ = true;
cljs.core.PersistentQueue.prototype.cljs$core$IEquiv$_equiv = function(coll, other) {
  var this__4421 = this;
  return cljs.core.equiv_sequential.call(null, coll, other)
};
cljs.core.PersistentQueue.prototype.cljs$core$IWithMeta$ = true;
cljs.core.PersistentQueue.prototype.cljs$core$IWithMeta$_with_meta = function(coll, meta) {
  var this__4422 = this;
  return new cljs.core.PersistentQueue(meta, this__4422.count, this__4422.front, this__4422.rear)
};
cljs.core.PersistentQueue.prototype.cljs$core$IMeta$ = true;
cljs.core.PersistentQueue.prototype.cljs$core$IMeta$_meta = function(coll) {
  var this__4423 = this;
  return this__4423.meta
};
cljs.core.PersistentQueue.prototype.cljs$core$IEmptyableCollection$ = true;
cljs.core.PersistentQueue.prototype.cljs$core$IEmptyableCollection$_empty = function(coll) {
  var this__4424 = this;
  return cljs.core.PersistentQueue.EMPTY
};
cljs.core.PersistentQueue;
cljs.core.PersistentQueue.EMPTY = new cljs.core.PersistentQueue(null, 0, null, cljs.core.PersistentVector.fromArray([]));
cljs.core.NeverEquiv = function() {
};
cljs.core.NeverEquiv.cljs$core$IPrintable$_pr_seq = function(this__367__auto__) {
  return cljs.core.list.call(null, "cljs.core.NeverEquiv")
};
cljs.core.NeverEquiv.prototype.cljs$core$IEquiv$ = true;
cljs.core.NeverEquiv.prototype.cljs$core$IEquiv$_equiv = function(o, other) {
  var this__4425 = this;
  return false
};
cljs.core.NeverEquiv;
cljs.core.never_equiv = new cljs.core.NeverEquiv;
cljs.core.equiv_map = function equiv_map(x, y) {
  return cljs.core.boolean$.call(null, cljs.core.truth_(cljs.core.map_QMARK_.call(null, y)) ? cljs.core.truth_(cljs.core._EQ_.call(null, cljs.core.count.call(null, x), cljs.core.count.call(null, y))) ? cljs.core.every_QMARK_.call(null, cljs.core.identity, cljs.core.map.call(null, function(xkv) {
    return cljs.core._EQ_.call(null, cljs.core.get.call(null, y, cljs.core.first.call(null, xkv), cljs.core.never_equiv), cljs.core.second.call(null, xkv))
  }, x)) : null : null)
};
cljs.core.scan_array = function scan_array(incr, k, array) {
  var len__4426 = array.length;
  var i__4427 = 0;
  while(true) {
    if(cljs.core.truth_(i__4427 < len__4426)) {
      if(cljs.core.truth_(cljs.core._EQ_.call(null, k, array[i__4427]))) {
        return i__4427
      }else {
        var G__4428 = i__4427 + incr;
        i__4427 = G__4428;
        continue
      }
    }else {
      return null
    }
    break
  }
};
cljs.core.obj_map_contains_key_QMARK_ = function() {
  var obj_map_contains_key_QMARK_ = null;
  var obj_map_contains_key_QMARK___4430 = function(k, strobj) {
    return obj_map_contains_key_QMARK_.call(null, k, strobj, true, false)
  };
  var obj_map_contains_key_QMARK___4431 = function(k, strobj, true_val, false_val) {
    if(cljs.core.truth_(function() {
      var and__3822__auto____4429 = goog.isString.call(null, k);
      if(cljs.core.truth_(and__3822__auto____4429)) {
        return strobj.hasOwnProperty(k)
      }else {
        return and__3822__auto____4429
      }
    }())) {
      return true_val
    }else {
      return false_val
    }
  };
  obj_map_contains_key_QMARK_ = function(k, strobj, true_val, false_val) {
    switch(arguments.length) {
      case 2:
        return obj_map_contains_key_QMARK___4430.call(this, k, strobj);
      case 4:
        return obj_map_contains_key_QMARK___4431.call(this, k, strobj, true_val, false_val)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return obj_map_contains_key_QMARK_
}();
cljs.core.obj_map_compare_keys = function obj_map_compare_keys(a, b) {
  var a__4434 = cljs.core.hash.call(null, a);
  var b__4435 = cljs.core.hash.call(null, b);
  if(cljs.core.truth_(a__4434 < b__4435)) {
    return-1
  }else {
    if(cljs.core.truth_(a__4434 > b__4435)) {
      return 1
    }else {
      if(cljs.core.truth_("\ufdd0'else")) {
        return 0
      }else {
        return null
      }
    }
  }
};
cljs.core.ObjMap = function(meta, keys, strobj) {
  this.meta = meta;
  this.keys = keys;
  this.strobj = strobj
};
cljs.core.ObjMap.cljs$core$IPrintable$_pr_seq = function(this__367__auto__) {
  return cljs.core.list.call(null, "cljs.core.ObjMap")
};
cljs.core.ObjMap.prototype.cljs$core$IHash$ = true;
cljs.core.ObjMap.prototype.cljs$core$IHash$_hash = function(coll) {
  var this__4436 = this;
  return cljs.core.hash_coll.call(null, coll)
};
cljs.core.ObjMap.prototype.cljs$core$ILookup$ = true;
cljs.core.ObjMap.prototype.cljs$core$ILookup$_lookup = function() {
  var G__4463 = null;
  var G__4463__4464 = function(coll, k) {
    var this__4437 = this;
    return cljs.core._lookup.call(null, coll, k, null)
  };
  var G__4463__4465 = function(coll, k, not_found) {
    var this__4438 = this;
    return cljs.core.obj_map_contains_key_QMARK_.call(null, k, this__4438.strobj, this__4438.strobj[k], not_found)
  };
  G__4463 = function(coll, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__4463__4464.call(this, coll, k);
      case 3:
        return G__4463__4465.call(this, coll, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__4463
}();
cljs.core.ObjMap.prototype.cljs$core$IAssociative$ = true;
cljs.core.ObjMap.prototype.cljs$core$IAssociative$_assoc = function(coll, k, v) {
  var this__4439 = this;
  if(cljs.core.truth_(goog.isString.call(null, k))) {
    var new_strobj__4440 = goog.object.clone.call(null, this__4439.strobj);
    var overwrite_QMARK___4441 = new_strobj__4440.hasOwnProperty(k);
    new_strobj__4440[k] = v;
    if(cljs.core.truth_(overwrite_QMARK___4441)) {
      return new cljs.core.ObjMap(this__4439.meta, this__4439.keys, new_strobj__4440)
    }else {
      var new_keys__4442 = cljs.core.aclone.call(null, this__4439.keys);
      new_keys__4442.push(k);
      return new cljs.core.ObjMap(this__4439.meta, new_keys__4442, new_strobj__4440)
    }
  }else {
    return cljs.core.with_meta.call(null, cljs.core.into.call(null, cljs.core.hash_map.call(null, k, v), cljs.core.seq.call(null, coll)), this__4439.meta)
  }
};
cljs.core.ObjMap.prototype.cljs$core$IAssociative$_contains_key_QMARK_ = function(coll, k) {
  var this__4443 = this;
  return cljs.core.obj_map_contains_key_QMARK_.call(null, k, this__4443.strobj)
};
cljs.core.ObjMap.prototype.cljs$core$IFn$ = true;
cljs.core.ObjMap.prototype.call = function() {
  var G__4467 = null;
  var G__4467__4468 = function(tsym4444, k) {
    var this__4446 = this;
    var tsym4444__4447 = this;
    var coll__4448 = tsym4444__4447;
    return cljs.core._lookup.call(null, coll__4448, k)
  };
  var G__4467__4469 = function(tsym4445, k, not_found) {
    var this__4449 = this;
    var tsym4445__4450 = this;
    var coll__4451 = tsym4445__4450;
    return cljs.core._lookup.call(null, coll__4451, k, not_found)
  };
  G__4467 = function(tsym4445, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__4467__4468.call(this, tsym4445, k);
      case 3:
        return G__4467__4469.call(this, tsym4445, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__4467
}();
cljs.core.ObjMap.prototype.cljs$core$ICollection$ = true;
cljs.core.ObjMap.prototype.cljs$core$ICollection$_conj = function(coll, entry) {
  var this__4452 = this;
  if(cljs.core.truth_(cljs.core.vector_QMARK_.call(null, entry))) {
    return cljs.core._assoc.call(null, coll, cljs.core._nth.call(null, entry, 0), cljs.core._nth.call(null, entry, 1))
  }else {
    return cljs.core.reduce.call(null, cljs.core._conj, coll, entry)
  }
};
cljs.core.ObjMap.prototype.cljs$core$ISeqable$ = true;
cljs.core.ObjMap.prototype.cljs$core$ISeqable$_seq = function(coll) {
  var this__4453 = this;
  if(cljs.core.truth_(this__4453.keys.length > 0)) {
    return cljs.core.map.call(null, function(p1__4433_SHARP_) {
      return cljs.core.vector.call(null, p1__4433_SHARP_, this__4453.strobj[p1__4433_SHARP_])
    }, this__4453.keys.sort(cljs.core.obj_map_compare_keys))
  }else {
    return null
  }
};
cljs.core.ObjMap.prototype.cljs$core$ICounted$ = true;
cljs.core.ObjMap.prototype.cljs$core$ICounted$_count = function(coll) {
  var this__4454 = this;
  return this__4454.keys.length
};
cljs.core.ObjMap.prototype.cljs$core$IEquiv$ = true;
cljs.core.ObjMap.prototype.cljs$core$IEquiv$_equiv = function(coll, other) {
  var this__4455 = this;
  return cljs.core.equiv_map.call(null, coll, other)
};
cljs.core.ObjMap.prototype.cljs$core$IWithMeta$ = true;
cljs.core.ObjMap.prototype.cljs$core$IWithMeta$_with_meta = function(coll, meta) {
  var this__4456 = this;
  return new cljs.core.ObjMap(meta, this__4456.keys, this__4456.strobj)
};
cljs.core.ObjMap.prototype.cljs$core$IMeta$ = true;
cljs.core.ObjMap.prototype.cljs$core$IMeta$_meta = function(coll) {
  var this__4457 = this;
  return this__4457.meta
};
cljs.core.ObjMap.prototype.cljs$core$IEmptyableCollection$ = true;
cljs.core.ObjMap.prototype.cljs$core$IEmptyableCollection$_empty = function(coll) {
  var this__4458 = this;
  return cljs.core.with_meta.call(null, cljs.core.ObjMap.EMPTY, this__4458.meta)
};
cljs.core.ObjMap.prototype.cljs$core$IMap$ = true;
cljs.core.ObjMap.prototype.cljs$core$IMap$_dissoc = function(coll, k) {
  var this__4459 = this;
  if(cljs.core.truth_(function() {
    var and__3822__auto____4460 = goog.isString.call(null, k);
    if(cljs.core.truth_(and__3822__auto____4460)) {
      return this__4459.strobj.hasOwnProperty(k)
    }else {
      return and__3822__auto____4460
    }
  }())) {
    var new_keys__4461 = cljs.core.aclone.call(null, this__4459.keys);
    var new_strobj__4462 = goog.object.clone.call(null, this__4459.strobj);
    new_keys__4461.splice(cljs.core.scan_array.call(null, 1, k, new_keys__4461), 1);
    cljs.core.js_delete.call(null, new_strobj__4462, k);
    return new cljs.core.ObjMap(this__4459.meta, new_keys__4461, new_strobj__4462)
  }else {
    return coll
  }
};
cljs.core.ObjMap;
cljs.core.ObjMap.EMPTY = new cljs.core.ObjMap(null, [], cljs.core.js_obj.call(null));
cljs.core.ObjMap.fromObject = function(ks, obj) {
  return new cljs.core.ObjMap(null, ks, obj)
};
cljs.core.HashMap = function(meta, count, hashobj) {
  this.meta = meta;
  this.count = count;
  this.hashobj = hashobj
};
cljs.core.HashMap.cljs$core$IPrintable$_pr_seq = function(this__367__auto__) {
  return cljs.core.list.call(null, "cljs.core.HashMap")
};
cljs.core.HashMap.prototype.cljs$core$IHash$ = true;
cljs.core.HashMap.prototype.cljs$core$IHash$_hash = function(coll) {
  var this__4472 = this;
  return cljs.core.hash_coll.call(null, coll)
};
cljs.core.HashMap.prototype.cljs$core$ILookup$ = true;
cljs.core.HashMap.prototype.cljs$core$ILookup$_lookup = function() {
  var G__4510 = null;
  var G__4510__4511 = function(coll, k) {
    var this__4473 = this;
    return cljs.core._lookup.call(null, coll, k, null)
  };
  var G__4510__4512 = function(coll, k, not_found) {
    var this__4474 = this;
    var bucket__4475 = this__4474.hashobj[cljs.core.hash.call(null, k)];
    var i__4476 = cljs.core.truth_(bucket__4475) ? cljs.core.scan_array.call(null, 2, k, bucket__4475) : null;
    if(cljs.core.truth_(i__4476)) {
      return bucket__4475[i__4476 + 1]
    }else {
      return not_found
    }
  };
  G__4510 = function(coll, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__4510__4511.call(this, coll, k);
      case 3:
        return G__4510__4512.call(this, coll, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__4510
}();
cljs.core.HashMap.prototype.cljs$core$IAssociative$ = true;
cljs.core.HashMap.prototype.cljs$core$IAssociative$_assoc = function(coll, k, v) {
  var this__4477 = this;
  var h__4478 = cljs.core.hash.call(null, k);
  var bucket__4479 = this__4477.hashobj[h__4478];
  if(cljs.core.truth_(bucket__4479)) {
    var new_bucket__4480 = cljs.core.aclone.call(null, bucket__4479);
    var new_hashobj__4481 = goog.object.clone.call(null, this__4477.hashobj);
    new_hashobj__4481[h__4478] = new_bucket__4480;
    var temp__3971__auto____4482 = cljs.core.scan_array.call(null, 2, k, new_bucket__4480);
    if(cljs.core.truth_(temp__3971__auto____4482)) {
      var i__4483 = temp__3971__auto____4482;
      new_bucket__4480[i__4483 + 1] = v;
      return new cljs.core.HashMap(this__4477.meta, this__4477.count, new_hashobj__4481)
    }else {
      new_bucket__4480.push(k, v);
      return new cljs.core.HashMap(this__4477.meta, this__4477.count + 1, new_hashobj__4481)
    }
  }else {
    var new_hashobj__4484 = goog.object.clone.call(null, this__4477.hashobj);
    new_hashobj__4484[h__4478] = [k, v];
    return new cljs.core.HashMap(this__4477.meta, this__4477.count + 1, new_hashobj__4484)
  }
};
cljs.core.HashMap.prototype.cljs$core$IAssociative$_contains_key_QMARK_ = function(coll, k) {
  var this__4485 = this;
  var bucket__4486 = this__4485.hashobj[cljs.core.hash.call(null, k)];
  var i__4487 = cljs.core.truth_(bucket__4486) ? cljs.core.scan_array.call(null, 2, k, bucket__4486) : null;
  if(cljs.core.truth_(i__4487)) {
    return true
  }else {
    return false
  }
};
cljs.core.HashMap.prototype.cljs$core$IFn$ = true;
cljs.core.HashMap.prototype.call = function() {
  var G__4514 = null;
  var G__4514__4515 = function(tsym4488, k) {
    var this__4490 = this;
    var tsym4488__4491 = this;
    var coll__4492 = tsym4488__4491;
    return cljs.core._lookup.call(null, coll__4492, k)
  };
  var G__4514__4516 = function(tsym4489, k, not_found) {
    var this__4493 = this;
    var tsym4489__4494 = this;
    var coll__4495 = tsym4489__4494;
    return cljs.core._lookup.call(null, coll__4495, k, not_found)
  };
  G__4514 = function(tsym4489, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__4514__4515.call(this, tsym4489, k);
      case 3:
        return G__4514__4516.call(this, tsym4489, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__4514
}();
cljs.core.HashMap.prototype.cljs$core$ICollection$ = true;
cljs.core.HashMap.prototype.cljs$core$ICollection$_conj = function(coll, entry) {
  var this__4496 = this;
  if(cljs.core.truth_(cljs.core.vector_QMARK_.call(null, entry))) {
    return cljs.core._assoc.call(null, coll, cljs.core._nth.call(null, entry, 0), cljs.core._nth.call(null, entry, 1))
  }else {
    return cljs.core.reduce.call(null, cljs.core._conj, coll, entry)
  }
};
cljs.core.HashMap.prototype.cljs$core$ISeqable$ = true;
cljs.core.HashMap.prototype.cljs$core$ISeqable$_seq = function(coll) {
  var this__4497 = this;
  if(cljs.core.truth_(this__4497.count > 0)) {
    var hashes__4498 = cljs.core.js_keys.call(null, this__4497.hashobj).sort();
    return cljs.core.mapcat.call(null, function(p1__4471_SHARP_) {
      return cljs.core.map.call(null, cljs.core.vec, cljs.core.partition.call(null, 2, this__4497.hashobj[p1__4471_SHARP_]))
    }, hashes__4498)
  }else {
    return null
  }
};
cljs.core.HashMap.prototype.cljs$core$ICounted$ = true;
cljs.core.HashMap.prototype.cljs$core$ICounted$_count = function(coll) {
  var this__4499 = this;
  return this__4499.count
};
cljs.core.HashMap.prototype.cljs$core$IEquiv$ = true;
cljs.core.HashMap.prototype.cljs$core$IEquiv$_equiv = function(coll, other) {
  var this__4500 = this;
  return cljs.core.equiv_map.call(null, coll, other)
};
cljs.core.HashMap.prototype.cljs$core$IWithMeta$ = true;
cljs.core.HashMap.prototype.cljs$core$IWithMeta$_with_meta = function(coll, meta) {
  var this__4501 = this;
  return new cljs.core.HashMap(meta, this__4501.count, this__4501.hashobj)
};
cljs.core.HashMap.prototype.cljs$core$IMeta$ = true;
cljs.core.HashMap.prototype.cljs$core$IMeta$_meta = function(coll) {
  var this__4502 = this;
  return this__4502.meta
};
cljs.core.HashMap.prototype.cljs$core$IEmptyableCollection$ = true;
cljs.core.HashMap.prototype.cljs$core$IEmptyableCollection$_empty = function(coll) {
  var this__4503 = this;
  return cljs.core.with_meta.call(null, cljs.core.HashMap.EMPTY, this__4503.meta)
};
cljs.core.HashMap.prototype.cljs$core$IMap$ = true;
cljs.core.HashMap.prototype.cljs$core$IMap$_dissoc = function(coll, k) {
  var this__4504 = this;
  var h__4505 = cljs.core.hash.call(null, k);
  var bucket__4506 = this__4504.hashobj[h__4505];
  var i__4507 = cljs.core.truth_(bucket__4506) ? cljs.core.scan_array.call(null, 2, k, bucket__4506) : null;
  if(cljs.core.truth_(cljs.core.not.call(null, i__4507))) {
    return coll
  }else {
    var new_hashobj__4508 = goog.object.clone.call(null, this__4504.hashobj);
    if(cljs.core.truth_(3 > bucket__4506.length)) {
      cljs.core.js_delete.call(null, new_hashobj__4508, h__4505)
    }else {
      var new_bucket__4509 = cljs.core.aclone.call(null, bucket__4506);
      new_bucket__4509.splice(i__4507, 2);
      new_hashobj__4508[h__4505] = new_bucket__4509
    }
    return new cljs.core.HashMap(this__4504.meta, this__4504.count - 1, new_hashobj__4508)
  }
};
cljs.core.HashMap;
cljs.core.HashMap.EMPTY = new cljs.core.HashMap(null, 0, cljs.core.js_obj.call(null));
cljs.core.HashMap.fromArrays = function(ks, vs) {
  var len__4518 = ks.length;
  var i__4519 = 0;
  var out__4520 = cljs.core.HashMap.EMPTY;
  while(true) {
    if(cljs.core.truth_(i__4519 < len__4518)) {
      var G__4521 = i__4519 + 1;
      var G__4522 = cljs.core.assoc.call(null, out__4520, ks[i__4519], vs[i__4519]);
      i__4519 = G__4521;
      out__4520 = G__4522;
      continue
    }else {
      return out__4520
    }
    break
  }
};
cljs.core.hash_map = function() {
  var hash_map__delegate = function(keyvals) {
    var in$__4523 = cljs.core.seq.call(null, keyvals);
    var out__4524 = cljs.core.HashMap.EMPTY;
    while(true) {
      if(cljs.core.truth_(in$__4523)) {
        var G__4525 = cljs.core.nnext.call(null, in$__4523);
        var G__4526 = cljs.core.assoc.call(null, out__4524, cljs.core.first.call(null, in$__4523), cljs.core.second.call(null, in$__4523));
        in$__4523 = G__4525;
        out__4524 = G__4526;
        continue
      }else {
        return out__4524
      }
      break
    }
  };
  var hash_map = function(var_args) {
    var keyvals = null;
    if(goog.isDef(var_args)) {
      keyvals = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return hash_map__delegate.call(this, keyvals)
  };
  hash_map.cljs$lang$maxFixedArity = 0;
  hash_map.cljs$lang$applyTo = function(arglist__4527) {
    var keyvals = cljs.core.seq(arglist__4527);
    return hash_map__delegate.call(this, keyvals)
  };
  return hash_map
}();
cljs.core.keys = function keys(hash_map) {
  return cljs.core.seq.call(null, cljs.core.map.call(null, cljs.core.first, hash_map))
};
cljs.core.vals = function vals(hash_map) {
  return cljs.core.seq.call(null, cljs.core.map.call(null, cljs.core.second, hash_map))
};
cljs.core.merge = function() {
  var merge__delegate = function(maps) {
    if(cljs.core.truth_(cljs.core.some.call(null, cljs.core.identity, maps))) {
      return cljs.core.reduce.call(null, function(p1__4528_SHARP_, p2__4529_SHARP_) {
        return cljs.core.conj.call(null, function() {
          var or__3824__auto____4530 = p1__4528_SHARP_;
          if(cljs.core.truth_(or__3824__auto____4530)) {
            return or__3824__auto____4530
          }else {
            return cljs.core.ObjMap.fromObject([], {})
          }
        }(), p2__4529_SHARP_)
      }, maps)
    }else {
      return null
    }
  };
  var merge = function(var_args) {
    var maps = null;
    if(goog.isDef(var_args)) {
      maps = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return merge__delegate.call(this, maps)
  };
  merge.cljs$lang$maxFixedArity = 0;
  merge.cljs$lang$applyTo = function(arglist__4531) {
    var maps = cljs.core.seq(arglist__4531);
    return merge__delegate.call(this, maps)
  };
  return merge
}();
cljs.core.merge_with = function() {
  var merge_with__delegate = function(f, maps) {
    if(cljs.core.truth_(cljs.core.some.call(null, cljs.core.identity, maps))) {
      var merge_entry__4534 = function(m, e) {
        var k__4532 = cljs.core.first.call(null, e);
        var v__4533 = cljs.core.second.call(null, e);
        if(cljs.core.truth_(cljs.core.contains_QMARK_.call(null, m, k__4532))) {
          return cljs.core.assoc.call(null, m, k__4532, f.call(null, cljs.core.get.call(null, m, k__4532), v__4533))
        }else {
          return cljs.core.assoc.call(null, m, k__4532, v__4533)
        }
      };
      var merge2__4536 = function(m1, m2) {
        return cljs.core.reduce.call(null, merge_entry__4534, function() {
          var or__3824__auto____4535 = m1;
          if(cljs.core.truth_(or__3824__auto____4535)) {
            return or__3824__auto____4535
          }else {
            return cljs.core.ObjMap.fromObject([], {})
          }
        }(), cljs.core.seq.call(null, m2))
      };
      return cljs.core.reduce.call(null, merge2__4536, maps)
    }else {
      return null
    }
  };
  var merge_with = function(f, var_args) {
    var maps = null;
    if(goog.isDef(var_args)) {
      maps = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
    }
    return merge_with__delegate.call(this, f, maps)
  };
  merge_with.cljs$lang$maxFixedArity = 1;
  merge_with.cljs$lang$applyTo = function(arglist__4537) {
    var f = cljs.core.first(arglist__4537);
    var maps = cljs.core.rest(arglist__4537);
    return merge_with__delegate.call(this, f, maps)
  };
  return merge_with
}();
cljs.core.select_keys = function select_keys(map, keyseq) {
  var ret__4539 = cljs.core.ObjMap.fromObject([], {});
  var keys__4540 = cljs.core.seq.call(null, keyseq);
  while(true) {
    if(cljs.core.truth_(keys__4540)) {
      var key__4541 = cljs.core.first.call(null, keys__4540);
      var entry__4542 = cljs.core.get.call(null, map, key__4541, "\ufdd0'user/not-found");
      var G__4543 = cljs.core.truth_(cljs.core.not_EQ_.call(null, entry__4542, "\ufdd0'user/not-found")) ? cljs.core.assoc.call(null, ret__4539, key__4541, entry__4542) : ret__4539;
      var G__4544 = cljs.core.next.call(null, keys__4540);
      ret__4539 = G__4543;
      keys__4540 = G__4544;
      continue
    }else {
      return ret__4539
    }
    break
  }
};
cljs.core.Set = function(meta, hash_map) {
  this.meta = meta;
  this.hash_map = hash_map
};
cljs.core.Set.cljs$core$IPrintable$_pr_seq = function(this__367__auto__) {
  return cljs.core.list.call(null, "cljs.core.Set")
};
cljs.core.Set.prototype.cljs$core$IHash$ = true;
cljs.core.Set.prototype.cljs$core$IHash$_hash = function(coll) {
  var this__4545 = this;
  return cljs.core.hash_coll.call(null, coll)
};
cljs.core.Set.prototype.cljs$core$ILookup$ = true;
cljs.core.Set.prototype.cljs$core$ILookup$_lookup = function() {
  var G__4566 = null;
  var G__4566__4567 = function(coll, v) {
    var this__4546 = this;
    return cljs.core._lookup.call(null, coll, v, null)
  };
  var G__4566__4568 = function(coll, v, not_found) {
    var this__4547 = this;
    if(cljs.core.truth_(cljs.core._contains_key_QMARK_.call(null, this__4547.hash_map, v))) {
      return v
    }else {
      return not_found
    }
  };
  G__4566 = function(coll, v, not_found) {
    switch(arguments.length) {
      case 2:
        return G__4566__4567.call(this, coll, v);
      case 3:
        return G__4566__4568.call(this, coll, v, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__4566
}();
cljs.core.Set.prototype.cljs$core$IFn$ = true;
cljs.core.Set.prototype.call = function() {
  var G__4570 = null;
  var G__4570__4571 = function(tsym4548, k) {
    var this__4550 = this;
    var tsym4548__4551 = this;
    var coll__4552 = tsym4548__4551;
    return cljs.core._lookup.call(null, coll__4552, k)
  };
  var G__4570__4572 = function(tsym4549, k, not_found) {
    var this__4553 = this;
    var tsym4549__4554 = this;
    var coll__4555 = tsym4549__4554;
    return cljs.core._lookup.call(null, coll__4555, k, not_found)
  };
  G__4570 = function(tsym4549, k, not_found) {
    switch(arguments.length) {
      case 2:
        return G__4570__4571.call(this, tsym4549, k);
      case 3:
        return G__4570__4572.call(this, tsym4549, k, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__4570
}();
cljs.core.Set.prototype.cljs$core$ICollection$ = true;
cljs.core.Set.prototype.cljs$core$ICollection$_conj = function(coll, o) {
  var this__4556 = this;
  return new cljs.core.Set(this__4556.meta, cljs.core.assoc.call(null, this__4556.hash_map, o, null))
};
cljs.core.Set.prototype.cljs$core$ISeqable$ = true;
cljs.core.Set.prototype.cljs$core$ISeqable$_seq = function(coll) {
  var this__4557 = this;
  return cljs.core.keys.call(null, this__4557.hash_map)
};
cljs.core.Set.prototype.cljs$core$ISet$ = true;
cljs.core.Set.prototype.cljs$core$ISet$_disjoin = function(coll, v) {
  var this__4558 = this;
  return new cljs.core.Set(this__4558.meta, cljs.core.dissoc.call(null, this__4558.hash_map, v))
};
cljs.core.Set.prototype.cljs$core$ICounted$ = true;
cljs.core.Set.prototype.cljs$core$ICounted$_count = function(coll) {
  var this__4559 = this;
  return cljs.core.count.call(null, cljs.core.seq.call(null, coll))
};
cljs.core.Set.prototype.cljs$core$IEquiv$ = true;
cljs.core.Set.prototype.cljs$core$IEquiv$_equiv = function(coll, other) {
  var this__4560 = this;
  var and__3822__auto____4561 = cljs.core.set_QMARK_.call(null, other);
  if(cljs.core.truth_(and__3822__auto____4561)) {
    var and__3822__auto____4562 = cljs.core._EQ_.call(null, cljs.core.count.call(null, coll), cljs.core.count.call(null, other));
    if(cljs.core.truth_(and__3822__auto____4562)) {
      return cljs.core.every_QMARK_.call(null, function(p1__4538_SHARP_) {
        return cljs.core.contains_QMARK_.call(null, coll, p1__4538_SHARP_)
      }, other)
    }else {
      return and__3822__auto____4562
    }
  }else {
    return and__3822__auto____4561
  }
};
cljs.core.Set.prototype.cljs$core$IWithMeta$ = true;
cljs.core.Set.prototype.cljs$core$IWithMeta$_with_meta = function(coll, meta) {
  var this__4563 = this;
  return new cljs.core.Set(meta, this__4563.hash_map)
};
cljs.core.Set.prototype.cljs$core$IMeta$ = true;
cljs.core.Set.prototype.cljs$core$IMeta$_meta = function(coll) {
  var this__4564 = this;
  return this__4564.meta
};
cljs.core.Set.prototype.cljs$core$IEmptyableCollection$ = true;
cljs.core.Set.prototype.cljs$core$IEmptyableCollection$_empty = function(coll) {
  var this__4565 = this;
  return cljs.core.with_meta.call(null, cljs.core.Set.EMPTY, this__4565.meta)
};
cljs.core.Set;
cljs.core.Set.EMPTY = new cljs.core.Set(null, cljs.core.hash_map.call(null));
cljs.core.set = function set(coll) {
  var in$__4575 = cljs.core.seq.call(null, coll);
  var out__4576 = cljs.core.Set.EMPTY;
  while(true) {
    if(cljs.core.truth_(cljs.core.not.call(null, cljs.core.empty_QMARK_.call(null, in$__4575)))) {
      var G__4577 = cljs.core.rest.call(null, in$__4575);
      var G__4578 = cljs.core.conj.call(null, out__4576, cljs.core.first.call(null, in$__4575));
      in$__4575 = G__4577;
      out__4576 = G__4578;
      continue
    }else {
      return out__4576
    }
    break
  }
};
cljs.core.replace = function replace(smap, coll) {
  if(cljs.core.truth_(cljs.core.vector_QMARK_.call(null, coll))) {
    var n__4579 = cljs.core.count.call(null, coll);
    return cljs.core.reduce.call(null, function(v, i) {
      var temp__3971__auto____4580 = cljs.core.find.call(null, smap, cljs.core.nth.call(null, v, i));
      if(cljs.core.truth_(temp__3971__auto____4580)) {
        var e__4581 = temp__3971__auto____4580;
        return cljs.core.assoc.call(null, v, i, cljs.core.second.call(null, e__4581))
      }else {
        return v
      }
    }, coll, cljs.core.take.call(null, n__4579, cljs.core.iterate.call(null, cljs.core.inc, 0)))
  }else {
    return cljs.core.map.call(null, function(p1__4574_SHARP_) {
      var temp__3971__auto____4582 = cljs.core.find.call(null, smap, p1__4574_SHARP_);
      if(cljs.core.truth_(temp__3971__auto____4582)) {
        var e__4583 = temp__3971__auto____4582;
        return cljs.core.second.call(null, e__4583)
      }else {
        return p1__4574_SHARP_
      }
    }, coll)
  }
};
cljs.core.distinct = function distinct(coll) {
  var step__4591 = function step(xs, seen) {
    return new cljs.core.LazySeq(null, false, function() {
      return function(p__4584, seen) {
        while(true) {
          var vec__4585__4586 = p__4584;
          var f__4587 = cljs.core.nth.call(null, vec__4585__4586, 0, null);
          var xs__4588 = vec__4585__4586;
          var temp__3974__auto____4589 = cljs.core.seq.call(null, xs__4588);
          if(cljs.core.truth_(temp__3974__auto____4589)) {
            var s__4590 = temp__3974__auto____4589;
            if(cljs.core.truth_(cljs.core.contains_QMARK_.call(null, seen, f__4587))) {
              var G__4592 = cljs.core.rest.call(null, s__4590);
              var G__4593 = seen;
              p__4584 = G__4592;
              seen = G__4593;
              continue
            }else {
              return cljs.core.cons.call(null, f__4587, step.call(null, cljs.core.rest.call(null, s__4590), cljs.core.conj.call(null, seen, f__4587)))
            }
          }else {
            return null
          }
          break
        }
      }.call(null, xs, seen)
    })
  };
  return step__4591.call(null, coll, cljs.core.set([]))
};
cljs.core.butlast = function butlast(s) {
  var ret__4594 = cljs.core.PersistentVector.fromArray([]);
  var s__4595 = s;
  while(true) {
    if(cljs.core.truth_(cljs.core.next.call(null, s__4595))) {
      var G__4596 = cljs.core.conj.call(null, ret__4594, cljs.core.first.call(null, s__4595));
      var G__4597 = cljs.core.next.call(null, s__4595);
      ret__4594 = G__4596;
      s__4595 = G__4597;
      continue
    }else {
      return cljs.core.seq.call(null, ret__4594)
    }
    break
  }
};
cljs.core.name = function name(x) {
  if(cljs.core.truth_(cljs.core.string_QMARK_.call(null, x))) {
    return x
  }else {
    if(cljs.core.truth_(function() {
      var or__3824__auto____4598 = cljs.core.keyword_QMARK_.call(null, x);
      if(cljs.core.truth_(or__3824__auto____4598)) {
        return or__3824__auto____4598
      }else {
        return cljs.core.symbol_QMARK_.call(null, x)
      }
    }())) {
      var i__4599 = x.lastIndexOf("/");
      if(cljs.core.truth_(i__4599 < 0)) {
        return cljs.core.subs.call(null, x, 2)
      }else {
        return cljs.core.subs.call(null, x, i__4599 + 1)
      }
    }else {
      if(cljs.core.truth_("\ufdd0'else")) {
        throw new Error(cljs.core.str.call(null, "Doesn't support name: ", x));
      }else {
        return null
      }
    }
  }
};
cljs.core.namespace = function namespace(x) {
  if(cljs.core.truth_(function() {
    var or__3824__auto____4600 = cljs.core.keyword_QMARK_.call(null, x);
    if(cljs.core.truth_(or__3824__auto____4600)) {
      return or__3824__auto____4600
    }else {
      return cljs.core.symbol_QMARK_.call(null, x)
    }
  }())) {
    var i__4601 = x.lastIndexOf("/");
    if(cljs.core.truth_(i__4601 > -1)) {
      return cljs.core.subs.call(null, x, 2, i__4601)
    }else {
      return null
    }
  }else {
    throw new Error(cljs.core.str.call(null, "Doesn't support namespace: ", x));
  }
};
cljs.core.zipmap = function zipmap(keys, vals) {
  var map__4604 = cljs.core.ObjMap.fromObject([], {});
  var ks__4605 = cljs.core.seq.call(null, keys);
  var vs__4606 = cljs.core.seq.call(null, vals);
  while(true) {
    if(cljs.core.truth_(function() {
      var and__3822__auto____4607 = ks__4605;
      if(cljs.core.truth_(and__3822__auto____4607)) {
        return vs__4606
      }else {
        return and__3822__auto____4607
      }
    }())) {
      var G__4608 = cljs.core.assoc.call(null, map__4604, cljs.core.first.call(null, ks__4605), cljs.core.first.call(null, vs__4606));
      var G__4609 = cljs.core.next.call(null, ks__4605);
      var G__4610 = cljs.core.next.call(null, vs__4606);
      map__4604 = G__4608;
      ks__4605 = G__4609;
      vs__4606 = G__4610;
      continue
    }else {
      return map__4604
    }
    break
  }
};
cljs.core.max_key = function() {
  var max_key = null;
  var max_key__4613 = function(k, x) {
    return x
  };
  var max_key__4614 = function(k, x, y) {
    if(cljs.core.truth_(k.call(null, x) > k.call(null, y))) {
      return x
    }else {
      return y
    }
  };
  var max_key__4615 = function() {
    var G__4617__delegate = function(k, x, y, more) {
      return cljs.core.reduce.call(null, function(p1__4602_SHARP_, p2__4603_SHARP_) {
        return max_key.call(null, k, p1__4602_SHARP_, p2__4603_SHARP_)
      }, max_key.call(null, k, x, y), more)
    };
    var G__4617 = function(k, x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
      }
      return G__4617__delegate.call(this, k, x, y, more)
    };
    G__4617.cljs$lang$maxFixedArity = 3;
    G__4617.cljs$lang$applyTo = function(arglist__4618) {
      var k = cljs.core.first(arglist__4618);
      var x = cljs.core.first(cljs.core.next(arglist__4618));
      var y = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4618)));
      var more = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__4618)));
      return G__4617__delegate.call(this, k, x, y, more)
    };
    return G__4617
  }();
  max_key = function(k, x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 2:
        return max_key__4613.call(this, k, x);
      case 3:
        return max_key__4614.call(this, k, x, y);
      default:
        return max_key__4615.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  max_key.cljs$lang$maxFixedArity = 3;
  max_key.cljs$lang$applyTo = max_key__4615.cljs$lang$applyTo;
  return max_key
}();
cljs.core.min_key = function() {
  var min_key = null;
  var min_key__4619 = function(k, x) {
    return x
  };
  var min_key__4620 = function(k, x, y) {
    if(cljs.core.truth_(k.call(null, x) < k.call(null, y))) {
      return x
    }else {
      return y
    }
  };
  var min_key__4621 = function() {
    var G__4623__delegate = function(k, x, y, more) {
      return cljs.core.reduce.call(null, function(p1__4611_SHARP_, p2__4612_SHARP_) {
        return min_key.call(null, k, p1__4611_SHARP_, p2__4612_SHARP_)
      }, min_key.call(null, k, x, y), more)
    };
    var G__4623 = function(k, x, y, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
      }
      return G__4623__delegate.call(this, k, x, y, more)
    };
    G__4623.cljs$lang$maxFixedArity = 3;
    G__4623.cljs$lang$applyTo = function(arglist__4624) {
      var k = cljs.core.first(arglist__4624);
      var x = cljs.core.first(cljs.core.next(arglist__4624));
      var y = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4624)));
      var more = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__4624)));
      return G__4623__delegate.call(this, k, x, y, more)
    };
    return G__4623
  }();
  min_key = function(k, x, y, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 2:
        return min_key__4619.call(this, k, x);
      case 3:
        return min_key__4620.call(this, k, x, y);
      default:
        return min_key__4621.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  min_key.cljs$lang$maxFixedArity = 3;
  min_key.cljs$lang$applyTo = min_key__4621.cljs$lang$applyTo;
  return min_key
}();
cljs.core.partition_all = function() {
  var partition_all = null;
  var partition_all__4627 = function(n, coll) {
    return partition_all.call(null, n, n, coll)
  };
  var partition_all__4628 = function(n, step, coll) {
    return new cljs.core.LazySeq(null, false, function() {
      var temp__3974__auto____4625 = cljs.core.seq.call(null, coll);
      if(cljs.core.truth_(temp__3974__auto____4625)) {
        var s__4626 = temp__3974__auto____4625;
        return cljs.core.cons.call(null, cljs.core.take.call(null, n, s__4626), partition_all.call(null, n, step, cljs.core.drop.call(null, step, s__4626)))
      }else {
        return null
      }
    })
  };
  partition_all = function(n, step, coll) {
    switch(arguments.length) {
      case 2:
        return partition_all__4627.call(this, n, step);
      case 3:
        return partition_all__4628.call(this, n, step, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return partition_all
}();
cljs.core.take_while = function take_while(pred, coll) {
  return new cljs.core.LazySeq(null, false, function() {
    var temp__3974__auto____4630 = cljs.core.seq.call(null, coll);
    if(cljs.core.truth_(temp__3974__auto____4630)) {
      var s__4631 = temp__3974__auto____4630;
      if(cljs.core.truth_(pred.call(null, cljs.core.first.call(null, s__4631)))) {
        return cljs.core.cons.call(null, cljs.core.first.call(null, s__4631), take_while.call(null, pred, cljs.core.rest.call(null, s__4631)))
      }else {
        return null
      }
    }else {
      return null
    }
  })
};
cljs.core.Range = function(meta, start, end, step) {
  this.meta = meta;
  this.start = start;
  this.end = end;
  this.step = step
};
cljs.core.Range.cljs$core$IPrintable$_pr_seq = function(this__367__auto__) {
  return cljs.core.list.call(null, "cljs.core.Range")
};
cljs.core.Range.prototype.cljs$core$IHash$ = true;
cljs.core.Range.prototype.cljs$core$IHash$_hash = function(rng) {
  var this__4632 = this;
  return cljs.core.hash_coll.call(null, rng)
};
cljs.core.Range.prototype.cljs$core$ISequential$ = true;
cljs.core.Range.prototype.cljs$core$ICollection$ = true;
cljs.core.Range.prototype.cljs$core$ICollection$_conj = function(rng, o) {
  var this__4633 = this;
  return cljs.core.cons.call(null, o, rng)
};
cljs.core.Range.prototype.cljs$core$IReduce$ = true;
cljs.core.Range.prototype.cljs$core$IReduce$_reduce = function() {
  var G__4649 = null;
  var G__4649__4650 = function(rng, f) {
    var this__4634 = this;
    return cljs.core.ci_reduce.call(null, rng, f)
  };
  var G__4649__4651 = function(rng, f, s) {
    var this__4635 = this;
    return cljs.core.ci_reduce.call(null, rng, f, s)
  };
  G__4649 = function(rng, f, s) {
    switch(arguments.length) {
      case 2:
        return G__4649__4650.call(this, rng, f);
      case 3:
        return G__4649__4651.call(this, rng, f, s)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__4649
}();
cljs.core.Range.prototype.cljs$core$ISeqable$ = true;
cljs.core.Range.prototype.cljs$core$ISeqable$_seq = function(rng) {
  var this__4636 = this;
  var comp__4637 = cljs.core.truth_(this__4636.step > 0) ? cljs.core._LT_ : cljs.core._GT_;
  if(cljs.core.truth_(comp__4637.call(null, this__4636.start, this__4636.end))) {
    return rng
  }else {
    return null
  }
};
cljs.core.Range.prototype.cljs$core$ICounted$ = true;
cljs.core.Range.prototype.cljs$core$ICounted$_count = function(rng) {
  var this__4638 = this;
  if(cljs.core.truth_(cljs.core.not.call(null, cljs.core._seq.call(null, rng)))) {
    return 0
  }else {
    return Math["ceil"].call(null, (this__4638.end - this__4638.start) / this__4638.step)
  }
};
cljs.core.Range.prototype.cljs$core$ISeq$ = true;
cljs.core.Range.prototype.cljs$core$ISeq$_first = function(rng) {
  var this__4639 = this;
  return this__4639.start
};
cljs.core.Range.prototype.cljs$core$ISeq$_rest = function(rng) {
  var this__4640 = this;
  if(cljs.core.truth_(cljs.core._seq.call(null, rng))) {
    return new cljs.core.Range(this__4640.meta, this__4640.start + this__4640.step, this__4640.end, this__4640.step)
  }else {
    return cljs.core.list.call(null)
  }
};
cljs.core.Range.prototype.cljs$core$IEquiv$ = true;
cljs.core.Range.prototype.cljs$core$IEquiv$_equiv = function(rng, other) {
  var this__4641 = this;
  return cljs.core.equiv_sequential.call(null, rng, other)
};
cljs.core.Range.prototype.cljs$core$IWithMeta$ = true;
cljs.core.Range.prototype.cljs$core$IWithMeta$_with_meta = function(rng, meta) {
  var this__4642 = this;
  return new cljs.core.Range(meta, this__4642.start, this__4642.end, this__4642.step)
};
cljs.core.Range.prototype.cljs$core$IMeta$ = true;
cljs.core.Range.prototype.cljs$core$IMeta$_meta = function(rng) {
  var this__4643 = this;
  return this__4643.meta
};
cljs.core.Range.prototype.cljs$core$IIndexed$ = true;
cljs.core.Range.prototype.cljs$core$IIndexed$_nth = function() {
  var G__4653 = null;
  var G__4653__4654 = function(rng, n) {
    var this__4644 = this;
    if(cljs.core.truth_(n < cljs.core._count.call(null, rng))) {
      return this__4644.start + n * this__4644.step
    }else {
      if(cljs.core.truth_(function() {
        var and__3822__auto____4645 = this__4644.start > this__4644.end;
        if(cljs.core.truth_(and__3822__auto____4645)) {
          return cljs.core._EQ_.call(null, this__4644.step, 0)
        }else {
          return and__3822__auto____4645
        }
      }())) {
        return this__4644.start
      }else {
        throw new Error("Index out of bounds");
      }
    }
  };
  var G__4653__4655 = function(rng, n, not_found) {
    var this__4646 = this;
    if(cljs.core.truth_(n < cljs.core._count.call(null, rng))) {
      return this__4646.start + n * this__4646.step
    }else {
      if(cljs.core.truth_(function() {
        var and__3822__auto____4647 = this__4646.start > this__4646.end;
        if(cljs.core.truth_(and__3822__auto____4647)) {
          return cljs.core._EQ_.call(null, this__4646.step, 0)
        }else {
          return and__3822__auto____4647
        }
      }())) {
        return this__4646.start
      }else {
        return not_found
      }
    }
  };
  G__4653 = function(rng, n, not_found) {
    switch(arguments.length) {
      case 2:
        return G__4653__4654.call(this, rng, n);
      case 3:
        return G__4653__4655.call(this, rng, n, not_found)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return G__4653
}();
cljs.core.Range.prototype.cljs$core$IEmptyableCollection$ = true;
cljs.core.Range.prototype.cljs$core$IEmptyableCollection$_empty = function(rng) {
  var this__4648 = this;
  return cljs.core.with_meta.call(null, cljs.core.List.EMPTY, this__4648.meta)
};
cljs.core.Range;
cljs.core.range = function() {
  var range = null;
  var range__4657 = function() {
    return range.call(null, 0, Number["MAX_VALUE"], 1)
  };
  var range__4658 = function(end) {
    return range.call(null, 0, end, 1)
  };
  var range__4659 = function(start, end) {
    return range.call(null, start, end, 1)
  };
  var range__4660 = function(start, end, step) {
    return new cljs.core.Range(null, start, end, step)
  };
  range = function(start, end, step) {
    switch(arguments.length) {
      case 0:
        return range__4657.call(this);
      case 1:
        return range__4658.call(this, start);
      case 2:
        return range__4659.call(this, start, end);
      case 3:
        return range__4660.call(this, start, end, step)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return range
}();
cljs.core.take_nth = function take_nth(n, coll) {
  return new cljs.core.LazySeq(null, false, function() {
    var temp__3974__auto____4662 = cljs.core.seq.call(null, coll);
    if(cljs.core.truth_(temp__3974__auto____4662)) {
      var s__4663 = temp__3974__auto____4662;
      return cljs.core.cons.call(null, cljs.core.first.call(null, s__4663), take_nth.call(null, n, cljs.core.drop.call(null, n, s__4663)))
    }else {
      return null
    }
  })
};
cljs.core.split_with = function split_with(pred, coll) {
  return cljs.core.PersistentVector.fromArray([cljs.core.take_while.call(null, pred, coll), cljs.core.drop_while.call(null, pred, coll)])
};
cljs.core.partition_by = function partition_by(f, coll) {
  return new cljs.core.LazySeq(null, false, function() {
    var temp__3974__auto____4665 = cljs.core.seq.call(null, coll);
    if(cljs.core.truth_(temp__3974__auto____4665)) {
      var s__4666 = temp__3974__auto____4665;
      var fst__4667 = cljs.core.first.call(null, s__4666);
      var fv__4668 = f.call(null, fst__4667);
      var run__4669 = cljs.core.cons.call(null, fst__4667, cljs.core.take_while.call(null, function(p1__4664_SHARP_) {
        return cljs.core._EQ_.call(null, fv__4668, f.call(null, p1__4664_SHARP_))
      }, cljs.core.next.call(null, s__4666)));
      return cljs.core.cons.call(null, run__4669, partition_by.call(null, f, cljs.core.seq.call(null, cljs.core.drop.call(null, cljs.core.count.call(null, run__4669), s__4666))))
    }else {
      return null
    }
  })
};
cljs.core.frequencies = function frequencies(coll) {
  return cljs.core.reduce.call(null, function(counts, x) {
    return cljs.core.assoc.call(null, counts, x, cljs.core.get.call(null, counts, x, 0) + 1)
  }, cljs.core.ObjMap.fromObject([], {}), coll)
};
cljs.core.reductions = function() {
  var reductions = null;
  var reductions__4684 = function(f, coll) {
    return new cljs.core.LazySeq(null, false, function() {
      var temp__3971__auto____4680 = cljs.core.seq.call(null, coll);
      if(cljs.core.truth_(temp__3971__auto____4680)) {
        var s__4681 = temp__3971__auto____4680;
        return reductions.call(null, f, cljs.core.first.call(null, s__4681), cljs.core.rest.call(null, s__4681))
      }else {
        return cljs.core.list.call(null, f.call(null))
      }
    })
  };
  var reductions__4685 = function(f, init, coll) {
    return cljs.core.cons.call(null, init, new cljs.core.LazySeq(null, false, function() {
      var temp__3974__auto____4682 = cljs.core.seq.call(null, coll);
      if(cljs.core.truth_(temp__3974__auto____4682)) {
        var s__4683 = temp__3974__auto____4682;
        return reductions.call(null, f, f.call(null, init, cljs.core.first.call(null, s__4683)), cljs.core.rest.call(null, s__4683))
      }else {
        return null
      }
    }))
  };
  reductions = function(f, init, coll) {
    switch(arguments.length) {
      case 2:
        return reductions__4684.call(this, f, init);
      case 3:
        return reductions__4685.call(this, f, init, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return reductions
}();
cljs.core.juxt = function() {
  var juxt = null;
  var juxt__4688 = function(f) {
    return function() {
      var G__4693 = null;
      var G__4693__4694 = function() {
        return cljs.core.vector.call(null, f.call(null))
      };
      var G__4693__4695 = function(x) {
        return cljs.core.vector.call(null, f.call(null, x))
      };
      var G__4693__4696 = function(x, y) {
        return cljs.core.vector.call(null, f.call(null, x, y))
      };
      var G__4693__4697 = function(x, y, z) {
        return cljs.core.vector.call(null, f.call(null, x, y, z))
      };
      var G__4693__4698 = function() {
        var G__4700__delegate = function(x, y, z, args) {
          return cljs.core.vector.call(null, cljs.core.apply.call(null, f, x, y, z, args))
        };
        var G__4700 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__4700__delegate.call(this, x, y, z, args)
        };
        G__4700.cljs$lang$maxFixedArity = 3;
        G__4700.cljs$lang$applyTo = function(arglist__4701) {
          var x = cljs.core.first(arglist__4701);
          var y = cljs.core.first(cljs.core.next(arglist__4701));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4701)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__4701)));
          return G__4700__delegate.call(this, x, y, z, args)
        };
        return G__4700
      }();
      G__4693 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return G__4693__4694.call(this);
          case 1:
            return G__4693__4695.call(this, x);
          case 2:
            return G__4693__4696.call(this, x, y);
          case 3:
            return G__4693__4697.call(this, x, y, z);
          default:
            return G__4693__4698.apply(this, arguments)
        }
        throw"Invalid arity: " + arguments.length;
      };
      G__4693.cljs$lang$maxFixedArity = 3;
      G__4693.cljs$lang$applyTo = G__4693__4698.cljs$lang$applyTo;
      return G__4693
    }()
  };
  var juxt__4689 = function(f, g) {
    return function() {
      var G__4702 = null;
      var G__4702__4703 = function() {
        return cljs.core.vector.call(null, f.call(null), g.call(null))
      };
      var G__4702__4704 = function(x) {
        return cljs.core.vector.call(null, f.call(null, x), g.call(null, x))
      };
      var G__4702__4705 = function(x, y) {
        return cljs.core.vector.call(null, f.call(null, x, y), g.call(null, x, y))
      };
      var G__4702__4706 = function(x, y, z) {
        return cljs.core.vector.call(null, f.call(null, x, y, z), g.call(null, x, y, z))
      };
      var G__4702__4707 = function() {
        var G__4709__delegate = function(x, y, z, args) {
          return cljs.core.vector.call(null, cljs.core.apply.call(null, f, x, y, z, args), cljs.core.apply.call(null, g, x, y, z, args))
        };
        var G__4709 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__4709__delegate.call(this, x, y, z, args)
        };
        G__4709.cljs$lang$maxFixedArity = 3;
        G__4709.cljs$lang$applyTo = function(arglist__4710) {
          var x = cljs.core.first(arglist__4710);
          var y = cljs.core.first(cljs.core.next(arglist__4710));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4710)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__4710)));
          return G__4709__delegate.call(this, x, y, z, args)
        };
        return G__4709
      }();
      G__4702 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return G__4702__4703.call(this);
          case 1:
            return G__4702__4704.call(this, x);
          case 2:
            return G__4702__4705.call(this, x, y);
          case 3:
            return G__4702__4706.call(this, x, y, z);
          default:
            return G__4702__4707.apply(this, arguments)
        }
        throw"Invalid arity: " + arguments.length;
      };
      G__4702.cljs$lang$maxFixedArity = 3;
      G__4702.cljs$lang$applyTo = G__4702__4707.cljs$lang$applyTo;
      return G__4702
    }()
  };
  var juxt__4690 = function(f, g, h) {
    return function() {
      var G__4711 = null;
      var G__4711__4712 = function() {
        return cljs.core.vector.call(null, f.call(null), g.call(null), h.call(null))
      };
      var G__4711__4713 = function(x) {
        return cljs.core.vector.call(null, f.call(null, x), g.call(null, x), h.call(null, x))
      };
      var G__4711__4714 = function(x, y) {
        return cljs.core.vector.call(null, f.call(null, x, y), g.call(null, x, y), h.call(null, x, y))
      };
      var G__4711__4715 = function(x, y, z) {
        return cljs.core.vector.call(null, f.call(null, x, y, z), g.call(null, x, y, z), h.call(null, x, y, z))
      };
      var G__4711__4716 = function() {
        var G__4718__delegate = function(x, y, z, args) {
          return cljs.core.vector.call(null, cljs.core.apply.call(null, f, x, y, z, args), cljs.core.apply.call(null, g, x, y, z, args), cljs.core.apply.call(null, h, x, y, z, args))
        };
        var G__4718 = function(x, y, z, var_args) {
          var args = null;
          if(goog.isDef(var_args)) {
            args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
          }
          return G__4718__delegate.call(this, x, y, z, args)
        };
        G__4718.cljs$lang$maxFixedArity = 3;
        G__4718.cljs$lang$applyTo = function(arglist__4719) {
          var x = cljs.core.first(arglist__4719);
          var y = cljs.core.first(cljs.core.next(arglist__4719));
          var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4719)));
          var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__4719)));
          return G__4718__delegate.call(this, x, y, z, args)
        };
        return G__4718
      }();
      G__4711 = function(x, y, z, var_args) {
        var args = var_args;
        switch(arguments.length) {
          case 0:
            return G__4711__4712.call(this);
          case 1:
            return G__4711__4713.call(this, x);
          case 2:
            return G__4711__4714.call(this, x, y);
          case 3:
            return G__4711__4715.call(this, x, y, z);
          default:
            return G__4711__4716.apply(this, arguments)
        }
        throw"Invalid arity: " + arguments.length;
      };
      G__4711.cljs$lang$maxFixedArity = 3;
      G__4711.cljs$lang$applyTo = G__4711__4716.cljs$lang$applyTo;
      return G__4711
    }()
  };
  var juxt__4691 = function() {
    var G__4720__delegate = function(f, g, h, fs) {
      var fs__4687 = cljs.core.list_STAR_.call(null, f, g, h, fs);
      return function() {
        var G__4721 = null;
        var G__4721__4722 = function() {
          return cljs.core.reduce.call(null, function(p1__4670_SHARP_, p2__4671_SHARP_) {
            return cljs.core.conj.call(null, p1__4670_SHARP_, p2__4671_SHARP_.call(null))
          }, cljs.core.PersistentVector.fromArray([]), fs__4687)
        };
        var G__4721__4723 = function(x) {
          return cljs.core.reduce.call(null, function(p1__4672_SHARP_, p2__4673_SHARP_) {
            return cljs.core.conj.call(null, p1__4672_SHARP_, p2__4673_SHARP_.call(null, x))
          }, cljs.core.PersistentVector.fromArray([]), fs__4687)
        };
        var G__4721__4724 = function(x, y) {
          return cljs.core.reduce.call(null, function(p1__4674_SHARP_, p2__4675_SHARP_) {
            return cljs.core.conj.call(null, p1__4674_SHARP_, p2__4675_SHARP_.call(null, x, y))
          }, cljs.core.PersistentVector.fromArray([]), fs__4687)
        };
        var G__4721__4725 = function(x, y, z) {
          return cljs.core.reduce.call(null, function(p1__4676_SHARP_, p2__4677_SHARP_) {
            return cljs.core.conj.call(null, p1__4676_SHARP_, p2__4677_SHARP_.call(null, x, y, z))
          }, cljs.core.PersistentVector.fromArray([]), fs__4687)
        };
        var G__4721__4726 = function() {
          var G__4728__delegate = function(x, y, z, args) {
            return cljs.core.reduce.call(null, function(p1__4678_SHARP_, p2__4679_SHARP_) {
              return cljs.core.conj.call(null, p1__4678_SHARP_, cljs.core.apply.call(null, p2__4679_SHARP_, x, y, z, args))
            }, cljs.core.PersistentVector.fromArray([]), fs__4687)
          };
          var G__4728 = function(x, y, z, var_args) {
            var args = null;
            if(goog.isDef(var_args)) {
              args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
            }
            return G__4728__delegate.call(this, x, y, z, args)
          };
          G__4728.cljs$lang$maxFixedArity = 3;
          G__4728.cljs$lang$applyTo = function(arglist__4729) {
            var x = cljs.core.first(arglist__4729);
            var y = cljs.core.first(cljs.core.next(arglist__4729));
            var z = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4729)));
            var args = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__4729)));
            return G__4728__delegate.call(this, x, y, z, args)
          };
          return G__4728
        }();
        G__4721 = function(x, y, z, var_args) {
          var args = var_args;
          switch(arguments.length) {
            case 0:
              return G__4721__4722.call(this);
            case 1:
              return G__4721__4723.call(this, x);
            case 2:
              return G__4721__4724.call(this, x, y);
            case 3:
              return G__4721__4725.call(this, x, y, z);
            default:
              return G__4721__4726.apply(this, arguments)
          }
          throw"Invalid arity: " + arguments.length;
        };
        G__4721.cljs$lang$maxFixedArity = 3;
        G__4721.cljs$lang$applyTo = G__4721__4726.cljs$lang$applyTo;
        return G__4721
      }()
    };
    var G__4720 = function(f, g, h, var_args) {
      var fs = null;
      if(goog.isDef(var_args)) {
        fs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 3), 0)
      }
      return G__4720__delegate.call(this, f, g, h, fs)
    };
    G__4720.cljs$lang$maxFixedArity = 3;
    G__4720.cljs$lang$applyTo = function(arglist__4730) {
      var f = cljs.core.first(arglist__4730);
      var g = cljs.core.first(cljs.core.next(arglist__4730));
      var h = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4730)));
      var fs = cljs.core.rest(cljs.core.next(cljs.core.next(arglist__4730)));
      return G__4720__delegate.call(this, f, g, h, fs)
    };
    return G__4720
  }();
  juxt = function(f, g, h, var_args) {
    var fs = var_args;
    switch(arguments.length) {
      case 1:
        return juxt__4688.call(this, f);
      case 2:
        return juxt__4689.call(this, f, g);
      case 3:
        return juxt__4690.call(this, f, g, h);
      default:
        return juxt__4691.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  juxt.cljs$lang$maxFixedArity = 3;
  juxt.cljs$lang$applyTo = juxt__4691.cljs$lang$applyTo;
  return juxt
}();
cljs.core.dorun = function() {
  var dorun = null;
  var dorun__4732 = function(coll) {
    while(true) {
      if(cljs.core.truth_(cljs.core.seq.call(null, coll))) {
        var G__4735 = cljs.core.next.call(null, coll);
        coll = G__4735;
        continue
      }else {
        return null
      }
      break
    }
  };
  var dorun__4733 = function(n, coll) {
    while(true) {
      if(cljs.core.truth_(function() {
        var and__3822__auto____4731 = cljs.core.seq.call(null, coll);
        if(cljs.core.truth_(and__3822__auto____4731)) {
          return n > 0
        }else {
          return and__3822__auto____4731
        }
      }())) {
        var G__4736 = n - 1;
        var G__4737 = cljs.core.next.call(null, coll);
        n = G__4736;
        coll = G__4737;
        continue
      }else {
        return null
      }
      break
    }
  };
  dorun = function(n, coll) {
    switch(arguments.length) {
      case 1:
        return dorun__4732.call(this, n);
      case 2:
        return dorun__4733.call(this, n, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return dorun
}();
cljs.core.doall = function() {
  var doall = null;
  var doall__4738 = function(coll) {
    cljs.core.dorun.call(null, coll);
    return coll
  };
  var doall__4739 = function(n, coll) {
    cljs.core.dorun.call(null, n, coll);
    return coll
  };
  doall = function(n, coll) {
    switch(arguments.length) {
      case 1:
        return doall__4738.call(this, n);
      case 2:
        return doall__4739.call(this, n, coll)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return doall
}();
cljs.core.re_matches = function re_matches(re, s) {
  var matches__4741 = re.exec(s);
  if(cljs.core.truth_(cljs.core._EQ_.call(null, cljs.core.first.call(null, matches__4741), s))) {
    if(cljs.core.truth_(cljs.core._EQ_.call(null, cljs.core.count.call(null, matches__4741), 1))) {
      return cljs.core.first.call(null, matches__4741)
    }else {
      return cljs.core.vec.call(null, matches__4741)
    }
  }else {
    return null
  }
};
cljs.core.re_find = function re_find(re, s) {
  var matches__4742 = re.exec(s);
  if(cljs.core.truth_(matches__4742 === null)) {
    return null
  }else {
    if(cljs.core.truth_(cljs.core._EQ_.call(null, cljs.core.count.call(null, matches__4742), 1))) {
      return cljs.core.first.call(null, matches__4742)
    }else {
      return cljs.core.vec.call(null, matches__4742)
    }
  }
};
cljs.core.re_seq = function re_seq(re, s) {
  var match_data__4743 = cljs.core.re_find.call(null, re, s);
  var match_idx__4744 = s.search(re);
  var match_str__4745 = cljs.core.truth_(cljs.core.coll_QMARK_.call(null, match_data__4743)) ? cljs.core.first.call(null, match_data__4743) : match_data__4743;
  var post_match__4746 = cljs.core.subs.call(null, s, match_idx__4744 + cljs.core.count.call(null, match_str__4745));
  if(cljs.core.truth_(match_data__4743)) {
    return new cljs.core.LazySeq(null, false, function() {
      return cljs.core.cons.call(null, match_data__4743, re_seq.call(null, re, post_match__4746))
    })
  }else {
    return null
  }
};
cljs.core.re_pattern = function re_pattern(s) {
  var vec__4748__4749 = cljs.core.re_find.call(null, /^(?:\(\?([idmsux]*)\))?(.*)/, s);
  var ___4750 = cljs.core.nth.call(null, vec__4748__4749, 0, null);
  var flags__4751 = cljs.core.nth.call(null, vec__4748__4749, 1, null);
  var pattern__4752 = cljs.core.nth.call(null, vec__4748__4749, 2, null);
  return new RegExp(pattern__4752, flags__4751)
};
cljs.core.pr_sequential = function pr_sequential(print_one, begin, sep, end, opts, coll) {
  return cljs.core.concat.call(null, cljs.core.PersistentVector.fromArray([begin]), cljs.core.flatten1.call(null, cljs.core.interpose.call(null, cljs.core.PersistentVector.fromArray([sep]), cljs.core.map.call(null, function(p1__4747_SHARP_) {
    return print_one.call(null, p1__4747_SHARP_, opts)
  }, coll))), cljs.core.PersistentVector.fromArray([end]))
};
cljs.core.string_print = function string_print(x) {
  cljs.core._STAR_print_fn_STAR_.call(null, x);
  return null
};
cljs.core.flush = function flush() {
  return null
};
cljs.core.pr_seq = function pr_seq(obj, opts) {
  if(cljs.core.truth_(obj === null)) {
    return cljs.core.list.call(null, "nil")
  }else {
    if(cljs.core.truth_(void 0 === obj)) {
      return cljs.core.list.call(null, "#<undefined>")
    }else {
      if(cljs.core.truth_("\ufdd0'else")) {
        return cljs.core.concat.call(null, cljs.core.truth_(function() {
          var and__3822__auto____4753 = cljs.core.get.call(null, opts, "\ufdd0'meta");
          if(cljs.core.truth_(and__3822__auto____4753)) {
            var and__3822__auto____4757 = function() {
              var x__451__auto____4754 = obj;
              if(cljs.core.truth_(function() {
                var and__3822__auto____4755 = x__451__auto____4754;
                if(cljs.core.truth_(and__3822__auto____4755)) {
                  var and__3822__auto____4756 = x__451__auto____4754.cljs$core$IMeta$;
                  if(cljs.core.truth_(and__3822__auto____4756)) {
                    return cljs.core.not.call(null, x__451__auto____4754.hasOwnProperty("cljs$core$IMeta$"))
                  }else {
                    return and__3822__auto____4756
                  }
                }else {
                  return and__3822__auto____4755
                }
              }())) {
                return true
              }else {
                return cljs.core.type_satisfies_.call(null, cljs.core.IMeta, x__451__auto____4754)
              }
            }();
            if(cljs.core.truth_(and__3822__auto____4757)) {
              return cljs.core.meta.call(null, obj)
            }else {
              return and__3822__auto____4757
            }
          }else {
            return and__3822__auto____4753
          }
        }()) ? cljs.core.concat.call(null, cljs.core.PersistentVector.fromArray(["^"]), pr_seq.call(null, cljs.core.meta.call(null, obj), opts), cljs.core.PersistentVector.fromArray([" "])) : null, cljs.core.truth_(function() {
          var x__451__auto____4758 = obj;
          if(cljs.core.truth_(function() {
            var and__3822__auto____4759 = x__451__auto____4758;
            if(cljs.core.truth_(and__3822__auto____4759)) {
              var and__3822__auto____4760 = x__451__auto____4758.cljs$core$IPrintable$;
              if(cljs.core.truth_(and__3822__auto____4760)) {
                return cljs.core.not.call(null, x__451__auto____4758.hasOwnProperty("cljs$core$IPrintable$"))
              }else {
                return and__3822__auto____4760
              }
            }else {
              return and__3822__auto____4759
            }
          }())) {
            return true
          }else {
            return cljs.core.type_satisfies_.call(null, cljs.core.IPrintable, x__451__auto____4758)
          }
        }()) ? cljs.core._pr_seq.call(null, obj, opts) : cljs.core.list.call(null, "#<", cljs.core.str.call(null, obj), ">"))
      }else {
        return null
      }
    }
  }
};
cljs.core.pr_sb = function pr_sb(objs, opts) {
  var first_obj__4761 = cljs.core.first.call(null, objs);
  var sb__4762 = new goog.string.StringBuffer;
  var G__4763__4764 = cljs.core.seq.call(null, objs);
  if(cljs.core.truth_(G__4763__4764)) {
    var obj__4765 = cljs.core.first.call(null, G__4763__4764);
    var G__4763__4766 = G__4763__4764;
    while(true) {
      if(cljs.core.truth_(obj__4765 === first_obj__4761)) {
      }else {
        sb__4762.append(" ")
      }
      var G__4767__4768 = cljs.core.seq.call(null, cljs.core.pr_seq.call(null, obj__4765, opts));
      if(cljs.core.truth_(G__4767__4768)) {
        var string__4769 = cljs.core.first.call(null, G__4767__4768);
        var G__4767__4770 = G__4767__4768;
        while(true) {
          sb__4762.append(string__4769);
          var temp__3974__auto____4771 = cljs.core.next.call(null, G__4767__4770);
          if(cljs.core.truth_(temp__3974__auto____4771)) {
            var G__4767__4772 = temp__3974__auto____4771;
            var G__4775 = cljs.core.first.call(null, G__4767__4772);
            var G__4776 = G__4767__4772;
            string__4769 = G__4775;
            G__4767__4770 = G__4776;
            continue
          }else {
          }
          break
        }
      }else {
      }
      var temp__3974__auto____4773 = cljs.core.next.call(null, G__4763__4766);
      if(cljs.core.truth_(temp__3974__auto____4773)) {
        var G__4763__4774 = temp__3974__auto____4773;
        var G__4777 = cljs.core.first.call(null, G__4763__4774);
        var G__4778 = G__4763__4774;
        obj__4765 = G__4777;
        G__4763__4766 = G__4778;
        continue
      }else {
      }
      break
    }
  }else {
  }
  return sb__4762
};
cljs.core.pr_str_with_opts = function pr_str_with_opts(objs, opts) {
  return cljs.core.str.call(null, cljs.core.pr_sb.call(null, objs, opts))
};
cljs.core.prn_str_with_opts = function prn_str_with_opts(objs, opts) {
  var sb__4779 = cljs.core.pr_sb.call(null, objs, opts);
  sb__4779.append("\n");
  return cljs.core.str.call(null, sb__4779)
};
cljs.core.pr_with_opts = function pr_with_opts(objs, opts) {
  var first_obj__4780 = cljs.core.first.call(null, objs);
  var G__4781__4782 = cljs.core.seq.call(null, objs);
  if(cljs.core.truth_(G__4781__4782)) {
    var obj__4783 = cljs.core.first.call(null, G__4781__4782);
    var G__4781__4784 = G__4781__4782;
    while(true) {
      if(cljs.core.truth_(obj__4783 === first_obj__4780)) {
      }else {
        cljs.core.string_print.call(null, " ")
      }
      var G__4785__4786 = cljs.core.seq.call(null, cljs.core.pr_seq.call(null, obj__4783, opts));
      if(cljs.core.truth_(G__4785__4786)) {
        var string__4787 = cljs.core.first.call(null, G__4785__4786);
        var G__4785__4788 = G__4785__4786;
        while(true) {
          cljs.core.string_print.call(null, string__4787);
          var temp__3974__auto____4789 = cljs.core.next.call(null, G__4785__4788);
          if(cljs.core.truth_(temp__3974__auto____4789)) {
            var G__4785__4790 = temp__3974__auto____4789;
            var G__4793 = cljs.core.first.call(null, G__4785__4790);
            var G__4794 = G__4785__4790;
            string__4787 = G__4793;
            G__4785__4788 = G__4794;
            continue
          }else {
          }
          break
        }
      }else {
      }
      var temp__3974__auto____4791 = cljs.core.next.call(null, G__4781__4784);
      if(cljs.core.truth_(temp__3974__auto____4791)) {
        var G__4781__4792 = temp__3974__auto____4791;
        var G__4795 = cljs.core.first.call(null, G__4781__4792);
        var G__4796 = G__4781__4792;
        obj__4783 = G__4795;
        G__4781__4784 = G__4796;
        continue
      }else {
        return null
      }
      break
    }
  }else {
    return null
  }
};
cljs.core.newline = function newline(opts) {
  cljs.core.string_print.call(null, "\n");
  if(cljs.core.truth_(cljs.core.get.call(null, opts, "\ufdd0'flush-on-newline"))) {
    return cljs.core.flush.call(null)
  }else {
    return null
  }
};
cljs.core._STAR_flush_on_newline_STAR_ = true;
cljs.core._STAR_print_readably_STAR_ = true;
cljs.core._STAR_print_meta_STAR_ = false;
cljs.core._STAR_print_dup_STAR_ = false;
cljs.core.pr_opts = function pr_opts() {
  return cljs.core.ObjMap.fromObject(["\ufdd0'flush-on-newline", "\ufdd0'readably", "\ufdd0'meta", "\ufdd0'dup"], {"\ufdd0'flush-on-newline":cljs.core._STAR_flush_on_newline_STAR_, "\ufdd0'readably":cljs.core._STAR_print_readably_STAR_, "\ufdd0'meta":cljs.core._STAR_print_meta_STAR_, "\ufdd0'dup":cljs.core._STAR_print_dup_STAR_})
};
cljs.core.pr_str = function() {
  var pr_str__delegate = function(objs) {
    return cljs.core.pr_str_with_opts.call(null, objs, cljs.core.pr_opts.call(null))
  };
  var pr_str = function(var_args) {
    var objs = null;
    if(goog.isDef(var_args)) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return pr_str__delegate.call(this, objs)
  };
  pr_str.cljs$lang$maxFixedArity = 0;
  pr_str.cljs$lang$applyTo = function(arglist__4797) {
    var objs = cljs.core.seq(arglist__4797);
    return pr_str__delegate.call(this, objs)
  };
  return pr_str
}();
cljs.core.prn_str = function() {
  var prn_str__delegate = function(objs) {
    return cljs.core.prn_str_with_opts.call(null, objs, cljs.core.pr_opts.call(null))
  };
  var prn_str = function(var_args) {
    var objs = null;
    if(goog.isDef(var_args)) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return prn_str__delegate.call(this, objs)
  };
  prn_str.cljs$lang$maxFixedArity = 0;
  prn_str.cljs$lang$applyTo = function(arglist__4798) {
    var objs = cljs.core.seq(arglist__4798);
    return prn_str__delegate.call(this, objs)
  };
  return prn_str
}();
cljs.core.pr = function() {
  var pr__delegate = function(objs) {
    return cljs.core.pr_with_opts.call(null, objs, cljs.core.pr_opts.call(null))
  };
  var pr = function(var_args) {
    var objs = null;
    if(goog.isDef(var_args)) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return pr__delegate.call(this, objs)
  };
  pr.cljs$lang$maxFixedArity = 0;
  pr.cljs$lang$applyTo = function(arglist__4799) {
    var objs = cljs.core.seq(arglist__4799);
    return pr__delegate.call(this, objs)
  };
  return pr
}();
cljs.core.print = function() {
  var cljs_core_print__delegate = function(objs) {
    return cljs.core.pr_with_opts.call(null, objs, cljs.core.assoc.call(null, cljs.core.pr_opts.call(null), "\ufdd0'readably", false))
  };
  var cljs_core_print = function(var_args) {
    var objs = null;
    if(goog.isDef(var_args)) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return cljs_core_print__delegate.call(this, objs)
  };
  cljs_core_print.cljs$lang$maxFixedArity = 0;
  cljs_core_print.cljs$lang$applyTo = function(arglist__4800) {
    var objs = cljs.core.seq(arglist__4800);
    return cljs_core_print__delegate.call(this, objs)
  };
  return cljs_core_print
}();
cljs.core.print_str = function() {
  var print_str__delegate = function(objs) {
    return cljs.core.pr_str_with_opts.call(null, objs, cljs.core.assoc.call(null, cljs.core.pr_opts.call(null), "\ufdd0'readably", false))
  };
  var print_str = function(var_args) {
    var objs = null;
    if(goog.isDef(var_args)) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return print_str__delegate.call(this, objs)
  };
  print_str.cljs$lang$maxFixedArity = 0;
  print_str.cljs$lang$applyTo = function(arglist__4801) {
    var objs = cljs.core.seq(arglist__4801);
    return print_str__delegate.call(this, objs)
  };
  return print_str
}();
cljs.core.println = function() {
  var println__delegate = function(objs) {
    cljs.core.pr_with_opts.call(null, objs, cljs.core.assoc.call(null, cljs.core.pr_opts.call(null), "\ufdd0'readably", false));
    return cljs.core.newline.call(null, cljs.core.pr_opts.call(null))
  };
  var println = function(var_args) {
    var objs = null;
    if(goog.isDef(var_args)) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return println__delegate.call(this, objs)
  };
  println.cljs$lang$maxFixedArity = 0;
  println.cljs$lang$applyTo = function(arglist__4802) {
    var objs = cljs.core.seq(arglist__4802);
    return println__delegate.call(this, objs)
  };
  return println
}();
cljs.core.println_str = function() {
  var println_str__delegate = function(objs) {
    return cljs.core.prn_str_with_opts.call(null, objs, cljs.core.assoc.call(null, cljs.core.pr_opts.call(null), "\ufdd0'readably", false))
  };
  var println_str = function(var_args) {
    var objs = null;
    if(goog.isDef(var_args)) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return println_str__delegate.call(this, objs)
  };
  println_str.cljs$lang$maxFixedArity = 0;
  println_str.cljs$lang$applyTo = function(arglist__4803) {
    var objs = cljs.core.seq(arglist__4803);
    return println_str__delegate.call(this, objs)
  };
  return println_str
}();
cljs.core.prn = function() {
  var prn__delegate = function(objs) {
    cljs.core.pr_with_opts.call(null, objs, cljs.core.pr_opts.call(null));
    return cljs.core.newline.call(null, cljs.core.pr_opts.call(null))
  };
  var prn = function(var_args) {
    var objs = null;
    if(goog.isDef(var_args)) {
      objs = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
    }
    return prn__delegate.call(this, objs)
  };
  prn.cljs$lang$maxFixedArity = 0;
  prn.cljs$lang$applyTo = function(arglist__4804) {
    var objs = cljs.core.seq(arglist__4804);
    return prn__delegate.call(this, objs)
  };
  return prn
}();
cljs.core.HashMap.prototype.cljs$core$IPrintable$ = true;
cljs.core.HashMap.prototype.cljs$core$IPrintable$_pr_seq = function(coll, opts) {
  var pr_pair__4805 = function(keyval) {
    return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "", " ", "", opts, keyval)
  };
  return cljs.core.pr_sequential.call(null, pr_pair__4805, "{", ", ", "}", opts, coll)
};
cljs.core.IPrintable["number"] = true;
cljs.core._pr_seq["number"] = function(n, opts) {
  return cljs.core.list.call(null, cljs.core.str.call(null, n))
};
cljs.core.IndexedSeq.prototype.cljs$core$IPrintable$ = true;
cljs.core.IndexedSeq.prototype.cljs$core$IPrintable$_pr_seq = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "(", " ", ")", opts, coll)
};
cljs.core.Subvec.prototype.cljs$core$IPrintable$ = true;
cljs.core.Subvec.prototype.cljs$core$IPrintable$_pr_seq = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "[", " ", "]", opts, coll)
};
cljs.core.LazySeq.prototype.cljs$core$IPrintable$ = true;
cljs.core.LazySeq.prototype.cljs$core$IPrintable$_pr_seq = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "(", " ", ")", opts, coll)
};
cljs.core.IPrintable["boolean"] = true;
cljs.core._pr_seq["boolean"] = function(bool, opts) {
  return cljs.core.list.call(null, cljs.core.str.call(null, bool))
};
cljs.core.Set.prototype.cljs$core$IPrintable$ = true;
cljs.core.Set.prototype.cljs$core$IPrintable$_pr_seq = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "#{", " ", "}", opts, coll)
};
cljs.core.IPrintable["string"] = true;
cljs.core._pr_seq["string"] = function(obj, opts) {
  if(cljs.core.truth_(cljs.core.keyword_QMARK_.call(null, obj))) {
    return cljs.core.list.call(null, cljs.core.str.call(null, ":", function() {
      var temp__3974__auto____4806 = cljs.core.namespace.call(null, obj);
      if(cljs.core.truth_(temp__3974__auto____4806)) {
        var nspc__4807 = temp__3974__auto____4806;
        return cljs.core.str.call(null, nspc__4807, "/")
      }else {
        return null
      }
    }(), cljs.core.name.call(null, obj)))
  }else {
    if(cljs.core.truth_(cljs.core.symbol_QMARK_.call(null, obj))) {
      return cljs.core.list.call(null, cljs.core.str.call(null, function() {
        var temp__3974__auto____4808 = cljs.core.namespace.call(null, obj);
        if(cljs.core.truth_(temp__3974__auto____4808)) {
          var nspc__4809 = temp__3974__auto____4808;
          return cljs.core.str.call(null, nspc__4809, "/")
        }else {
          return null
        }
      }(), cljs.core.name.call(null, obj)))
    }else {
      if(cljs.core.truth_("\ufdd0'else")) {
        return cljs.core.list.call(null, cljs.core.truth_("\ufdd0'readably".call(null, opts)) ? goog.string.quote.call(null, obj) : obj)
      }else {
        return null
      }
    }
  }
};
cljs.core.Vector.prototype.cljs$core$IPrintable$ = true;
cljs.core.Vector.prototype.cljs$core$IPrintable$_pr_seq = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "[", " ", "]", opts, coll)
};
cljs.core.PersistentVector.prototype.cljs$core$IPrintable$ = true;
cljs.core.PersistentVector.prototype.cljs$core$IPrintable$_pr_seq = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "[", " ", "]", opts, coll)
};
cljs.core.List.prototype.cljs$core$IPrintable$ = true;
cljs.core.List.prototype.cljs$core$IPrintable$_pr_seq = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "(", " ", ")", opts, coll)
};
cljs.core.IPrintable["array"] = true;
cljs.core._pr_seq["array"] = function(a, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "#<Array [", ", ", "]>", opts, a)
};
cljs.core.PersistentQueueSeq.prototype.cljs$core$IPrintable$ = true;
cljs.core.PersistentQueueSeq.prototype.cljs$core$IPrintable$_pr_seq = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "(", " ", ")", opts, coll)
};
cljs.core.IPrintable["function"] = true;
cljs.core._pr_seq["function"] = function(this$) {
  return cljs.core.list.call(null, "#<", cljs.core.str.call(null, this$), ">")
};
cljs.core.EmptyList.prototype.cljs$core$IPrintable$ = true;
cljs.core.EmptyList.prototype.cljs$core$IPrintable$_pr_seq = function(coll, opts) {
  return cljs.core.list.call(null, "()")
};
cljs.core.Cons.prototype.cljs$core$IPrintable$ = true;
cljs.core.Cons.prototype.cljs$core$IPrintable$_pr_seq = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "(", " ", ")", opts, coll)
};
cljs.core.Range.prototype.cljs$core$IPrintable$ = true;
cljs.core.Range.prototype.cljs$core$IPrintable$_pr_seq = function(coll, opts) {
  return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "(", " ", ")", opts, coll)
};
cljs.core.ObjMap.prototype.cljs$core$IPrintable$ = true;
cljs.core.ObjMap.prototype.cljs$core$IPrintable$_pr_seq = function(coll, opts) {
  var pr_pair__4810 = function(keyval) {
    return cljs.core.pr_sequential.call(null, cljs.core.pr_seq, "", " ", "", opts, keyval)
  };
  return cljs.core.pr_sequential.call(null, pr_pair__4810, "{", ", ", "}", opts, coll)
};
cljs.core.Atom = function(state, meta, validator, watches) {
  this.state = state;
  this.meta = meta;
  this.validator = validator;
  this.watches = watches
};
cljs.core.Atom.cljs$core$IPrintable$_pr_seq = function(this__367__auto__) {
  return cljs.core.list.call(null, "cljs.core.Atom")
};
cljs.core.Atom.prototype.cljs$core$IHash$ = true;
cljs.core.Atom.prototype.cljs$core$IHash$_hash = function(this$) {
  var this__4811 = this;
  return goog.getUid.call(null, this$)
};
cljs.core.Atom.prototype.cljs$core$IWatchable$ = true;
cljs.core.Atom.prototype.cljs$core$IWatchable$_notify_watches = function(this$, oldval, newval) {
  var this__4812 = this;
  var G__4813__4814 = cljs.core.seq.call(null, this__4812.watches);
  if(cljs.core.truth_(G__4813__4814)) {
    var G__4816__4818 = cljs.core.first.call(null, G__4813__4814);
    var vec__4817__4819 = G__4816__4818;
    var key__4820 = cljs.core.nth.call(null, vec__4817__4819, 0, null);
    var f__4821 = cljs.core.nth.call(null, vec__4817__4819, 1, null);
    var G__4813__4822 = G__4813__4814;
    var G__4816__4823 = G__4816__4818;
    var G__4813__4824 = G__4813__4822;
    while(true) {
      var vec__4825__4826 = G__4816__4823;
      var key__4827 = cljs.core.nth.call(null, vec__4825__4826, 0, null);
      var f__4828 = cljs.core.nth.call(null, vec__4825__4826, 1, null);
      var G__4813__4829 = G__4813__4824;
      f__4828.call(null, key__4827, this$, oldval, newval);
      var temp__3974__auto____4830 = cljs.core.next.call(null, G__4813__4829);
      if(cljs.core.truth_(temp__3974__auto____4830)) {
        var G__4813__4831 = temp__3974__auto____4830;
        var G__4838 = cljs.core.first.call(null, G__4813__4831);
        var G__4839 = G__4813__4831;
        G__4816__4823 = G__4838;
        G__4813__4824 = G__4839;
        continue
      }else {
        return null
      }
      break
    }
  }else {
    return null
  }
};
cljs.core.Atom.prototype.cljs$core$IWatchable$_add_watch = function(this$, key, f) {
  var this__4832 = this;
  return this$.watches = cljs.core.assoc.call(null, this__4832.watches, key, f)
};
cljs.core.Atom.prototype.cljs$core$IWatchable$_remove_watch = function(this$, key) {
  var this__4833 = this;
  return this$.watches = cljs.core.dissoc.call(null, this__4833.watches, key)
};
cljs.core.Atom.prototype.cljs$core$IPrintable$ = true;
cljs.core.Atom.prototype.cljs$core$IPrintable$_pr_seq = function(a, opts) {
  var this__4834 = this;
  return cljs.core.concat.call(null, cljs.core.PersistentVector.fromArray(["#<Atom: "]), cljs.core._pr_seq.call(null, this__4834.state, opts), ">")
};
cljs.core.Atom.prototype.cljs$core$IMeta$ = true;
cljs.core.Atom.prototype.cljs$core$IMeta$_meta = function(_) {
  var this__4835 = this;
  return this__4835.meta
};
cljs.core.Atom.prototype.cljs$core$IDeref$ = true;
cljs.core.Atom.prototype.cljs$core$IDeref$_deref = function(_) {
  var this__4836 = this;
  return this__4836.state
};
cljs.core.Atom.prototype.cljs$core$IEquiv$ = true;
cljs.core.Atom.prototype.cljs$core$IEquiv$_equiv = function(o, other) {
  var this__4837 = this;
  return o === other
};
cljs.core.Atom;
cljs.core.atom = function() {
  var atom = null;
  var atom__4846 = function(x) {
    return new cljs.core.Atom(x, null, null, null)
  };
  var atom__4847 = function() {
    var G__4849__delegate = function(x, p__4840) {
      var map__4841__4842 = p__4840;
      var map__4841__4843 = cljs.core.truth_(cljs.core.seq_QMARK_.call(null, map__4841__4842)) ? cljs.core.apply.call(null, cljs.core.hash_map, map__4841__4842) : map__4841__4842;
      var validator__4844 = cljs.core.get.call(null, map__4841__4843, "\ufdd0'validator");
      var meta__4845 = cljs.core.get.call(null, map__4841__4843, "\ufdd0'meta");
      return new cljs.core.Atom(x, meta__4845, validator__4844, null)
    };
    var G__4849 = function(x, var_args) {
      var p__4840 = null;
      if(goog.isDef(var_args)) {
        p__4840 = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
      }
      return G__4849__delegate.call(this, x, p__4840)
    };
    G__4849.cljs$lang$maxFixedArity = 1;
    G__4849.cljs$lang$applyTo = function(arglist__4850) {
      var x = cljs.core.first(arglist__4850);
      var p__4840 = cljs.core.rest(arglist__4850);
      return G__4849__delegate.call(this, x, p__4840)
    };
    return G__4849
  }();
  atom = function(x, var_args) {
    var p__4840 = var_args;
    switch(arguments.length) {
      case 1:
        return atom__4846.call(this, x);
      default:
        return atom__4847.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  atom.cljs$lang$maxFixedArity = 1;
  atom.cljs$lang$applyTo = atom__4847.cljs$lang$applyTo;
  return atom
}();
cljs.core.reset_BANG_ = function reset_BANG_(a, new_value) {
  var temp__3974__auto____4851 = a.validator;
  if(cljs.core.truth_(temp__3974__auto____4851)) {
    var validate__4852 = temp__3974__auto____4851;
    if(cljs.core.truth_(validate__4852.call(null, new_value))) {
    }else {
      throw new Error(cljs.core.str.call(null, "Assert failed: ", "Validator rejected reference state", "\n", cljs.core.pr_str.call(null, cljs.core.with_meta(cljs.core.list("\ufdd1'validate", "\ufdd1'new-value"), cljs.core.hash_map("\ufdd0'line", 3282)))));
    }
  }else {
  }
  var old_value__4853 = a.state;
  a.state = new_value;
  cljs.core._notify_watches.call(null, a, old_value__4853, new_value);
  return new_value
};
cljs.core.swap_BANG_ = function() {
  var swap_BANG_ = null;
  var swap_BANG___4854 = function(a, f) {
    return cljs.core.reset_BANG_.call(null, a, f.call(null, a.state))
  };
  var swap_BANG___4855 = function(a, f, x) {
    return cljs.core.reset_BANG_.call(null, a, f.call(null, a.state, x))
  };
  var swap_BANG___4856 = function(a, f, x, y) {
    return cljs.core.reset_BANG_.call(null, a, f.call(null, a.state, x, y))
  };
  var swap_BANG___4857 = function(a, f, x, y, z) {
    return cljs.core.reset_BANG_.call(null, a, f.call(null, a.state, x, y, z))
  };
  var swap_BANG___4858 = function() {
    var G__4860__delegate = function(a, f, x, y, z, more) {
      return cljs.core.reset_BANG_.call(null, a, cljs.core.apply.call(null, f, a.state, x, y, z, more))
    };
    var G__4860 = function(a, f, x, y, z, var_args) {
      var more = null;
      if(goog.isDef(var_args)) {
        more = cljs.core.array_seq(Array.prototype.slice.call(arguments, 5), 0)
      }
      return G__4860__delegate.call(this, a, f, x, y, z, more)
    };
    G__4860.cljs$lang$maxFixedArity = 5;
    G__4860.cljs$lang$applyTo = function(arglist__4861) {
      var a = cljs.core.first(arglist__4861);
      var f = cljs.core.first(cljs.core.next(arglist__4861));
      var x = cljs.core.first(cljs.core.next(cljs.core.next(arglist__4861)));
      var y = cljs.core.first(cljs.core.next(cljs.core.next(cljs.core.next(arglist__4861))));
      var z = cljs.core.first(cljs.core.next(cljs.core.next(cljs.core.next(cljs.core.next(arglist__4861)))));
      var more = cljs.core.rest(cljs.core.next(cljs.core.next(cljs.core.next(cljs.core.next(arglist__4861)))));
      return G__4860__delegate.call(this, a, f, x, y, z, more)
    };
    return G__4860
  }();
  swap_BANG_ = function(a, f, x, y, z, var_args) {
    var more = var_args;
    switch(arguments.length) {
      case 2:
        return swap_BANG___4854.call(this, a, f);
      case 3:
        return swap_BANG___4855.call(this, a, f, x);
      case 4:
        return swap_BANG___4856.call(this, a, f, x, y);
      case 5:
        return swap_BANG___4857.call(this, a, f, x, y, z);
      default:
        return swap_BANG___4858.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  swap_BANG_.cljs$lang$maxFixedArity = 5;
  swap_BANG_.cljs$lang$applyTo = swap_BANG___4858.cljs$lang$applyTo;
  return swap_BANG_
}();
cljs.core.compare_and_set_BANG_ = function compare_and_set_BANG_(a, oldval, newval) {
  if(cljs.core.truth_(cljs.core._EQ_.call(null, a.state, oldval))) {
    cljs.core.reset_BANG_.call(null, a, newval);
    return true
  }else {
    return false
  }
};
cljs.core.deref = function deref(o) {
  return cljs.core._deref.call(null, o)
};
cljs.core.set_validator_BANG_ = function set_validator_BANG_(iref, val) {
  return iref.validator = val
};
cljs.core.get_validator = function get_validator(iref) {
  return iref.validator
};
cljs.core.alter_meta_BANG_ = function() {
  var alter_meta_BANG___delegate = function(iref, f, args) {
    return iref.meta = cljs.core.apply.call(null, f, iref.meta, args)
  };
  var alter_meta_BANG_ = function(iref, f, var_args) {
    var args = null;
    if(goog.isDef(var_args)) {
      args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 2), 0)
    }
    return alter_meta_BANG___delegate.call(this, iref, f, args)
  };
  alter_meta_BANG_.cljs$lang$maxFixedArity = 2;
  alter_meta_BANG_.cljs$lang$applyTo = function(arglist__4862) {
    var iref = cljs.core.first(arglist__4862);
    var f = cljs.core.first(cljs.core.next(arglist__4862));
    var args = cljs.core.rest(cljs.core.next(arglist__4862));
    return alter_meta_BANG___delegate.call(this, iref, f, args)
  };
  return alter_meta_BANG_
}();
cljs.core.reset_meta_BANG_ = function reset_meta_BANG_(iref, m) {
  return iref.meta = m
};
cljs.core.add_watch = function add_watch(iref, key, f) {
  return cljs.core._add_watch.call(null, iref, key, f)
};
cljs.core.remove_watch = function remove_watch(iref, key) {
  return cljs.core._remove_watch.call(null, iref, key)
};
cljs.core.gensym_counter = null;
cljs.core.gensym = function() {
  var gensym = null;
  var gensym__4863 = function() {
    return gensym.call(null, "G__")
  };
  var gensym__4864 = function(prefix_string) {
    if(cljs.core.truth_(cljs.core.gensym_counter === null)) {
      cljs.core.gensym_counter = cljs.core.atom.call(null, 0)
    }else {
    }
    return cljs.core.symbol.call(null, cljs.core.str.call(null, prefix_string, cljs.core.swap_BANG_.call(null, cljs.core.gensym_counter, cljs.core.inc)))
  };
  gensym = function(prefix_string) {
    switch(arguments.length) {
      case 0:
        return gensym__4863.call(this);
      case 1:
        return gensym__4864.call(this, prefix_string)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return gensym
}();
cljs.core.fixture1 = 1;
cljs.core.fixture2 = 2;
cljs.core.Delay = function(state, f) {
  this.state = state;
  this.f = f
};
cljs.core.Delay.cljs$core$IPrintable$_pr_seq = function(this__367__auto__) {
  return cljs.core.list.call(null, "cljs.core.Delay")
};
cljs.core.Delay.prototype.cljs$core$IPending$ = true;
cljs.core.Delay.prototype.cljs$core$IPending$_realized_QMARK_ = function(d) {
  var this__4866 = this;
  return"\ufdd0'done".call(null, cljs.core.deref.call(null, this__4866.state))
};
cljs.core.Delay.prototype.cljs$core$IDeref$ = true;
cljs.core.Delay.prototype.cljs$core$IDeref$_deref = function(_) {
  var this__4867 = this;
  return"\ufdd0'value".call(null, cljs.core.swap_BANG_.call(null, this__4867.state, function(p__4868) {
    var curr_state__4869 = p__4868;
    var curr_state__4870 = cljs.core.truth_(cljs.core.seq_QMARK_.call(null, curr_state__4869)) ? cljs.core.apply.call(null, cljs.core.hash_map, curr_state__4869) : curr_state__4869;
    var done__4871 = cljs.core.get.call(null, curr_state__4870, "\ufdd0'done");
    if(cljs.core.truth_(done__4871)) {
      return curr_state__4870
    }else {
      return cljs.core.ObjMap.fromObject(["\ufdd0'done", "\ufdd0'value"], {"\ufdd0'done":true, "\ufdd0'value":this__4867.f.call(null)})
    }
  }))
};
cljs.core.Delay;
cljs.core.delay_QMARK_ = function delay_QMARK_(x) {
  return cljs.core.instance_QMARK_.call(null, cljs.core.Delay, x)
};
cljs.core.force = function force(x) {
  if(cljs.core.truth_(cljs.core.delay_QMARK_.call(null, x))) {
    return cljs.core.deref.call(null, x)
  }else {
    return x
  }
};
cljs.core.realized_QMARK_ = function realized_QMARK_(d) {
  return cljs.core._realized_QMARK_.call(null, d)
};
cljs.core.js__GT_clj = function() {
  var js__GT_clj__delegate = function(x, options) {
    var map__4872__4873 = options;
    var map__4872__4874 = cljs.core.truth_(cljs.core.seq_QMARK_.call(null, map__4872__4873)) ? cljs.core.apply.call(null, cljs.core.hash_map, map__4872__4873) : map__4872__4873;
    var keywordize_keys__4875 = cljs.core.get.call(null, map__4872__4874, "\ufdd0'keywordize-keys");
    var keyfn__4876 = cljs.core.truth_(keywordize_keys__4875) ? cljs.core.keyword : cljs.core.str;
    var f__4882 = function thisfn(x) {
      if(cljs.core.truth_(cljs.core.seq_QMARK_.call(null, x))) {
        return cljs.core.doall.call(null, cljs.core.map.call(null, thisfn, x))
      }else {
        if(cljs.core.truth_(cljs.core.coll_QMARK_.call(null, x))) {
          return cljs.core.into.call(null, cljs.core.empty.call(null, x), cljs.core.map.call(null, thisfn, x))
        }else {
          if(cljs.core.truth_(goog.isArray.call(null, x))) {
            return cljs.core.vec.call(null, cljs.core.map.call(null, thisfn, x))
          }else {
            if(cljs.core.truth_(goog.isObject.call(null, x))) {
              return cljs.core.into.call(null, cljs.core.ObjMap.fromObject([], {}), function() {
                var iter__520__auto____4881 = function iter__4877(s__4878) {
                  return new cljs.core.LazySeq(null, false, function() {
                    var s__4878__4879 = s__4878;
                    while(true) {
                      if(cljs.core.truth_(cljs.core.seq.call(null, s__4878__4879))) {
                        var k__4880 = cljs.core.first.call(null, s__4878__4879);
                        return cljs.core.cons.call(null, cljs.core.PersistentVector.fromArray([keyfn__4876.call(null, k__4880), thisfn.call(null, x[k__4880])]), iter__4877.call(null, cljs.core.rest.call(null, s__4878__4879)))
                      }else {
                        return null
                      }
                      break
                    }
                  })
                };
                return iter__520__auto____4881.call(null, cljs.core.js_keys.call(null, x))
              }())
            }else {
              if(cljs.core.truth_("\ufdd0'else")) {
                return x
              }else {
                return null
              }
            }
          }
        }
      }
    };
    return f__4882.call(null, x)
  };
  var js__GT_clj = function(x, var_args) {
    var options = null;
    if(goog.isDef(var_args)) {
      options = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
    }
    return js__GT_clj__delegate.call(this, x, options)
  };
  js__GT_clj.cljs$lang$maxFixedArity = 1;
  js__GT_clj.cljs$lang$applyTo = function(arglist__4883) {
    var x = cljs.core.first(arglist__4883);
    var options = cljs.core.rest(arglist__4883);
    return js__GT_clj__delegate.call(this, x, options)
  };
  return js__GT_clj
}();
cljs.core.memoize = function memoize(f) {
  var mem__4884 = cljs.core.atom.call(null, cljs.core.ObjMap.fromObject([], {}));
  return function() {
    var G__4888__delegate = function(args) {
      var temp__3971__auto____4885 = cljs.core.get.call(null, cljs.core.deref.call(null, mem__4884), args);
      if(cljs.core.truth_(temp__3971__auto____4885)) {
        var v__4886 = temp__3971__auto____4885;
        return v__4886
      }else {
        var ret__4887 = cljs.core.apply.call(null, f, args);
        cljs.core.swap_BANG_.call(null, mem__4884, cljs.core.assoc, args, ret__4887);
        return ret__4887
      }
    };
    var G__4888 = function(var_args) {
      var args = null;
      if(goog.isDef(var_args)) {
        args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 0), 0)
      }
      return G__4888__delegate.call(this, args)
    };
    G__4888.cljs$lang$maxFixedArity = 0;
    G__4888.cljs$lang$applyTo = function(arglist__4889) {
      var args = cljs.core.seq(arglist__4889);
      return G__4888__delegate.call(this, args)
    };
    return G__4888
  }()
};
cljs.core.trampoline = function() {
  var trampoline = null;
  var trampoline__4891 = function(f) {
    while(true) {
      var ret__4890 = f.call(null);
      if(cljs.core.truth_(cljs.core.fn_QMARK_.call(null, ret__4890))) {
        var G__4894 = ret__4890;
        f = G__4894;
        continue
      }else {
        return ret__4890
      }
      break
    }
  };
  var trampoline__4892 = function() {
    var G__4895__delegate = function(f, args) {
      return trampoline.call(null, function() {
        return cljs.core.apply.call(null, f, args)
      })
    };
    var G__4895 = function(f, var_args) {
      var args = null;
      if(goog.isDef(var_args)) {
        args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
      }
      return G__4895__delegate.call(this, f, args)
    };
    G__4895.cljs$lang$maxFixedArity = 1;
    G__4895.cljs$lang$applyTo = function(arglist__4896) {
      var f = cljs.core.first(arglist__4896);
      var args = cljs.core.rest(arglist__4896);
      return G__4895__delegate.call(this, f, args)
    };
    return G__4895
  }();
  trampoline = function(f, var_args) {
    var args = var_args;
    switch(arguments.length) {
      case 1:
        return trampoline__4891.call(this, f);
      default:
        return trampoline__4892.apply(this, arguments)
    }
    throw"Invalid arity: " + arguments.length;
  };
  trampoline.cljs$lang$maxFixedArity = 1;
  trampoline.cljs$lang$applyTo = trampoline__4892.cljs$lang$applyTo;
  return trampoline
}();
cljs.core.rand = function() {
  var rand = null;
  var rand__4897 = function() {
    return rand.call(null, 1)
  };
  var rand__4898 = function(n) {
    return Math.random() * n
  };
  rand = function(n) {
    switch(arguments.length) {
      case 0:
        return rand__4897.call(this);
      case 1:
        return rand__4898.call(this, n)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return rand
}();
cljs.core.rand_int = function rand_int(n) {
  return Math.floor(Math.random() * n)
};
cljs.core.rand_nth = function rand_nth(coll) {
  return cljs.core.nth.call(null, coll, cljs.core.rand_int.call(null, cljs.core.count.call(null, coll)))
};
cljs.core.group_by = function group_by(f, coll) {
  return cljs.core.reduce.call(null, function(ret, x) {
    var k__4900 = f.call(null, x);
    return cljs.core.assoc.call(null, ret, k__4900, cljs.core.conj.call(null, cljs.core.get.call(null, ret, k__4900, cljs.core.PersistentVector.fromArray([])), x))
  }, cljs.core.ObjMap.fromObject([], {}), coll)
};
cljs.core.make_hierarchy = function make_hierarchy() {
  return cljs.core.ObjMap.fromObject(["\ufdd0'parents", "\ufdd0'descendants", "\ufdd0'ancestors"], {"\ufdd0'parents":cljs.core.ObjMap.fromObject([], {}), "\ufdd0'descendants":cljs.core.ObjMap.fromObject([], {}), "\ufdd0'ancestors":cljs.core.ObjMap.fromObject([], {})})
};
cljs.core.global_hierarchy = cljs.core.atom.call(null, cljs.core.make_hierarchy.call(null));
cljs.core.isa_QMARK_ = function() {
  var isa_QMARK_ = null;
  var isa_QMARK___4909 = function(child, parent) {
    return isa_QMARK_.call(null, cljs.core.deref.call(null, cljs.core.global_hierarchy), child, parent)
  };
  var isa_QMARK___4910 = function(h, child, parent) {
    var or__3824__auto____4901 = cljs.core._EQ_.call(null, child, parent);
    if(cljs.core.truth_(or__3824__auto____4901)) {
      return or__3824__auto____4901
    }else {
      var or__3824__auto____4902 = cljs.core.contains_QMARK_.call(null, "\ufdd0'ancestors".call(null, h).call(null, child), parent);
      if(cljs.core.truth_(or__3824__auto____4902)) {
        return or__3824__auto____4902
      }else {
        var and__3822__auto____4903 = cljs.core.vector_QMARK_.call(null, parent);
        if(cljs.core.truth_(and__3822__auto____4903)) {
          var and__3822__auto____4904 = cljs.core.vector_QMARK_.call(null, child);
          if(cljs.core.truth_(and__3822__auto____4904)) {
            var and__3822__auto____4905 = cljs.core._EQ_.call(null, cljs.core.count.call(null, parent), cljs.core.count.call(null, child));
            if(cljs.core.truth_(and__3822__auto____4905)) {
              var ret__4906 = true;
              var i__4907 = 0;
              while(true) {
                if(cljs.core.truth_(function() {
                  var or__3824__auto____4908 = cljs.core.not.call(null, ret__4906);
                  if(cljs.core.truth_(or__3824__auto____4908)) {
                    return or__3824__auto____4908
                  }else {
                    return cljs.core._EQ_.call(null, i__4907, cljs.core.count.call(null, parent))
                  }
                }())) {
                  return ret__4906
                }else {
                  var G__4912 = isa_QMARK_.call(null, h, child.call(null, i__4907), parent.call(null, i__4907));
                  var G__4913 = i__4907 + 1;
                  ret__4906 = G__4912;
                  i__4907 = G__4913;
                  continue
                }
                break
              }
            }else {
              return and__3822__auto____4905
            }
          }else {
            return and__3822__auto____4904
          }
        }else {
          return and__3822__auto____4903
        }
      }
    }
  };
  isa_QMARK_ = function(h, child, parent) {
    switch(arguments.length) {
      case 2:
        return isa_QMARK___4909.call(this, h, child);
      case 3:
        return isa_QMARK___4910.call(this, h, child, parent)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return isa_QMARK_
}();
cljs.core.parents = function() {
  var parents = null;
  var parents__4914 = function(tag) {
    return parents.call(null, cljs.core.deref.call(null, cljs.core.global_hierarchy), tag)
  };
  var parents__4915 = function(h, tag) {
    return cljs.core.not_empty.call(null, cljs.core.get.call(null, "\ufdd0'parents".call(null, h), tag))
  };
  parents = function(h, tag) {
    switch(arguments.length) {
      case 1:
        return parents__4914.call(this, h);
      case 2:
        return parents__4915.call(this, h, tag)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return parents
}();
cljs.core.ancestors = function() {
  var ancestors = null;
  var ancestors__4917 = function(tag) {
    return ancestors.call(null, cljs.core.deref.call(null, cljs.core.global_hierarchy), tag)
  };
  var ancestors__4918 = function(h, tag) {
    return cljs.core.not_empty.call(null, cljs.core.get.call(null, "\ufdd0'ancestors".call(null, h), tag))
  };
  ancestors = function(h, tag) {
    switch(arguments.length) {
      case 1:
        return ancestors__4917.call(this, h);
      case 2:
        return ancestors__4918.call(this, h, tag)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return ancestors
}();
cljs.core.descendants = function() {
  var descendants = null;
  var descendants__4920 = function(tag) {
    return descendants.call(null, cljs.core.deref.call(null, cljs.core.global_hierarchy), tag)
  };
  var descendants__4921 = function(h, tag) {
    return cljs.core.not_empty.call(null, cljs.core.get.call(null, "\ufdd0'descendants".call(null, h), tag))
  };
  descendants = function(h, tag) {
    switch(arguments.length) {
      case 1:
        return descendants__4920.call(this, h);
      case 2:
        return descendants__4921.call(this, h, tag)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return descendants
}();
cljs.core.derive = function() {
  var derive = null;
  var derive__4931 = function(tag, parent) {
    if(cljs.core.truth_(cljs.core.namespace.call(null, parent))) {
    }else {
      throw new Error(cljs.core.str.call(null, "Assert failed: ", cljs.core.pr_str.call(null, cljs.core.with_meta(cljs.core.list("\ufdd1'namespace", "\ufdd1'parent"), cljs.core.hash_map("\ufdd0'line", 3566)))));
    }
    cljs.core.swap_BANG_.call(null, cljs.core.global_hierarchy, derive, tag, parent);
    return null
  };
  var derive__4932 = function(h, tag, parent) {
    if(cljs.core.truth_(cljs.core.not_EQ_.call(null, tag, parent))) {
    }else {
      throw new Error(cljs.core.str.call(null, "Assert failed: ", cljs.core.pr_str.call(null, cljs.core.with_meta(cljs.core.list("\ufdd1'not=", "\ufdd1'tag", "\ufdd1'parent"), cljs.core.hash_map("\ufdd0'line", 3570)))));
    }
    var tp__4926 = "\ufdd0'parents".call(null, h);
    var td__4927 = "\ufdd0'descendants".call(null, h);
    var ta__4928 = "\ufdd0'ancestors".call(null, h);
    var tf__4929 = function(m, source, sources, target, targets) {
      return cljs.core.reduce.call(null, function(ret, k) {
        return cljs.core.assoc.call(null, ret, k, cljs.core.reduce.call(null, cljs.core.conj, cljs.core.get.call(null, targets, k, cljs.core.set([])), cljs.core.cons.call(null, target, targets.call(null, target))))
      }, m, cljs.core.cons.call(null, source, sources.call(null, source)))
    };
    var or__3824__auto____4930 = cljs.core.truth_(cljs.core.contains_QMARK_.call(null, tp__4926.call(null, tag), parent)) ? null : function() {
      if(cljs.core.truth_(cljs.core.contains_QMARK_.call(null, ta__4928.call(null, tag), parent))) {
        throw new Error(cljs.core.str.call(null, tag, "already has", parent, "as ancestor"));
      }else {
      }
      if(cljs.core.truth_(cljs.core.contains_QMARK_.call(null, ta__4928.call(null, parent), tag))) {
        throw new Error(cljs.core.str.call(null, "Cyclic derivation:", parent, "has", tag, "as ancestor"));
      }else {
      }
      return cljs.core.ObjMap.fromObject(["\ufdd0'parents", "\ufdd0'ancestors", "\ufdd0'descendants"], {"\ufdd0'parents":cljs.core.assoc.call(null, "\ufdd0'parents".call(null, h), tag, cljs.core.conj.call(null, cljs.core.get.call(null, tp__4926, tag, cljs.core.set([])), parent)), "\ufdd0'ancestors":tf__4929.call(null, "\ufdd0'ancestors".call(null, h), tag, td__4927, parent, ta__4928), "\ufdd0'descendants":tf__4929.call(null, "\ufdd0'descendants".call(null, h), parent, ta__4928, tag, td__4927)})
    }();
    if(cljs.core.truth_(or__3824__auto____4930)) {
      return or__3824__auto____4930
    }else {
      return h
    }
  };
  derive = function(h, tag, parent) {
    switch(arguments.length) {
      case 2:
        return derive__4931.call(this, h, tag);
      case 3:
        return derive__4932.call(this, h, tag, parent)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return derive
}();
cljs.core.underive = function() {
  var underive = null;
  var underive__4938 = function(tag, parent) {
    cljs.core.swap_BANG_.call(null, cljs.core.global_hierarchy, underive, tag, parent);
    return null
  };
  var underive__4939 = function(h, tag, parent) {
    var parentMap__4934 = "\ufdd0'parents".call(null, h);
    var childsParents__4935 = cljs.core.truth_(parentMap__4934.call(null, tag)) ? cljs.core.disj.call(null, parentMap__4934.call(null, tag), parent) : cljs.core.set([]);
    var newParents__4936 = cljs.core.truth_(cljs.core.not_empty.call(null, childsParents__4935)) ? cljs.core.assoc.call(null, parentMap__4934, tag, childsParents__4935) : cljs.core.dissoc.call(null, parentMap__4934, tag);
    var deriv_seq__4937 = cljs.core.flatten.call(null, cljs.core.map.call(null, function(p1__4923_SHARP_) {
      return cljs.core.cons.call(null, cljs.core.first.call(null, p1__4923_SHARP_), cljs.core.interpose.call(null, cljs.core.first.call(null, p1__4923_SHARP_), cljs.core.second.call(null, p1__4923_SHARP_)))
    }, cljs.core.seq.call(null, newParents__4936)));
    if(cljs.core.truth_(cljs.core.contains_QMARK_.call(null, parentMap__4934.call(null, tag), parent))) {
      return cljs.core.reduce.call(null, function(p1__4924_SHARP_, p2__4925_SHARP_) {
        return cljs.core.apply.call(null, cljs.core.derive, p1__4924_SHARP_, p2__4925_SHARP_)
      }, cljs.core.make_hierarchy.call(null), cljs.core.partition.call(null, 2, deriv_seq__4937))
    }else {
      return h
    }
  };
  underive = function(h, tag, parent) {
    switch(arguments.length) {
      case 2:
        return underive__4938.call(this, h, tag);
      case 3:
        return underive__4939.call(this, h, tag, parent)
    }
    throw"Invalid arity: " + arguments.length;
  };
  return underive
}();
cljs.core.reset_cache = function reset_cache(method_cache, method_table, cached_hierarchy, hierarchy) {
  cljs.core.swap_BANG_.call(null, method_cache, function(_) {
    return cljs.core.deref.call(null, method_table)
  });
  return cljs.core.swap_BANG_.call(null, cached_hierarchy, function(_) {
    return cljs.core.deref.call(null, hierarchy)
  })
};
cljs.core.prefers_STAR_ = function prefers_STAR_(x, y, prefer_table) {
  var xprefs__4941 = cljs.core.deref.call(null, prefer_table).call(null, x);
  var or__3824__auto____4943 = cljs.core.truth_(function() {
    var and__3822__auto____4942 = xprefs__4941;
    if(cljs.core.truth_(and__3822__auto____4942)) {
      return xprefs__4941.call(null, y)
    }else {
      return and__3822__auto____4942
    }
  }()) ? true : null;
  if(cljs.core.truth_(or__3824__auto____4943)) {
    return or__3824__auto____4943
  }else {
    var or__3824__auto____4945 = function() {
      var ps__4944 = cljs.core.parents.call(null, y);
      while(true) {
        if(cljs.core.truth_(cljs.core.count.call(null, ps__4944) > 0)) {
          if(cljs.core.truth_(prefers_STAR_.call(null, x, cljs.core.first.call(null, ps__4944), prefer_table))) {
          }else {
          }
          var G__4948 = cljs.core.rest.call(null, ps__4944);
          ps__4944 = G__4948;
          continue
        }else {
          return null
        }
        break
      }
    }();
    if(cljs.core.truth_(or__3824__auto____4945)) {
      return or__3824__auto____4945
    }else {
      var or__3824__auto____4947 = function() {
        var ps__4946 = cljs.core.parents.call(null, x);
        while(true) {
          if(cljs.core.truth_(cljs.core.count.call(null, ps__4946) > 0)) {
            if(cljs.core.truth_(prefers_STAR_.call(null, cljs.core.first.call(null, ps__4946), y, prefer_table))) {
            }else {
            }
            var G__4949 = cljs.core.rest.call(null, ps__4946);
            ps__4946 = G__4949;
            continue
          }else {
            return null
          }
          break
        }
      }();
      if(cljs.core.truth_(or__3824__auto____4947)) {
        return or__3824__auto____4947
      }else {
        return false
      }
    }
  }
};
cljs.core.dominates = function dominates(x, y, prefer_table) {
  var or__3824__auto____4950 = cljs.core.prefers_STAR_.call(null, x, y, prefer_table);
  if(cljs.core.truth_(or__3824__auto____4950)) {
    return or__3824__auto____4950
  }else {
    return cljs.core.isa_QMARK_.call(null, x, y)
  }
};
cljs.core.find_and_cache_best_method = function find_and_cache_best_method(name, dispatch_val, hierarchy, method_table, prefer_table, method_cache, cached_hierarchy) {
  var best_entry__4959 = cljs.core.reduce.call(null, function(be, p__4951) {
    var vec__4952__4953 = p__4951;
    var k__4954 = cljs.core.nth.call(null, vec__4952__4953, 0, null);
    var ___4955 = cljs.core.nth.call(null, vec__4952__4953, 1, null);
    var e__4956 = vec__4952__4953;
    if(cljs.core.truth_(cljs.core.isa_QMARK_.call(null, dispatch_val, k__4954))) {
      var be2__4958 = cljs.core.truth_(function() {
        var or__3824__auto____4957 = be === null;
        if(cljs.core.truth_(or__3824__auto____4957)) {
          return or__3824__auto____4957
        }else {
          return cljs.core.dominates.call(null, k__4954, cljs.core.first.call(null, be), prefer_table)
        }
      }()) ? e__4956 : be;
      if(cljs.core.truth_(cljs.core.dominates.call(null, cljs.core.first.call(null, be2__4958), k__4954, prefer_table))) {
      }else {
        throw new Error(cljs.core.str.call(null, "Multiple methods in multimethod '", name, "' match dispatch value: ", dispatch_val, " -> ", k__4954, " and ", cljs.core.first.call(null, be2__4958), ", and neither is preferred"));
      }
      return be2__4958
    }else {
      return be
    }
  }, null, cljs.core.deref.call(null, method_table));
  if(cljs.core.truth_(best_entry__4959)) {
    if(cljs.core.truth_(cljs.core._EQ_.call(null, cljs.core.deref.call(null, cached_hierarchy), cljs.core.deref.call(null, hierarchy)))) {
      cljs.core.swap_BANG_.call(null, method_cache, cljs.core.assoc, dispatch_val, cljs.core.second.call(null, best_entry__4959));
      return cljs.core.second.call(null, best_entry__4959)
    }else {
      cljs.core.reset_cache.call(null, method_cache, method_table, cached_hierarchy, hierarchy);
      return find_and_cache_best_method.call(null, name, dispatch_val, hierarchy, method_table, prefer_table, method_cache, cached_hierarchy)
    }
  }else {
    return null
  }
};
cljs.core.IMultiFn = {};
cljs.core._reset = function _reset(mf) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____4960 = mf;
    if(cljs.core.truth_(and__3822__auto____4960)) {
      return mf.cljs$core$IMultiFn$_reset
    }else {
      return and__3822__auto____4960
    }
  }())) {
    return mf.cljs$core$IMultiFn$_reset(mf)
  }else {
    return function() {
      var or__3824__auto____4961 = cljs.core._reset[goog.typeOf.call(null, mf)];
      if(cljs.core.truth_(or__3824__auto____4961)) {
        return or__3824__auto____4961
      }else {
        var or__3824__auto____4962 = cljs.core._reset["_"];
        if(cljs.core.truth_(or__3824__auto____4962)) {
          return or__3824__auto____4962
        }else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-reset", mf);
        }
      }
    }().call(null, mf)
  }
};
cljs.core._add_method = function _add_method(mf, dispatch_val, method) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____4963 = mf;
    if(cljs.core.truth_(and__3822__auto____4963)) {
      return mf.cljs$core$IMultiFn$_add_method
    }else {
      return and__3822__auto____4963
    }
  }())) {
    return mf.cljs$core$IMultiFn$_add_method(mf, dispatch_val, method)
  }else {
    return function() {
      var or__3824__auto____4964 = cljs.core._add_method[goog.typeOf.call(null, mf)];
      if(cljs.core.truth_(or__3824__auto____4964)) {
        return or__3824__auto____4964
      }else {
        var or__3824__auto____4965 = cljs.core._add_method["_"];
        if(cljs.core.truth_(or__3824__auto____4965)) {
          return or__3824__auto____4965
        }else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-add-method", mf);
        }
      }
    }().call(null, mf, dispatch_val, method)
  }
};
cljs.core._remove_method = function _remove_method(mf, dispatch_val) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____4966 = mf;
    if(cljs.core.truth_(and__3822__auto____4966)) {
      return mf.cljs$core$IMultiFn$_remove_method
    }else {
      return and__3822__auto____4966
    }
  }())) {
    return mf.cljs$core$IMultiFn$_remove_method(mf, dispatch_val)
  }else {
    return function() {
      var or__3824__auto____4967 = cljs.core._remove_method[goog.typeOf.call(null, mf)];
      if(cljs.core.truth_(or__3824__auto____4967)) {
        return or__3824__auto____4967
      }else {
        var or__3824__auto____4968 = cljs.core._remove_method["_"];
        if(cljs.core.truth_(or__3824__auto____4968)) {
          return or__3824__auto____4968
        }else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-remove-method", mf);
        }
      }
    }().call(null, mf, dispatch_val)
  }
};
cljs.core._prefer_method = function _prefer_method(mf, dispatch_val, dispatch_val_y) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____4969 = mf;
    if(cljs.core.truth_(and__3822__auto____4969)) {
      return mf.cljs$core$IMultiFn$_prefer_method
    }else {
      return and__3822__auto____4969
    }
  }())) {
    return mf.cljs$core$IMultiFn$_prefer_method(mf, dispatch_val, dispatch_val_y)
  }else {
    return function() {
      var or__3824__auto____4970 = cljs.core._prefer_method[goog.typeOf.call(null, mf)];
      if(cljs.core.truth_(or__3824__auto____4970)) {
        return or__3824__auto____4970
      }else {
        var or__3824__auto____4971 = cljs.core._prefer_method["_"];
        if(cljs.core.truth_(or__3824__auto____4971)) {
          return or__3824__auto____4971
        }else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-prefer-method", mf);
        }
      }
    }().call(null, mf, dispatch_val, dispatch_val_y)
  }
};
cljs.core._get_method = function _get_method(mf, dispatch_val) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____4972 = mf;
    if(cljs.core.truth_(and__3822__auto____4972)) {
      return mf.cljs$core$IMultiFn$_get_method
    }else {
      return and__3822__auto____4972
    }
  }())) {
    return mf.cljs$core$IMultiFn$_get_method(mf, dispatch_val)
  }else {
    return function() {
      var or__3824__auto____4973 = cljs.core._get_method[goog.typeOf.call(null, mf)];
      if(cljs.core.truth_(or__3824__auto____4973)) {
        return or__3824__auto____4973
      }else {
        var or__3824__auto____4974 = cljs.core._get_method["_"];
        if(cljs.core.truth_(or__3824__auto____4974)) {
          return or__3824__auto____4974
        }else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-get-method", mf);
        }
      }
    }().call(null, mf, dispatch_val)
  }
};
cljs.core._methods = function _methods(mf) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____4975 = mf;
    if(cljs.core.truth_(and__3822__auto____4975)) {
      return mf.cljs$core$IMultiFn$_methods
    }else {
      return and__3822__auto____4975
    }
  }())) {
    return mf.cljs$core$IMultiFn$_methods(mf)
  }else {
    return function() {
      var or__3824__auto____4976 = cljs.core._methods[goog.typeOf.call(null, mf)];
      if(cljs.core.truth_(or__3824__auto____4976)) {
        return or__3824__auto____4976
      }else {
        var or__3824__auto____4977 = cljs.core._methods["_"];
        if(cljs.core.truth_(or__3824__auto____4977)) {
          return or__3824__auto____4977
        }else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-methods", mf);
        }
      }
    }().call(null, mf)
  }
};
cljs.core._prefers = function _prefers(mf) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____4978 = mf;
    if(cljs.core.truth_(and__3822__auto____4978)) {
      return mf.cljs$core$IMultiFn$_prefers
    }else {
      return and__3822__auto____4978
    }
  }())) {
    return mf.cljs$core$IMultiFn$_prefers(mf)
  }else {
    return function() {
      var or__3824__auto____4979 = cljs.core._prefers[goog.typeOf.call(null, mf)];
      if(cljs.core.truth_(or__3824__auto____4979)) {
        return or__3824__auto____4979
      }else {
        var or__3824__auto____4980 = cljs.core._prefers["_"];
        if(cljs.core.truth_(or__3824__auto____4980)) {
          return or__3824__auto____4980
        }else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-prefers", mf);
        }
      }
    }().call(null, mf)
  }
};
cljs.core._dispatch = function _dispatch(mf, args) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____4981 = mf;
    if(cljs.core.truth_(and__3822__auto____4981)) {
      return mf.cljs$core$IMultiFn$_dispatch
    }else {
      return and__3822__auto____4981
    }
  }())) {
    return mf.cljs$core$IMultiFn$_dispatch(mf, args)
  }else {
    return function() {
      var or__3824__auto____4982 = cljs.core._dispatch[goog.typeOf.call(null, mf)];
      if(cljs.core.truth_(or__3824__auto____4982)) {
        return or__3824__auto____4982
      }else {
        var or__3824__auto____4983 = cljs.core._dispatch["_"];
        if(cljs.core.truth_(or__3824__auto____4983)) {
          return or__3824__auto____4983
        }else {
          throw cljs.core.missing_protocol.call(null, "IMultiFn.-dispatch", mf);
        }
      }
    }().call(null, mf, args)
  }
};
cljs.core.do_dispatch = function do_dispatch(mf, dispatch_fn, args) {
  var dispatch_val__4984 = cljs.core.apply.call(null, dispatch_fn, args);
  var target_fn__4985 = cljs.core._get_method.call(null, mf, dispatch_val__4984);
  if(cljs.core.truth_(target_fn__4985)) {
  }else {
    throw new Error(cljs.core.str.call(null, "No method in multimethod '", cljs.core.name, "' for dispatch value: ", dispatch_val__4984));
  }
  return cljs.core.apply.call(null, target_fn__4985, args)
};
cljs.core.MultiFn = function(name, dispatch_fn, default_dispatch_val, hierarchy, method_table, prefer_table, method_cache, cached_hierarchy) {
  this.name = name;
  this.dispatch_fn = dispatch_fn;
  this.default_dispatch_val = default_dispatch_val;
  this.hierarchy = hierarchy;
  this.method_table = method_table;
  this.prefer_table = prefer_table;
  this.method_cache = method_cache;
  this.cached_hierarchy = cached_hierarchy
};
cljs.core.MultiFn.cljs$core$IPrintable$_pr_seq = function(this__367__auto__) {
  return cljs.core.list.call(null, "cljs.core.MultiFn")
};
cljs.core.MultiFn.prototype.cljs$core$IHash$ = true;
cljs.core.MultiFn.prototype.cljs$core$IHash$_hash = function(this$) {
  var this__4986 = this;
  return goog.getUid.call(null, this$)
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$ = true;
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_reset = function(mf) {
  var this__4987 = this;
  cljs.core.swap_BANG_.call(null, this__4987.method_table, function(mf) {
    return cljs.core.ObjMap.fromObject([], {})
  });
  cljs.core.swap_BANG_.call(null, this__4987.method_cache, function(mf) {
    return cljs.core.ObjMap.fromObject([], {})
  });
  cljs.core.swap_BANG_.call(null, this__4987.prefer_table, function(mf) {
    return cljs.core.ObjMap.fromObject([], {})
  });
  cljs.core.swap_BANG_.call(null, this__4987.cached_hierarchy, function(mf) {
    return null
  });
  return mf
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_add_method = function(mf, dispatch_val, method) {
  var this__4988 = this;
  cljs.core.swap_BANG_.call(null, this__4988.method_table, cljs.core.assoc, dispatch_val, method);
  cljs.core.reset_cache.call(null, this__4988.method_cache, this__4988.method_table, this__4988.cached_hierarchy, this__4988.hierarchy);
  return mf
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_remove_method = function(mf, dispatch_val) {
  var this__4989 = this;
  cljs.core.swap_BANG_.call(null, this__4989.method_table, cljs.core.dissoc, dispatch_val);
  cljs.core.reset_cache.call(null, this__4989.method_cache, this__4989.method_table, this__4989.cached_hierarchy, this__4989.hierarchy);
  return mf
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_get_method = function(mf, dispatch_val) {
  var this__4990 = this;
  if(cljs.core.truth_(cljs.core._EQ_.call(null, cljs.core.deref.call(null, this__4990.cached_hierarchy), cljs.core.deref.call(null, this__4990.hierarchy)))) {
  }else {
    cljs.core.reset_cache.call(null, this__4990.method_cache, this__4990.method_table, this__4990.cached_hierarchy, this__4990.hierarchy)
  }
  var temp__3971__auto____4991 = cljs.core.deref.call(null, this__4990.method_cache).call(null, dispatch_val);
  if(cljs.core.truth_(temp__3971__auto____4991)) {
    var target_fn__4992 = temp__3971__auto____4991;
    return target_fn__4992
  }else {
    var temp__3971__auto____4993 = cljs.core.find_and_cache_best_method.call(null, this__4990.name, dispatch_val, this__4990.hierarchy, this__4990.method_table, this__4990.prefer_table, this__4990.method_cache, this__4990.cached_hierarchy);
    if(cljs.core.truth_(temp__3971__auto____4993)) {
      var target_fn__4994 = temp__3971__auto____4993;
      return target_fn__4994
    }else {
      return cljs.core.deref.call(null, this__4990.method_table).call(null, this__4990.default_dispatch_val)
    }
  }
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_prefer_method = function(mf, dispatch_val_x, dispatch_val_y) {
  var this__4995 = this;
  if(cljs.core.truth_(cljs.core.prefers_STAR_.call(null, dispatch_val_x, dispatch_val_y, this__4995.prefer_table))) {
    throw new Error(cljs.core.str.call(null, "Preference conflict in multimethod '", this__4995.name, "': ", dispatch_val_y, " is already preferred to ", dispatch_val_x));
  }else {
  }
  cljs.core.swap_BANG_.call(null, this__4995.prefer_table, function(old) {
    return cljs.core.assoc.call(null, old, dispatch_val_x, cljs.core.conj.call(null, cljs.core.get.call(null, old, dispatch_val_x, cljs.core.set([])), dispatch_val_y))
  });
  return cljs.core.reset_cache.call(null, this__4995.method_cache, this__4995.method_table, this__4995.cached_hierarchy, this__4995.hierarchy)
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_methods = function(mf) {
  var this__4996 = this;
  return cljs.core.deref.call(null, this__4996.method_table)
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_prefers = function(mf) {
  var this__4997 = this;
  return cljs.core.deref.call(null, this__4997.prefer_table)
};
cljs.core.MultiFn.prototype.cljs$core$IMultiFn$_dispatch = function(mf, args) {
  var this__4998 = this;
  return cljs.core.do_dispatch.call(null, mf, this__4998.dispatch_fn, args)
};
cljs.core.MultiFn;
cljs.core.MultiFn.prototype.call = function() {
  var G__4999__delegate = function(_, args) {
    return cljs.core._dispatch.call(null, this, args)
  };
  var G__4999 = function(_, var_args) {
    var args = null;
    if(goog.isDef(var_args)) {
      args = cljs.core.array_seq(Array.prototype.slice.call(arguments, 1), 0)
    }
    return G__4999__delegate.call(this, _, args)
  };
  G__4999.cljs$lang$maxFixedArity = 1;
  G__4999.cljs$lang$applyTo = function(arglist__5000) {
    var _ = cljs.core.first(arglist__5000);
    var args = cljs.core.rest(arglist__5000);
    return G__4999__delegate.call(this, _, args)
  };
  return G__4999
}();
cljs.core.MultiFn.prototype.apply = function(_, args) {
  return cljs.core._dispatch.call(null, this, args)
};
cljs.core.remove_all_methods = function remove_all_methods(multifn) {
  return cljs.core._reset.call(null, multifn)
};
cljs.core.remove_method = function remove_method(multifn, dispatch_val) {
  return cljs.core._remove_method.call(null, multifn, dispatch_val)
};
cljs.core.prefer_method = function prefer_method(multifn, dispatch_val_x, dispatch_val_y) {
  return cljs.core._prefer_method.call(null, multifn, dispatch_val_x, dispatch_val_y)
};
cljs.core.methods$ = function methods$(multifn) {
  return cljs.core._methods.call(null, multifn)
};
cljs.core.get_method = function get_method(multifn, dispatch_val) {
  return cljs.core._get_method.call(null, multifn, dispatch_val)
};
cljs.core.prefers = function prefers(multifn) {
  return cljs.core._prefers.call(null, multifn)
};
goog.provide("transformers");
goog.require("cljs.core");
transformers.trim = function trim(text) {
  return cljs.core.apply.call(null, cljs.core.str, cljs.core.take_while.call(null, cljs.core.partial.call(null, cljs.core.not_EQ_, " "), cljs.core.drop_while.call(null, cljs.core.partial.call(null, cljs.core._EQ_, " "), text)))
};
transformers.separator_transformer = function separator_transformer(text, open, close, separator, state) {
  if(cljs.core.truth_("\ufdd0'code".call(null, state))) {
    return cljs.core.PersistentVector.fromArray([text, state])
  }else {
    var out__5001 = cljs.core.PersistentVector.fromArray([]);
    var buf__5002 = cljs.core.PersistentVector.fromArray([]);
    var tokens__5003 = cljs.core.partition_by.call(null, cljs.core.partial.call(null, cljs.core._EQ_, cljs.core.first.call(null, separator)), cljs.core.seq.call(null, text));
    var cur_state__5004 = cljs.core.assoc.call(null, state, "\ufdd0'found-token", false);
    while(true) {
      if(cljs.core.truth_(cljs.core.empty_QMARK_.call(null, tokens__5003))) {
        return cljs.core.PersistentVector.fromArray([cljs.core.apply.call(null, cljs.core.str, cljs.core.into.call(null, cljs.core.truth_("\ufdd0'found-token".call(null, cur_state__5004)) ? cljs.core.into.call(null, out__5001, separator) : out__5001, buf__5002)), cljs.core.dissoc.call(null, cur_state__5004, "\ufdd0'found-token")])
      }else {
        if(cljs.core.truth_("\ufdd0'found-token".call(null, cur_state__5004))) {
          if(cljs.core.truth_(cljs.core._EQ_.call(null, cljs.core.first.call(null, tokens__5003), separator))) {
            var G__5005 = cljs.core.into.call(null, out__5001, cljs.core.concat.call(null, cljs.core.seq.call(null, open), buf__5002, cljs.core.seq.call(null, close)));
            var G__5006 = cljs.core.PersistentVector.fromArray([]);
            var G__5007 = cljs.core.rest.call(null, tokens__5003);
            var G__5008 = cljs.core.assoc.call(null, cur_state__5004, "\ufdd0'found-token", false);
            out__5001 = G__5005;
            buf__5002 = G__5006;
            tokens__5003 = G__5007;
            cur_state__5004 = G__5008;
            continue
          }else {
            var G__5009 = out__5001;
            var G__5010 = cljs.core.into.call(null, buf__5002, cljs.core.first.call(null, tokens__5003));
            var G__5011 = cljs.core.rest.call(null, tokens__5003);
            var G__5012 = cur_state__5004;
            out__5001 = G__5009;
            buf__5002 = G__5010;
            tokens__5003 = G__5011;
            cur_state__5004 = G__5012;
            continue
          }
        }else {
          if(cljs.core.truth_(cljs.core._EQ_.call(null, cljs.core.first.call(null, tokens__5003), separator))) {
            var G__5013 = out__5001;
            var G__5014 = buf__5002;
            var G__5015 = cljs.core.rest.call(null, tokens__5003);
            var G__5016 = cljs.core.assoc.call(null, cur_state__5004, "\ufdd0'found-token", true);
            out__5001 = G__5013;
            buf__5002 = G__5014;
            tokens__5003 = G__5015;
            cur_state__5004 = G__5016;
            continue
          }else {
            if(cljs.core.truth_("\ufdd0'default")) {
              var G__5017 = cljs.core.into.call(null, out__5001, cljs.core.first.call(null, tokens__5003));
              var G__5018 = buf__5002;
              var G__5019 = cljs.core.rest.call(null, tokens__5003);
              var G__5020 = cur_state__5004;
              out__5001 = G__5017;
              buf__5002 = G__5018;
              tokens__5003 = G__5019;
              cur_state__5004 = G__5020;
              continue
            }else {
              return null
            }
          }
        }
      }
      break
    }
  }
};
transformers.bold_transformer = function bold_transformer(text, state) {
  return transformers.separator_transformer.call(null, text, "<b>", "</b>", cljs.core.PersistentVector.fromArray(["*", "*"]), state)
};
transformers.alt_bold_transformer = function alt_bold_transformer(text, state) {
  return transformers.separator_transformer.call(null, text, "<b>", "</b>", cljs.core.PersistentVector.fromArray(["_", "_"]), state)
};
transformers.em_transformer = function em_transformer(text, state) {
  return transformers.separator_transformer.call(null, text, "<em>", "</em>", cljs.core.PersistentVector.fromArray(["*"]), state)
};
transformers.italics_transformer = function italics_transformer(text, state) {
  return transformers.separator_transformer.call(null, text, "<i>", "</i>", cljs.core.PersistentVector.fromArray(["_"]), state)
};
transformers.inline_code_transformer = function inline_code_transformer(text, state) {
  return transformers.separator_transformer.call(null, text, "<code>", "</code>", cljs.core.PersistentVector.fromArray(["`"]), state)
};
transformers.strikethrough_transformer = function strikethrough_transformer(text, state) {
  return transformers.separator_transformer.call(null, text, "<del>", "</del>", cljs.core.PersistentVector.fromArray(["~", "~"]), state)
};
transformers.superscript_transformer = function superscript_transformer(text, state) {
  if(cljs.core.truth_("\ufdd0'code".call(null, state))) {
    return cljs.core.PersistentVector.fromArray([text, state])
  }else {
    var tokens__5021 = cljs.core.partition_by.call(null, cljs.core.partial.call(null, cljs.core.contains_QMARK_, cljs.core.set([" ", "^"])), text);
    var buf__5022 = cljs.core.PersistentVector.fromArray([]);
    var remaining__5023 = tokens__5021;
    while(true) {
      if(cljs.core.truth_(cljs.core.empty_QMARK_.call(null, remaining__5023))) {
        return cljs.core.PersistentVector.fromArray([cljs.core.apply.call(null, cljs.core.str, buf__5022), state])
      }else {
        if(cljs.core.truth_(cljs.core._EQ_.call(null, cljs.core.first.call(null, remaining__5023), cljs.core.PersistentVector.fromArray(["^"])))) {
          var G__5024 = cljs.core.into.call(null, buf__5022, cljs.core.concat.call(null, cljs.core.seq.call(null, "<sup>"), cljs.core.second.call(null, remaining__5023), cljs.core.seq.call(null, "</sup>")));
          var G__5025 = cljs.core.drop.call(null, 2, remaining__5023);
          buf__5022 = G__5024;
          remaining__5023 = G__5025;
          continue
        }else {
          if(cljs.core.truth_("\ufdd0'default")) {
            var G__5026 = cljs.core.into.call(null, buf__5022, cljs.core.first.call(null, remaining__5023));
            var G__5027 = cljs.core.rest.call(null, remaining__5023);
            buf__5022 = G__5026;
            remaining__5023 = G__5027;
            continue
          }else {
            return null
          }
        }
      }
      break
    }
  }
};
transformers.heading_transformer = function heading_transformer(text, state) {
  if(cljs.core.truth_("\ufdd0'code".call(null, state))) {
    return cljs.core.PersistentVector.fromArray([text, state])
  }else {
    var num_hashes__5028 = cljs.core.count.call(null, cljs.core.take_while.call(null, cljs.core.partial.call(null, cljs.core._EQ_, "#"), cljs.core.seq.call(null, text)));
    if(cljs.core.truth_(num_hashes__5028 > 0)) {
      return cljs.core.PersistentVector.fromArray([cljs.core.str.call(null, "<h", num_hashes__5028, ">", cljs.core.apply.call(null, cljs.core.str, cljs.core.drop.call(null, num_hashes__5028, text)), "</h", num_hashes__5028, ">"), state])
    }else {
      return cljs.core.PersistentVector.fromArray([text, state])
    }
  }
};
transformers.paragraph_transformer = function paragraph_transformer(text, state) {
  if(cljs.core.truth_(function() {
    var or__3824__auto____5029 = "\ufdd0'code".call(null, state);
    if(cljs.core.truth_(or__3824__auto____5029)) {
      return or__3824__auto____5029
    }else {
      var or__3824__auto____5030 = "\ufdd0'list".call(null, state);
      if(cljs.core.truth_(or__3824__auto____5030)) {
        return or__3824__auto____5030
      }else {
        return"\ufdd0'blockquote".call(null, state)
      }
    }
  }())) {
    return cljs.core.PersistentVector.fromArray([text, state])
  }else {
    if(cljs.core.truth_("\ufdd0'paragraph".call(null, state))) {
      if(cljs.core.truth_(function() {
        var or__3824__auto____5031 = "\ufdd0'eof".call(null, state);
        if(cljs.core.truth_(or__3824__auto____5031)) {
          return or__3824__auto____5031
        }else {
          return cljs.core.empty_QMARK_.call(null, transformers.trim.call(null, text))
        }
      }())) {
        return cljs.core.PersistentVector.fromArray([cljs.core.str.call(null, text, "</p>"), cljs.core.assoc.call(null, state, "\ufdd0'paragraph", false)])
      }else {
        return cljs.core.PersistentVector.fromArray([text, state])
      }
    }else {
      if(cljs.core.truth_(function() {
        var and__3822__auto____5032 = cljs.core.not.call(null, "\ufdd0'eof".call(null, state));
        if(cljs.core.truth_(and__3822__auto____5032)) {
          return"\ufdd0'last-line-empty?".call(null, state)
        }else {
          return and__3822__auto____5032
        }
      }())) {
        return cljs.core.PersistentVector.fromArray([cljs.core.str.call(null, "<p>", text), cljs.core.assoc.call(null, state, "\ufdd0'paragraph", true)])
      }else {
        if(cljs.core.truth_("\ufdd0'default")) {
          return cljs.core.PersistentVector.fromArray([text, state])
        }else {
          return null
        }
      }
    }
  }
};
transformers.code_transformer = function code_transformer(text, state) {
  if(cljs.core.truth_("\ufdd0'codeblock".call(null, state))) {
    return cljs.core.PersistentVector.fromArray([text, state])
  }else {
    if(cljs.core.truth_("\ufdd0'code".call(null, state))) {
      if(cljs.core.truth_(function() {
        var or__3824__auto____5033 = "\ufdd0'eof".call(null, state);
        if(cljs.core.truth_(or__3824__auto____5033)) {
          return or__3824__auto____5033
        }else {
          return cljs.core.empty_QMARK_.call(null, transformers.trim.call(null, text))
        }
      }())) {
        return cljs.core.PersistentVector.fromArray(["</code></pre>", cljs.core.assoc.call(null, state, "\ufdd0'code", false)])
      }else {
        return cljs.core.PersistentVector.fromArray([cljs.core.str.call(null, "\n", text), state])
      }
    }else {
      if(cljs.core.truth_(cljs.core.empty_QMARK_.call(null, transformers.trim.call(null, text)))) {
        return cljs.core.PersistentVector.fromArray([text, state])
      }else {
        if(cljs.core.truth_("\ufdd0'default")) {
          var num_spaces__5034 = cljs.core.count.call(null, cljs.core.take_while.call(null, cljs.core.partial.call(null, cljs.core._EQ_, " "), text));
          if(cljs.core.truth_(num_spaces__5034 > 3)) {
            return cljs.core.PersistentVector.fromArray([cljs.core.str.call(null, "<pre><code>", text), cljs.core.assoc.call(null, state, "\ufdd0'code", true)])
          }else {
            return cljs.core.PersistentVector.fromArray([text, state])
          }
        }else {
          return null
        }
      }
    }
  }
};
transformers.codeblock_transformer = function codeblock_transformer(text, state) {
  if(cljs.core.truth_(function() {
    var and__3822__auto____5036 = function() {
      var or__3824__auto____5035 = cljs.core._EQ_.call(null, cljs.core.PersistentVector.fromArray(["`", "`", "`"]), cljs.core.take.call(null, 3, text));
      if(cljs.core.truth_(or__3824__auto____5035)) {
        return or__3824__auto____5035
      }else {
        return cljs.core._EQ_.call(null, cljs.core.PersistentVector.fromArray(["`", "`", "`"]), cljs.core.take_last.call(null, 3, text))
      }
    }();
    if(cljs.core.truth_(and__3822__auto____5036)) {
      return"\ufdd0'codeblock".call(null, state)
    }else {
      return and__3822__auto____5036
    }
  }())) {
    return cljs.core.PersistentVector.fromArray([cljs.core.str.call(null, "</code></pre>", cljs.core.apply.call(null, cljs.core.str, cljs.core.drop.call(null, 3, text))), cljs.core.assoc.call(null, state, "\ufdd0'code", false, "\ufdd0'codeblock", false)])
  }else {
    if(cljs.core.truth_(cljs.core._EQ_.call(null, cljs.core.PersistentVector.fromArray(["`", "`", "`"]), cljs.core.take.call(null, 3, text)))) {
      return cljs.core.PersistentVector.fromArray([cljs.core.str.call(null, "<pre><code>\n", cljs.core.apply.call(null, cljs.core.str, cljs.core.drop.call(null, 3, text))), cljs.core.assoc.call(null, state, "\ufdd0'code", true, "\ufdd0'codeblock", true)])
    }else {
      if(cljs.core.truth_("\ufdd0'codeblock".call(null, state))) {
        return cljs.core.PersistentVector.fromArray([cljs.core.str.call(null, "\n", text), state])
      }else {
        if(cljs.core.truth_("\ufdd0'default")) {
          return cljs.core.PersistentVector.fromArray([text, state])
        }else {
          return null
        }
      }
    }
  }
};
transformers.hr_transformer = function hr_transformer(text, state) {
  if(cljs.core.truth_("\ufdd0'code".call(null, state))) {
    return cljs.core.PersistentVector.fromArray([text, state])
  }else {
    var trimmed__5037 = transformers.trim.call(null, text);
    if(cljs.core.truth_(function() {
      var or__3824__auto____5038 = cljs.core._EQ_.call(null, "***", trimmed__5037);
      if(cljs.core.truth_(or__3824__auto____5038)) {
        return or__3824__auto____5038
      }else {
        var or__3824__auto____5039 = cljs.core._EQ_.call(null, "* * *", trimmed__5037);
        if(cljs.core.truth_(or__3824__auto____5039)) {
          return or__3824__auto____5039
        }else {
          var or__3824__auto____5040 = cljs.core._EQ_.call(null, "*****", trimmed__5037);
          if(cljs.core.truth_(or__3824__auto____5040)) {
            return or__3824__auto____5040
          }else {
            return cljs.core._EQ_.call(null, "- - -", trimmed__5037)
          }
        }
      }
    }())) {
      return cljs.core.PersistentVector.fromArray([cljs.core.str.call(null, "<hr/>"), state])
    }else {
      return cljs.core.PersistentVector.fromArray([text, state])
    }
  }
};
transformers.blockquote_transformer = function blockquote_transformer(text, state) {
  if(cljs.core.truth_(function() {
    var or__3824__auto____5041 = "\ufdd0'code".call(null, state);
    if(cljs.core.truth_(or__3824__auto____5041)) {
      return or__3824__auto____5041
    }else {
      return"\ufdd0'list".call(null, state)
    }
  }())) {
    return cljs.core.PersistentVector.fromArray([text, state])
  }else {
    if(cljs.core.truth_("\ufdd0'blockquote".call(null, state))) {
      if(cljs.core.truth_(function() {
        var or__3824__auto____5042 = "\ufdd0'eof".call(null, state);
        if(cljs.core.truth_(or__3824__auto____5042)) {
          return or__3824__auto____5042
        }else {
          return cljs.core.empty_QMARK_.call(null, transformers.trim.call(null, text))
        }
      }())) {
        return cljs.core.PersistentVector.fromArray(["</p></blockquote>", cljs.core.assoc.call(null, state, "\ufdd0'blockquote", false)])
      }else {
        return cljs.core.PersistentVector.fromArray([text, state])
      }
    }else {
      if(cljs.core.truth_("\ufdd0'default")) {
        if(cljs.core.truth_(cljs.core._EQ_.call(null, ">", cljs.core.first.call(null, text)))) {
          return cljs.core.PersistentVector.fromArray([cljs.core.str.call(null, "<blockquote><p>", cljs.core.apply.call(null, cljs.core.str, cljs.core.rest.call(null, text))), cljs.core.assoc.call(null, state, "\ufdd0'blockquote", true)])
        }else {
          return cljs.core.PersistentVector.fromArray([text, state])
        }
      }else {
        return null
      }
    }
  }
};
transformers.link_transformer = function link_transformer(text, state) {
  if(cljs.core.truth_("\ufdd0'code".call(null, state))) {
    return cljs.core.PersistentVector.fromArray([text, state])
  }else {
    var out__5043 = cljs.core.PersistentVector.fromArray([]);
    var tokens__5044 = cljs.core.seq.call(null, text);
    while(true) {
      if(cljs.core.truth_(cljs.core.empty_QMARK_.call(null, tokens__5044))) {
        return cljs.core.PersistentVector.fromArray([cljs.core.apply.call(null, cljs.core.str, out__5043), state])
      }else {
        var vec__5045__5049 = cljs.core.split_with.call(null, cljs.core.partial.call(null, cljs.core.not_EQ_, "["), tokens__5044);
        var head__5050 = cljs.core.nth.call(null, vec__5045__5049, 0, null);
        var xs__5051 = cljs.core.nth.call(null, vec__5045__5049, 1, null);
        var vec__5046__5052 = cljs.core.split_with.call(null, cljs.core.partial.call(null, cljs.core.not_EQ_, "]"), xs__5051);
        var title__5053 = cljs.core.nth.call(null, vec__5046__5052, 0, null);
        var ys__5054 = cljs.core.nth.call(null, vec__5046__5052, 1, null);
        var vec__5047__5055 = cljs.core.split_with.call(null, cljs.core.partial.call(null, cljs.core.not_EQ_, "("), ys__5054);
        var dud__5056 = cljs.core.nth.call(null, vec__5047__5055, 0, null);
        var zs__5057 = cljs.core.nth.call(null, vec__5047__5055, 1, null);
        var vec__5048__5058 = cljs.core.split_with.call(null, cljs.core.partial.call(null, cljs.core.not_EQ_, ")"), zs__5057);
        var link__5059 = cljs.core.nth.call(null, vec__5048__5058, 0, null);
        var tail__5060 = cljs.core.nth.call(null, vec__5048__5058, 1, null);
        cljs.core.PersistentVector.fromArray([cljs.core.count.call(null, title__5053), cljs.core.count.call(null, link__5059)]);
        if(cljs.core.truth_(function() {
          var or__3824__auto____5061 = cljs.core.count.call(null, title__5053) < 2;
          if(cljs.core.truth_(or__3824__auto____5061)) {
            return or__3824__auto____5061
          }else {
            var or__3824__auto____5062 = cljs.core.count.call(null, link__5059) < 2;
            if(cljs.core.truth_(or__3824__auto____5062)) {
              return or__3824__auto____5062
            }else {
              return cljs.core.count.call(null, tail__5060) < 1
            }
          }
        }())) {
          var G__5063 = cljs.core.concat.call(null, out__5043, head__5050, title__5053, dud__5056, link__5059);
          var G__5064 = tail__5060;
          out__5043 = G__5063;
          tokens__5044 = G__5064;
          continue
        }else {
          var G__5065 = cljs.core.concat.call(null, out__5043, head__5050, cljs.core.seq.call(null, "<a href='"), cljs.core.rest.call(null, link__5059), cljs.core.seq.call(null, "'>"), cljs.core.rest.call(null, title__5053), cljs.core.seq.call(null, "</a>"));
          var G__5066 = cljs.core.rest.call(null, tail__5060);
          out__5043 = G__5065;
          tokens__5044 = G__5066;
          continue
        }
      }
      break
    }
  }
};
transformers.close_list = function close_list(list_name, indents) {
  if(cljs.core.truth_(indents > 0)) {
    return cljs.core.apply.call(null, cljs.core.str, function() {
      var iter__520__auto____5071 = function iter__5067(s__5068) {
        return new cljs.core.LazySeq(null, false, function() {
          var s__5068__5069 = s__5068;
          while(true) {
            if(cljs.core.truth_(cljs.core.seq.call(null, s__5068__5069))) {
              var i__5070 = cljs.core.first.call(null, s__5068__5069);
              return cljs.core.cons.call(null, cljs.core.str.call(null, "</li></", list_name, ">"), iter__5067.call(null, cljs.core.rest.call(null, s__5068__5069)))
            }else {
              return null
            }
            break
          }
        })
      };
      return iter__520__auto____5071.call(null, cljs.core.range.call(null, indents))
    }())
  }else {
    return cljs.core.str.call(null, "</li></", list_name, ">")
  }
};
transformers.list_row_helper = function list_row_helper(text, state, list_type, indents) {
  var list_name__5072 = cljs.core.truth_(list_type) ? cljs.core.name.call(null, list_type) : null;
  var total_indents__5073 = "\ufdd0'list-indents".call(null, state);
  var lists__5075 = function() {
    var or__3824__auto____5074 = "\ufdd0'lists".call(null, state);
    if(cljs.core.truth_(or__3824__auto____5074)) {
      return or__3824__auto____5074
    }else {
      return cljs.core.List.EMPTY
    }
  }();
  var last_list_type__5076 = cljs.core.first.call(null, lists__5075);
  var text_string__5077 = cljs.core.apply.call(null, cljs.core.str, text);
  if(cljs.core.truth_(function() {
    var or__3824__auto____5078 = cljs.core.empty_QMARK_.call(null, lists__5075);
    if(cljs.core.truth_(or__3824__auto____5078)) {
      return or__3824__auto____5078
    }else {
      return indents > total_indents__5073
    }
  }())) {
    return cljs.core.PersistentVector.fromArray([cljs.core.str.call(null, "<", list_name__5072, "><li>", text_string__5077), cljs.core.assoc.call(null, state, "\ufdd0'lists", cljs.core.conj.call(null, lists__5075, list_type))])
  }else {
    if(cljs.core.truth_(cljs.core.not_EQ_.call(null, list_type, last_list_type__5076))) {
      var lists_to_close__5079 = cljs.core.take_while.call(null, cljs.core.partial.call(null, cljs.core._EQ_, last_list_type__5076), lists__5075);
      return cljs.core.PersistentVector.fromArray([cljs.core.str.call(null, cljs.core.apply.call(null, cljs.core.str, function() {
        var iter__520__auto____5084 = function iter__5080(s__5081) {
          return new cljs.core.LazySeq(null, false, function() {
            var s__5081__5082 = s__5081;
            while(true) {
              if(cljs.core.truth_(cljs.core.seq.call(null, s__5081__5082))) {
                var l__5083 = cljs.core.first.call(null, s__5081__5082);
                return cljs.core.cons.call(null, transformers.close_list.call(null, cljs.core.name.call(null, l__5083), 1), iter__5080.call(null, cljs.core.rest.call(null, s__5081__5082)))
              }else {
                return null
              }
              break
            }
          })
        };
        return iter__520__auto____5084.call(null, lists_to_close__5079)
      }()), "<li>", text_string__5077), cljs.core.assoc.call(null, state, "\ufdd0'lists", cljs.core.drop.call(null, cljs.core.count.call(null, lists_to_close__5079), lists__5075))])
    }else {
      if(cljs.core.truth_("\ufdd0'default")) {
        if(cljs.core.truth_(indents < total_indents__5073)) {
          var num_closed__5085 = total_indents__5073 - indents;
          return cljs.core.PersistentVector.fromArray([cljs.core.str.call(null, cljs.core.apply.call(null, cljs.core.str, function() {
            var iter__520__auto____5090 = function iter__5086(s__5087) {
              return new cljs.core.LazySeq(null, false, function() {
                var s__5087__5088 = s__5087;
                while(true) {
                  if(cljs.core.truth_(cljs.core.seq.call(null, s__5087__5088))) {
                    var l__5089 = cljs.core.first.call(null, s__5087__5088);
                    return cljs.core.cons.call(null, transformers.close_list.call(null, cljs.core.name.call(null, l__5089), 1), iter__5086.call(null, cljs.core.rest.call(null, s__5087__5088)))
                  }else {
                    return null
                  }
                  break
                }
              })
            };
            return iter__520__auto____5090.call(null, cljs.core.take.call(null, num_closed__5085, lists__5075))
          }()), "</li><li>", text_string__5077), cljs.core.assoc.call(null, state, "\ufdd0'lists", cljs.core.drop.call(null, num_closed__5085, lists__5075))])
        }else {
          if(cljs.core.truth_("\ufdd0'default")) {
            return cljs.core.PersistentVector.fromArray([cljs.core.str.call(null, "</li><li>", text_string__5077), state])
          }else {
            return null
          }
        }
      }else {
        return null
      }
    }
  }
};
transformers.list_transformer = function list_transformer(text, state) {
  if(cljs.core.truth_("\ufdd0'code".call(null, state))) {
    return cljs.core.PersistentVector.fromArray([text, state])
  }else {
    var vec__5091__5093 = cljs.core.split_with.call(null, cljs.core.partial.call(null, cljs.core._EQ_, " "), text);
    var spaces__5094 = cljs.core.nth.call(null, vec__5091__5093, 0, null);
    var remaining_text__5095 = cljs.core.nth.call(null, vec__5091__5093, 1, null);
    var num_indents__5096 = cljs.core.count.call(null, spaces__5094);
    var map__5092__5097 = state;
    var map__5092__5098 = cljs.core.truth_(cljs.core.seq_QMARK_.call(null, map__5092__5097)) ? cljs.core.apply.call(null, cljs.core.hash_map, map__5092__5097) : map__5092__5097;
    var cur_lists__5099 = cljs.core.get.call(null, map__5092__5098, "\ufdd0'lists");
    var list_indents__5100 = cljs.core.get.call(null, map__5092__5098, "\ufdd0'list-indents");
    var eof_QMARK___5101 = cljs.core.get.call(null, map__5092__5098, "\ufdd0'eof");
    var lists__5103 = function() {
      var or__3824__auto____5102 = cur_lists__5099;
      if(cljs.core.truth_(or__3824__auto____5102)) {
        return or__3824__auto____5102
      }else {
        return cljs.core.List.EMPTY
      }
    }();
    if(cljs.core.truth_(cljs.core.re_matches.call(null, /[0-9]+/, cljs.core.apply.call(null, cljs.core.str, cljs.core.take_while.call(null, cljs.core.partial.call(null, cljs.core.not_EQ_, "."), remaining_text__5095))))) {
      var actual_text__5105 = cljs.core.rest.call(null, cljs.core.drop_while.call(null, cljs.core.partial.call(null, cljs.core.not_EQ_, "."), remaining_text__5095));
      var vec__5104__5106 = transformers.list_row_helper.call(null, actual_text__5105, state, "\ufdd0'ol", num_indents__5096);
      var new_text__5107 = cljs.core.nth.call(null, vec__5104__5106, 0, null);
      var new_state__5108 = cljs.core.nth.call(null, vec__5104__5106, 1, null);
      return cljs.core.PersistentVector.fromArray([new_text__5107, cljs.core.assoc.call(null, new_state__5108, "\ufdd0'list-indents", num_indents__5096)])
    }else {
      if(cljs.core.truth_(cljs.core._EQ_.call(null, cljs.core.PersistentVector.fromArray(["*", " "]), cljs.core.take.call(null, 2, remaining_text__5095)))) {
        var actual_text__5110 = cljs.core.drop.call(null, 2, remaining_text__5095);
        var vec__5109__5111 = transformers.list_row_helper.call(null, actual_text__5110, state, "\ufdd0'ul", num_indents__5096);
        var new_text__5112 = cljs.core.nth.call(null, vec__5109__5111, 0, null);
        var new_state__5113 = cljs.core.nth.call(null, vec__5109__5111, 1, null);
        return cljs.core.PersistentVector.fromArray([new_text__5112, cljs.core.assoc.call(null, new_state__5113, "\ufdd0'list-indents", num_indents__5096)])
      }else {
        if(cljs.core.truth_("\ufdd0'default")) {
          if(cljs.core.truth_("\ufdd0'lists".call(null, state))) {
            return cljs.core.PersistentVector.fromArray([cljs.core.str.call(null, cljs.core.apply.call(null, cljs.core.str, function() {
              var iter__520__auto____5118 = function iter__5114(s__5115) {
                return new cljs.core.LazySeq(null, false, function() {
                  var s__5115__5116 = s__5115;
                  while(true) {
                    if(cljs.core.truth_(cljs.core.seq.call(null, s__5115__5116))) {
                      var l__5117 = cljs.core.first.call(null, s__5115__5116);
                      return cljs.core.cons.call(null, transformers.close_list.call(null, cljs.core.name.call(null, l__5117), 1), iter__5114.call(null, cljs.core.rest.call(null, s__5115__5116)))
                    }else {
                      return null
                    }
                    break
                  }
                })
              };
              return iter__520__auto____5118.call(null, "\ufdd0'lists".call(null, state))
            }()), text), cljs.core.dissoc.call(null, state, "\ufdd0'lists", "\ufdd0'list-indents")])
          }else {
            if(cljs.core.truth_("\ufdd0'default")) {
              return cljs.core.PersistentVector.fromArray([text, state])
            }else {
              return null
            }
          }
        }else {
          return null
        }
      }
    }
  }
};
transformers.transformer_list = function transformer_list() {
  return cljs.core.PersistentVector.fromArray([transformers.codeblock_transformer, transformers.code_transformer, transformers.hr_transformer, transformers.inline_code_transformer, transformers.list_transformer, transformers.heading_transformer, transformers.italics_transformer, transformers.em_transformer, transformers.bold_transformer, transformers.alt_bold_transformer, transformers.strikethrough_transformer, transformers.superscript_transformer, transformers.link_transformer, transformers.blockquote_transformer, 
  transformers.paragraph_transformer])
};
goog.provide("markdown");
goog.require("cljs.core");
goog.require("transformers");
markdown.init_transformer = function init_transformer(transformers) {
  return function(html, line, state) {
    var vec__3186__3192 = cljs.core.reduce.call(null, function(p__3187, transformer) {
      var vec__3188__3189 = p__3187;
      var text__3190 = cljs.core.nth.call(null, vec__3188__3189, 0, null);
      var state__3191 = cljs.core.nth.call(null, vec__3188__3189, 1, null);
      return transformer.call(null, text__3190, state__3191)
    }, cljs.core.PersistentVector.fromArray([line, state]), transformers);
    var text__3193 = cljs.core.nth.call(null, vec__3186__3192, 0, null);
    var new_state__3194 = cljs.core.nth.call(null, vec__3186__3192, 1, null);
    return cljs.core.PersistentVector.fromArray([cljs.core.str.call(null, html, text__3193), new_state__3194])
  }
};
markdown.mdToHtml = function mdToHtml(text) {
  var transformer__3195 = markdown.init_transformer.call(null, transformers.transformer_list.call(null));
  var html__3196 = "";
  var remaining__3197 = text.split("\n");
  var state__3198 = cljs.core.ObjMap.fromObject(["\ufdd0'last-line-empty?"], {"\ufdd0'last-line-empty?":false});
  while(true) {
    if(cljs.core.truth_(cljs.core.empty_QMARK_.call(null, remaining__3197))) {
      return cljs.core.first.call(null, transformer__3195.call(null, html__3196, "", cljs.core.assoc.call(null, state__3198, "\ufdd0'eof", true)))
    }else {
      var vec__3199__3200 = transformer__3195.call(null, html__3196, cljs.core.first.call(null, remaining__3197), state__3198);
      var new_html__3201 = cljs.core.nth.call(null, vec__3199__3200, 0, null);
      var new_state__3202 = cljs.core.nth.call(null, vec__3199__3200, 1, null);
      var G__3203 = new_html__3201;
      var G__3204 = cljs.core.rest.call(null, remaining__3197);
      var G__3205 = cljs.core.assoc.call(null, new_state__3202, "\ufdd0'last-line-empty?", cljs.core.empty_QMARK_.call(null, cljs.core.first.call(null, remaining__3197)));
      html__3196 = G__3203;
      remaining__3197 = G__3204;
      state__3198 = G__3205;
      continue
    }
    break
  }
};
goog.exportSymbol("markdown.mdToHtml", markdown.mdToHtml);
