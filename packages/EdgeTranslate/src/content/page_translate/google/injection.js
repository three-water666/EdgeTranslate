// Copyright 2010 Google Inc. All Rights Reserved.

(function () {
    let uid = "1E07F158C6FA4460B352973E9693B329";
    let teId = `TE_${uid}`;
    let cbId = `TECB_${uid}`;
    let runtime = this;

    readInjectionConfig(runtime);

    if (window[teId]) {
        show(teId);
    } else if (!hasTranslateElement()) {
        ensureTranslateElementCallback(teId, cbId);
        loadElementScript(runtime.EDGE_TRANSLATE_URL, runtime.USER_LANG);
    }

    function readInjectionConfig(runtime) {
        let injectionElement = document.getElementById("google-translate-injection");
        runtime.USER_LANG = injectionElement.getAttribute("user-lang");
        injectionElement.removeAttribute("user-lang");
        runtime.EDGE_TRANSLATE_URL = injectionElement.getAttribute("edge-translate-url");
        injectionElement.removeAttribute("edge-translate-url");
    }

    function show(teId) {
        window.setTimeout(function () {
            window[teId].showBanner(true);
        }, 10);
    }

    function hasTranslateElement() {
        // eslint-disable-next-line no-undef
        return window.google && google.translate && google.translate.TranslateElement;
    }

    function ensureTranslateElementCallback(teId, cbId) {
        if (!window[cbId]) {
            window[cbId] = function () {
                window[teId] = newElem();
                show(teId);
            };
        }
    }

    function loadElementScript(extensionUrl, userLang) {
        let s = document.createElement("script");
        s.src = `${extensionUrl}google/elms/elm_${userLang}.js`;
        document.getElementsByTagName("head")[0].appendChild(s);
    }

    function newElem() {
        // eslint-disable-next-line no-undef
        let elem = new google.translate.TranslateElement({
            autoDisplay: false,
            floatPosition: 0,
            multilanguagePage: true,
            pageLanguage: "auto",
        });
        return elem;
    }
})();
