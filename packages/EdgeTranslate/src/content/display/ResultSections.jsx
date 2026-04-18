/** @jsx h */
import { h, Fragment } from "preact";
import DOMPurify from "dompurify";
import {
    BlockContent,
    BlockContentDrawerHeight,
    BlockHead,
    BlockHeadTitle,
    BlockSplitLine,
    Definition,
    DefinitionExample,
    DefinitionHeadSpot,
    Detail,
    DetailHeadSpot,
    DetailMeaning,
    Example,
    ExampleHeadSpot,
    ExampleItem,
    ExampleList,
    ExampleSource,
    ExampleTarget,
    Position,
    PronounceLine,
    PronounceText,
    Source,
    StyledCopyIcon,
    StyledEditDoneIcon,
    StyledEditIcon,
    StyledPronounceIcon,
    StyledPronounceLoadingIcon,
    SynonymLine,
    SynonymTitle,
    SynonymWord,
    Target,
    TextContentDrawerHeight,
    TextLine,
} from "./Result.styles.js";

function TargetContent({
    copyResult,
    displayTPronunciation,
    displayTPronunciationIcon,
    foldLongContent,
    mainMeaning,
    setCopyResult,
    setTargetPronounce,
    tPronunciation,
    targetPronouncing,
    textDirection,
    translateResultElRef,
}) {
    if (!mainMeaning?.length) return null;

    return (
        <Target>
            <TextLine>
                <div
                    dir={textDirection}
                    contenteditable={copyResult}
                    onBlur={() => setCopyResult({ copy: false })}
                    ref={translateResultElRef}
                    style={{ paddingLeft: 3 }}
                >
                    {mainMeaning}
                </div>
                <StyledCopyIcon
                    role="button"
                    onClick={() =>
                        setCopyResult({
                            copy: true,
                            element: translateResultElRef.current,
                        })
                    }
                    title={chrome.i18n.getMessage("CopyResult")}
                />
            </TextLine>
            {(displayTPronunciationIcon || displayTPronunciation) && (
                <PronounceLine>
                    {displayTPronunciationIcon &&
                        (targetPronouncing ? (
                            <StyledPronounceLoadingIcon />
                        ) : (
                            <StyledPronounceIcon
                                role="button"
                                onClick={() => setTargetPronounce(true)}
                            />
                        ))}
                    {displayTPronunciation && (
                        <PronounceText
                            dir={textDirection}
                            DrawerHeight={TextContentDrawerHeight}
                            DisableDrawer={!foldLongContent}
                        >
                            {tPronunciation}
                        </PronounceText>
                    )}
                </PronounceLine>
            )}
        </Target>
    );
}

function SourceContent({
    displaySPronunciation,
    displaySPronunciationIcon,
    editing,
    foldLongContent,
    onFinishEdit,
    onStartEdit,
    originalText,
    originalTextElRef,
    sPronunciation,
    setSourcePronounce,
    sourcePronouncing,
    textDirection,
}) {
    if (!originalText?.length) return null;

    return (
        <Source>
            <TextLine>
                <div
                    dir={textDirection}
                    contenteditable={editing}
                    ref={originalTextElRef}
                    style={{ paddingLeft: 3 }}
                >
                    {originalText}
                </div>
                {editing ? (
                    <StyledEditDoneIcon
                        role="button"
                        title={chrome.i18n.getMessage("Retranslate")}
                        onClick={onFinishEdit}
                    />
                ) : (
                    <StyledEditIcon
                        role="button"
                        title={chrome.i18n.getMessage("EditText")}
                        onClick={onStartEdit}
                    />
                )}
            </TextLine>
            {(displaySPronunciationIcon || displaySPronunciation) && (
                <PronounceLine>
                    {displaySPronunciationIcon &&
                        (sourcePronouncing ? (
                            <StyledPronounceLoadingIcon />
                        ) : (
                            <StyledPronounceIcon
                                role="button"
                                onClick={() => setSourcePronounce(true)}
                            />
                        ))}
                    {displaySPronunciation && (
                        <PronounceText
                            dir={textDirection}
                            DrawerHeight={TextContentDrawerHeight}
                            DisableDrawer={!foldLongContent}
                        >
                            {sPronunciation}
                        </PronounceText>
                    )}
                </PronounceLine>
            )}
        </Source>
    );
}

