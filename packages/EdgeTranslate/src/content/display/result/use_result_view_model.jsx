/** @jsx h */
import { h } from "preact";
import { useEffect, useReducer, useRef, useState } from "preact/hooks";
import {
    DefinitionContent,
    DetailContent,
    ExampleContent,
    SourceContent,
    TargetContent,
} from "./ResultSections.jsx";
import { copyContent, sourcePronounce, targetPronounce, _setEditing } from "./ResultReducers.js";
import { createStorageChangeHandler, loadResultDisplaySettings } from "./result_settings.js";

function useResultState(props) {
    const [contentDisplayOrder, setContentDisplayOrder] = useState([]);
    const [displayTPronunciation, setDisplayTPronunciation] = useState(false);
    const [displaySPronunciation, setDisplaySPronunciation] = useState(false);
    const [displayTPronunciationIcon, setDisplayTPronunciationIcon] = useState(false);
    const [displaySPronunciationIcon, setDisplaySPronunciationIcon] = useState(false);
    const [contentFilter, setContentFilter] = useState({});
    const [textDirection, setTextDirection] = useState("ltr");
    const [foldLongContent, setFoldLongContent] = useState(true);
    const [sourcePronouncing, setSourcePronounce] = useReducer(sourcePronounce, false);
    const [targetPronouncing, setTargetPronounce] = useReducer(targetPronounce, false);
    const [copyResult, setCopyResult] = useReducer(copyContent, false);
    const translateResultElRef = useRef();
    const [editing, setEditing] = useReducer(_setEditing, false);
    const originalTextElRef = useRef();

    return {
        contentDisplayOrder,
        contentFilter,
        copyResult,
        displaySPronunciation,
        displaySPronunciationIcon,
        displayTPronunciation,
        displayTPronunciationIcon,
        editing,
        foldLongContent,
        isScreenshotTranslate: props.translateMode === "screenshot",
        originalTextElRef,
        setContentDisplayOrder,
        setContentFilter,
        setCopyResult,
        setDisplaySPronunciation,
        setDisplaySPronunciationIcon,
        setDisplayTPronunciation,
        setDisplayTPronunciationIcon,
        setEditing,
        setFoldLongContent,
        setSourcePronounce,
        setTargetPronounce,
        setTextDirection,
        sourcePronouncing,
        targetPronouncing,
        textDirection,
        translateResultElRef,
    };
}

function useResultEffects({
    channel,
    checkTimestamp,
    defaultSettings,
    getOrSetDefaultSettings,
    notifier,
    setters,
    storage,
}) {
    useEffect(() => {
        const cancelers = bindResultChannelEvents({
            channel,
            checkTimestamp,
            notifier,
            setCopyResult: setters.setCopyResult,
            setSourcePronounce: setters.setSourcePronounce,
            setTargetPronounce: setters.setTargetPronounce,
            translateResultElRef: setters.translateResultElRef,
        });
        loadResultDisplaySettings(getOrSetDefaultSettings, defaultSettings, setters);

        const onStorageChange = createStorageChangeHandler(setters);
        storage.onChanged.addListener(onStorageChange);

        return () => {
            cancelers.forEach((canceler) => canceler());
            storage.onChanged.removeListener(onStorageChange);
        };
    }, [
        channel,
        checkTimestamp,
        defaultSettings,
        getOrSetDefaultSettings,
        notifier,
        setters,
        storage,
    ]);
}

function useResultViewModel({
    channel,
    checkTimestamp,
    defaultSettings,
    getOrSetDefaultSettings,
    notifier,
    props,
    storage,
}) {
    const state = useResultState(props);
    const sectionProps = {
        foldLongContent: state.foldLongContent,
        textDirection: state.textDirection,
    };
    const effectSetters = {
        setContentDisplayOrder: state.setContentDisplayOrder,
        setContentFilter: state.setContentFilter,
        setCopyResult: state.setCopyResult,
        setDisplaySPronunciation: state.setDisplaySPronunciation,
        setDisplaySPronunciationIcon: state.setDisplaySPronunciationIcon,
        setDisplayTPronunciation: state.setDisplayTPronunciation,
        setDisplayTPronunciationIcon: state.setDisplayTPronunciationIcon,
        setFoldLongContent: state.setFoldLongContent,
        setSourcePronounce: state.setSourcePronounce,
        setTargetPronounce: state.setTargetPronounce,
        setTextDirection: state.setTextDirection,
        translateResultElRef: state.translateResultElRef,
    };

    const contents = buildContentMap({
        copyResult: state.copyResult,
        displaySPronunciation: state.displaySPronunciation,
        displaySPronunciationIcon: state.displaySPronunciationIcon,
        displayTPronunciation: state.displayTPronunciation,
        displayTPronunciationIcon: state.displayTPronunciationIcon,
        editing: state.editing,
        originalTextElRef: state.originalTextElRef,
        props,
        sectionProps,
        setCopyResult: state.setCopyResult,
        setEditing: state.setEditing,
        setSourcePronounce: state.setSourcePronounce,
        setTargetPronounce: state.setTargetPronounce,
        sourcePronouncing: state.sourcePronouncing,
        targetPronouncing: state.targetPronouncing,
        translateResultElRef: state.translateResultElRef,
    });

    useResultEffects({
        channel,
        checkTimestamp,
        defaultSettings,
        getOrSetDefaultSettings,
        notifier,
        setters: effectSetters,
        storage,
    });

    return {
        contentDisplayOrder: state.contentDisplayOrder,
        contentFilter: state.contentFilter,
        contents,
        isScreenshotTranslate: state.isScreenshotTranslate,
        textDirection: state.textDirection,
    };
}