function DetailContent({ detailedMeanings, foldLongContent, textDirection }) {
    if (!detailedMeanings?.length) return null;

    return (
        <Detail>
            <BlockHead>
                <DetailHeadSpot />
                <BlockHeadTitle>{chrome.i18n.getMessage("DetailedMeanings")}</BlockHeadTitle>
                <BlockSplitLine />
            </BlockHead>
            <BlockContent DrawerHeight={BlockContentDrawerHeight} DisableDrawer={!foldLongContent}>
                {detailedMeanings.map((detail, detailIndex) => (
                    <Fragment key={`detail-${detailIndex}`}>
                        <Position dir={textDirection}>{detail.pos}</Position>
                        <DetailMeaning dir={textDirection}>{detail.meaning}</DetailMeaning>
                        {renderSynonyms(detail.synonyms, textDirection)}
                    </Fragment>
                ))}
            </BlockContent>
        </Detail>
    );
}

function DefinitionContent({ definitions, foldLongContent, textDirection }) {
    if (!definitions?.length) return null;

    return (
        <Definition>
            <BlockHead>
                <DefinitionHeadSpot />
                <BlockHeadTitle>{chrome.i18n.getMessage("Definitions")}</BlockHeadTitle>
                <BlockSplitLine />
            </BlockHead>
            <BlockContent DrawerHeight={BlockContentDrawerHeight} DisableDrawer={!foldLongContent}>
                {definitions.map((definition, definitionIndex) => (
                    <Fragment key={`definition-${definitionIndex}`}>
                        <Position dir={textDirection}>{definition.pos}</Position>
                        <DetailMeaning dir={textDirection}>{definition.meaning}</DetailMeaning>
                        {definition.example && (
                            <DefinitionExample
                                dir={textDirection}
                            >{`"${definition.example}"`}</DefinitionExample>
                        )}
                        {renderSynonyms(definition.synonyms, textDirection, "definition")}
                    </Fragment>
                ))}
            </BlockContent>
        </Definition>
    );
}

function ExampleContent({ examples, foldLongContent, textDirection }) {
    if (!examples?.length) return null;

    return (
        <Example>
            <BlockHead>
                <ExampleHeadSpot />
                <BlockHeadTitle>{chrome.i18n.getMessage("Examples")}</BlockHeadTitle>
                <BlockSplitLine />
            </BlockHead>
            <BlockContent DrawerHeight={BlockContentDrawerHeight} DisableDrawer={!foldLongContent}>
                <ExampleList dir={textDirection}>
                    {examples.map((example, index) => (
                        <ExampleItem key={`example-${index}`}>
                            {renderExampleText(example.source, ExampleSource)}
                            {renderExampleText(example.target, ExampleTarget)}
                        </ExampleItem>
                    ))}
                </ExampleList>
            </BlockContent>
        </Example>
    );
}

function renderSynonyms(synonyms, textDirection, prefix = "detail") {
    if (!synonyms?.length) return null;

    return (
        <Fragment>
            <SynonymTitle dir={textDirection}>{chrome.i18n.getMessage("Synonyms")}</SynonymTitle>
            <SynonymLine>
                {synonyms.map((word, synonymIndex) => (
                    <SynonymWord key={`${prefix}-synonym-${synonymIndex}`} dir={textDirection}>
                        {word}
                    </SynonymWord>
                ))}
            </SynonymLine>
        </Fragment>
    );
}

function renderExampleText(text, Component) {
    if (!text) return null;

    return (
        <Component
            dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(text, {
                    ALLOWED_TAGS: ["b"],
                }),
            }}
        />
    );
}

export { DefinitionContent, DetailContent, ExampleContent, SourceContent, TargetContent };