function buildContentMap({
    copyResult,
    displaySPronunciation,
    displaySPronunciationIcon,
    displayTPronunciation,
    displayTPronunciationIcon,
    editing,
    originalTextElRef,
    props,
    sectionProps,
    setCopyResult,
    setEditing,
    setSourcePronounce,
    setTargetPronounce,
    sourcePronouncing,
    targetPronouncing,
    translateResultElRef,
}) {
    return {
        mainMeaning: (
            <TargetContent
                {...sectionProps}
                copyResult={copyResult}
                displayTPronunciation={displayTPronunciation}
                displayTPronunciationIcon={displayTPronunciationIcon}
                mainMeaning={props.mainMeaning}
                setCopyResult={setCopyResult}
                setTargetPronounce={setTargetPronounce}
                tPronunciation={props.tPronunciation}
                targetPronouncing={targetPronouncing}
                translateResultElRef={translateResultElRef}
            />
        ),
        originalText: (
            <SourceContent
                {...sectionProps}
                displaySPronunciation={displaySPronunciation}
                displaySPronunciationIcon={displaySPronunciationIcon}
                editing={editing}
                onFinishEdit={() =>
                    setEditing({
                        edit: false,
                        element: originalTextElRef.current,
                    })
                }
                onStartEdit={() =>
                    setEditing({
                        edit: true,
                        element: originalTextElRef.current,
                    })
                }
                originalText={props.originalText}
                originalTextElRef={originalTextElRef}
                sPronunciation={props.sPronunciation}
                setSourcePronounce={setSourcePronounce}
                sourcePronouncing={sourcePronouncing}
            />
        ),
        detailedMeanings: (
            <DetailContent {...sectionProps} detailedMeanings={props.detailedMeanings} />
        ),
        definitions: <DefinitionContent {...sectionProps} definitions={props.definitions} />,
        examples: <ExampleContent {...sectionProps} examples={props.examples} />,
    };
}

function bindResultChannelEvents({
    channel,
    checkTimestamp,
    notifier,
    setCopyResult,
    setSourcePronounce,
    setTargetPronounce,
    translateResultElRef,
}) {
    return [
        channel.on("pronouncing_finished", (detail) => {
            if (!checkTimestamp(detail.timestamp)) return;
            if (detail.pronouncing === "source") setSourcePronounce(false);
            else if (detail.pronouncing === "target") setTargetPronounce(false);
        }),
        channel.on("pronouncing_error", (detail) => {
            if (!checkTimestamp(detail.timestamp)) return;
            if (detail.pronouncing === "source") setSourcePronounce(false);
            else if (detail.pronouncing === "target") setTargetPronounce(false);
            notifier.notify({
                type: "error",
                title: chrome.i18n.getMessage("AppName"),
                detail: chrome.i18n.getMessage("PRONOUN_ERR"),
            });
        }),
        channel.on("command", (detail) => {
            if (detail.command === "pronounce_original") {
                setSourcePronounce(true);
            } else if (detail.command === "pronounce_translated") {
                setTargetPronounce(true);
            } else if (detail.command === "copy_result") {
                handleCopyResultCommand(setCopyResult, translateResultElRef);
            }
        }),
    ];
}

function handleCopyResultCommand(setCopyResult, translateResultElRef) {
    if (window.translateResult.mainMeaning && translateResultElRef.current) {
        setCopyResult({ copy: true, element: translateResultElRef.current });
    }
}

export { useResultViewModel };
